import type {
  ContextPersistenceProvider,
  ContextPersistenceSession,
  ContextStore,
  ContextStoreRecord,
  ContextStoreResult,
  ContextStoreTransaction,
  ContextStoreWriteOptions,
  ContextRuntimeValue,
} from '@host/context-persistence';
import type {
  DispatchPersistenceQuery,
  DispatchPersistenceRecord,
  DispatchRepository,
  EventHistoryQuery,
  EventHistoryRecord,
  EventHistoryRepository,
  ExecutionPersistenceQuery,
  ExecutionPersistenceRecord,
  ExecutionRepository,
  PersistedRecordEnvelope,
  RepositoryQueryOptions,
  RepositoryQueryResult,
  RepositoryWriteOptions,
  WorkflowInstancePersistenceQuery,
  WorkflowInstancePersistenceRecord,
  WorkflowPersistenceQuery,
  WorkflowPersistenceRecord,
  WorkflowRepository,
} from './contracts.js';
import { ExecutionPersistenceError } from './contracts.js';
import type { DurableExecutionRecordKind } from './contracts.js';
import type { DurableExecutionRuntimeValue } from './runtime.js';
import { createDurableExecutionPersistenceRuntime } from './runtime.js';

const deepFreeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object') {
      deepFreeze(nested);
    }
  }

  return value;
};

type Filter<TValue, TQuery extends RepositoryQueryOptions> = (value: TValue, query: TQuery) => boolean;

const mapStoreFailure = (result: {
  readonly error: {
    readonly code: string;
    readonly message: string;
    readonly key?: string | undefined;
    readonly expected_version?: number | undefined;
    readonly actual_version?: number | undefined;
  };
}): never => {
  if (result.error.code === 'context-store.not-found') {
    throw new ExecutionPersistenceError('execution-persistence.not-found', result.error.message, {
      record_id: result.error.key,
    });
  }
  if (result.error.code === 'context-store.version-conflict') {
    throw new ExecutionPersistenceError('execution-persistence.conflict', result.error.message, {
      record_id: result.error.key,
      expected_version: result.error.expected_version,
      actual_version: result.error.actual_version,
    });
  }

  throw new ExecutionPersistenceError('execution-persistence.provider-failure', result.error.message, {
    record_id: result.error.key,
    expected_version: result.error.expected_version,
    actual_version: result.error.actual_version,
  });
};

const unwrap = <TValue>(result: ContextStoreResult<TValue>): TValue => {
  if (!result.ok) {
    return mapStoreFailure(result);
  }

  return result.value;
};

const unwrapSession = async (provider: ContextPersistenceProvider): Promise<ContextPersistenceSession> => {
  const session = await provider.beginSession();
  if (!session.ok) {
    throw new ExecutionPersistenceError('execution-persistence.provider-failure', session.error.message);
  }

  return session.value;
};

const unwrapTransaction = async (provider: ContextPersistenceProvider): Promise<ContextStoreTransaction> => {
  const transaction = await provider.beginTransaction();
  if (!transaction.ok) {
    throw new ExecutionPersistenceError('execution-persistence.provider-failure', transaction.error.message);
  }

  return transaction.value.store;
};

const createQueryResult = <TValue>(items: readonly PersistedRecordEnvelope<TValue>[]): RepositoryQueryResult<TValue> =>
  deepFreeze({
    items,
    total: items.length,
  });

const applyLimit = <TValue>(items: readonly PersistedRecordEnvelope<TValue>[], query: RepositoryQueryOptions | undefined): readonly PersistedRecordEnvelope<TValue>[] => {
  const offset = query?.offset ?? 0;
  const limit = query?.limit ?? items.length;
  return deepFreeze(items.slice(offset, offset + limit));
};

abstract class PersistentCollection<TValue, TQuery extends RepositoryQueryOptions> {
  protected readonly provider: ContextPersistenceProvider;
  protected readonly runtime = createDurableExecutionPersistenceRuntime();
  readonly #prefix: string;
  readonly #kind: DurableExecutionRecordKind;

  constructor(provider: ContextPersistenceProvider, prefix: string, kind: DurableExecutionRecordKind) {
    this.provider = provider;
    this.#prefix = prefix;
    this.#kind = kind;
  }

  protected keyFor(id: string): string {
    return `${this.#prefix}/${id}`;
  }

