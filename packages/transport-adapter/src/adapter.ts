import type {
  TransportAuthenticationContext,
  TransportDirection,
  TransportMetadata,
  TransportTracingMetadata,
} from './contracts.js';
import {
  DEFAULT_TRANSPORT_CORRELATION_ID,
  DEFAULT_TRANSPORT_PROTOCOL,
  DEFAULT_TRANSPORT_REQUEST_ID,
  DEFAULT_TRANSPORT_TIMESTAMP,
  TRANSPORT_ADAPTER_CONTRACT_VERSION,
} from './contracts.js';

const freeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== "object") {
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

export interface TransportAuthenticationDefaultsInput {
  readonly authenticated?: boolean | undefined;
  readonly principal?: string | undefined;
  readonly subject?: string | undefined;
  readonly tenant?: string | undefined;
  readonly roles?: readonly string[] | undefined;
  readonly claims?: Readonly<Record<string, unknown>> | undefined;
  readonly method?: TransportAuthenticationContext['method'] | undefined;
}

export interface TransportTracingDefaultsInput {
  readonly correlation_id?: string | undefined;
  readonly request_id?: string | undefined;
  readonly trace_id?: string | undefined;
  readonly span_id?: string | undefined;
  readonly timestamp?: string | undefined;
}

export interface TransportMetadataDefaultsInput {
  readonly protocol?: string | undefined;
  readonly direction?: TransportDirection | undefined;
  readonly authentication?: TransportAuthenticationDefaultsInput | undefined;
  readonly tracing?: TransportTracingDefaultsInput | undefined;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

export const createTransportAuthenticationContext = (
  input: TransportAuthenticationDefaultsInput = {},
): TransportAuthenticationContext =>
  freeze({
    authenticated: input.authenticated ?? false,
    principal: input.principal ?? 'anonymous',
    subject: input.subject ?? 'anonymous',
    ...(input.tenant ? { tenant: input.tenant } : {}),
    roles: freeze([...(input.roles ?? [])]),
    claims: freeze({ ...(input.claims ?? {}) }),
    method: input.method ?? 'anonymous',
  });

export const createTransportTracingMetadata = (
  input: TransportTracingDefaultsInput = {},
): TransportTracingMetadata =>
  freeze({
    correlation_id: input.correlation_id ?? DEFAULT_TRANSPORT_CORRELATION_ID,
    request_id: input.request_id ?? DEFAULT_TRANSPORT_REQUEST_ID,
    ...(input.trace_id ? { trace_id: input.trace_id } : {}),
    ...(input.span_id ? { span_id: input.span_id } : {}),
    timestamp: input.timestamp ?? DEFAULT_TRANSPORT_TIMESTAMP,
  });

export const createTransportMetadata = (input: TransportMetadataDefaultsInput = {}): TransportMetadata =>
  freeze({
    protocol: input.protocol ?? DEFAULT_TRANSPORT_PROTOCOL,
    direction: input.direction ?? 'inbound',
    version: TRANSPORT_ADAPTER_CONTRACT_VERSION,
    authentication: createTransportAuthenticationContext(input.authentication),
    tracing: createTransportTracingMetadata(input.tracing),
    attributes: freeze({ ...(input.attributes ?? {}) }),
  });
