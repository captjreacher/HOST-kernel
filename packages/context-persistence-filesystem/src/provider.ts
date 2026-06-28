import fs from 'node:fs/promises';
import path from 'node:path';
import {
  ContextStoreError,
  type ContextRuntime,
  type ContextRuntimeValue,
  type ContextQuery,
  type ContextQueryOrder,
  type ContextQueryResult,
  type ContextStore,
  type ContextStoreCommitResult,
  type ContextStoreDeleteOptions,
  type ContextStoreExistsResult,
  type ContextStoreFailure,
  type ContextStoreRecord,
  type ContextStoreResult,
  type ContextStoreSnapshot,
  type ContextStoreSuccess,
  type ContextStoreTransaction,
  type ContextStoreTransactionState,
  type ContextStoreWriteOptions,
} from '@host/context-persistence';
import {
  ContextPersistenceError,
  type ContextPersistenceCapabilities,
  type ContextPersistenceCommitResult,
  type ContextPersistenceConnectResult,
  type ContextPersistenceDisconnectResult,
  type ContextPersistenceFailure,
  type ContextPersistenceHealth,
  type ContextPersistenceOperation,
  type ContextPersistenceProvider,
  type ContextPersistenceRegistration,
  type ContextPersistenceResult,
  type ContextPersistenceRollbackResult,
  type ContextPersistenceSession,
  type ContextPersistenceSessionCloseResult,
  type ContextPersistenceTransaction,
  type ContextPersistenceTransactionState,
} from '@host/context-persistence';
import type {
  FilesystemPersistenceCapabilities,
  FilesystemPersistenceProviderHealth,
  FilesystemPersistenceProviderFromPathOptions,
  FilesystemPersistenceProviderOptions,
  FilesystemPersistenceStorageDescriptor,
} from './contracts.js';

interface InternalStoreRecord<TValue extends ContextRuntimeValue = ContextRuntimeValue> extends ContextStoreRecord<TValue> {}

interface StoreState {
  records: Map<string, InternalStoreRecord>;
  revision: number;
}

interface PersistedRecord {
  readonly key: string;
  readonly runtime_kind: string;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly value: string;
}

interface PersistedState {
  readonly format: 'host-context-persistence-filesystem.v1';
  readonly revision: number;
  readonly records: readonly PersistedRecord[];
}

const providerVersion = '1.0.0';
const storageFormatVersion = 'host-context-persistence-filesystem.v1';
const defaultFileName = 'context-store.json';
const defaultLimit = 50;
const defaultOrder: readonly ContextQueryOrder[] = Object.freeze([{ field: 'key', direction: 'asc' }]);

const freeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
      freeze(nested);
    }
  }

  return value;
};

const success = <TValue>(operation: ContextStoreSuccess<TValue>['operation'], value: TValue): ContextStoreSuccess<TValue> =>
  freeze({
    ok: true,
    operation,
    value,
  });

const failure = (operation: ContextStoreFailure['operation'], error: ContextStoreError): ContextStoreFailure =>
  freeze({
    ok: false,
    operation,
    error,
  });

const persistenceSuccess = <TValue>(operation: ContextPersistenceOperation, value: TValue): ContextPersistenceResult<TValue> =>
  freeze({
    ok: true,
    operation,
    value,
  });

const persistenceFailure = (operation: ContextPersistenceOperation, error: ContextPersistenceError): ContextPersistenceFailure =>
  freeze({
    ok: false,
    operation,
    error,
  });

const notBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const isIsoTimestamp = (value: string): boolean => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const cloneMap = (records: Map<string, InternalStoreRecord>): Map<string, InternalStoreRecord> => {
  const next = new Map<string, InternalStoreRecord>();
  for (const [key, value] of records.entries()) {
    next.set(key, structuredClone(value));
  }
  return next;
};

const cloneState = (state: StoreState): StoreState => ({
  records: cloneMap(state.records),
  revision: state.revision,
});

const createStoreError = (
  code: ContextStoreError['code'],
  message: string,
  options: ConstructorParameters<typeof ContextStoreError>[2],
): ContextStoreError => new ContextStoreError(code, message, options);

const createPersistenceError = (
  code: ContextPersistenceError['code'],
  message: string,
  options: ConstructorParameters<typeof ContextPersistenceError>[2],
): ContextPersistenceError => new ContextPersistenceError(code, message, options);

const filesystemPersistenceCapabilities = (): FilesystemPersistenceCapabilities =>
  freeze({
    transactions: true,
    optimistic_locking: true,
    snapshots: true,
    version_history: false,
    bulk_operations: false,
    streaming_support: false,
  });

const normalizeOrder = (query: ContextQuery | undefined): readonly ContextQueryOrder[] => {
  if (!query?.order_by || query.order_by.length === 0) {
    return defaultOrder;
  }

  return freeze(query.order_by.map((entry) => ({ field: entry.field, direction: entry.direction ?? 'asc' })));
};

const compareRecords = (left: InternalStoreRecord, right: InternalStoreRecord, orderBy: readonly ContextQueryOrder[]): number => {
  for (const rule of orderBy) {
    const leftValue = left[rule.field];
    const rightValue = right[rule.field];
    if (leftValue === rightValue) {
      continue;
    }

    const direction = rule.direction ?? 'asc';
    const base = leftValue < rightValue ? -1 : 1;
    return direction === 'asc' ? base : base * -1;
  }

  return 0;
};

