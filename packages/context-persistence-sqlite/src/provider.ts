import fs from 'node:fs/promises';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
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
  SQLitePersistenceCapabilities,
  SQLitePersistenceProviderFromPathOptions,
  SQLitePersistenceProviderHealth,
  SQLitePersistenceProviderOptions,
  SQLitePersistenceStorageDescriptor,
} from './contracts.js';

interface InternalStoreRecord<TValue extends ContextRuntimeValue = ContextRuntimeValue> extends ContextStoreRecord<TValue> {}

interface StoreState {
  records: Map<string, InternalStoreRecord>;
  revision: number;
}

interface SQLiteRow {
  readonly key: string;
  readonly runtime_kind: string;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly value: string;
}

const providerVersion = '1.0.0';
const schemaVersion = 1;
const defaultFileName = 'context-store.sqlite';
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

const sqlitePersistenceCapabilities = (): SQLitePersistenceCapabilities =>
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

const sqliteCodeOf = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object') {
    return undefined;
  }

  const candidate = error as { code?: unknown; errno?: unknown };
  if (typeof candidate.code === 'string') {
    return candidate.code;
  }
  if (typeof candidate.errno === 'string') {
    return candidate.errno;
  }
  return undefined;
};

const isSQLiteStorageCorruption = (error: unknown): boolean => {
  const code = sqliteCodeOf(error);
  const message = String((error as Error | undefined)?.message ?? '').toLowerCase();
  return code === 'SQLITE_CORRUPT' || code === 'SQLITE_NOTADB' || (code === 'ERR_SQLITE_ERROR' && message.includes('not a database'));
};

class SQLiteContextStore implements ContextStore {
  readonly #provider: SQLitePersistenceProviderImpl;

  constructor(provider: SQLitePersistenceProviderImpl) {
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
      this.#provider.persistState(candidate);
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
      this.#provider.persistState(candidate);
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
      this.#provider.persistState(candidate);
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
    const transaction = new SQLiteContextStoreTransaction(this.#provider);
    return success('begin-transaction', transaction);
  }
}

class SQLiteContextStoreTransaction implements ContextStoreTransaction {
  readonly #provider: SQLitePersistenceProviderImpl;
  readonly #baseRecords: Map<string, InternalStoreRecord>;
  readonly #workingRecords: Map<string, InternalStoreRecord>;
  readonly #touched = new Set<string>();
  readonly #id: string;
  #state: ContextStoreTransactionState = 'active';
  #revision: number;

