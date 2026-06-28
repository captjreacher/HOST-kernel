import type { ApiHostErrorCode, ApiOperation, ApiRequest, ApiResponse } from '../../api-host/src/index.js';
import { API_HOST_PROTOCOL_VERSION } from '../../api-host/src/index.js';
import {
  createTransportMetadata,
  type TransportMetadata,
} from '../../transport-adapter/src/index.js';
import type {
  RestErrorStatusRegistry,
  RestMethod,
  RestQueryMap,
  RestRouteRegistryEntry,
  RestTransportAdapter,
  RestTransportRequest,
  RestTransportResponse,
} from './contracts.js';
import { REST_TRANSPORT_ADAPTER_VERSION, REST_TRANSPORT_PROTOCOL } from './contracts.js';

type ContextQuery = NonNullable<ApiRequest['query']>;

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

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isIntegerString = (value: string): boolean => /^-?\d+$/.test(value.trim());

export const REST_RESOURCE_REGISTRY = freeze([
  { method: 'POST', template: '/context', operation: 'context.create' },
  { method: 'GET', template: '/context/{key}', operation: 'context.retrieve' },
  { method: 'PUT', template: '/context/{key}', operation: 'context.update' },
  { method: 'PATCH', template: '/context/{key}', operation: 'context.update' },
  { method: 'DELETE', template: '/context/{key}', operation: 'context.delete' },
  { method: 'GET', template: '/context', operation: 'context.query' },
] as const satisfies readonly RestRouteRegistryEntry[]);

export const REST_ERROR_STATUS_REGISTRY: RestErrorStatusRegistry = freeze({
  'api.invalid_request': 400,
  'api.validation_failed': 422,
  'api.not_found': 404,
  'api.conflict': 409,
  'api.transaction_closed': 409,
  'api.unavailable': 503,
  'api.internal': 500,
});

const getQueryValues = (query: RestQueryMap | undefined, key: string): readonly string[] => {
  const value = query?.[key];
  if (value === undefined) {
    return [];
  }
  return typeof value === 'string' ? [value] : value;
};

const getLastQueryValue = (query: RestQueryMap | undefined, key: string): string | undefined => {
  const values = getQueryValues(query, key);
  const last = values.at(-1);
  return isString(last) ? last : undefined;
};

const splitCsv = (values: readonly string[]): readonly string[] =>
  values
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .filter((value) => value.length > 0);

const parseInteger = (value: string | undefined): number | undefined =>
  value !== undefined && isIntegerString(value) ? Number.parseInt(value, 10) : undefined;

const parseOrderBy = (value: string | undefined): ContextQuery['order_by'] | undefined => {
  if (!isString(value)) {
    return undefined;
  }

  const items: Array<NonNullable<ContextQuery['order_by']>[number]> = [];
  for (const part of value.split(',').map((item) => item.trim()).filter((item) => item.length > 0)) {
    const [field, direction] = part.split(':', 2);
    if (!isString(field)) {
      continue;
    }

    const normalizedDirection = direction?.trim();
    if (normalizedDirection && normalizedDirection !== 'asc' && normalizedDirection !== 'desc') {
      continue;
    }

    items.push(
      normalizedDirection
        ? {
            field: field as NonNullable<ContextQuery['order_by']>[number]['field'],
            direction: normalizedDirection as NonNullable<ContextQuery['order_by']>[number]['direction'],
          }
        : {
            field: field as NonNullable<ContextQuery['order_by']>[number]['field'],
          },
    );
  }

  return items.length > 0 ? freeze(items) : undefined;
};

