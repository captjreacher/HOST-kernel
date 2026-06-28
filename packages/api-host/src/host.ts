import {
  ContextServiceError,
  type ContextService,
  type ContextServiceResult,
  type ContextServiceTransaction,
  type ContextStoreCommitResult,
  type ContextStoreRecord,
  type ContextStoreRollbackResult,
} from '@host/context-service';
import type {
  ApiErrorResponse,
  ApiHost,
  ApiHostErrorCode,
  ApiHostOptions,
  ApiRequest,
  ApiResponse,
  ApiRoute,
  ApiSuccessResponse,
  ContextApiPayload,
  ContextCreateRequest,
  ContextDeleteRequest,
  ContextQueryRequest,
  ContextRetrieveRequest,
  ContextTransactionDeleteRequest,
  ContextTransactionHandleResponse,
  ContextTransactionMutationRequest,
  ContextTransactionQueryRequest,
  ContextTransactionRequest,
  ContextTransactionRetrieveRequest,
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

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

const response = <TValue>(status: number, data: TValue): ApiSuccessResponse<TValue> =>
  freeze({
    status,
    body: {
      data,
    },
  });

const errorResponse = (status: number, code: ApiHostErrorCode, message: string): ApiErrorResponse =>
  freeze({
    status,
    body: {
      error: {
        code,
        message,
      },
    },
  });

const routeSet = new Set<ApiRoute>([
  'context.create',
  'context.retrieve',
  'context.update',
  'context.delete',
  'context.query',
  'context.begin-transaction',
  'context.transaction.create',
  'context.transaction.retrieve',
  'context.transaction.update',
  'context.transaction.delete',
  'context.transaction.query',
  'context.transaction.commit',
  'context.transaction.rollback',
]);

const isExpectedVersionOptions = (value: unknown): value is { expected_version?: number | undefined } =>
  value === undefined ||
  (isObject(value) && (value.expected_version === undefined || isInteger(value.expected_version)));

const asCreateRequest = (value: unknown): ContextCreateRequest | undefined => {
  if (!isObject(value) || !isString(value.key) || !('value' in value) || !isExpectedVersionOptions(value.options)) {
    return undefined;
  }

  return value as unknown as ContextCreateRequest;
};

const asRetrieveRequest = (value: unknown): ContextRetrieveRequest | undefined => {
  if (!isObject(value) || !isString(value.key)) {
    return undefined;
  }

  return value as unknown as ContextRetrieveRequest;
};

const asDeleteRequest = (value: unknown): ContextDeleteRequest | undefined => {
  if (!isObject(value) || !isString(value.key) || !isExpectedVersionOptions(value.options)) {
    return undefined;
  }

  return value as unknown as ContextDeleteRequest;
};

const asQueryRequest = (value: unknown): ContextQueryRequest | undefined => {
  if (value === undefined) {
    return {};
  }
  if (!isObject(value)) {
    return undefined;
  }

  return value as ContextQueryRequest;
};

const asTransactionRequest = (value: unknown): ContextTransactionRequest | undefined => {
  if (!isObject(value) || !isString(value.transaction_id)) {
    return undefined;
  }

  return value as unknown as ContextTransactionRequest;
};

const asTransactionMutationRequest = (value: unknown): ContextTransactionMutationRequest | undefined => {
  if (!isObject(value) || !isString(value.transaction_id) || !isString(value.key) || !('value' in value) || !isExpectedVersionOptions(value.options)) {
    return undefined;
  }

  return value as unknown as ContextTransactionMutationRequest;
};

const asTransactionDeleteRequest = (value: unknown): ContextTransactionDeleteRequest | undefined => {
  if (!isObject(value) || !isString(value.transaction_id) || !isString(value.key) || !isExpectedVersionOptions(value.options)) {
    return undefined;
  }

  return value as unknown as ContextTransactionDeleteRequest;
};

const asTransactionRetrieveRequest = (value: unknown): ContextTransactionRetrieveRequest | undefined => {
  if (!isObject(value) || !isString(value.transaction_id) || !isString(value.key)) {
    return undefined;
  }

  return value as unknown as ContextTransactionRetrieveRequest;
};

const asTransactionQueryRequest = (value: unknown): ContextTransactionQueryRequest | undefined => {
  if (!isObject(value) || !isString(value.transaction_id)) {
    return undefined;
  }

  return value as unknown as ContextTransactionQueryRequest;
};

const mapContextError = (error: ContextServiceError): ApiErrorResponse => {
  switch (error.code) {
    case 'context-service.duplicate-key':
      return errorResponse(409, 'api-host.context.duplicate-key', error.message);
    case 'context-service.not-found':
      return errorResponse(404, 'api-host.context.not-found', error.message);
    case 'context-service.version-conflict':
      return errorResponse(409, 'api-host.context.version-conflict', error.message);
    case 'context-service.invalid-query':
      return errorResponse(400, 'api-host.context.invalid-query', error.message);
    case 'context-service.transaction-closed':
      return errorResponse(409, 'api-host.context.transaction-closed', error.message);
    case 'context-service.unavailable':
      return errorResponse(503, 'api-host.context.unavailable', error.message);
  }
};

class DefaultApiHost implements ApiHost {
  readonly #context: ContextService;
  readonly #transactions = new Map<string, ContextServiceTransaction>();

  constructor(options: ApiHostOptions) {
    this.#context = options.services.context;
  }

  async handle(request: ApiRequest): Promise<ApiResponse> {
    if (!isObject(request) || !isString(request.route)) {
      return errorResponse(400, 'api-host.request.invalid', 'API request must provide a non-empty route string.');
    }

    if (!routeSet.has(request.route as ApiRoute)) {
      return errorResponse(404, 'api-host.route.not-found', `Unknown API route: ${request.route}`);
    }

    try {
      return await this.#dispatch(request.route as ApiRoute, request.input);
    } catch {
      return errorResponse(500, 'api-host.internal-error', 'Unexpected API host failure.');
    }
  }

  async #dispatch(route: ApiRoute, input: unknown): Promise<ApiResponse> {
    switch (route) {
      case 'context.create': {
        const parsed = asCreateRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.create requires { key, value, options? }.');
        }
        return this.#mapResult(201, await this.#context.create(parsed.key, parsed.value as never, parsed.options ?? {}));
      }
      case 'context.retrieve': {
        const parsed = asRetrieveRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.retrieve requires { key }.');
        }
        return this.#mapResult(200, await this.#context.retrieve(parsed.key));
      }
      case 'context.update': {
        const parsed = asCreateRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.update requires { key, value, options? }.');
        }
        return this.#mapResult(200, await this.#context.update(parsed.key, parsed.value as never, parsed.options ?? {}));
      }
      case 'context.delete': {
        const parsed = asDeleteRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.delete requires { key, options? }.');
        }
        return this.#mapResult(200, await this.#context.delete(parsed.key, parsed.options ?? {}));
      }
      case 'context.query': {
        const parsed = asQueryRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.query requires { query? }.');
        }
        return this.#mapResult(200, await this.#context.query(parsed.query ?? {}));
      }
      case 'context.begin-transaction': {
        const begun = await this.#context.beginTransaction();
        if (!begun.ok) {
          return mapContextError(begun.error);
        }
        this.#transactions.set(begun.value.id, begun.value);
        const payload: ContextTransactionHandleResponse = freeze({
          transaction_id: begun.value.id,
          state: begun.value.state,
        });
        return response(201, payload);
      }
      case 'context.transaction.create': {
        const parsed = asTransactionMutationRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.create requires { transaction_id, key, value, options? }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        return this.#mapResult(201, await transaction.create(parsed.key, parsed.value as never, parsed.options ?? {}));
      }
      case 'context.transaction.retrieve': {
        const parsed = asTransactionRetrieveRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.retrieve requires { transaction_id, key }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        return this.#mapResult(200, await transaction.retrieve(parsed.key));
      }
      case 'context.transaction.update': {
        const parsed = asTransactionMutationRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.update requires { transaction_id, key, value, options? }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        return this.#mapResult(200, await transaction.update(parsed.key, parsed.value as never, parsed.options ?? {}));
      }
      case 'context.transaction.delete': {
        const parsed = asTransactionDeleteRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.delete requires { transaction_id, key, options? }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        return this.#mapResult(200, await transaction.delete(parsed.key, parsed.options ?? {}));
      }
      case 'context.transaction.query': {
        const parsed = asTransactionQueryRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.query requires { transaction_id, query? }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        return this.#mapResult(200, await transaction.query(parsed.query ?? {}));
      }
      case 'context.transaction.commit': {
        const parsed = asTransactionRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.commit requires { transaction_id }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        const result = await transaction.commit();
        if (result.ok) {
          this.#transactions.delete(parsed.transaction_id);
        }
        return this.#mapResult(200, result);
      }
      case 'context.transaction.rollback': {
        const parsed = asTransactionRequest(input);
        if (!parsed) {
          return errorResponse(400, 'api-host.request.invalid', 'context.transaction.rollback requires { transaction_id }.');
        }
        const transaction = this.#transactions.get(parsed.transaction_id);
        if (!transaction) {
          return errorResponse(404, 'api-host.context.transaction-not-found', `Unknown transaction: ${parsed.transaction_id}`);
        }
        const result = await transaction.rollback();
        if (result.ok) {
          this.#transactions.delete(parsed.transaction_id);
        }
        return this.#mapResult(200, result);
      }
    }

    return errorResponse(404, 'api-host.route.not-found', `Unknown API route: ${route}`);
  }

  #mapResult(
    status: number,
    result:
      | ContextServiceResult<ContextStoreRecord>
      | ContextServiceResult<ContextApiPayload>
      | ContextServiceResult<ContextStoreCommitResult>
      | ContextServiceResult<ContextStoreRollbackResult>,
  ): ApiResponse {
    if (!result.ok) {
      return mapContextError(result.error);
    }

    return response(status, result.value);
  }
}

export const createApiHost = (options: ApiHostOptions): ApiHost => new DefaultApiHost(options);
