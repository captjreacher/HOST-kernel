import type {
  ContextPersistenceProvider,
  ContextQuery,
  ContextQueryResult,
  ContextRuntimeValue,
  ContextStoreCommitResult,
  ContextStoreDeleteOptions,
  ContextStoreRecord,
  ContextStoreRollbackResult,
  ContextStoreWriteOptions,
} from '@host/context-persistence';
import type { RuntimeObservability, RuntimeRequestContext } from '../../runtime-contracts/src/index.js';

export type ContextServiceOperation =
  | 'create'
  | 'update'
  | 'delete'
  | 'retrieve'
  | 'query'
  | 'begin-transaction'
  | 'commit'
  | 'rollback';

export type ContextServiceErrorCode =
  | 'context-service.duplicate-key'
  | 'context-service.not-found'
  | 'context-service.version-conflict'
  | 'context-service.invalid-query'
  | 'context-service.transaction-closed'
  | 'context-service.unavailable';

export interface ContextServiceErrorOptions {
  readonly operation: ContextServiceOperation;
  readonly key?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;
}

export class ContextServiceError extends Error {
  readonly code: ContextServiceErrorCode;
  readonly operation: ContextServiceOperation;
  readonly key?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;

  constructor(code: ContextServiceErrorCode, message: string, options: ContextServiceErrorOptions) {
    super(message);
    this.name = 'ContextServiceError';
    this.code = code;
    this.operation = options.operation;
    this.key = options.key;
    this.expected_version = options.expected_version;
    this.actual_version = options.actual_version;
  }
}

export interface ContextServiceSuccess<TValue> {
  readonly ok: true;
  readonly operation: ContextServiceOperation;
  readonly value: TValue;
}

export interface ContextServiceFailure {
  readonly ok: false;
  readonly operation: ContextServiceOperation;
  readonly error: ContextServiceError;
}

export type ContextServiceResult<TValue> = ContextServiceSuccess<TValue> | ContextServiceFailure;

export interface ContextServiceOptions {
  readonly provider: ContextPersistenceProvider;
  readonly observability?: RuntimeObservability | undefined;
}

export interface ContextServiceRequestContext extends RuntimeRequestContext {}

export interface ContextService {
  create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options?: ContextStoreWriteOptions,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>>;
  update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options?: ContextStoreWriteOptions,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>>;
  delete(
    key: string,
    options?: ContextStoreDeleteOptions,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord>>;
  retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    key: string,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>>;
  query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query?: ContextQuery,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextQueryResult<TValue>>>;
  beginTransaction(request_context?: ContextServiceRequestContext): Promise<ContextServiceResult<ContextServiceTransaction>>;
}

export interface ContextServiceTransaction {
  readonly id: string;
  readonly state: 'active' | 'committed' | 'rolled-back';
  create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options?: ContextStoreWriteOptions,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>>;
  update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options?: ContextStoreWriteOptions,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>>;
  delete(
    key: string,
    options?: ContextStoreDeleteOptions,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord>>;
  retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    key: string,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>>;
  query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query?: ContextQuery,
    request_context?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextQueryResult<TValue>>>;
  commit(): Promise<ContextServiceResult<ContextStoreCommitResult>>;
  rollback(): Promise<ContextServiceResult<ContextStoreRollbackResult>>;
}
