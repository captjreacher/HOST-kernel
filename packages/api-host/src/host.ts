import type {
  ContextService,
  ContextServiceError,
  ContextServiceRequestContext,
  ContextServiceResult,
  ContextServiceTransaction,
  ContextStoreCommitResult,
  ContextStoreRecord,
  ContextStoreRollbackResult,
} from '@host/context-service';
import type {
  ApiDiagnostics,
  ApiErrorResponse,
  ApiHost,
  ApiHostErrorCode,
  ApiHostOptions,
  ApiOperation,
  ApiRequest,
  ApiResource,
  ApiResponse,
  ApiResponseMetadata,
  ApiSuccessResponse,
  ApiTransactionMetadata,
  ApiWarning,
  ContextApiPayload,
  ContextDeletePayload,
  ContextQueryPayload,
  ContextRetrievePayload,
  ContextTransactionHandleResponse,
  ContextWritePayload,
} from './contracts.js';
import { API_HOST_OPERATION_REGISTRY, API_HOST_PROTOCOL_VERSION } from './contracts.js';
import { createRuntimeRequestContext, type RuntimeAuthenticationMethod } from '../../runtime-contracts/src/index.js';

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

const EMPTY_WARNINGS = freeze([] as readonly ApiWarning[]);
const SUPPORTED_PROTOCOL_VERSIONS = new Set<string>([API_HOST_PROTOCOL_VERSION]);
const operationSet = new Set<ApiOperation>(API_HOST_OPERATION_REGISTRY);

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);
const isIsoTimestamp = (value: unknown): value is string => isString(value) && !Number.isNaN(Date.parse(value));
const isStringArray = (value: unknown): value is readonly string[] => Array.isArray(value) && value.every((item) => typeof item === 'string');

interface CanonicalApiRequest {
  readonly version: string;
  readonly operation: ApiOperation;
  readonly resource: ApiResource;
  readonly payload?: unknown;
  readonly query?: ApiRequest['query'];
  readonly metadata?: Readonly<Record<string, unknown>> | undefined;
  readonly correlation_id?: string | undefined;
  readonly request_id?: string | undefined;
  readonly timestamp?: string | undefined;
  readonly transaction?: {
    readonly id: string;
  } | undefined;
}

interface StoredTransaction {
  readonly transaction: ContextServiceTransaction;
  readonly metadata: ApiTransactionMetadata;
}

const successDiagnostics = (): ApiDiagnostics =>
  freeze({
    handled_by: '@host/api-host',
    category: 'success',
  });

const errorDiagnostics = (): ApiDiagnostics =>
  freeze({
    handled_by: '@host/api-host',
    category: 'error',
  });

const responseMetadata = (
  request: Pick<CanonicalApiRequest, 'operation' | 'resource' | 'correlation_id' | 'request_id' | 'timestamp'>,
  transaction?: ApiTransactionMetadata,
): ApiResponseMetadata =>
  freeze({
    operation: request.operation,
    resource: request.resource,
    ...(request.correlation_id ? { correlation_id: request.correlation_id } : {}),
    ...(request.request_id ? { request_id: request.request_id } : {}),
    ...(request.timestamp ? { timestamp: request.timestamp } : {}),
    ...(transaction ? { transaction } : {}),
  });

const failureMetadata = (request: Partial<ApiRequest>, transaction?: ApiTransactionMetadata): ApiResponseMetadata =>
  freeze({
    ...(isString(request.operation) && operationSet.has(request.operation as ApiOperation) ? { operation: request.operation as ApiOperation } : {}),
    ...(request.resource === 'context' ? { resource: 'context' as const } : {}),
    ...(isString(request.correlation_id) ? { correlation_id: request.correlation_id } : {}),
    ...(isString(request.request_id) ? { request_id: request.request_id } : {}),
    ...(isIsoTimestamp(request.timestamp) ? { timestamp: request.timestamp } : {}),
    ...(transaction ? { transaction } : {}),
  });

const successResponse = <TValue>(
  request: CanonicalApiRequest,
  result: TValue,
  transaction?: ApiTransactionMetadata,
): ApiSuccessResponse<TValue> =>
  freeze({
    success: true,
    result,
    metadata: responseMetadata(request, transaction),
    diagnostics: successDiagnostics(),
    warnings: EMPTY_WARNINGS,
    version: API_HOST_PROTOCOL_VERSION,
  });

