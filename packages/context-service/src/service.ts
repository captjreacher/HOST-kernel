import {
  createContextStoreFromProvider,
  type ContextPersistenceProvider,
  type ContextQuery,
  type ContextQueryResult,
  type ContextRuntimeValue,
  type ContextStore,
  type ContextStoreCommitResult,
  type ContextStoreDeleteOptions,
  type ContextStoreError,
  type ContextStoreRecord,
  type ContextStoreResult,
  type ContextStoreRollbackResult,
  type ContextStoreTransaction,
  type ContextStoreWriteOptions,
} from '@host/context-persistence';
import {
  ContextServiceError,
  type ContextServiceRequestContext,
  type ContextService,
  type ContextServiceOperation,
  type ContextServiceOptions,
  type ContextServiceResult,
  type ContextServiceTransaction,
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

const serviceSuccess = <TValue>(operation: ContextServiceOperation, value: TValue): ContextServiceResult<TValue> =>
  freeze({
    ok: true,
    operation,
    value,
  });

const serviceFailure = (operation: ContextServiceOperation, error: ContextServiceError): ContextServiceResult<never> =>
  freeze({
    ok: false,
    operation,
    error,
  });

const mapStoreError = (operation: ContextServiceOperation, error: ContextStoreError): ContextServiceError => {
  const code =
    error.code === 'context-store.duplicate-key'
      ? 'context-service.duplicate-key'
      : error.code === 'context-store.not-found'
        ? 'context-service.not-found'
        : error.code === 'context-store.version-conflict'
          ? 'context-service.version-conflict'
          : error.code === 'context-store.invalid-query'
            ? 'context-service.invalid-query'
            : error.code === 'context-store.transaction-closed'
              ? 'context-service.transaction-closed'
              : 'context-service.unavailable';

  return new ContextServiceError(code, error.message, {
    operation,
    key: error.key,
    expected_version: error.expected_version,
    actual_version: error.actual_version,
  });
};

const mapStoreResult = <TValue>(
  operation: ContextServiceOperation,
  result: ContextStoreResult<TValue>,
): ContextServiceResult<TValue> => (result.ok ? serviceSuccess(operation, result.value) : serviceFailure(operation, mapStoreError(operation, result.error)));

class DefaultContextServiceTransaction implements ContextServiceTransaction {
  readonly #transaction: ContextStoreTransaction;
  readonly #requestContext?: ContextServiceRequestContext | undefined;

  constructor(transaction: ContextStoreTransaction, requestContext?: ContextServiceRequestContext) {
    this.#transaction = transaction;
    this.#requestContext = requestContext;
  }

  get id(): string {
    return this.#transaction.id;
  }

  get state(): 'active' | 'committed' | 'rolled-back' {
    return this.#transaction.state;
  }

  async create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>> {
    return mapStoreResult('create', await this.#transaction.create(key, value, options));
  }

  async update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>> {
    return mapStoreResult('update', await this.#transaction.update(key, value, options));
  }

  async delete(
    key: string,
    options: ContextStoreDeleteOptions = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord>> {
    return mapStoreResult('delete', await this.#transaction.delete(key, options));
  }

  async retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    key: string,
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>> {
    return mapStoreResult('retrieve', await this.#transaction.retrieve<TValue>(key));
  }

  async query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query: ContextQuery = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextQueryResult<TValue>>> {
    return mapStoreResult('query', await this.#transaction.query<TValue>(query));
  }

  async commit(): Promise<ContextServiceResult<ContextStoreCommitResult>> {
    return mapStoreResult('commit', await this.#transaction.commit());
  }

  async rollback(): Promise<ContextServiceResult<ContextStoreRollbackResult>> {
    return mapStoreResult('rollback', await this.#transaction.rollback());
  }
}

class DefaultContextService implements ContextService {
  readonly #store: ContextStore;

  constructor(provider: ContextPersistenceProvider) {
    this.#store = createContextStoreFromProvider({ provider });
  }

  async create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>> {
    return mapStoreResult('create', await this.#store.create(key, value, options));
  }

  async update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>> {
    return mapStoreResult('update', await this.#store.update(key, value, options));
  }

  async delete(
    key: string,
    options: ContextStoreDeleteOptions = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord>> {
    return mapStoreResult('delete', await this.#store.delete(key, options));
  }

  async retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    key: string,
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextStoreRecord<TValue>>> {
    return mapStoreResult('retrieve', await this.#store.retrieve<TValue>(key));
  }

  async query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query: ContextQuery = {},
    _requestContext?: ContextServiceRequestContext,
  ): Promise<ContextServiceResult<ContextQueryResult<TValue>>> {
    return mapStoreResult('query', await this.#store.query<TValue>(query));
  }

  async beginTransaction(requestContext?: ContextServiceRequestContext): Promise<ContextServiceResult<ContextServiceTransaction>> {
    const begun = await this.#store.beginTransaction();
    if (!begun.ok) {
      return serviceFailure('begin-transaction', mapStoreError('begin-transaction', begun.error));
    }

    return serviceSuccess('begin-transaction', new DefaultContextServiceTransaction(begun.value, requestContext));
  }
}

export const createContextService = (options: ContextServiceOptions): ContextService => new DefaultContextService(options.provider);
