import type {
  RuntimeAuthenticationContext,
  RuntimeAuthenticationMetadata,
  RuntimeClaims,
  RuntimeCorrelationContext,
  RuntimeObservability,
  RuntimePrincipal,
  RuntimeRequestContext,
  RuntimeSubject,
  RuntimeTenant,
} from './contracts.js';
import {
  DEFAULT_RUNTIME_CORRELATION_ID,
  DEFAULT_RUNTIME_REQUEST_ID,
  DEFAULT_RUNTIME_TIMESTAMP,
} from './contracts.js';

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

export interface RuntimeAuthenticationMetadataInput {
  readonly issuer?: string | undefined;
  readonly authenticated_at?: string | undefined;
  readonly session_id?: string | undefined;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

export interface RuntimeAuthenticationContextInput {
  readonly authenticated?: boolean | undefined;
  readonly principal?: RuntimePrincipal | string | undefined;
  readonly subject?: RuntimeSubject | string | undefined;
  readonly tenant?: RuntimeTenant | string | undefined;
  readonly roles?: readonly string[] | undefined;
  readonly claims?: RuntimeClaims | undefined;
  readonly method?: RuntimeAuthenticationContext['method'] | undefined;
  readonly metadata?: RuntimeAuthenticationMetadataInput | undefined;
}

export interface RuntimeCorrelationContextInput {
  readonly correlation_id?: string | undefined;
  readonly request_id?: string | undefined;
  readonly trace_id?: string | undefined;
  readonly span_id?: string | undefined;
  readonly timestamp?: string | undefined;
}

export interface RuntimeRequestContextInput {
  readonly authentication?: RuntimeAuthenticationContextInput | undefined;
  readonly correlation?: RuntimeCorrelationContextInput | undefined;
  readonly attributes?: Readonly<Record<string, unknown>> | undefined;
}

const asPrincipal = (value: RuntimePrincipal | string | undefined, fallback: string): RuntimePrincipal =>
  freeze(
    typeof value === 'string'
      ? { id: value }
      : {
          id: value?.id ?? fallback,
          ...(value?.type ? { type: value.type } : {}),
        },
  );

const asSubject = (value: RuntimeSubject | string | undefined, fallback: string): RuntimeSubject =>
  freeze(
    typeof value === 'string'
      ? { id: value }
      : {
          id: value?.id ?? fallback,
          ...(value?.type ? { type: value.type } : {}),
        },
  );

const asTenant = (value: RuntimeTenant | string | undefined): RuntimeTenant | undefined => {
  if (!value) {
    return undefined;
  }

  return freeze(typeof value === 'string' ? { id: value } : { id: value.id });
};

export const createRuntimeAuthenticationMetadata = (
  input: RuntimeAuthenticationMetadataInput = {},
): RuntimeAuthenticationMetadata =>
  freeze({
    ...(input.issuer ? { issuer: input.issuer } : {}),
    ...(input.authenticated_at ? { authenticated_at: input.authenticated_at } : {}),
    ...(input.session_id ? { session_id: input.session_id } : {}),
    attributes: freeze({ ...(input.attributes ?? {}) }),
  });

export const createRuntimeAuthenticationContext = (
  input: RuntimeAuthenticationContextInput = {},
): RuntimeAuthenticationContext =>
  freeze({
    authenticated: input.authenticated ?? false,
    principal: asPrincipal(input.principal, 'anonymous'),
    subject: asSubject(input.subject, 'anonymous'),
    ...(asTenant(input.tenant) ? { tenant: asTenant(input.tenant) } : {}),
    roles: freeze([...(input.roles ?? [])]),
    claims: freeze({ ...(input.claims ?? {}) }),
    method: input.method ?? 'anonymous',
    metadata: createRuntimeAuthenticationMetadata(input.metadata),
  });

export const createRuntimeCorrelationContext = (
  input: RuntimeCorrelationContextInput = {},
): RuntimeCorrelationContext =>
  freeze({
    correlation_id: input.correlation_id ?? DEFAULT_RUNTIME_CORRELATION_ID,
    request_id: input.request_id ?? DEFAULT_RUNTIME_REQUEST_ID,
    ...(input.trace_id ? { trace_id: input.trace_id } : {}),
    ...(input.span_id ? { span_id: input.span_id } : {}),
    timestamp: input.timestamp ?? DEFAULT_RUNTIME_TIMESTAMP,
  });

export const createRuntimeRequestContext = (input: RuntimeRequestContextInput = {}): RuntimeRequestContext =>
  freeze({
    authentication: createRuntimeAuthenticationContext(input.authentication),
    correlation: createRuntimeCorrelationContext(input.correlation),
    attributes: freeze({ ...(input.attributes ?? {}) }),
  });

export const createRuntimeObservability = (input: RuntimeObservability = {}): RuntimeObservability =>
  freeze({
    ...(input.logger ? { logger: input.logger } : {}),
    ...(input.metrics ? { metrics: input.metrics } : {}),
    ...(input.tracer ? { tracer: input.tracer } : {}),
  });