const errorResponse = (
  request: Partial<ApiRequest>,
  code: ApiHostErrorCode,
  message: string,
  transaction?: ApiTransactionMetadata,
): ApiErrorResponse =>
  freeze({
    success: false,
    error: {
      code,
      message,
    },
    metadata: failureMetadata(request, transaction),
    diagnostics: errorDiagnostics(),
    warnings: EMPTY_WARNINGS,
    version: API_HOST_PROTOCOL_VERSION,
  });

const isExpectedVersionOptions = (value: unknown): value is { expected_version?: number | undefined } =>
  value === undefined ||
  (isObject(value) && (value.expected_version === undefined || isInteger(value.expected_version)));

const asWritePayload = (value: unknown): ContextWritePayload | undefined => {
  if (!isObject(value) || !isString(value.key) || !('value' in value) || !isExpectedVersionOptions(value.options)) {
    return undefined;
  }

  return value as unknown as ContextWritePayload;
};

const asRetrievePayload = (value: unknown): ContextRetrievePayload | undefined => {
  if (!isObject(value) || !isString(value.key)) {
    return undefined;
  }

  return value as unknown as ContextRetrievePayload;
};

const asDeletePayload = (value: unknown): ContextDeletePayload | undefined => {
  if (!isObject(value) || !isString(value.key) || !isExpectedVersionOptions(value.options)) {
    return undefined;
  }

  return value as unknown as ContextDeletePayload;
};

const asQueryPayload = (query: unknown, payload: unknown): ContextQueryPayload | undefined => {
  if (query !== undefined) {
    if (!isObject(query)) {
      return undefined;
    }
    return { query: query as ContextQueryPayload['query'] };
  }

  if (payload === undefined) {
    return {};
  }

  if (!isObject(payload)) {
    return undefined;
  }

  if ('query' in payload && payload.query !== undefined && !isObject(payload.query)) {
    return undefined;
  }

  return payload as ContextQueryPayload;
};

const parseRequest = (request: ApiRequest | unknown): CanonicalApiRequest | undefined => {
  if (!isObject(request) || !isString(request.operation) || request.resource !== 'context') {
    return undefined;
  }

  const version = request.version ?? API_HOST_PROTOCOL_VERSION;
  if (!isString(version) || !SUPPORTED_PROTOCOL_VERSIONS.has(version)) {
    return undefined;
  }

  if (!operationSet.has(request.operation as ApiOperation)) {
    return undefined;
  }

  if (request.metadata !== undefined && !isObject(request.metadata)) {
    return undefined;
  }

  if (request.correlation_id !== undefined && !isString(request.correlation_id)) {
    return undefined;
  }

  if (request.request_id !== undefined && !isString(request.request_id)) {
    return undefined;
  }

  if (request.timestamp !== undefined && !isIsoTimestamp(request.timestamp)) {
    return undefined;
  }

  if (request.query !== undefined && !isObject(request.query)) {
    return undefined;
  }

  if (request.transaction !== undefined) {
    if (!isObject(request.transaction) || !isString(request.transaction.id)) {
      return undefined;
    }
  }

  return request as unknown as CanonicalApiRequest;
};

