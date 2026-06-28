import type {
  ContextQuery,
  ContextQueryResult,
  ContextService,
  ContextStoreCommitResult,
  ContextStoreRecord,
  ContextStoreRollbackResult,
} from '@host/context-service';

export const API_HOST_PROTOCOL_VERSION = '1.0.0' as const;

export const API_HOST_RESOURCE_REGISTRY = ['context'] as const;
export type ApiResource = (typeof API_HOST_RESOURCE_REGISTRY)[number];

export const API_HOST_OPERATION_REGISTRY = [
  'context.create',
  'context.retrieve',
  'context.update',
  'context.delete',
  'context.query',
  'context.transaction.begin',
  'context.transaction.create',
  'context.transaction.retrieve',
  'context.transaction.update',
  'context.transaction.delete',
  'context.transaction.query',
  'context.transaction.commit',
  'context.transaction.rollback',
] as const;

export type ApiOperation = (typeof API_HOST_OPERATION_REGISTRY)[number];
export type ApiProtocolVersion = typeof API_HOST_PROTOCOL_VERSION;

export interface ApiTransactionReference {
  readonly id: string;
}

export interface ApiRequest {
  readonly version?: string | undefined;
  readonly operation: string;
  readonly resource: string;
  readonly payload?: unknown;
  readonly query?: ContextQuery | undefined;
  readonly transaction?: ApiTransactionReference | undefined;
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly correlation_id?: string | undefined;
  readonly request_id?: string | undefined;
  readonly timestamp?: string | undefined;
}

export type ApiHostErrorCode =
  | 'api.invalid_request'
  | 'api.validation_failed'
  | 'api.not_found'
  | 'api.conflict'
  | 'api.transaction_closed'
  | 'api.unavailable'
  | 'api.internal';

export interface ApiError {
  readonly code: ApiHostErrorCode;
  readonly message: string;
}

export interface ApiTransactionMetadata {
  readonly id: string;
  readonly ownership: 'host-local';
  readonly expiry: 'until-finalized-or-host-disposal';
  readonly lifecycle: 'active' | 'finalized';
}

export interface ApiResponseMetadata {
  readonly operation?: ApiOperation | undefined;
  readonly resource?: ApiResource | undefined;
  readonly correlation_id?: string | undefined;
  readonly request_id?: string | undefined;
  readonly timestamp?: string | undefined;
  readonly transaction?: ApiTransactionMetadata | undefined;
}

export interface ApiDiagnostics {
  readonly handled_by: '@host/api-host';
  readonly category: 'success' | 'error';
}

export interface ApiWarning {
  readonly code: string;
  readonly message: string;
}

export interface ApiSuccessResponse<TValue = unknown> {
  readonly success: true;
  readonly result: TValue;
  readonly metadata: ApiResponseMetadata;
  readonly diagnostics: ApiDiagnostics;
  readonly warnings: readonly ApiWarning[];
  readonly version: ApiProtocolVersion;
}

export interface ApiErrorResponse {
  readonly success: false;
  readonly error: ApiError;
  readonly metadata: ApiResponseMetadata;
  readonly diagnostics: ApiDiagnostics;
  readonly warnings: readonly ApiWarning[];
  readonly version: ApiProtocolVersion;
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

export interface ContextWritePayload {
  readonly key: string;
  readonly value: unknown;
  readonly options?: {
    readonly expected_version?: number | undefined;
  } | undefined;
}

export interface ContextRetrievePayload {
  readonly key: string;
}

export interface ContextDeletePayload {
  readonly key: string;
  readonly options?: {
    readonly expected_version?: number | undefined;
  } | undefined;
}

export interface ContextQueryPayload {
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
