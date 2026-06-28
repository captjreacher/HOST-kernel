import type { ContextRuntime, ContextRuntimeValue } from '@host/context-runtime';
import {
  type ContextQuery,
  type ContextQueryOrder,
  type ContextStore,
  type ContextStoreCommitResult,
  type ContextStoreDeleteOptions,
  ContextStoreError,
  type ContextStoreExistsResult,
  type ContextStoreFailure,
  type ContextStoreOptions,
  type ContextStoreRecord,
  type ContextStoreResult,
  type ContextStoreSnapshot,
  type ContextStoreSuccess,
  type ContextStoreTransaction,
  type ContextStoreTransactionState,
  type ContextStoreWriteOptions,
  type ContextQueryResult,
} from './contracts.js';

interface InternalStoreRecord<TValue extends ContextRuntimeValue = ContextRuntimeValue> extends ContextStoreRecord<TValue> {}

interface StoreState {
  records: Map<string, InternalStoreRecord>;
  revision: number;
}

const defaultLimit = 50;
const defaultOrder: readonly ContextQueryOrder[] = Object.freeze([{ field: 'key', direction: 'asc' }]);

const cloneMap = (records: Map<string, InternalStoreRecord>): Map<string, InternalStoreRecord> => {
  const next = new Map<string, InternalStoreRecord>();
  for (const [key, value] of records.entries()) {
    next.set(key, structuredClone(value));
  }
  return next;
};

const isIsoTimestamp = (value: string): boolean => {
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const notBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

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

const createError = (
  code: ContextStoreError['code'],
  message: string,
  options: ConstructorParameters<typeof ContextStoreError>[2],
): ContextStoreError => new ContextStoreError(code, message, options);

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
    return createError('context-store.invalid-query', 'Query limit must be a non-negative integer.', { operation: 'query' });
  }
  if (query.offset !== undefined && (!Number.isInteger(query.offset) || query.offset < 0)) {
    return createError('context-store.invalid-query', 'Query offset must be a non-negative integer.', { operation: 'query' });
  }
  if (query.min_version !== undefined && (!Number.isInteger(query.min_version) || query.min_version < 1)) {
    return createError('context-store.invalid-query', 'Query min_version must be a positive integer.', { operation: 'query' });
  }
  if (query.max_version !== undefined && (!Number.isInteger(query.max_version) || query.max_version < 1)) {
    return createError('context-store.invalid-query', 'Query max_version must be a positive integer.', { operation: 'query' });
  }
  if (query.min_version !== undefined && query.max_version !== undefined && query.min_version > query.max_version) {
    return createError('context-store.invalid-query', 'Query min_version must not exceed max_version.', { operation: 'query' });
  }

  for (const [field, value] of [
    ['created_from', query.created_from],
    ['created_to', query.created_to],
    ['updated_from', query.updated_from],
    ['updated_to', query.updated_to],
  ] as const) {
    if (value !== undefined && !isIsoTimestamp(value)) {
      return createError('context-store.invalid-query', `${field} must use canonical ISO formatting.`, { operation: 'query' });
    }
  }

  if (query.key !== undefined && !notBlank(query.key)) {
    return createError('context-store.invalid-query', 'Query key must not be blank.', { operation: 'query' });
  }
  if (query.key_prefix !== undefined && !notBlank(query.key_prefix)) {
    return createError('context-store.invalid-query', 'Query key_prefix must not be blank.', { operation: 'query' });
  }
  if (query.keys !== undefined && query.keys.some((entry) => !notBlank(entry))) {
    return createError('context-store.invalid-query', 'Query keys must not contain blank values.', { operation: 'query' });
  }

  return undefined;
};

const materializeRecord = <TValue extends ContextRuntimeValue>(
  runtime: ContextRuntime,
  record: InternalStoreRecord<TValue>,
): ContextStoreRecord<TValue> =>
  freeze({
    key: record.key,
    runtime_kind: record.runtime_kind,
    version: record.version,
    created_at: record.created_at,
    updated_at: record.updated_at,
    value: runtime.clone(record.value),
  });

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

class InMemoryContextStore implements ContextStore {
  readonly #runtime: ContextRuntime;
  readonly #now: () => string;
  readonly #state: StoreState;

