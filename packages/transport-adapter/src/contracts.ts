import { API_HOST_PROTOCOL_VERSION, type ApiRequest, type ApiResponse } from '@host/api-host';

export const TRANSPORT_ADAPTER_CONTRACT_VERSION = '1.0.0' as const;
export const TRANSPORT_ADAPTER_TARGET_API_PROTOCOL_VERSION = API_HOST_PROTOCOL_VERSION;
export const DEFAULT_TRANSPORT_PROTOCOL = 'unspecified' as const;
export const DEFAULT_TRANSPORT_TIMESTAMP = '1970-01-01T00:00:00.000Z' as const;
export const DEFAULT_TRANSPORT_CORRELATION_ID = 'transport-correlation-unspecified' as const;
export const DEFAULT_TRANSPORT_REQUEST_ID = 'transport-request-unspecified' as const;

export type TransportAdapterContractVersion = typeof TRANSPORT_ADAPTER_CONTRACT_VERSION;
export type TransportAuthenticationMethod = 'anonymous' | 'bearer' | 'session' | 'api-key' | 'mutual-tls' | 'custom';
export type TransportDirection = 'inbound' | 'outbound';

export interface TransportAuthenticationContext {
  readonly authenticated: boolean;
  readonly principal: string;
  readonly subject: string;
  readonly tenant?: string | undefined;
  readonly roles: readonly string[];
  readonly claims: Readonly<Record<string, unknown>>;
  readonly method: TransportAuthenticationMethod;
}

export interface TransportTracingMetadata {
  readonly correlation_id: string;
  readonly request_id: string;
  readonly trace_id?: string | undefined;
  readonly span_id?: string | undefined;
  readonly timestamp: string;
}

export interface TransportMetadata {
  readonly protocol: string;
  readonly direction: TransportDirection;
  readonly version: TransportAdapterContractVersion;
  readonly authentication: TransportAuthenticationContext;
  readonly tracing: TransportTracingMetadata;
  readonly attributes: Readonly<Record<string, unknown>>;
}

export interface TransportRequest {
  readonly payload: unknown;
  readonly metadata: TransportMetadata;
}

export interface TransportStatus {
  readonly code: string | number;
  readonly detail?: string | undefined;
}

export interface TransportResponse {
  readonly payload: unknown;
  readonly metadata: TransportMetadata;
  readonly success: boolean;
  readonly status?: TransportStatus | undefined;
}

export interface TransportAdapterLifecycle {
  start?(): Promise<void>;
  stop?(): Promise<void>;
}

export interface TransportAdapter<TTransportRequest = TransportRequest, TTransportResponse = TransportResponse>
  extends TransportAdapterLifecycle {
  readonly version: TransportAdapterContractVersion;
  translateRequest(request: TTransportRequest): Promise<ApiRequest>;
  translateResponse(response: ApiResponse): Promise<TTransportResponse>;
}
