import type {
  ContextQuery,
  ContextQueryResult,
  ContextService,
  ContextStoreCommitResult,
  ContextStoreRecord,
  ContextStoreRollbackResult,
} from '@host/context-service';

export type ApiRoute =
  | 'context.create'
  | 'context.retrieve'
  | 'context.update'
  | 'context.delete'
  | 'context.query'
  | 'context.begin-transaction'
  | 'context.transaction.create'
  | 'context.transaction.retrieve'
  | 'context.transaction.update'
  | 'context.transaction.delete'
  | 'context.transaction.query'
  | 'context.transaction.commit'
  | 'context.transaction.rollback';

export interface ApiRequest {
  readonly route: string;
  readonly input?: unknown;
}

export type ApiHostErrorCode =
  | 'api-host.request.invalid'
  | 'api-host.route.not-found'
  | 'api-host.context.duplicate-key'
  | 'api-host.context.not-found'
  | 'api-host.context.version-conflict'
  | 'api-host.context.invalid-query'
  | 'api-host.context.transaction-closed'
  | 'api-host.context.transaction-not-found'
  | 'api-host.context.unavailable'
  | 'api-host.internal-error';

export interface ApiError {
  readonly code: ApiHostErrorCode;
  readonly message: string;
}

export interface ApiSuccessResponse<TValue = unknown> {
  readonly status: number;
  readonly body: {
    readonly data: TValue;
  };
}

export interface ApiErrorResponse {
  readonly status: number;
  readonly body: {
    readonly error: ApiError;
  };
}

export type ApiResponse<TValue = unknown> = ApiSuccessResponse<TValue> | ApiErrorResponse;

export interface ApiHostServices {
  readonly context: ContextService;
}

export interface ApiHostOptions {
  readonly services: ApiHostServices;
}

export interface ApiHost {
  handle(request: ApiRequest): Promise<ApiResponse>;
}

export interface ContextCreateRequest {
  readonly key: string;
  readonly value: unknown;
  readonly options?: {
    readonly expected_version?: number | undefined;
  } | undefined;
}

export interface ContextRetrieveRequest {
  readonly key: string;
}

export interface ContextDeleteRequest {
  readonly key: string;
  readonly options?: {
    readonly expected_version?: number | undefined;
  } | undefined;
}

export interface ContextQueryRequest {
  readonly query?: ContextQuery | undefined;
}

export interface ContextTransactionRequest {
  readonly transaction_id: string;
}

export interface ContextTransactionMutationRequest extends ContextTransactionRequest {
  readonly key: string;
  readonly value: unknown;
  readonly options?: {
    readonly expected_version?: number | undefined;
  } | undefined;
}

export interface ContextTransactionDeleteRequest extends ContextTransactionRequest {
  readonly key: string;
  readonly options?: {
    readonly expected_version?: number | undefined;
  } | undefined;
}

export interface ContextTransactionRetrieveRequest extends ContextTransactionRequest {
  readonly key: string;
}

export interface ContextTransactionQueryRequest extends ContextTransactionRequest {
  readonly query?: ContextQuery | undefined;
}

export interface ContextTransactionHandleResponse {
  readonly transaction_id: string;
  readonly state: 'active' | 'committed' | 'rolled-back';
}

export type ContextApiPayload =
  | ContextStoreRecord
  | ContextQueryResult
  | ContextStoreCommitResult
  | ContextStoreRollbackResult
  | ContextTransactionHandleResponse;
