import type { ApiErrorResponse, ApiHostErrorCode, ApiOperation, ApiSuccessResponse } from '../../api-host/src/index.js';
import type { TransportAdapter, TransportMetadata, TransportResponse, TransportStatus } from '../../transport-adapter/src/index.js';

export const REST_TRANSPORT_ADAPTER_VERSION = '1.0.0' as const;
export const REST_TRANSPORT_PROTOCOL = 'rest' as const;

export type RestTransportAdapterVersion = typeof REST_TRANSPORT_ADAPTER_VERSION;
export type RestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface RestHeaderMap {
  readonly [name: string]: string | readonly string[] | undefined;
}

export interface RestQueryMap {
  readonly [name: string]: string | readonly string[] | undefined;
}

export interface RestTransportRequest {
  readonly method: RestMethod;
  readonly path: string;
  readonly headers?: RestHeaderMap | undefined;
  readonly query?: RestQueryMap | undefined;
  readonly body?: unknown;
  readonly metadata: TransportMetadata;
}

export interface RestTransportResponsePayloadSuccess {
  readonly result: ApiSuccessResponse['result'];
  readonly metadata: ApiSuccessResponse['metadata'];
  readonly diagnostics: ApiSuccessResponse['diagnostics'];
  readonly warnings: ApiSuccessResponse['warnings'];
  readonly version: ApiSuccessResponse['version'];
}

export interface RestTransportResponsePayloadError {
  readonly error: ApiErrorResponse['error'];
  readonly metadata: ApiErrorResponse['metadata'];
  readonly diagnostics: ApiErrorResponse['diagnostics'];
  readonly warnings: ApiErrorResponse['warnings'];
  readonly version: ApiErrorResponse['version'];
}

export interface RestTransportResponse extends TransportResponse {
  readonly payload: RestTransportResponsePayloadSuccess | RestTransportResponsePayloadError;
  readonly metadata: TransportMetadata;
  readonly success: boolean;
  readonly status: TransportStatus & {
    readonly code: number;
  };
  readonly headers: Readonly<Record<string, string>>;
}

export interface RestRouteRegistryEntry {
  readonly method: RestMethod;
  readonly template: '/context' | '/context/{key}';
  readonly operation: Extract<ApiOperation, 'context.create' | 'context.retrieve' | 'context.update' | 'context.delete' | 'context.query'>;
}

export type RestTransportAdapter = TransportAdapter<RestTransportRequest, RestTransportResponse>;

export type RestErrorStatusRegistry = Readonly<Record<ApiHostErrorCode, number>>;
