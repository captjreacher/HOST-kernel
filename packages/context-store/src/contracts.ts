import type { ContextRuntime, ContextRuntimeKind, ContextRuntimeValue } from '@host/context-runtime';

export type ContextStoreOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'retrieve'
  | 'exists'
  | 'query'
  | 'snapshot'
  | 'begin-transaction'
  | 'commit'
  | 'rollback';

export type ContextStoreErrorCode =
  | 'context-store.duplicate-key'
  | 'context-store.not-found'
  | 'context-store.version-conflict'
  | 'context-store.invalid-query'
  | 'context-store.transaction-closed'
  | 'context-store.io-failure';

export type ContextStoreOrderField = 'key' | 'runtime_kind' | 'version' | 'created_at' | 'updated_at';
export type ContextStoreOrderDirection = 'asc' | 'desc';
export type ContextStoreTransactionState = 'active' | 'committed' | 'rolled-back';

export interface ContextStoreRecord<TValue extends ContextRuntimeValue = ContextRuntimeValue> {
  readonly key: string;
  readonly runtime_kind: TValue['runtime_kind'];
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly value: TValue;
}

export interface ContextStoreWriteOptions {
  readonly expected_version?: number | undefined;
}

export interface ContextStoreDeleteOptions extends ContextStoreWriteOptions {}

export interface ContextQueryOrder {
  readonly field: ContextStoreOrderField;
  readonly direction?: ContextStoreOrderDirection | undefined;
}

export interface ContextQuery {
  readonly key?: string | undefined;
  readonly keys?: readonly string[] | undefined;
  readonly key_prefix?: string | undefined;
  readonly runtime_kind?: ContextRuntimeKind | readonly ContextRuntimeKind[] | undefined;
  readonly min_version?: number | undefined;
  readonly max_version?: number | undefined;
  readonly created_from?: string | undefined;
  readonly created_to?: string | undefined;
  readonly updated_from?: string | undefined;
  readonly updated_to?: string | undefined;
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
  readonly order_by?: readonly ContextQueryOrder[] | undefined;
}

export interface ContextQueryResult<TValue extends ContextRuntimeValue = ContextRuntimeValue> {
  readonly items: readonly ContextStoreRecord<TValue>[];
  readonly total: number;
  readonly limit: number;
  readonly offset: number;
  readonly has_more: boolean;
  readonly next_offset?: number | undefined;
  readonly order_by: readonly ContextQueryOrder[];
  readonly query: ContextQuery;
}

export interface ContextStoreSnapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue> {
  readonly captured_at: string;
  readonly revision: number;
  readonly total: number;
  readonly query: ContextQuery;
  readonly items: readonly ContextStoreRecord<TValue>[];
}

export interface ContextStoreCommitResult {
  readonly transaction_id: string;
  readonly state: 'committed';
  readonly revision: number;
}

export interface ContextStoreRollbackResult {
  readonly transaction_id: string;
  readonly state: 'rolled-back';
}

export interface ContextStoreExistsResult {
  readonly key: string;
  readonly exists: boolean;
  readonly version?: number | undefined;
}

export interface ContextStoreErrorOptions {
  readonly operation: ContextStoreOperation;
  readonly key?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;
}

export class ContextStoreError extends Error {
  readonly code: ContextStoreErrorCode;
  readonly operation: ContextStoreOperation;
  readonly key?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;

  constructor(code: ContextStoreErrorCode, message: string, options: ContextStoreErrorOptions) {
    super(message);
    this.name = 'ContextStoreError';
    this.code = code;
    this.operation = options.operation;
    this.key = options.key;
    this.expected_version = options.expected_version;
    this.actual_version = options.actual_version;
  }
}

export interface ContextStoreSuccess<TValue> {
  readonly ok: true;
  readonly operation: ContextStoreOperation;
  readonly value: TValue;
}

export interface ContextStoreFailure {
  readonly ok: false;
  readonly operation: ContextStoreOperation;
  readonly error: ContextStoreError;
}

export type ContextStoreResult<TValue> = ContextStoreSuccess<TValue> | ContextStoreFailure;

export interface ContextStoreOptions {
  readonly runtime: ContextRuntime;
  readonly now?: (() => string) | undefined;
}

export interface ContextStore {
  readonly runtime: ContextRuntime;
  create<TValue extends ContextRuntimeValue>(key: string, value: TValue, options?: ContextStoreWriteOptions): Promise<ContextStoreResult<ContextStoreRecord<TValue>>>;
  update<TValue extends ContextRuntimeValue>(key: string, value: TValue, options?: ContextStoreWriteOptions): Promise<ContextStoreResult<ContextStoreRecord<TValue>>>;
  delete(key: string, options?: ContextStoreDeleteOptions): Promise<ContextStoreResult<ContextStoreRecord>>;
  retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(key: string): Promise<ContextStoreResult<ContextStoreRecord<TValue>>>;
  exists(key: string): Promise<ContextStoreResult<ContextStoreExistsResult>>;
  query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query?: ContextQuery): Promise<ContextStoreResult<ContextQueryResult<TValue>>>;
  snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query?: ContextQuery): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>>;
  beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>>;
}

export interface ContextStoreTransaction extends ContextStore {
  readonly id: string;
  readonly state: ContextStoreTransactionState;
  commit(): Promise<ContextStoreResult<ContextStoreCommitResult>>;
  rollback(): Promise<ContextStoreResult<ContextStoreRollbackResult>>;
}
