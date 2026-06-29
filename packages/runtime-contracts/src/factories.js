import { DEFAULT_RUNTIME_CORRELATION_ID, DEFAULT_RUNTIME_REQUEST_ID, DEFAULT_RUNTIME_TIMESTAMP, } from './contracts.js';
const freeze = (value) => {
    if (!value || typeof value !== 'object') {
        return value;
    }
    Object.freeze(value);
    for (const nested of Object.values(value)) {
        if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
            freeze(nested);
        }
    }
    return value;
};
const asPrincipal = (value, fallback) => freeze(typeof value === 'string'
    ? { id: value }
    : {
        id: value?.id ?? fallback,
        ...(value?.type ? { type: value.type } : {}),
    });
const asSubject = (value, fallback) => freeze(typeof value === 'string'
    ? { id: value }
    : {
        id: value?.id ?? fallback,
        ...(value?.type ? { type: value.type } : {}),
    });
const asTenant = (value) => {
    if (!value) {
        return undefined;
    }
    return freeze(typeof value === 'string' ? { id: value } : { id: value.id });
};
export const createRuntimeAuthenticationMetadata = (input = {}) => freeze({
    ...(input.issuer ? { issuer: input.issuer } : {}),
    ...(input.authenticated_at ? { authenticated_at: input.authenticated_at } : {}),
    ...(input.session_id ? { session_id: input.session_id } : {}),
    attributes: freeze({ ...(input.attributes ?? {}) }),
});
export const createRuntimeAuthenticationContext = (input = {}) => freeze({
    authenticated: input.authenticated ?? false,
    principal: asPrincipal(input.principal, 'anonymous'),
    subject: asSubject(input.subject, 'anonymous'),
    ...(asTenant(input.tenant) ? { tenant: asTenant(input.tenant) } : {}),
    roles: freeze([...(input.roles ?? [])]),
    claims: freeze({ ...(input.claims ?? {}) }),
    method: input.method ?? 'anonymous',
    metadata: createRuntimeAuthenticationMetadata(input.metadata),
});
export const createRuntimeCorrelationContext = (input = {}) => freeze({
    correlation_id: input.correlation_id ?? DEFAULT_RUNTIME_CORRELATION_ID,
    request_id: input.request_id ?? DEFAULT_RUNTIME_REQUEST_ID,
    ...(input.trace_id ? { trace_id: input.trace_id } : {}),
    ...(input.span_id ? { span_id: input.span_id } : {}),
    timestamp: input.timestamp ?? DEFAULT_RUNTIME_TIMESTAMP,
});
export const createRuntimeRequestContext = (input = {}) => freeze({
    authentication: createRuntimeAuthenticationContext(input.authentication),
    correlation: createRuntimeCorrelationContext(input.correlation),
    attributes: freeze({ ...(input.attributes ?? {}) }),
});
export const createRuntimeObservability = (input = {}) => freeze({
    ...(input.logger ? { logger: input.logger } : {}),
    ...(input.metrics ? { metrics: input.metrics } : {}),
    ...(input.tracer ? { tracer: input.tracer } : {}),
});