  constructor(options: ContextStoreOptions) {
    this.#runtime = options.runtime;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#state = {
      records: new Map<string, InternalStoreRecord>(),
      revision: 0,
    };
  }

  get runtime(): ContextRuntime {
    return this.#runtime;
  }

  async create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return writeCreate(this.#state, this.#runtime, this.#now, key, value, options);
  }

  async update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return writeUpdate(this.#state, this.#runtime, this.#now, key, value, options);
  }

  async delete(key: string, options: ContextStoreDeleteOptions = {}): Promise<ContextStoreResult<ContextStoreRecord>> {
    return writeDelete(this.#state, this.#runtime, key, options);
  }

  async retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(key: string): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    const existing = this.#state.records.get(key) as InternalStoreRecord<TValue> | undefined;
    if (!existing) {
      return failure('retrieve', createError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'retrieve', key }));
    }

    return success('retrieve', materializeRecord(this.#runtime, existing));
  }

  async exists(key: string): Promise<ContextStoreResult<ContextStoreExistsResult>> {
    const existing = this.#state.records.get(key);
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

    const records = filterRecords([...this.#state.records.values()] as InternalStoreRecord<TValue>[], query);
    return success('query', toQueryResult(this.#runtime, query, records));
  }

  async snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query: ContextQuery = {}): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> {
    const validation = validateQuery(query);
    if (validation) {
      return failure('snapshot', createError(validation.code, validation.message, { ...validation, operation: 'snapshot' }));
    }

    const records = filterRecords([...this.#state.records.values()] as InternalStoreRecord<TValue>[], query)
      .slice()
      .sort((left, right) => compareRecords(left, right, normalizeOrder(query)));
    return success('snapshot', toSnapshot(this.#runtime, this.#state.revision, this.#now(), query, records));
  }

  async beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>> {
    const transaction = new InMemoryContextStoreTransaction(this.#state, this.#runtime, this.#now);
    return success('begin-transaction', transaction);
  }
}

class InMemoryContextStoreTransaction implements ContextStoreTransaction {
  readonly #parent: StoreState;
  readonly #runtime: ContextRuntime;
  readonly #now: () => string;
  readonly #baseRecords: Map<string, InternalStoreRecord>;
  readonly #workingRecords: Map<string, InternalStoreRecord>;
  readonly #touched = new Set<string>();
  readonly #id: string;
  #state: ContextStoreTransactionState = 'active';
  #revision: number;

  constructor(parent: StoreState, runtime: ContextRuntime, now: () => string) {
    this.#parent = parent;
    this.#runtime = runtime;
    this.#now = now;
    this.#baseRecords = cloneMap(parent.records);
    this.#workingRecords = cloneMap(parent.records);
    this.#revision = parent.revision;
    this.#id = `ctx-tx-${parent.revision + 1}`;
  }

  get runtime(): ContextRuntime {
    return this.#runtime;
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
      createError('context-store.transaction-closed', `Transaction ${this.#id} is ${this.#state}.`, {
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

    const result = await writeCreate({ records: this.#workingRecords, revision: this.#revision }, this.#runtime, this.#now, key, value, options);
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

    const result = await writeUpdate({ records: this.#workingRecords, revision: this.#revision }, this.#runtime, this.#now, key, value, options);
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

    const result = await writeDelete({ records: this.#workingRecords, revision: this.#revision }, this.#runtime, key, options);
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
      return failure('retrieve', createError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'retrieve', key }));
    }

    return success('retrieve', materializeRecord(this.#runtime, existing));
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
    return success('query', toQueryResult(this.#runtime, query, records));
  }

  async snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query: ContextQuery = {}): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> {
    const closed = this.#assertActive('snapshot');
    if (closed) {
      return closed;
    }

    const validation = validateQuery(query);
    if (validation) {
      return failure('snapshot', createError(validation.code, validation.message, { ...validation, operation: 'snapshot' }));
    }

    const records = filterRecords([...this.#workingRecords.values()] as InternalStoreRecord<TValue>[], query)
      .slice()
      .sort((left, right) => compareRecords(left, right, normalizeOrder(query)));
    return success('snapshot', toSnapshot(this.#runtime, this.#revision, this.#now(), query, records));
  }

  async beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>> {
    const closed = this.#assertActive('begin-transaction');
    if (closed) {
      return closed;
    }

    return failure(
      'begin-transaction',
      createError('context-store.transaction-closed', 'Nested transactions are not supported by the in-memory reference implementation.', {
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
      const current = this.#parent.records.get(key);
      const baseVersion = base?.version;
      const currentVersion = current?.version;
      if (baseVersion !== currentVersion) {
        return failure(
          'commit',
          createError('context-store.version-conflict', `Transaction ${this.#id} detected a version conflict for key: ${key}`, {
            operation: 'commit',
            key,
            expected_version: baseVersion,
            actual_version: currentVersion,
          }),
        );
      }
    }

    this.#parent.records = cloneMap(this.#workingRecords);
    this.#parent.revision = this.#revision;
    this.#state = 'committed';
    return success(
      'commit',
      freeze({
        transaction_id: this.#id,
        state: 'committed',
        revision: this.#parent.revision,
      }),
    );
  }

  async rollback(): Promise<ContextStoreResult<{ transaction_id: string; state: 'rolled-back' }>> {
    if (this.#state === 'rolled-back') {
      return failure(
        'rollback',
        createError('context-store.transaction-closed', `Transaction ${this.#id} is rolled-back.`, {
          operation: 'rollback',
        }),
      );
    }

    if (this.#state === 'committed') {
      return failure(
        'rollback',
        createError('context-store.transaction-closed', `Transaction ${this.#id} is committed.`, {
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

const writeCreate = async <TValue extends ContextRuntimeValue>(
  state: StoreState,
  runtime: ContextRuntime,
  now: () => string,
  key: string,
  value: TValue,
  options: ContextStoreWriteOptions,
): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> => {
  if (!notBlank(key)) {
    return failure('create', createError('context-store.invalid-query', 'Context store key must not be blank.', { operation: 'create', key }));
  }

  if (options.expected_version !== undefined && options.expected_version !== 0) {
    return failure(
      'create',
      createError('context-store.version-conflict', 'Create expected_version must be 0 when provided.', {
        operation: 'create',
        key,
        expected_version: options.expected_version,
        actual_version: 0,
      }),
    );
  }

  if (state.records.has(key)) {
    return failure('create', createError('context-store.duplicate-key', `Context store key already exists: ${key}`, { operation: 'create', key }));
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

const writeUpdate = async <TValue extends ContextRuntimeValue>(
  state: StoreState,
  runtime: ContextRuntime,
  now: () => string,
  key: string,
  value: TValue,
  options: ContextStoreWriteOptions,
): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> => {
  const existing = state.records.get(key) as InternalStoreRecord<TValue> | undefined;
  if (!existing) {
    return failure('update', createError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'update', key }));
  }

  if (options.expected_version !== undefined && options.expected_version !== existing.version) {
    return failure(
      'update',
      createError('context-store.version-conflict', `Expected version ${options.expected_version} but found ${existing.version} for key: ${key}`, {
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

const writeDelete = async (
  state: StoreState,
  runtime: ContextRuntime,
  key: string,
  options: ContextStoreDeleteOptions,
): Promise<ContextStoreResult<ContextStoreRecord>> => {
  const existing = state.records.get(key);
  if (!existing) {
    return failure('delete', createError('context-store.not-found', `Unknown context store key: ${key}`, { operation: 'delete', key }));
  }

  if (options.expected_version !== undefined && options.expected_version !== existing.version) {
    return failure(
      'delete',
      createError('context-store.version-conflict', `Expected version ${options.expected_version} but found ${existing.version} for key: ${key}`, {
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

export const createInMemoryContextStore = (options: ContextStoreOptions): ContextStore => new InMemoryContextStore(options);

export const createContextStore = (options: ContextStoreOptions): ContextStore => createInMemoryContextStore(options);

export const beginTransaction = (store: ContextStore): Promise<ContextStoreResult<ContextStoreTransaction>> => store.beginTransaction();

export const commit = (transaction: ContextStoreTransaction): Promise<ContextStoreResult<ContextStoreCommitResult>> => transaction.commit();

export const rollback = (transaction: ContextStoreTransaction): Promise<ContextStoreResult<{ transaction_id: string; state: 'rolled-back' }>> =>
  transaction.rollback();

export const query = <TValue extends ContextRuntimeValue = ContextRuntimeValue>(
  store: ContextStore,
  request: ContextQuery = {},
): Promise<ContextStoreResult<ContextQueryResult<TValue>>> => store.query<TValue>(request);

export const snapshot = <TValue extends ContextRuntimeValue = ContextRuntimeValue>(
  store: ContextStore,
  request: ContextQuery = {},
): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> => store.snapshot<TValue>(request);