  protected toEnvelope(record: ContextStoreRecord): PersistedRecordEnvelope<TValue> {
    const value = record.value as unknown as DurableExecutionRuntimeValue;
    return deepFreeze({
      id: record.key.slice(this.#prefix.length + 1),
      version: record.version,
      created_at: record.created_at,
      updated_at: record.updated_at,
      value: structuredClone(value.payload) as TValue,
    });
  }

  public async createRecord(id: string, payload: TValue, options: RepositoryWriteOptions = {}): Promise<PersistedRecordEnvelope<TValue>> {
    const transaction = await unwrapTransaction(this.provider);
    const now = new Date().toISOString();
    const result = await transaction.create(
      this.keyFor(id),
      this.runtime.createValue(this.#kind, payload, { created_at: now, updated_at: now }) as unknown as ContextRuntimeValue,
      this.writeOptionsForCreate(options),
    );
    const created = unwrap(result);
    const committed = await transaction.commit();
    if (!committed.ok) {
      return mapStoreFailure(committed);
    }

    return this.toEnvelope(created);
  }

  public async retrieveRecord(id: string): Promise<PersistedRecordEnvelope<TValue>> {
    const session = await unwrapSession(this.provider);
    try {
      const record = unwrap(await session.store.retrieve(this.keyFor(id)));
      return this.toEnvelope(record);
    } finally {
      await session.close();
    }
  }

  public async updateRecord(id: string, payload: TValue, options: RepositoryWriteOptions = {}): Promise<PersistedRecordEnvelope<TValue>> {
    const current = await this.retrieveRecord(id);
    const transaction = await unwrapTransaction(this.provider);
    const result = await transaction.update(
      this.keyFor(id),
      this.runtime.createValue(this.#kind, payload, {
        created_at: current.created_at,
        updated_at: new Date().toISOString(),
      }) as unknown as ContextRuntimeValue,
      this.writeOptionsForUpdate(current, options),
    );
    const updated = unwrap(result);
    const committed = await transaction.commit();
    if (!committed.ok) {
      return mapStoreFailure(committed);
    }

    return this.toEnvelope(updated);
  }

  public async deleteRecord(id: string, options: RepositoryWriteOptions = {}): Promise<PersistedRecordEnvelope<TValue>> {
    const transaction = await unwrapTransaction(this.provider);
    const deleted = unwrap(await transaction.delete(this.keyFor(id), this.writeOptionsForDelete(options)));
    const committed = await transaction.commit();
    if (!committed.ok) {
      return mapStoreFailure(committed);
    }

    return this.toEnvelope(deleted);
  }

  public async queryRecords(query: TQuery | undefined, matches: Filter<TValue, TQuery>): Promise<RepositoryQueryResult<TValue>> {
    const session = await unwrapSession(this.provider);
    try {
      const result = unwrap(
        await session.store.query({
          key_prefix: `${this.#prefix}/`,
          order_by: [{ field: 'key', direction: 'asc' }],
        }),
      );
      const filtered = result.items.map((item) => this.toEnvelope(item)).filter((item) => matches(item.value, (query ?? {}) as TQuery));
      return createQueryResult(applyLimit(filtered, query));
    } finally {
      await session.close();
    }
  }

  protected immutableUpdate(recordId: string): never {
    throw new ExecutionPersistenceError(
      'execution-persistence.immutable-record',
      `Record ${recordId} is immutable and must be replaced by appending a new history entry instead of updating in place.`,
      { record_id: recordId },
    );
  }

  protected writeOptionsForCreate(options: RepositoryWriteOptions): ContextStoreWriteOptions {
    return options.expected_version === undefined ? {} : { expected_version: options.expected_version };
  }

  protected writeOptionsForUpdate(
    current: PersistedRecordEnvelope<TValue>,
    options: RepositoryWriteOptions,
  ): ContextStoreWriteOptions {
    return {
      expected_version: options.expected_version ?? current.version,
    };
  }

  protected writeOptionsForDelete(options: RepositoryWriteOptions): ContextStoreWriteOptions {
    return options.expected_version === undefined ? {} : { expected_version: options.expected_version };
  }
}

class WorkflowRepositoryImpl implements WorkflowRepository {
  readonly #definitions: PersistentCollection<WorkflowPersistenceRecord, WorkflowPersistenceQuery>;
  readonly #instances: PersistentCollection<WorkflowInstancePersistenceRecord, WorkflowInstancePersistenceQuery>;

  constructor(provider: ContextPersistenceProvider) {
    this.#definitions = new (class extends PersistentCollection<WorkflowPersistenceRecord, WorkflowPersistenceQuery> {})(provider, 'workflow-definitions', 'execution-workflow-definition');
    this.#instances = new (class extends PersistentCollection<WorkflowInstancePersistenceRecord, WorkflowInstancePersistenceQuery> {})(provider, 'workflow-instances', 'execution-workflow-instance');
  }

  createDefinition(record: WorkflowPersistenceRecord, options?: RepositoryWriteOptions): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>> {
    return this.#definitions.createRecord(`${record.workflow_definition_id}/${record.workflow_version}`, record, options);
  }

