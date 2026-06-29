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
import {
  createRuntimeAuthenticationContext,
  createRuntimeCorrelationContext,
  type RuntimeAuthenticationContextInput,
  type RuntimeCorrelationContextInput,
} from '../../runtime-contracts/src/index.js';

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

export interface TransportAuthenticationDefaultsInput extends RuntimeAuthenticationContextInput {}

export interface TransportTracingDefaultsInput extends RuntimeCorrelationContextInput {}

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
    ...createRuntimeAuthenticationContext(input),
  });

export const createTransportTracingMetadata = (
  input: TransportTracingDefaultsInput = {},
): TransportTracingMetadata =>
  freeze({
    ...createRuntimeCorrelationContext({
      correlation_id: input.correlation_id ?? DEFAULT_TRANSPORT_CORRELATION_ID,
      request_id: input.request_id ?? DEFAULT_TRANSPORT_REQUEST_ID,
      trace_id: input.trace_id,
      span_id: input.span_id,
      timestamp: input.timestamp ?? DEFAULT_TRANSPORT_TIMESTAMP,
    }),
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