const requestContextFrom = (request: CanonicalApiRequest): ContextServiceRequestContext => {
  const metadata = isObject(request.metadata) ? request.metadata : {};
  const rawTransportMetadata = isObject(metadata.transport_metadata) ? metadata.transport_metadata : {};
  const rawAuthentication = isObject(rawTransportMetadata.authentication)
    ? rawTransportMetadata.authentication
    : isObject(metadata.authentication)
      ? metadata.authentication
      : {};
  const rawAuthenticationMetadata = isObject(rawAuthentication.metadata) ? rawAuthentication.metadata : {};
  const rawTracing = isObject(rawTransportMetadata.tracing)
    ? rawTransportMetadata.tracing
    : isObject(metadata.correlation)
      ? metadata.correlation
      : {};

  const principal =
    isObject(rawAuthentication.principal) && isString(rawAuthentication.principal.id)
      ? {
          id: rawAuthentication.principal.id,
          ...(isString(rawAuthentication.principal.type) ? { type: rawAuthentication.principal.type } : {}),
        }
      : isString(rawAuthentication.principal)
        ? rawAuthentication.principal
        : 'anonymous';

  const subject =
    isObject(rawAuthentication.subject) && isString(rawAuthentication.subject.id)
      ? {
          id: rawAuthentication.subject.id,
          ...(isString(rawAuthentication.subject.type) ? { type: rawAuthentication.subject.type } : {}),
        }
      : isString(rawAuthentication.subject)
        ? rawAuthentication.subject
        : 'anonymous';

  const tenant =
    isObject(rawAuthentication.tenant) && isString(rawAuthentication.tenant.id)
      ? { id: rawAuthentication.tenant.id }
      : isString(rawAuthentication.tenant)
        ? rawAuthentication.tenant
        : undefined;

  return createRuntimeRequestContext({
    authentication: {
      authenticated: rawAuthentication.authenticated === true,
      principal,
      subject,
      ...(tenant ? { tenant } : {}),
      roles: isStringArray(rawAuthentication.roles) ? rawAuthentication.roles : [],
      claims: isObject(rawAuthentication.claims) ? rawAuthentication.claims : {},
      method: isString(rawAuthentication.method) ? (rawAuthentication.method as RuntimeAuthenticationMethod) : 'anonymous',
      metadata: {
        issuer: isString(rawAuthenticationMetadata.issuer) ? rawAuthenticationMetadata.issuer : undefined,
        authenticated_at: isString(rawAuthenticationMetadata.authenticated_at) ? rawAuthenticationMetadata.authenticated_at : undefined,
        session_id: isString(rawAuthenticationMetadata.session_id) ? rawAuthenticationMetadata.session_id : undefined,
        attributes: isObject(rawAuthenticationMetadata.attributes) ? rawAuthenticationMetadata.attributes : {},
      },
    },
    correlation: {
      correlation_id:
        (isString(rawTracing.correlation_id) ? rawTracing.correlation_id : undefined) ??
        request.correlation_id ??
        'runtime-correlation-unspecified',
      request_id:
        (isString(rawTracing.request_id) ? rawTracing.request_id : undefined) ?? request.request_id ?? 'runtime-request-unspecified',
      trace_id: isString(rawTracing.trace_id) ? rawTracing.trace_id : undefined,
      span_id: isString(rawTracing.span_id) ? rawTracing.span_id : undefined,
      timestamp:
        (isIsoTimestamp(rawTracing.timestamp) ? rawTracing.timestamp : undefined) ??
        request.timestamp ??
        '1970-01-01T00:00:00.000Z',
    },
    attributes: isObject(metadata.request_attributes) ? metadata.request_attributes : {},
  });
};

const transactionMetadata = (transactionId: string, lifecycle: 'active' | 'finalized'): ApiTransactionMetadata =>
  freeze({
    id: transactionId,
    ownership: 'host-local',
    expiry: 'until-finalized-or-host-disposal',
    lifecycle,
  });

const mapContextError = (request: CanonicalApiRequest, error: ContextServiceError, transaction?: ApiTransactionMetadata): ApiErrorResponse => {
  switch (error.code) {
    case 'context-service.duplicate-key':
    case 'context-service.version-conflict':
      return errorResponse(request, 'api.conflict', error.message, transaction);
    case 'context-service.not-found':
      return errorResponse(request, 'api.not_found', error.message, transaction);
    case 'context-service.invalid-query':
      return errorResponse(request, 'api.validation_failed', error.message, transaction);
    case 'context-service.transaction-closed':
      return errorResponse(request, 'api.transaction_closed', error.message, transaction);
    case 'context-service.unavailable':
      return errorResponse(request, 'api.unavailable', error.message, transaction);
  }
};

class DefaultApiHost implements ApiHost {
  readonly #context: ContextService;
  readonly #transactions = new Map<string, StoredTransaction>();

  constructor(options: ApiHostOptions) {
    this.#context = options.services.context;
  }

  async handle(request: ApiRequest): Promise<ApiResponse> {
    const parsed = parseRequest(request);
    if (!parsed) {
      return errorResponse(
        isObject(request) ? request : {},
        'api.invalid_request',
        'API requests must provide a supported version, canonical operation, resource, and valid envelope fields.',
      );
    }

    try {
      return await this.#dispatch(parsed);
    } catch {
      return errorResponse(parsed, 'api.internal', 'Unexpected API host failure.');
    }
  }