const validateQuery = (query: ContextQuery | undefined): ContextStoreError | undefined => {
  if (!query) {
    return undefined;
  }

  if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 0)) {
    return createStoreError('context-store.invalid-query', 'Query limit must be a non-negative integer.', { operation: 'query' });
  }
  if (query.offset !== undefined && (!Number.isInteger(query.offset) || query.offset < 0)) {
    return createStoreError('context-store.invalid-query', 'Query offset must be a non-negative integer.', { operation: 'query' });
  }
  if (query.min_version !== undefined && (!Number.isInteger(query.min_version) || query.min_version < 1)) {
    return createStoreError('context-store.invalid-query', 'Query min_version must be a positive integer.', { operation: 'query' });
  }
  if (query.max_version !== undefined && (!Number.isInteger(query.max_version) || query.max_version < 1)) {
    return createStoreError('context-store.invalid-query', 'Query max_version must be a positive integer.', { operation: 'query' });
  }
  if (query.min_version !== undefined && query.max_version !== undefined && query.min_version > query.max_version) {
    return createStoreError('context-store.invalid-query', 'Query min_version must not exceed max_version.', { operation: 'query' });
  }

  for (const [field, value] of [
    ['created_from', query.created_from],
    ['created_to', query.created_to],
    ['updated_from', query.updated_from],
    ['updated_to', query.updated_to],
  ] as const) {
    if (value !== undefined && !isIsoTimestamp(value)) {
      return createStoreError('context-store.invalid-query', `${field} must use canonical ISO formatting.`, { operation: 'query' });
    }
  }

  if (query.key !== undefined && !notBlank(query.key)) {
    return createStoreError('context-store.invalid-query', 'Query key must not be blank.', { operation: 'query' });
  }
  if (query.key_prefix !== undefined && !notBlank(query.key_prefix)) {
    return createStoreError('context-store.invalid-query', 'Query key_prefix must not be blank.', { operation: 'query' });
  }
  if (query.keys !== undefined && query.keys.some((entry) => !notBlank(entry))) {
    return createStoreError('context-store.invalid-query', 'Query keys must not contain blank values.', { operation: 'query' });
  }

  return undefined;
};

const materializeRecord = <TValue extends ContextRuntimeValue>(runtime: ContextRuntime, record: InternalStoreRecord<TValue>): ContextStoreRecord<TValue> =>
  freeze({
    key: record.key,
    runtime_kind: record.runtime_kind,
    version: record.version,
    created_at: record.created_at,
    updated_at: record.updated_at,
    value: runtime.clone(record.value),
  });

const filterRecords = <TValue extends ContextRuntimeValue>(
  records: readonly InternalStoreRecord<TValue>[],
  query: ContextQuery | undefined,
): InternalStoreRecord<TValue>[] => {
  const runtimeKinds =
    query?.runtime_kind === undefined ? undefined : Array.isArray(query.runtime_kind) ? query.runtime_kind : [query.runtime_kind];
  const keySet = query?.keys ? new Set(query.keys) : undefined;

  return records.filter((record) => {
    if (query?.key !== undefined && record.key !== query.key) {
      return false;
    }
    if (keySet && !keySet.has(record.key)) {
      return false;
    }
    if (query?.key_prefix !== undefined && !record.key.startsWith(query.key_prefix)) {
      return false;
    }
    if (runtimeKinds && !runtimeKinds.includes(record.runtime_kind)) {
      return false;
    }
    if (query?.min_version !== undefined && record.version < query.min_version) {
      return false;
    }
    if (query?.max_version !== undefined && record.version > query.max_version) {
      return false;
    }
    if (query?.created_from !== undefined && record.created_at < query.created_from) {
      return false;
    }
    if (query?.created_to !== undefined && record.created_at > query.created_to) {
      return false;
    }
    if (query?.updated_from !== undefined && record.updated_at < query.updated_from) {
      return false;
    }
    if (query?.updated_to !== undefined && record.updated_at > query.updated_to) {
      return false;
    }

    return true;
  });
};

const toQueryResult = <TValue extends ContextRuntimeValue>(
  runtime: ContextRuntime,
  query: ContextQuery | undefined,
  records: readonly InternalStoreRecord<TValue>[],
): ContextQueryResult<TValue> => {
  const orderBy = normalizeOrder(query);
  const total = records.length;
  const limit = query?.limit ?? defaultLimit;
  const offset = query?.offset ?? 0;
  const items = records
    .slice()
    .sort((left, right) => compareRecords(left, right, orderBy))
    .slice(offset, offset + limit)
    .map((record) => materializeRecord(runtime, record));

  return freeze({
    items,
    total,
    limit,
    offset,
    has_more: offset + items.length < total,
    ...(offset + items.length < total ? { next_offset: offset + items.length } : {}),
    order_by: orderBy,
    query: freeze({ ...(query ?? {}) }),
  });
};

const toSnapshot = <TValue extends ContextRuntimeValue>(
  runtime: ContextRuntime,
  revision: number,
  capturedAt: string,
  query: ContextQuery | undefined,
  records: readonly InternalStoreRecord<TValue>[],
): ContextStoreSnapshot<TValue> => {
  const result = toQueryResult(runtime, { ...query, limit: records.length, offset: 0 }, records);
  return freeze({
    captured_at: capturedAt,
    revision,
    total: result.total,
    query: freeze({ ...(query ?? {}) }),
    items: result.items,
  });
};