  constructor(provider: SQLitePersistenceProviderImpl) {
    this.#provider = provider;
    this.#baseRecords = cloneMap(provider.currentState.records);
    this.#workingRecords = cloneMap(provider.currentState.records);
    this.#revision = provider.currentState.revision;
    this.#id = `ctx-sqlite-tx-${provider.currentState.revision + 1}`;
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

    const workingState = { records: this.#workingRecords, revision: this.#revision };
    const result = writeCreate(workingState, this.runtime, this.#provider.now, key, value, options);
    this.#revision = workingState.revision;
    if (result.ok) {
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

    const workingState = { records: this.#workingRecords, revision: this.#revision };
    const result = writeUpdate(workingState, this.runtime, this.#provider.now, key, value, options);
    this.#revision = workingState.revision;
    if (result.ok) {
      this.#touched.add(key);
    }
    return result;
  }

  async delete(key: string, options: ContextStoreDeleteOptions = {}): Promise<ContextStoreResult<ContextStoreRecord>> {
    const closed = this.#assertActive('delete');
    if (closed) {
      return closed;
    }

    const workingState = { records: this.#workingRecords, revision: this.#revision };
    const result = writeDelete(workingState, this.runtime, key, options);
    this.#revision = workingState.revision;
    if (result.ok) {
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
      createStoreError('context-store.transaction-closed', 'Nested transactions are not supported by the SQLite provider.', {
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

class SQLitePersistenceProviderImpl implements ContextPersistenceProvider {
  readonly #runtime: ContextRuntime;
  readonly #now: () => string;
  readonly #registration: ContextPersistenceRegistration;
  readonly #capabilities = sqlitePersistenceCapabilities();
  readonly #storage: SQLitePersistenceStorageDescriptor;
  readonly #store: SQLiteContextStore;
  readonly #sessions = new Set<SQLitePersistenceSession>();
  readonly #transactions = new Set<SQLitePersistenceTransaction>();
  #database: DatabaseSync | undefined;
  #connected = false;
  #state: StoreState = { records: new Map<string, InternalStoreRecord>(), revision: 0 };
  #sessionSequence = 0;

  constructor(options: SQLitePersistenceProviderOptions) {
    const resolvedPath = path.resolve(options.file_path);
    this.#runtime = options.runtime;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#registration = freeze({
      provider_id: 'context-provider-sqlite.local-file',
      provider_name: 'sqlite',
      provider_version: providerVersion,
      provider_kind: 'sqlite',
    });
    this.#storage = freeze({
      directory: path.dirname(resolvedPath),
      file_path: resolvedPath,
      file_name: path.basename(resolvedPath),
      schema_version: schemaVersion,
    });
    this.#store = new SQLiteContextStore(this);
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

  replaceCurrentState(state: StoreState): void {
    this.#state = state;
  }

  #databaseOrThrow(operation: ContextPersistenceOperation): DatabaseSync {
    if (!this.#database) {
      throw this.#error(operation, 'context-persistence.not-connected', 'Persistence provider is not connected.');
    }

    return this.#database;
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

  #mapSQLiteError(operation: ContextPersistenceOperation, error: unknown): ContextPersistenceError {
    const message = String((error as Error).message);
    if (isSQLiteStorageCorruption(error)) {
      return this.#error(operation, 'context-persistence.storage-corrupted', message);
    }

    return this.#error(operation, 'context-persistence.io-failure', message);
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
        throw this.#error('connect', 'context-persistence.io-failure', `SQLite provider directory is not a directory: ${this.#storage.directory}`);
      }

      await fs.mkdir(this.#storage.directory, { recursive: true });
    } catch (error) {
      if (error instanceof ContextPersistenceError) {
        throw error;
      }

      throw this.#error('connect', 'context-persistence.io-failure', `Failed to initialize SQLite provider directory: ${String((error as Error).message)}`);
    }
  }

  #openDatabase(): DatabaseSync {
    try {
      return new DatabaseSync(this.#storage.file_path);
    } catch (error) {
      throw this.#mapSQLiteError('connect', error);
    }
  }

  #schemaVersionFrom(db: DatabaseSync): number {
    const row = db
      .prepare("SELECT value FROM metadata WHERE key = 'schema_version'")
      .get() as { value?: string } | undefined;

    if (!row || !notBlank(row.value)) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', 'SQLite persistence metadata is missing schema_version.');
    }

    const parsed = Number.parseInt(row.value, 10);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', 'SQLite persistence schema_version is invalid.');
    }

    return parsed;
  }

  #verifySchema(db: DatabaseSync): void {
    const tables = new Set(
      (
        db
          .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('context_records', 'metadata')")
          .all() as { name: string }[]
      ).map((row) => row.name),
    );

    const hasContextRecords = tables.has('context_records');
    const hasMetadata = tables.has('metadata');

    if (!hasContextRecords && !hasMetadata) {
      db.exec(`
        CREATE TABLE context_records (
          key TEXT PRIMARY KEY,
          runtime_kind TEXT NOT NULL,
          version INTEGER NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          value TEXT NOT NULL
        );
        CREATE TABLE metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
      `);
      db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('schema_version', String(schemaVersion));
      db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('revision', '0');
      return;
    }

    if (!hasContextRecords || !hasMetadata) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', 'SQLite persistence schema is incomplete.');
    }

    const actualSchemaVersion = this.#schemaVersionFrom(db);
    if (actualSchemaVersion !== schemaVersion) {
      throw this.#error(
        'connect',
        'context-persistence.storage-corrupted',
        `SQLite persistence schema version ${actualSchemaVersion} does not match required version ${schemaVersion}.`,
      );
    }
  }

