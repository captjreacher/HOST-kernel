import {
  ContextStoreError,
  type ContextQuery,
  type ContextQueryResult,
  type ContextStore,
  type ContextStoreCommitResult,
  type ContextStoreDeleteOptions,
  type ContextStoreExistsResult,
  type ContextStoreRecord,
  type ContextStoreRollbackResult,
  type ContextStoreResult,
  type ContextStoreSnapshot,
  type ContextStoreTransaction,
  type ContextStoreWriteOptions,
} from '@host/context-store';
import type { ContextRuntime, ContextRuntimeValue } from '@host/context-runtime';
import {
  type ContextPersistenceError,
  type ContextPersistenceProvider,
  type ContextPersistenceSession,
  type ContextPersistenceTransaction,
} from './contracts.js';

export interface ContextStoreFromProviderOptions {
  readonly provider: ContextPersistenceProvider;
}

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

const storeSuccess = <TValue>(operation: ContextStoreResult<TValue>['operation'], value: TValue): ContextStoreResult<TValue> =>
  freeze({
    ok: true,
    operation,
    value,
  });

const storeFailure = (operation: ContextStoreResult<unknown>['operation'], error: ContextStoreError): ContextStoreResult<never> =>
  freeze({
    ok: false,
    operation,
    error,
  });

const mapPersistenceError = (
  operation: ContextStoreResult<unknown>['operation'],
  error: ContextPersistenceError,
): ContextStoreError => {
  const code =
    error.code === 'context-persistence.version-conflict'
      ? 'context-store.version-conflict'
      : error.code === 'context-persistence.transaction-closed' || error.code === 'context-persistence.session-closed'
        ? 'context-store.transaction-closed'
        : 'context-store.io-failure';

  return new ContextStoreError(code, error.message, {
    operation,
    key: error.key,
    expected_version: error.expected_version,
    actual_version: error.actual_version,
  });
};

const closeSession = async (session: ContextPersistenceSession): Promise<void> => {
  try {
    await session.close();
  } catch {
    // best effort lifecycle cleanup only
  }
};

class PersistenceBackedContextStore implements ContextStore {
  readonly #provider: ContextPersistenceProvider;

  constructor(provider: ContextPersistenceProvider) {
    this.#provider = provider;
  }

  get runtime(): ContextRuntime {
    return this.#provider.runtime;
  }

  async #withSession<TValue>(
    operation: ContextStoreResult<TValue>['operation'],
    run: (session: ContextPersistenceSession) => Promise<ContextStoreResult<TValue>>,
  ): Promise<ContextStoreResult<TValue>> {
    const opened = await this.#provider.beginSession();
    if (!opened.ok) {
      return storeFailure(operation, mapPersistenceError(operation, opened.error));
    }

    try {
      return await run(opened.value);
    } finally {
      await closeSession(opened.value);
    }
  }

  create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return this.#withSession('create', (session) => session.store.create(key, value, options));
  }

  update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return this.#withSession('update', (session) => session.store.update(key, value, options));
  }

  delete(key: string, options: ContextStoreDeleteOptions = {}): Promise<ContextStoreResult<ContextStoreRecord>> {
    return this.#withSession('delete', (session) => session.store.delete(key, options));
  }

  retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(key: string): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return this.#withSession('retrieve', (session) => session.store.retrieve<TValue>(key));
  }

  exists(key: string): Promise<ContextStoreResult<ContextStoreExistsResult>> {
    return this.#withSession('exists', (session) => session.store.exists(key));
  }

  query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query: ContextQuery = {}): Promise<ContextStoreResult<ContextQueryResult<TValue>>> {
    return this.#withSession('query', (session) => session.store.query<TValue>(query));
  }

  snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query: ContextQuery = {},
  ): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> {
    return this.#withSession('snapshot', (session) => session.store.snapshot<TValue>(query));
  }

  async beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>> {
    const opened = await this.#provider.beginSession();
    if (!opened.ok) {
      return storeFailure('begin-transaction', mapPersistenceError('begin-transaction', opened.error));
    }

    const begun = await opened.value.beginTransaction();
    if (!begun.ok) {
      await closeSession(opened.value);
      return storeFailure('begin-transaction', mapPersistenceError('begin-transaction', begun.error));
    }

    return storeSuccess('begin-transaction', new PersistenceBackedContextStoreTransaction(opened.value, begun.value));
  }
}

class PersistenceBackedContextStoreTransaction implements ContextStoreTransaction {
  readonly #session: ContextPersistenceSession;
  readonly #transaction: ContextPersistenceTransaction;

  constructor(session: ContextPersistenceSession, transaction: ContextPersistenceTransaction) {
    this.#session = session;
    this.#transaction = transaction;
  }

  get runtime(): ContextRuntime {
    return this.#transaction.store.runtime;
  }

  get id(): string {
    return this.#transaction.id;
  }

  get state() {
    return this.#transaction.store.state;
  }

  create<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return this.#transaction.store.create(key, value, options);
  }

  update<TValue extends ContextRuntimeValue>(
    key: string,
    value: TValue,
    options: ContextStoreWriteOptions = {},
  ): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return this.#transaction.store.update(key, value, options);
  }

  delete(key: string, options: ContextStoreDeleteOptions = {}): Promise<ContextStoreResult<ContextStoreRecord>> {
    return this.#transaction.store.delete(key, options);
  }

  retrieve<TValue extends ContextRuntimeValue = ContextRuntimeValue>(key: string): Promise<ContextStoreResult<ContextStoreRecord<TValue>>> {
    return this.#transaction.store.retrieve<TValue>(key);
  }

  exists(key: string): Promise<ContextStoreResult<ContextStoreExistsResult>> {
    return this.#transaction.store.exists(key);
  }

  query<TValue extends ContextRuntimeValue = ContextRuntimeValue>(query: ContextQuery = {}): Promise<ContextStoreResult<ContextQueryResult<TValue>>> {
    return this.#transaction.store.query<TValue>(query);
  }

  snapshot<TValue extends ContextRuntimeValue = ContextRuntimeValue>(
    query: ContextQuery = {},
  ): Promise<ContextStoreResult<ContextStoreSnapshot<TValue>>> {
    return this.#transaction.store.snapshot<TValue>(query);
  }

  async beginTransaction(): Promise<ContextStoreResult<ContextStoreTransaction>> {
    const begun = await this.#transaction.store.beginTransaction();
    if (!begun.ok) {
      return begun;
    }

    return storeSuccess('begin-transaction', begun.value);
  }

  async commit(): Promise<ContextStoreResult<ContextStoreCommitResult>> {
    try {
      const committed = await this.#transaction.commit();
      if (!committed.ok) {
        return storeFailure('commit', mapPersistenceError('commit', committed.error));
      }

      return storeSuccess(
        'commit',
        freeze({
          transaction_id: committed.value.transaction_id,
          state: 'committed',
          revision: committed.value.revision,
        }),
      );
    } finally {
      await closeSession(this.#session);
    }
  }

  async rollback(): Promise<ContextStoreResult<ContextStoreRollbackResult>> {
    try {
      const rolledBack = await this.#transaction.rollback();
      if (!rolledBack.ok) {
        return storeFailure('rollback', mapPersistenceError('rollback', rolledBack.error));
      }

      return storeSuccess(
        'rollback',
        freeze({
          transaction_id: rolledBack.value.transaction_id,
          state: 'rolled-back' as const,
        }),
      );
    } finally {
      await closeSession(this.#session);
    }
  }
}

export const createContextStoreFromProvider = (options: ContextStoreFromProviderOptions): ContextStore =>
  new PersistenceBackedContextStore(options.provider);