  async #dispatch(request: CanonicalApiRequest): Promise<ApiResponse> {
    switch (request.operation) {
      case 'context.create': {
        const payload = asWritePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.create requires payload { key, value, options? }.');
        }
        return this.#mapResult(request, await this.#context.create(payload.key, payload.value as never, payload.options ?? {}, requestContextFrom(request)));
      }
      case 'context.retrieve': {
        const payload = asRetrievePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.retrieve requires payload { key }.');
        }
        return this.#mapResult(request, await this.#context.retrieve(payload.key, requestContextFrom(request)));
      }
      case 'context.update': {
        const payload = asWritePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.update requires payload { key, value, options? }.');
        }
        return this.#mapResult(request, await this.#context.update(payload.key, payload.value as never, payload.options ?? {}, requestContextFrom(request)));
      }
      case 'context.delete': {
        const payload = asDeletePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.delete requires payload { key, options? }.');
        }
        return this.#mapResult(request, await this.#context.delete(payload.key, payload.options ?? {}, requestContextFrom(request)));
      }
      case 'context.query': {
        const payload = asQueryPayload(request.query, request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.query requires query {} or payload { query? }.');
        }
        return this.#mapResult(request, await this.#context.query(payload.query ?? {}, requestContextFrom(request)));
      }
      case 'context.transaction.begin': {
        if (request.transaction) {
          return errorResponse(request, 'api.invalid_request', 'context.transaction.begin must not provide a transaction handle.');
        }
        const begun = await this.#context.beginTransaction(requestContextFrom(request));
        if (!begun.ok) {
          return mapContextError(request, begun.error);
        }
        const metadata = transactionMetadata(begun.value.id, 'active');
        this.#transactions.set(begun.value.id, {
          transaction: begun.value,
          metadata,
        });
        const payload: ContextTransactionHandleResponse = freeze({
          transaction_id: begun.value.id,
          state: begun.value.state,
        });
        return successResponse(request, payload, metadata);
      }
      case 'context.transaction.create': {
        const payload = asWritePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.transaction.create requires payload { key, value, options? }.');
        }
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        return this.#mapResult(
          request,
          await stored.transaction.create(payload.key, payload.value as never, payload.options ?? {}, requestContextFrom(request)),
          stored.metadata,
        );
      }
      case 'context.transaction.retrieve': {
        const payload = asRetrievePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.transaction.retrieve requires payload { key }.');
        }
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        return this.#mapResult(request, await stored.transaction.retrieve(payload.key, requestContextFrom(request)), stored.metadata);
      }
      case 'context.transaction.update': {
        const payload = asWritePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.transaction.update requires payload { key, value, options? }.');
        }
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        return this.#mapResult(
          request,
          await stored.transaction.update(payload.key, payload.value as never, payload.options ?? {}, requestContextFrom(request)),
          stored.metadata,
        );
      }
      case 'context.transaction.delete': {
        const payload = asDeletePayload(request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.transaction.delete requires payload { key, options? }.');
        }
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        return this.#mapResult(request, await stored.transaction.delete(payload.key, payload.options ?? {}, requestContextFrom(request)), stored.metadata);
      }
      case 'context.transaction.query': {
        const payload = asQueryPayload(request.query, request.payload);
        if (!payload) {
          return errorResponse(request, 'api.invalid_request', 'context.transaction.query requires query {} or payload { query? }.');
        }
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        return this.#mapResult(request, await stored.transaction.query(payload.query ?? {}, requestContextFrom(request)), stored.metadata);
      }
      case 'context.transaction.commit': {
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        const result = await stored.transaction.commit();
        if (result.ok) {
          this.#transactions.delete(stored.transaction.id);
        }
        return this.#mapResult(request, result, transactionMetadata(stored.transaction.id, 'finalized'));
      }
      case 'context.transaction.rollback': {
        const stored = this.#lookupTransaction(request);
        if (!stored) {
          return errorResponse(request, 'api.not_found', 'Unknown transaction handle.');
        }
        const result = await stored.transaction.rollback();
        if (result.ok) {
          this.#transactions.delete(stored.transaction.id);
        }
        return this.#mapResult(request, result, transactionMetadata(stored.transaction.id, 'finalized'));
      }
    }
  }

  #lookupTransaction(request: CanonicalApiRequest): StoredTransaction | undefined {
    if (!request.transaction) {
      return undefined;
    }

    return this.#transactions.get(request.transaction.id);
  }

  #mapResult(
    request: CanonicalApiRequest,
    result:
      | ContextServiceResult<ContextStoreRecord>
      | ContextServiceResult<ContextApiPayload>
      | ContextServiceResult<ContextStoreCommitResult>
      | ContextServiceResult<ContextStoreRollbackResult>,
    transaction?: ApiTransactionMetadata,
  ): ApiResponse {
    if (!result.ok) {
      return mapContextError(request, result.error, transaction);
    }

    return successResponse(request, result.value, transaction);
  }
}

export const createApiHost = (options: ApiHostOptions): ApiHost => new DefaultApiHost(options);