const writeCreate = <TValue extends ContextRuntimeValue>(
  state: StoreState,
  runtime: ContextRuntime,
  now: () => string,
  key: string,
  value: TValue,
  options: ContextStoreWriteOptions,
): ContextStoreResult<ContextStoreRecord<TValue>> => {
  if (!notBlank(key)) {
    return failure('create', createStoreError('context-store.invalid-query', 'Context store key must not be blank.', { operation: 'create', key }));
  }

  if (options.expected_version !== undefined && options.expected_version !== 0) {
    return failure(
      'create',
      createStoreError('context-store.version-conflict', 'Create expected_version must be 0 when provided.', {
        operation: 'create',
        key,
        expected_version: options.expected_version,
        actual_version: 0,
      }),
    );
  }

  if (state.records.has(key)) {
    return failure('create', createStoreError('context-store.duplicate-key', `Context store key already exists: ${key}`, { operation: 'create', key }));
  }

  const timestamp = now();
  state.revision += 1;
  const record: InternalStoreRecord<TValue> = {
    key,
    runtime_kind: value.runtime_kind,
    version: 1,
    created_at: timestamp,
    updated_at: timestamp,
    value: runtime.clone(value),
  };
  state.records.set(key, structuredClone(record));
  return success('create', materializeRecord(runtime, record));
};

const writeUpdate = <TValue extends ContextRuntimeValue>(
  state: StoreState,
  runtime: ContextRuntime,
  now: () => string,
  key: string,
  value: TValue,
  options: ContextStoreWriteOptions,
): ContextStoreResult<ContextStoreRecord<TValue>> => {
  const existing = state.records.get(key) as InternalStoreRecord<TValue> | undefined;
  if (!existing) {
    return failure('update', createStoreError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'update', key }));
  }

  if (options.expected_version !== undefined && options.expected_version !== existing.version) {
    return failure(
      'update',
      createStoreError('context-store.version-conflict', `Expected version ${options.expected_version} but found ${existing.version} for key: ${key}`, {
        operation: 'update',
        key,
        expected_version: options.expected_version,
        actual_version: existing.version,
      }),
    );
  }

  const record: InternalStoreRecord<TValue> = {
    key,
    runtime_kind: value.runtime_kind,
    version: existing.version + 1,
    created_at: existing.created_at,
    updated_at: now(),
    value: runtime.clone(value),
  };
  state.revision += 1;
  state.records.set(key, structuredClone(record));
  return success('update', materializeRecord(runtime, record));
};

const writeDelete = (
  state: StoreState,
  runtime: ContextRuntime,
  key: string,
  options: ContextStoreDeleteOptions,
): ContextStoreResult<ContextStoreRecord> => {
  const existing = state.records.get(key);
  if (!existing) {
    return failure('delete', createStoreError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'delete', key }));
  }

  if (options.expected_version !== undefined && options.expected_version !== existing.version) {
    return failure(
      'delete',
      createStoreError('context-store.version-conflict', `Expected version ${options.expected_version} but found ${existing.version} for key: ${key}`, {
        operation: 'delete',
        key,
        expected_version: options.expected_version,
        actual_version: existing.version,
      }),
    );
  }

  state.revision += 1;
  state.records.delete(key);
  return success('delete', materializeRecord(runtime, existing));
};

const mapStoreCommit = (value: ContextStoreCommitResult): ContextPersistenceCommitResult =>
  freeze({
    transaction_id: value.transaction_id,
    state: 'committed',
    revision: value.revision,
  });

const mapStoreRollback = (value: { transaction_id: string; state: 'rolled-back' }): ContextPersistenceRollbackResult =>
  freeze({
    transaction_id: value.transaction_id,
    state: 'rolled-back',
  });

class FilesystemContextStore implements ContextStore {
  readonly #provider: FilesystemPersistenceProviderImpl;

  constructor(provider: FilesystemPersistenceProviderImpl) {
    this.#provider = provider;
  }

  get runtime(): ContextRuntime {
    return this.#provider.runtime;
  }

  async create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const candidate = cloneState(this.#provider.currentState);
    const result = writeCreate(candidate, this.runtime, this.#provider.now, key, value, options);
    if (!result.ok) {
      return result;
    }

    try {
      await this.#provider.persistState(candidate);
      this.#provider.replaceCurrentState(candidate);
      return result;
    } catch (error) {
      return failure('create', createStoreError('context-store.io-failure', String((error as Error).message), { operation: 'create', key }));
    }
  }

  async update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const candidate = cloneState(this.#provider.currentState);
    const result = writeUpdate(candidate, this.runtime, this.#provider.now, key, value, options);
    if (!result.ok) {
      return result;
    }

    try {
      await this.#provider.persistState(candidate);
      this.#provider.replaceCurrentState(candidate);
      return result;
    } catch (error) {
      return failure('update', createStoreError('context-store.io-failure', String((error as Error).message), { operation: 'update', key }));
    }
  }

  async delete(key: string, options: ContextStoreDeleteOptions = {}): Promise<ContextStoreResult<ContextStoreRecord>> {
    const candidate = cloneState(this.#provider.currentState);
    const result = writeDelete(candidate, this.runtime, key, options);
    if (!result.ok) {
      return result;
    }

    try {
      await this.#provider.persistState(candidate);
      this.#provider.replaceCurrentState(candidate);
      return result;
    } catch (error) {
      return failure('delete', createStoreError('context-store.io-failure', String((error as Error).message), { operation: 'delete', key }));
    }
  }

  async retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(key: string): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const existing = this.#provider.currentState.records.get(key) as InternalStoreRecord<TValue> | undefined;
    if (!existing) {
      return failure('retrieve', createStoreError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'retrieve', key }));
    }

    return success('retrieve', materializeRecord(this.runtime, existing));
  }