export const createContextQueryFromRestQuery = (query: RestQueryMap | undefined): ContextQuery => {
  const keys = splitCsv(getQueryValues(query, 'keys'));
  const runtimeKinds = splitCsv(getQueryValues(query, 'runtime_kind'));
  const singleRuntimeKind = getLastQueryValue(query, 'runtime_kind');
  const orderBy = parseOrderBy(getLastQueryValue(query, 'order_by'));

  const built: Record<string, unknown> = {};
  const key = getLastQueryValue(query, 'key');
  const keyPrefix = getLastQueryValue(query, 'key_prefix');
  const minVersion = parseInteger(getLastQueryValue(query, 'min_version'));
  const maxVersion = parseInteger(getLastQueryValue(query, 'max_version'));
  const createdFrom = getLastQueryValue(query, 'created_from');
  const createdTo = getLastQueryValue(query, 'created_to');
  const updatedFrom = getLastQueryValue(query, 'updated_from');
  const updatedTo = getLastQueryValue(query, 'updated_to');
  const limit = parseInteger(getLastQueryValue(query, 'limit'));
  const offset = parseInteger(getLastQueryValue(query, 'offset'));

  if (isString(key)) {
    built.key = key;
  }
  if (keys.length > 0) {
    built.keys = freeze([...keys]);
  }
  if (isString(keyPrefix)) {
    built.key_prefix = keyPrefix;
  }
  if (runtimeKinds.length > 1) {
    built.runtime_kind = freeze([...runtimeKinds]);
  } else if (isString(singleRuntimeKind)) {
    built.runtime_kind = singleRuntimeKind;
  }
  if (minVersion !== undefined) {
    built.min_version = minVersion;
  }
  if (maxVersion !== undefined) {
    built.max_version = maxVersion;
  }
  if (isString(createdFrom)) {
    built.created_from = createdFrom;
  }
  if (isString(createdTo)) {
    built.created_to = createdTo;
  }
  if (isString(updatedFrom)) {
    built.updated_from = updatedFrom;
  }
  if (isString(updatedTo)) {
    built.updated_to = updatedTo;
  }
  if (limit !== undefined) {
    built.limit = limit;
  }
  if (offset !== undefined) {
    built.offset = offset;
  }
  if (orderBy) {
    built.order_by = orderBy;
  }

  return freeze(built) as unknown as ContextQuery;
};

const normalizePath = (path: string): string => {
  const trimmed = path.trim();
  if (!trimmed.startsWith('/')) {
    return `/${trimmed}`;
  }
  return trimmed;
};

const routeFor = (method: RestMethod, path: string): { route: RestRouteRegistryEntry; key?: string } | undefined => {
  const normalized = normalizePath(path);
  if (normalized === '/context') {
    return {
      route: REST_RESOURCE_REGISTRY.find((entry) => entry.method === method && entry.template === '/context') as RestRouteRegistryEntry,
    };
  }

  if (normalized.startsWith('/context/')) {
    const key = decodeURIComponent(normalized.slice('/context/'.length));
    if (!isString(key)) {
      return undefined;
    }
    const route = REST_RESOURCE_REGISTRY.find((entry) => entry.method === method && entry.template === '/context/{key}');
    if (!route) {
      return undefined;
    }
    return { route, key };
  }

  return undefined;
};

const expectedVersionFrom = (body: unknown, query: RestQueryMap | undefined): number | undefined => {
  const fromQuery = parseInteger(getLastQueryValue(query, 'expected_version'));
  if (fromQuery !== undefined) {
    return fromQuery;
  }

  if (!isObject(body)) {
    return undefined;
  }

  if (isObject(body.options) && typeof body.options.expected_version === 'number' && Number.isInteger(body.options.expected_version)) {
    return body.options.expected_version;
  }

  if (typeof body.expected_version === 'number' && Number.isInteger(body.expected_version)) {
    return body.expected_version;
  }

  return undefined;
};