  retrieveDefinition(workflow_definition_id: string, workflow_version: string): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>> {
    return this.#definitions.retrieveRecord(`${workflow_definition_id}/${workflow_version}`);
  }

  updateDefinition(record: WorkflowPersistenceRecord, options?: RepositoryWriteOptions): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>> {
    return this.#definitions.updateRecord(`${record.workflow_definition_id}/${record.workflow_version}`, record, options);
  }

  deleteDefinition(
    workflow_definition_id: string,
    workflow_version: string,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>> {
    return this.#definitions.deleteRecord(`${workflow_definition_id}/${workflow_version}`, options);
  }

  queryDefinitions(query: WorkflowPersistenceQuery = {}): Promise<RepositoryQueryResult<WorkflowPersistenceRecord>> {
    return this.#definitions.queryRecords(query, (value, candidate) => {
      if (candidate.workflow_definition_id && value.workflow_definition_id !== candidate.workflow_definition_id) {
        return false;
      }
      if (candidate.workflow_version && value.workflow_version !== candidate.workflow_version) {
        return false;
      }

      return true;
    });
  }

  createInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>> {
    return this.#instances.createRecord(record.workflow_instance_id, record, options) as Promise<
      PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  retrieveInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    workflow_instance_id: string,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>> {
    return this.#instances.retrieveRecord(workflow_instance_id) as Promise<
      PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  updateInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>> {
    return this.#instances.updateRecord(record.workflow_instance_id, record, options) as Promise<
      PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  deleteInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    workflow_instance_id: string,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>> {
    return this.#instances.deleteRecord(workflow_instance_id, options) as Promise<
      PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  queryInstances<TPayload, TEventMetadata extends Record<string, unknown>>(
    query: WorkflowInstancePersistenceQuery = {},
  ): Promise<RepositoryQueryResult<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>> {
    return this.#instances.queryRecords(query, (value, candidate) => {
      const statuses = candidate.status === undefined ? undefined : Array.isArray(candidate.status) ? candidate.status : [candidate.status];
      if (candidate.workflow_instance_id && value.workflow_instance_id !== candidate.workflow_instance_id) {
        return false;
      }
      if (candidate.workflow_definition_id && value.workflow_definition_id !== candidate.workflow_definition_id) {
        return false;
      }
      if (candidate.workflow_version && value.workflow_version !== candidate.workflow_version) {
        return false;
      }
      if (statuses && !statuses.includes(value.status)) {
        return false;
      }
      if (candidate.correlation_id && value.correlation_id !== candidate.correlation_id) {
        return false;
      }
      if (candidate.tenant && value.tenant !== candidate.tenant) {
        return false;
      }

      return true;
    }) as Promise<RepositoryQueryResult<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>>;
  }
}

class ExecutionRepositoryImpl extends PersistentCollection<ExecutionPersistenceRecord, ExecutionPersistenceQuery> implements ExecutionRepository {
  constructor(provider: ContextPersistenceProvider) {
    super(provider, 'executions', 'execution-instance');
  }

  create<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: ExecutionPersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>> {
    return this.createRecord(record.execution_instance_id, record, options) as Promise<
      PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  retrieve<TPayload, TEventMetadata extends Record<string, unknown>>(
    execution_instance_id: string,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>> {
    return this.retrieveRecord(execution_instance_id) as Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
  }

  update<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: ExecutionPersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>> {
    return this.updateRecord(record.execution_instance_id, record, options) as Promise<
      PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  delete<TPayload, TEventMetadata extends Record<string, unknown>>(
    execution_instance_id: string,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>> {
    return this.deleteRecord(execution_instance_id, options) as Promise<
      PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>
    >;
  }

  query<TPayload, TEventMetadata extends Record<string, unknown>>(
    query: ExecutionPersistenceQuery = {},
  ): Promise<RepositoryQueryResult<ExecutionPersistenceRecord<TPayload, TEventMetadata>>> {
    return this.queryRecords(query, (value, candidate) => {
      const statuses = candidate.status === undefined ? undefined : Array.isArray(candidate.status) ? candidate.status : [candidate.status];
      if (candidate.execution_instance_id && value.execution_instance_id !== candidate.execution_instance_id) {
        return false;
      }
      if (candidate.workflow_instance_id && value.workflow_instance_id !== candidate.workflow_instance_id) {
        return false;
      }
      if (candidate.workflow_definition_id && value.workflow_definition_id !== candidate.workflow_definition_id) {
        return false;
      }
      if (statuses && !statuses.includes(value.status)) {
        return false;
      }
      if (candidate.correlation_id && value.correlation_id !== candidate.correlation_id) {
        return false;
      }
      if (candidate.tenant && value.tenant !== candidate.tenant) {
        return false;
      }

      return true;
    }) as Promise<RepositoryQueryResult<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
  }
}

class DispatchRepositoryImpl extends PersistentCollection<DispatchPersistenceRecord, DispatchPersistenceQuery> implements DispatchRepository {
  constructor(provider: ContextPersistenceProvider) {
    super(provider, 'dispatches', 'execution-dispatch-record');
  }

  create(record: DispatchPersistenceRecord, options?: RepositoryWriteOptions): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>> {
    return this.createRecord(`${record.execution_instance_id}/${record.dispatch_id}`, record, options);
  }

  retrieve(dispatch_id: string, execution_instance_id: string): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>> {
    return this.retrieveRecord(`${execution_instance_id}/${dispatch_id}`);
  }

  update(record: DispatchPersistenceRecord): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>> {
    return Promise.resolve(this.immutableUpdate(record.dispatch_id));
  }

  delete(dispatch_id: string, execution_instance_id: string, options?: RepositoryWriteOptions): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>> {
    return this.deleteRecord(`${execution_instance_id}/${dispatch_id}`, options);
  }

  query(query: DispatchPersistenceQuery = {}): Promise<RepositoryQueryResult<DispatchPersistenceRecord>> {
    return this.queryRecords(query, (value, candidate) => {
      if (candidate.dispatch_id && value.dispatch_id !== candidate.dispatch_id) {
        return false;
      }
      if (candidate.execution_instance_id && value.execution_instance_id !== candidate.execution_instance_id) {
        return false;
      }
      if (candidate.workflow_instance_id && value.workflow_instance_id !== candidate.workflow_instance_id) {
        return false;
      }
      if (candidate.workflow_definition_id && value.workflow_definition_id !== candidate.workflow_definition_id) {
        return false;
      }
      if (candidate.correlation_id && value.correlation_id !== candidate.correlation_id) {
        return false;
      }
      if (candidate.tenant && value.tenant !== candidate.tenant) {
        return false;
      }

      return true;
    });
  }
}

class EventHistoryRepositoryImpl extends PersistentCollection<EventHistoryRecord, EventHistoryQuery> implements EventHistoryRepository {
  constructor(provider: ContextPersistenceProvider) {
    super(provider, 'event-history', 'execution-event-history');
  }

  create<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: EventHistoryRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>> {
    return this.createRecord(record.history_id, record, options) as Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  }

  retrieve<TPayload, TEventMetadata extends Record<string, unknown>>(
    history_id: string,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>> {
    return this.retrieveRecord(history_id) as Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  }

  update<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: EventHistoryRecord<TPayload, TEventMetadata>,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>> {
    return Promise.resolve(this.immutableUpdate(record.history_id));
  }

  delete<TPayload, TEventMetadata extends Record<string, unknown>>(
    history_id: string,
    options?: RepositoryWriteOptions,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>> {
    return this.deleteRecord(history_id, options) as Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  }

  query<TPayload, TEventMetadata extends Record<string, unknown>>(
    query: EventHistoryQuery = {},
  ): Promise<RepositoryQueryResult<EventHistoryRecord<TPayload, TEventMetadata>>> {
    return this.queryRecords(query, (value, candidate) => {
      const directions =
        candidate.direction === undefined ? undefined : Array.isArray(candidate.direction) ? candidate.direction : [candidate.direction];
      if (candidate.history_id && value.history_id !== candidate.history_id) {
        return false;
      }
      if (candidate.execution_instance_id && value.execution_instance_id !== candidate.execution_instance_id) {
        return false;
      }
      if (candidate.workflow_instance_id && value.workflow_instance_id !== candidate.workflow_instance_id) {
        return false;
      }
      if (candidate.workflow_definition_id && value.workflow_definition_id !== candidate.workflow_definition_id) {
        return false;
      }
      if (candidate.correlation_id && value.correlation_id !== candidate.correlation_id) {
        return false;
      }
      if (candidate.tenant && value.tenant !== candidate.tenant) {
        return false;
      }
      if (directions && !directions.includes(value.direction)) {
        return false;
      }

      return true;
    }) as Promise<RepositoryQueryResult<EventHistoryRecord<TPayload, TEventMetadata>>>;
  }
}

export const createWorkflowRepository = (provider: ContextPersistenceProvider): WorkflowRepository => new WorkflowRepositoryImpl(provider);
export const createExecutionRepository = (provider: ContextPersistenceProvider): ExecutionRepository => new ExecutionRepositoryImpl(provider);
export const createDispatchRepository = (provider: ContextPersistenceProvider): DispatchRepository => new DispatchRepositoryImpl(provider);
export const createEventHistoryRepository = (provider: ContextPersistenceProvider): EventHistoryRepository => new EventHistoryRepositoryImpl(provider);