  async exists(key: string): Promise<ContextStoreResult<ContextStoreExistsResult>> {
    const existing = this.#provider.currentState.records.get(key);
    return success(
      'exists',
      freeze({
        key,
        exists: existing !== undefined,
        ...(existing ? { version: existing.version } : {}),
      }),
    );
  }

  async query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query: ContextQuery = {}): Promise<ContextStoreResult<ContextQueryResult<TValue>>> {
    const validation = validateQuery(query);
    if (validation) {
      return failure('query', validation);
    }

    const records = filterRecords([...this.#provider.currentState.records.values()] as InternalStoreRecord<TValue>[], query);
    return success('query', toQueryResult(this.runtime, query, records));
  }

  async snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query: ContextQuery = {},
  ): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> {
    const validation = validateQuery(query);
    if (validation) {
      return failure('snapshot', createStoreError(validation.code, validation.message, { operation: 'snapshot' }));
    }

    const records = filterRecords([...this.#provider.currentState.records.values()] as InternalStoreRecord<TValue>[], query)
      .slice()
      .sort((left, right) => compareRecords(left, right, normalizeOrder(query)));
    return success('snapshot', toSnapshot(this.runtime, this.#provider.currentState.revision, this.#provider.now(), query, records));
  }

  async beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>> {
    const transaction = new FilesystemContextStoreTransaction(this.#provider);
    return success('begin-transaction', transaction);
  }
}

class FilesystemContextStoreTransaction implements ContextStoreTransaction {
  readonly #provider: FilesystemPersistenceProviderImpl;
  readonly #baseRecords: Map<string, InternalStoreRecord>;
  readonly #workingRecords: Map<string, InternalStoreRecord>;
  readonly #touched = new Set<string>();
  readonly #id: string;
  #state: ContextStoreTransactionState = 'active';
  #revision: number;

  constructor(provider: FilesystemPersistenceProviderImpl) {
    this.#provider = provider;
    this.#baseRecords = cloneMap(provider.currentState.records);
    this.#workingRecords = cloneMap(provider.currentState.records);
    this.#revision = provider.currentState.revision;
    this.#id = `ctx-fs-tx-${provider.currentState.revision + 1}`;
  }

  get runtime(): ContextRuntime {
    return this.#provider.runtime;
  }

  get id(): string {
    return this.#id;
  }

  get state(): ContextStoreTransactionState {
    return this.#state;
  }

  #assertActive(operation: ContextStoreFailure['operation']): ContextStoreFailure | undefined {
    if (this.#state === 'active') {
      return undefined;
    }

    return failure(
      operation,
      createStoreError('context-store.transaction-closed', `Transaction ${this.#id} is ${this.#state}.`, {
        operation,
      }),
    );
  }

  async create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const closed = this.#assertActive('create');
    if (closed) {
      return closed;
    }

    const result = writeCreate({ records: this.#workingRecords, revision: this.#revision }, this.runtime, this.#provider.now, key, value, options);
    if (result.ok) {
      this.#revision = Math.max(this.#revision, result.value.version);
      this.#touched.add(key);
    }
    return result;
  }

  async update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const closed = this.#assertActive('update');
    if (closed) {
      return closed;
    }

    const result = writeUpdate({ records: this.#workingRecords, revision: this.#revision }, this.runtime, this.#provider.now, key, value, options);
    if (result.ok) {
      this.#revision = Math.max(this.#revision, result.value.version);
      this.#touched.add(key);
    }
    return result;
  }

  async delete(key: string, options: ContextStoreDeleteOptions = {}): Promise<ContextStoreResult<ContextStoreRecord>> {
    const closed = this.#assertActive('delete');
    if (closed) {
      return closed;
    }

    const result = writeDelete({ records: this.#workingRecords, revision: this.#revision }, this.runtime, key, options);
    if (result.ok) {
      this.#revision = Math.max(this.#revision, result.value.version);
      this.#touched.add(key);
    }
    return result;
  }

  async retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(key: string): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const closed = this.#assertActive('retrieve');
    if (closed) {
      return closed;
    }

    const existing = this.#workingRecords.get(key) as InternalStoreRecord<TValue> | undefined;
    if (!existing) {
      return failure('retrieve', createStoreError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'retrieve', key }));
    }

    return success('retrieve', materializeRecord(this.runtime, existing));
  }

  async exists(key: string): Promise<ContextStoreResult<ContextStoreExistsResult>> {
    const closed = this.#assertActive('exists');
    if (closed) {
      return closed;
    }

    const existing = this.#workingRecords.get(key);
    return success(
      'exists',
      freeze({
        key,
        exists: existing !== undefined,
        ...(existing ? { version: existing.version } : {}),
      }),
    );
  }

  async query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query: ContextQuery = {}): Promise<ContextStoreResult<ContextQueryResult<TValue>>> {
    const closed = this.#assertActive('query');
    if (closed) {
      return closed;
    }

    const validation = validateQuery(query);
    if (validation) {
      return failure('query', validation);
    }

    const records = filterRecords([...this.#workingRecords.values()] as InternalStoreRecord<TValue>[], query);
    return success('query', toQueryResult(this.runtime, query, records));
  }

  async snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query: ContextQuery = {},
  ): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> {
    const closed = this.#assertActive('snapshot');
    if (closed) {
      return closed;
    }

    const validation = validateQuery(query);
    if (validation) {
      return failure('snapshot', createStoreError(validation.code, validation.message, { operation: 'snapshot' }));
    }

    const records = filterRecords([...this.#workingRecords.values()] as InternalStoreRecord<TValue>[], query)
      .slice()
      .sort((left, right) => compareRecords(left, right, normalizeOrder(query)));
    return success('snapshot', toSnapshot(this.runtime, this.#revision, this.#provider.now(), query, records));
  }

  async beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>> {
    const closed = this.#assertActive('begin-transaction');
    if (closed) {
      return closed;
    }

    return failure(
      'begin-transaction',
      createStoreError('context-store.transaction-closed', 'Nested transactions are not supported by the filesystem provider.', {
        operation: 'begin-transaction',
      }),
    );
  }

  async commit(): Promise<ContextStoreResult<ContextStoreCommitResult>> {
    const closed = this.#assertActive('commit');
    if (closed) {
      return closed;
    }

    for (const key of this.#touched) {
      const base = this.#baseRecords.get(key);
      const current = this.#provider.currentState.records.get(key);
      const baseVersion = base?.version;
      const currentVersion = current?.version;
      if (baseVersion !== currentVersion) {
        return failure(
          'commit',
          createStoreError('context-store.version-conflict', `Transaction ${this.#id} detected a version conflict for key: ${key}`, {
            operation: 'commit',
            key,
            expected_version: baseVersion,
            actual_version: currentVersion,
          }),
        );
      }
    }

    const candidate: StoreState = {
      records: cloneMap(this.#workingRecords),
      revision: this.#revision,
    };

    return this.#provider.persistTransactionCommit(this.#id, candidate).then((persisted) => {
      if (!persisted.ok) {
        return persisted;
      }

      this.#state = 'committed';
      return success(
        'commit',
        freeze({
          transaction_id: this.#id,
          state: 'committed',
          revision: candidate.revision,
        }),
      );
    });
  }

  async rollback(): Promise<ContextStoreResult<{ transaction_id: string; state: 'rolled-back' }>> {
    if (this.#state === 'rolled-back') {
      return failure(
        'rollback',
        createStoreError('context-store.transaction-closed', `Transaction ${this.#id} is rolled-back.`, {
          operation: 'rollback',
        }),
      );
    }

    if (this.#state === 'committed') {
      return failure(
        'rollback',
        createStoreError('context-store.transaction-closed', `Transaction ${this.#id} is committed.`, {
          operation: 'rollback',
        }),
      );
    }

    this.#state = 'rolled-back';
    return success(
      'rollback',
      freeze({
        transaction_id: this.#id,
        state: 'rolled-back',
      }),
    );
  }
}

class FilesystemPersistenceProviderImpl implements ContextPersistenceProvider {
  readonly #runtime: ContextRuntime;
  readonly #now: () => string;
  readonly #registration: ContextPersistenceRegistration;
  readonly #capabilities = filesystemPersistenceCapabilities();
  readonly #storage: FilesystemPersistenceStorageDescriptor;
  readonly #store: FilesystemContextStore;
  readonly #sessions = new Set<FilesystemPersistenceSession>();
  readonly #transactions = new Set<FilesystemPersistenceTransaction>();
  #connected = false;
  #state: StoreState = { records: new Map<string, InternalStoreRecord>(), revision: 0 };
  #sessionSequence = 0;

  constructor(options: FilesystemPersistenceProviderOptions) {
    const fileName = options.file_name ?? defaultFileName;
    this.#runtime = options.runtime;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#registration = freeze({
      provider_id: 'context-provider-filesystem.local-json',
      provider_name: 'filesystem',
      provider_version: providerVersion,
      provider_kind: 'filesystem',
    });
    this.#storage = freeze({
      directory: path.resolve(options.directory),
      file_path: path.resolve(options.directory, fileName),
      file_name: fileName,
    });
    this.#store = new FilesystemContextStore(this);
  }

  get runtime(): ContextRuntime {
    return this.#runtime;
  }

  get registration(): ContextPersistenceRegistration {
    return this.#registration;
  }

  get currentState(): StoreState {
    return this.#state;
  }

  get now(): () => string {
    return this.#now;
  }

  get storage(): FilesystemPersistenceStorageDescriptor {
    return this.#storage;
  }

  replaceCurrentState(state: StoreState): void {
    this.#state = state;
  }

  #tempPath(): string {
    return `${this.#storage.file_path}.tmp`;
  }

  #backupPath(): string {
    return `${this.#storage.file_path}.bak`;
  }

  #error(operation: ContextPersistenceOperation, code: ContextPersistenceError['code'], message: string, extra: Partial<{
    session_id: string;
    transaction_id: string;
    key: string;
    expected_version: number;
    actual_version: number;
  }> = {}): ContextPersistenceError {
    return createPersistenceError(code, message, {
      operation,
      provider_id: this.#registration.provider_id,
      ...(extra.session_id ? { session_id: extra.session_id } : {}),
      ...(extra.transaction_id ? { transaction_id: extra.transaction_id } : {}),
      ...(extra.key ? { key: extra.key } : {}),
      ...(extra.expected_version !== undefined ? { expected_version: extra.expected_version } : {}),
      ...(extra.actual_version !== undefined ? { actual_version: extra.actual_version } : {}),
    });
  }

  async #pathStat(target: string) {
    try {
      return await fs.stat(target);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return undefined;
      }
      throw error;
    }
  }

  async #ensureDirectory(): Promise<void> {
    try {
      const existing = await this.#pathStat(this.#storage.directory);
      if (existing && !existing.isDirectory()) {
        throw this.#error('connect', 'context-persistence.io-failure', `Filesystem provider directory is not a directory: ${this.#storage.directory}`);
      }

      await fs.mkdir(this.#storage.directory, { recursive: true });
    } catch (error) {
      if (error instanceof ContextPersistenceError) {
        throw error;
      }

      throw this.#error('connect', 'context-persistence.io-failure', `Failed to initialize filesystem provider directory: ${String((error as Error).message)}`);
    }
  }

  async #recoverWriteArtifacts(): Promise<void> {
    const fileExists = (await this.#pathStat(this.#storage.file_path))?.isFile() ?? false;
    const backupExists = (await this.#pathStat(this.#backupPath()))?.isFile() ?? false;
    const tempExists = (await this.#pathStat(this.#tempPath()))?.isFile() ?? false;

    if (!fileExists && backupExists) {
      await fs.rename(this.#backupPath(), this.#storage.file_path);
    } else if (backupExists) {
      await fs.rm(this.#backupPath(), { force: true });
    }

    if (tempExists) {
      await fs.rm(this.#tempPath(), { force: true });
    }
  }

  #serializeState(state: StoreState): string {
    const payload: PersistedState = {
      format: storageFormatVersion,
      revision: state.revision,
      records: [...state.records.values()]
        .sort((left, right) => left.key.localeCompare(right.key))
        .map((record) => ({
          key: record.key,
          runtime_kind: record.runtime_kind,
          version: record.version,
          created_at: record.created_at,
          updated_at: record.updated_at,
          value: this.#runtime.serialize(record.value),
        })),
    };

    return `${JSON.stringify(payload, null, 2)}\n`;
  }

  #parsePersistedState(raw: string): StoreState {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', `Filesystem persistence JSON is malformed: ${String((error as Error).message)}`);
    }

    if (!isRecord(parsed)) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', 'Filesystem persistence state does not match the canonical storage envelope.');
    }

    const revisionValue = parsed.revision;
    const recordsInput = parsed.records;
    if (
      parsed.format !== storageFormatVersion ||
      typeof revisionValue !== 'number' ||
      !Number.isInteger(revisionValue) ||
      revisionValue < 0 ||
      !Array.isArray(recordsInput)
    ) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', 'Filesystem persistence state does not match the canonical storage envelope.');
    }
    const revision = revisionValue;

    const persisted = {
      format: parsed.format,
      revision,
      records: recordsInput,
    } as unknown as PersistedState;

    const records = new Map<string, InternalStoreRecord>();
    for (const item of persisted.records) {
      if (
        !isRecord(item) ||
        !notBlank(item.key) ||
        !notBlank(item.runtime_kind) ||
        !Number.isInteger(item.version) ||
        item.version < 1 ||
        !notBlank(item.created_at) ||
        !notBlank(item.updated_at) ||
        !notBlank(item.value)
      ) {
        throw this.#error('connect', 'context-persistence.storage-corrupted', 'Filesystem persistence contains an invalid record envelope.');
      }

      if (!isIsoTimestamp(item.created_at) || !isIsoTimestamp(item.updated_at)) {
        throw this.#error('connect', 'context-persistence.storage-corrupted', 'Filesystem persistence contains non-canonical timestamps.');
      }

      if (records.has(item.key)) {
        throw this.#error('connect', 'context-persistence.storage-corrupted', `Filesystem persistence contains a duplicate key: ${item.key}`);
      }

      let value: ContextRuntimeValue;
      try {
        value = this.#runtime.deserialize(item.value);
      } catch (error) {
        throw this.#error('connect', 'context-persistence.storage-corrupted', `Filesystem persistence record could not be deserialized for key ${item.key}: ${String((error as Error).message)}`);
      }

      if (value.runtime_kind !== item.runtime_kind) {
        throw this.#error('connect', 'context-persistence.storage-corrupted', `Filesystem persistence runtime_kind mismatch for key: ${item.key}`);
      }

      records.set(
        item.key,
        structuredClone({
          key: item.key,
          runtime_kind: value.runtime_kind,
          version: item.version as number,
          created_at: item.created_at,
          updated_at: item.updated_at,
          value: this.#runtime.clone(value),
        } satisfies InternalStoreRecord),
      );
    }

    return {
      revision: persisted.revision,
      records,
    };
  }

  async #loadState(): Promise<StoreState> {
    const file = await this.#pathStat(this.#storage.file_path);
    if (!file) {
      return { records: new Map<string, InternalStoreRecord>(), revision: 0 };
    }

    if (!file.isFile()) {
      throw this.#error('connect', 'context-persistence.io-failure', `Filesystem persistence target is not a file: ${this.#storage.file_path}`);
    }

    try {
      const raw = await fs.readFile(this.#storage.file_path, 'utf8');
      return this.#parsePersistedState(raw);
    } catch (error) {
      if (error instanceof ContextPersistenceError) {
        throw error;
      }

      throw this.#error('connect', 'context-persistence.io-failure', `Failed to read filesystem persistence state: ${String((error as Error).message)}`);
    }
  }

  async persistState(state: StoreState, operation: 'connect' | 'disconnect' | 'commit' = 'disconnect'): Promise<void> {
    const tempPath = this.#tempPath();
    const backupPath = this.#backupPath();
    const payload = this.#serializeState(state);

    try {
      await fs.writeFile(tempPath, payload, 'utf8');
      const targetExists = await this.#pathStat(this.#storage.file_path);

      if (targetExists) {
        await fs.rm(backupPath, { force: true });
        await fs.rename(this.#storage.file_path, backupPath);
      }

      try {
        await fs.rename(tempPath, this.#storage.file_path);
      } catch (error) {
        if (targetExists) {
          const backupStillExists = await this.#pathStat(backupPath);
          const mainExists = await this.#pathStat(this.#storage.file_path);
          if (backupStillExists && !mainExists) {
            await fs.rename(backupPath, this.#storage.file_path);
          }
        }
        throw error;
      }

      await fs.rm(backupPath, { force: true });
    } catch (error) {
      try {
        await fs.rm(tempPath, { force: true });
      } catch {
        // best effort cleanup only
      }

      if (error instanceof ContextPersistenceError) {
        throw error;
      }

      throw this.#error(operation, 'context-persistence.io-failure', `Failed to flush filesystem persistence state: ${String((error as Error).message)}`);
    }
  }

  async persistTransactionCommit(transactionId: string, candidate: StoreState): Promise<ContextStoreResult<ContextStoreCommitResult>> {
    try {
      await this.persistState(candidate, 'commit');
      this.replaceCurrentState(candidate);
      return success(
        'commit',
        freeze({
          transaction_id: transactionId,
          state: 'committed',
          revision: candidate.revision,
        }),
      );
    } catch (error) {
      return failure(
        'commit',
        createStoreError('context-store.io-failure', String((error as Error).message), {
          operation: 'commit',
        }),
      );
    }
  }

  registerSession(session: FilesystemPersistenceSession): void {
    this.#sessions.add(session);
  }

  unregisterSession(session: FilesystemPersistenceSession): void {
    this.#sessions.delete(session);
  }

  registerTransaction(transaction: FilesystemPersistenceTransaction): void {
    this.#transactions.add(transaction);
  }

  unregisterTransaction(transaction: FilesystemPersistenceTransaction): void {
    this.#transactions.delete(transaction);
  }

  nextSessionId(): string {
    this.#sessionSequence += 1;
    return `ctx-fs-session-${this.#sessionSequence}`;
  }

  get state(): 'disconnected' | 'connected' {
    return this.#connected ? 'connected' : 'disconnected';
  }

  async connect(): Promise<ContextPersistenceResult<ContextPersistenceConnectResult>> {
    if (this.#connected) {
      return persistenceFailure(
        'connect',
        this.#error('connect', 'context-persistence.already-connected', 'Persistence provider is already connected.'),
      );
    }

    try {
      await this.#ensureDirectory();
      await this.#recoverWriteArtifacts();
      const loaded = await this.#loadState();
      await this.persistState(loaded, 'connect');
      this.replaceCurrentState(loaded);
      this.#connected = true;
      return persistenceSuccess(
        'connect',
        freeze({
          provider: this.#registration,
          state: 'connected',
        }),
      );
    } catch (error) {
      return persistenceFailure(
        'connect',
        error instanceof ContextPersistenceError
          ? error
          : this.#error('connect', 'context-persistence.io-failure', String((error as Error).message)),
      );
    }
  }

  async disconnect(): Promise<ContextPersistenceResult<ContextPersistenceDisconnectResult>> {
    if (!this.#connected) {
      return persistenceFailure(
        'disconnect',
        this.#error('disconnect', 'context-persistence.not-connected', 'Persistence provider is not connected.'),
      );
    }

    try {
      await this.persistState(this.#state, 'disconnect');
    } catch (error) {
      return persistenceFailure(
        'disconnect',
        error instanceof ContextPersistenceError
          ? error
          : this.#error('disconnect', 'context-persistence.io-failure', String((error as Error).message)),
      );
    }

    for (const transaction of this.#transactions) {
      transaction.forceClose();
    }
    for (const session of this.#sessions) {
      session.forceClose();
    }
    this.#transactions.clear();
    this.#sessions.clear();
    this.#connected = false;

    return persistenceSuccess(
      'disconnect',
      freeze({
        provider: this.#registration,
        state: 'disconnected',
      }),
    );
  }

  async beginSession(): Promise<ContextPersistenceResult<ContextPersistenceSession>> {
    if (!this.#connected) {
      return persistenceFailure(
        'begin-session',
        this.#error('begin-session', 'context-persistence.not-connected', 'Persistence provider is not connected.'),
      );
    }

    const session = new FilesystemPersistenceSession(this, this.#registration, this.nextSessionId(), this.#store);
    this.registerSession(session);
    return persistenceSuccess('begin-session', session);
  }

  async beginTransaction(): Promise<ContextPersistenceResult<ContextPersistenceTransaction>> {
    const session = await this.beginSession();
    if (!session.ok) {
      return session;
    }

    return session.value.beginTransaction();
  }

  async capabilities(): Promise<ContextPersistenceResult<ContextPersistenceCapabilities>> {
    return persistenceSuccess('capabilities', this.#capabilities);
  }

  async health(): Promise<ContextPersistenceResult<ContextPersistenceHealth>> {
    const health: FilesystemPersistenceProviderHealth = freeze({
      status: this.#connected ? 'healthy' : 'disconnected',
      healthy: this.#connected,
      connected: this.#connected,
      provider: this.#registration as FilesystemPersistenceProviderHealth['provider'],
      capabilities: this.#capabilities,
      issues: this.#connected ? [] : ['Provider is disconnected.'],
      storage: this.#storage,
    });

    return persistenceSuccess('health', health);
  }
}

class FilesystemPersistenceSession implements ContextPersistenceSession {
  readonly #providerRef: FilesystemPersistenceProviderImpl;
  readonly #registration: ContextPersistenceRegistration;
  readonly #store: ContextStore;
  readonly #id: string;
  #state: 'active' | 'closed' = 'active';

  constructor(provider: FilesystemPersistenceProviderImpl, registration: ContextPersistenceRegistration, id: string, store: ContextStore) {
    this.#providerRef = provider;
    this.#registration = registration;
    this.#id = id;
    this.#store = store;
  }

  get id(): string {
    return this.#id;
  }

  get state() {
    return this.#state;
  }

  get provider(): ContextPersistenceRegistration {
    return this.#registration;
  }

  get store(): ContextStore {
    return this.#store;
  }

  forceClose(): void {
    this.#state = 'closed';
  }

  #ensureActive(operation: ContextPersistenceOperation): ContextPersistenceFailure | undefined {
    if (this.#state === 'active') {
      return undefined;
    }

    return persistenceFailure(
      operation,
      createPersistenceError('context-persistence.session-closed', `Persistence session ${this.#id} is closed.`, {
        operation,
        provider_id: this.#registration.provider_id,
        session_id: this.#id,
      }),
    );
  }

  async beginTransaction(): Promise<ContextPersistenceResult<ContextPersistenceTransaction>> {
    const closed = this.#ensureActive('begin-transaction');
    if (closed) {
      return closed;
    }

    const transaction = new FilesystemPersistenceTransaction(this.#providerRef, this.#registration, this.#id);
    this.#providerRef.registerTransaction(transaction);
    return persistenceSuccess('begin-transaction', transaction);
  }

  async close(): Promise<ContextPersistenceResult<ContextPersistenceSessionCloseResult>> {
    const closed = this.#ensureActive('close-session');
    if (closed) {
      return closed;
    }

    this.#state = 'closed';
    this.#providerRef.unregisterSession(this);
    return persistenceSuccess(
      'close-session',
      freeze({
        session_id: this.#id,
        state: 'closed',
      }),
    );
  }
}

class FilesystemPersistenceTransaction implements ContextPersistenceTransaction {
  readonly #providerRef: FilesystemPersistenceProviderImpl;
  readonly #registration: ContextPersistenceRegistration;
  readonly #sessionId: string;
  readonly #store: ContextStoreTransaction;
  #state: ContextPersistenceTransactionState = 'active';

  constructor(provider: FilesystemPersistenceProviderImpl, registration: ContextPersistenceRegistration, sessionId: string) {
    this.#providerRef = provider;
    this.#registration = registration;
    this.#sessionId = sessionId;
    this.#store = new FilesystemContextStoreTransaction(provider);
  }

  get id(): string {
    return this.#store.id;
  }

  get session_id(): string {
    return this.#sessionId;
  }

  get state(): ContextPersistenceTransactionState {
    return this.#state;
  }

  get provider(): ContextPersistenceRegistration {
    return this.#registration;
  }

  get store(): ContextStoreTransaction {
    return this.#store;
  }

  forceClose(): void {
    if (this.#state === 'active') {
      this.#state = 'closed';
    }
  }

  #ensureActive(operation: ContextPersistenceOperation): ContextPersistenceFailure | undefined {
    if (this.#state === 'active') {
      return undefined;
    }

    return persistenceFailure(
      operation,
      createPersistenceError('context-persistence.transaction-closed', `Persistence transaction ${this.id} is ${this.#state}.`, {
        operation,
        provider_id: this.#registration.provider_id,
        session_id: this.#sessionId,
        transaction_id: this.id,
      }),
    );
  }

  async commit(): Promise<ContextPersistenceResult<ContextPersistenceCommitResult>> {
    const closed = this.#ensureActive('commit');
    if (closed) {
      return closed;
    }

    const committed = await this.#store.commit();
    if (!committed.ok) {
      if (committed.error.code === 'context-store.version-conflict') {
        return persistenceFailure(
          'commit',
          createPersistenceError('context-persistence.version-conflict', committed.error.message, {
            operation: 'commit',
            provider_id: this.#registration.provider_id,
            session_id: this.#sessionId,
            transaction_id: this.id,
            key: committed.error.key,
            expected_version: committed.error.expected_version,
            actual_version: committed.error.actual_version,
          }),
        );
      }

      return persistenceFailure(
        'commit',
        createPersistenceError('context-persistence.io-failure', committed.error.message, {
          operation: 'commit',
          provider_id: this.#registration.provider_id,
          session_id: this.#sessionId,
          transaction_id: this.id,
          key: committed.error.key,
          expected_version: committed.error.expected_version,
          actual_version: committed.error.actual_version,
        }),
      );
    }

    this.#state = 'committed';
    this.#providerRef.unregisterTransaction(this);
    return persistenceSuccess('commit', mapStoreCommit(committed.value));
  }

  async rollback(): Promise<ContextPersistenceResult<ContextPersistenceRollbackResult>> {
    const closed = this.#ensureActive('rollback');
    if (closed) {
      return closed;
    }

    const rolledBack = await this.#store.rollback();
    if (!rolledBack.ok) {
      return persistenceFailure(
        'rollback',
        createPersistenceError('context-persistence.transaction-closed', rolledBack.error.message, {
          operation: 'rollback',
          provider_id: this.#registration.provider_id,
          session_id: this.#sessionId,
          transaction_id: this.id,
        }),
      );
    }

    this.#state = 'rolled-back';
    this.#providerRef.unregisterTransaction(this);
    return persistenceSuccess('rollback', mapStoreRollback(rolledBack.value));
  }
}

export const createFilesystemPersistenceProvider = (options: FilesystemPersistenceProviderOptions): ContextPersistenceProvider =>
  new FilesystemPersistenceProviderImpl(options);

export const createFilesystemPersistenceProviderFromPath = (
  directory: string,
  options: FilesystemPersistenceProviderFromPathOptions,
): ContextPersistenceProvider =>
  createFilesystemPersistenceProvider({
    ...options,
    directory,
  });

export { filesystemPersistenceCapabilities };