const requestPayloadFor = (operation: ApiOperation, key: string | undefined, body: unknown, query: RestQueryMap | undefined): unknown => {
  const expectedVersion = expectedVersionFrom(body, query);

  switch (operation) {
    case 'context.create':
      return body;
    case 'context.retrieve':
      return freeze({ key });
    case 'context.update':
      return freeze({
        key,
        value: isObject(body) && 'value' in body ? body.value : body,
        ...(expectedVersion !== undefined ? { options: { expected_version: expectedVersion } } : {}),
      });
    case 'context.delete':
      return freeze({
        key,
        ...(expectedVersion !== undefined ? { options: { expected_version: expectedVersion } } : {}),
      });
    case 'context.query':
      return undefined;
  }
};

const successStatusFor = (operation: ApiOperation | undefined): number => {
  switch (operation) {
    case 'context.create':
      return 201;
    case 'context.retrieve':
    case 'context.update':
    case 'context.delete':
    case 'context.query':
    default:
      return 200;
  }
};

const errorStatusFor = (code: ApiHostErrorCode): number => REST_ERROR_STATUS_REGISTRY[code] ?? 500;

const responseHeadersFor = (metadata: TransportMetadata): Readonly<Record<string, string>> =>
  freeze({
    'content-type': 'application/json',
    'x-correlation-id': metadata.tracing.correlation_id,
    'x-request-id': metadata.tracing.request_id,
    ...(metadata.tracing.trace_id ? { 'x-trace-id': metadata.tracing.trace_id } : {}),
    ...(metadata.tracing.span_id ? { 'x-span-id': metadata.tracing.span_id } : {}),
  });

class DefaultRestTransportAdapter implements RestTransportAdapter {
  readonly version = REST_TRANSPORT_ADAPTER_VERSION;

  async translateRequest(request: RestTransportRequest): Promise<ApiRequest> {
    const resolved = routeFor(request.method, request.path);
    const baseMetadata = request.metadata;

    if (!resolved) {
      throw new Error(`Unsupported REST route: ${request.method} ${normalizePath(request.path)}`);
    }

    return freeze({
      version: API_HOST_PROTOCOL_VERSION,
      operation: resolved.route.operation,
      resource: 'context',
      ...(resolved.route.operation === 'context.query'
        ? { query: createContextQueryFromRestQuery(request.query) }
        : { payload: requestPayloadFor(resolved.route.operation, resolved.key, request.body, request.query) }),
      metadata: freeze({
        transport: freeze({
          protocol: REST_TRANSPORT_PROTOCOL,
          method: request.method,
          path: normalizePath(request.path),
          route_template: resolved.route.template,
        }),
        transport_metadata: baseMetadata,
      }),
      correlation_id: baseMetadata.tracing.correlation_id,
      request_id: baseMetadata.tracing.request_id,
      timestamp: baseMetadata.tracing.timestamp,
    });
  }

  async translateResponse(response: ApiResponse): Promise<RestTransportResponse> {
    const metadata = createTransportMetadata({
      protocol: REST_TRANSPORT_PROTOCOL,
      direction: 'outbound',
      tracing: {
        correlation_id: response.metadata.correlation_id,
        request_id: response.metadata.request_id,
        timestamp: response.metadata.timestamp,
      },
    });

    if (response.success) {
      const status = successStatusFor(response.metadata.operation);
      return freeze({
        payload: freeze({
          result: response.result,
          metadata: response.metadata,
          diagnostics: response.diagnostics,
          warnings: response.warnings,
          version: response.version,
        }),
        metadata,
        success: true,
        status: freeze({
          code: status,
          detail: 'success',
        }),
        headers: responseHeadersFor(metadata),
      });
    }

    const status = errorStatusFor(response.error.code);
    return freeze({
      payload: freeze({
        error: response.error,
        metadata: response.metadata,
        diagnostics: response.diagnostics,
        warnings: response.warnings,
        version: response.version,
      }),
      metadata,
      success: false,
      status: freeze({
        code: status,
        detail: 'error',
      }),
      headers: responseHeadersFor(metadata),
    });
  }
}

export const createRestTransportAdapter = (): RestTransportAdapter => new DefaultRestTransportAdapter();