  #readRevision(db: DatabaseSync): number {
    const row = db.prepare("SELECT value FROM metadata WHERE key = 'revision'").get() as { value?: string } | undefined;
    if (!row) {
      return 0;
    }

    const parsed = Number.parseInt(row.value ?? '', 10);
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw this.#error('connect', 'context-persistence.storage-corrupted', 'SQLite persistence revision metadata is invalid.');
    }

    return parsed;
  }

  #loadState(db: DatabaseSync): StoreState {
    try {
      const revision = this.#readRevision(db);
      const rows = db
        .prepare(
          'SELECT key, runtime_kind, version, created_at, updated_at, value FROM context_records ORDER BY key ASC',
        )
        .all() as unknown as SQLiteRow[];

      const records = new Map<string, InternalStoreRecord>();
      for (const row of rows) {
        if (
          !notBlank(row.key) ||
          !notBlank(row.runtime_kind) ||
          !Number.isInteger(row.version) ||
          row.version < 1 ||
          !notBlank(row.created_at) ||
          !notBlank(row.updated_at) ||
          !notBlank(row.value)
        ) {
          throw this.#error('connect', 'context-persistence.storage-corrupted', 'SQLite persistence contains an invalid record envelope.');
        }

        if (!isIsoTimestamp(row.created_at) || !isIsoTimestamp(row.updated_at)) {
          throw this.#error('connect', 'context-persistence.storage-corrupted', 'SQLite persistence contains non-canonical timestamps.');
        }

        let value: ContextRuntimeValue;
        try {
          value = this.#runtime.deserialize(row.value);
        } catch (error) {
          throw this.#error(
            'connect',
            'context-persistence.storage-corrupted',
            `SQLite persistence record could not be deserialized for key ${row.key}: ${String((error as Error).message)}`,
          );
        }

        if (value.runtime_kind !== row.runtime_kind) {
          throw this.#error('connect', 'context-persistence.storage-corrupted', `SQLite persistence runtime_kind mismatch for key: ${row.key}`);
        }

        records.set(
          row.key,
          structuredClone({
            key: row.key,
            runtime_kind: value.runtime_kind,
            version: row.version,
            created_at: row.created_at,
            updated_at: row.updated_at,
            value: this.#runtime.clone(value),
          } satisfies InternalStoreRecord),
        );
      }

      return { revision, records };
    } catch (error) {
      if (error instanceof ContextPersistenceError) {
        throw error;
      }

      throw this.#mapSQLiteError('connect', error);
    }
  }

  persistState(state: StoreState): void {
    const db = this.#databaseOrThrow('commit');

    try {
      db.exec('BEGIN IMMEDIATE');
      db.exec('DELETE FROM context_records');
      const insert = db.prepare(
        'INSERT INTO context_records (key, runtime_kind, version, created_at, updated_at, value) VALUES (?, ?, ?, ?, ?, ?)',
      );
      for (const record of [...state.records.values()].sort((left, right) => left.key.localeCompare(right.key))) {
        insert.run(
          record.key,
          record.runtime_kind,
          record.version,
          record.created_at,
          record.updated_at,
          this.#runtime.serialize(record.value),
        );
      }
      db.prepare("INSERT INTO metadata (key, value) VALUES ('revision', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(
        String(state.revision),
      );
      db.exec('COMMIT');
    } catch (error) {
      try {
        db.exec('ROLLBACK');
      } catch {
        // best effort rollback only
      }

      throw this.#mapSQLiteError('commit', error);
    }
  }

  async persistTransactionCommit(transactionId: string, candidate: StoreState): Promise<ContextStoreResult<ContextStoreCommitResult>> {
    try {
      this.persistState(candidate);
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

  registerSession(session: SQLitePersistenceSession): void {
    this.#sessions.add(session);
  }

  unregisterSession(session: SQLitePersistenceSession): void {
    this.#sessions.delete(session);
  }

  registerTransaction(transaction: SQLitePersistenceTransaction): void {
    this.#transactions.add(transaction);
  }

  unregisterTransaction(transaction: SQLitePersistenceTransaction): void {
    this.#transactions.delete(transaction);
  }

  nextSessionId(): string {
    this.#sessionSequence += 1;
    return `ctx-sqlite-session-${this.#sessionSequence}`;
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
      this.#database = this.#openDatabase();
      this.#database.exec('PRAGMA foreign_keys = ON');
      this.#verifySchema(this.#database);
      const loaded = this.#loadState(this.#database);
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
      try {
        this.#database?.close();
      } catch {
        // best effort close only
      }
      this.#database = undefined;
      return persistenceFailure(
        'connect',
        error instanceof ContextPersistenceError
          ? error
          : this.#mapSQLiteError('connect', error),
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

    for (const transaction of this.#transactions) {
      transaction.forceClose();
    }
    for (const session of this.#sessions) {
      session.forceClose();
    }
    this.#transactions.clear();
    this.#sessions.clear();

    try {
      this.#database?.close();
      this.#database = undefined;
      this.#connected = false;
      return persistenceSuccess(
        'disconnect',
        freeze({
          provider: this.#registration,
          state: 'disconnected',
        }),
      );
    } catch (error) {
      return persistenceFailure(
        'disconnect',
        this.#mapSQLiteError('disconnect', error),
      );
    }
  }

  async beginSession(): Promise<ContextPersistenceResult<ContextPersistenceSession>> {
    if (!this.#connected) {
      return persistenceFailure(
        'begin-session',
        this.#error('begin-session', 'context-persistence.not-connected', 'Persistence provider is not connected.'),
      );
    }

    const session = new SQLitePersistenceSession(this, this.#registration, this.nextSessionId(), this.#store);
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
    const health: SQLitePersistenceProviderHealth = freeze({
      status: this.#connected ? 'healthy' : 'disconnected',
      healthy: this.#connected,
      connected: this.#connected,
      provider: this.#registration as SQLitePersistenceProviderHealth['provider'],
      capabilities: this.#capabilities,
      issues: this.#connected ? [] : ['Provider is disconnected.'],
      storage: this.#storage,
    });

    return persistenceSuccess('health', health);
  }
}

class SQLitePersistenceSession implements ContextPersistenceSession {
  readonly #providerRef: SQLitePersistenceProviderImpl;
  readonly #registration: ContextPersistenceRegistration;
  readonly #store: ContextStore;
  readonly #id: string;
  #state: 'active' | 'closed' = 'active';

  constructor(provider: SQLitePersistenceProviderImpl, registration: ContextPersistenceRegistration, id: string, store: ContextStore) {
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

    const transaction = new SQLitePersistenceTransaction(this.#providerRef, this.#registration, this.#id);
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

class SQLitePersistenceTransaction implements ContextPersistenceTransaction {
  readonly #providerRef: SQLitePersistenceProviderImpl;
  readonly #registration: ContextPersistenceRegistration;
  readonly #sessionId: string;
  readonly #store: ContextStoreTransaction;
  #state: ContextPersistenceTransactionState = 'active';

  constructor(provider: SQLitePersistenceProviderImpl, registration: ContextPersistenceRegistration, sessionId: string) {
    this.#providerRef = provider;
    this.#registration = registration;
    this.#sessionId = sessionId;
    this.#store = new SQLiteContextStoreTransaction(provider);
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

export const createSQLitePersistenceProvider = (options: SQLitePersistenceProviderOptions): ContextPersistenceProvider =>
  new SQLitePersistenceProviderImpl(options);

export const createSQLitePersistenceProviderFromPath = (
  filePath: string,
  options: SQLitePersistenceProviderFromPathOptions,
): ContextPersistenceProvider =>
  createSQLitePersistenceProvider({
    ...options,
    file_path: filePath,
  });

export { sqlitePersistenceCapabilities };
