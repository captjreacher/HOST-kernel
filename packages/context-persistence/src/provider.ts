import {
  beginTransaction as beginStoreTransaction,
  createInMemoryContextStore,
  type ContextStore,
  type ContextStoreCommitResult,
  type ContextStoreRollbackResult,
  type ContextStoreTransaction,
} from '@host/context-store';
import type { ContextRuntime } from '@host/context-runtime';
import {
  type ContextPersistenceCapabilities,
  type ContextPersistenceCommitResult,
  type ContextPersistenceConnectResult,
  type ContextPersistenceDisconnectResult,
  ContextPersistenceError,
  type ContextPersistenceFailure,
  type ContextPersistenceHealth,
  type ContextPersistenceOperation,
  type ContextPersistenceOptions,
  type ContextPersistenceProvider,
  type ContextPersistenceRegistration,
  type ContextPersistenceResult,
  type ContextPersistenceRollbackResult,
  type ContextPersistenceSession,
  type ContextPersistenceSessionCloseResult,
  type ContextPersistenceTransaction,
  type ContextPersistenceTransactionState,
} from './contracts.js';

const providerVersion = '1.0.0';

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

const success = <TValue>(operation: ContextPersistenceOperation, value: TValue) =>
  freeze({
    ok: true,
    operation,
    value,
  }) satisfies ContextPersistenceResult<TValue>;

const failure = (operation: ContextPersistenceOperation, error: ContextPersistenceError): ContextPersistenceFailure =>
  freeze({
    ok: false,
    operation,
    error,
  });

const capabilitiesValue = (): ContextPersistenceCapabilities =>
  freeze({
    transactions: true,
    optimistic_locking: true,
    snapshots: true,
    version_history: false,
    bulk_operations: false,
    streaming_support: false,
  });

const registrationValue = (): ContextPersistenceRegistration =>
  freeze({
    provider_id: 'context-persistence.in-memory',
    provider_name: 'in-memory',
    provider_version: providerVersion,
    provider_kind: 'reference',
  });

const healthValue = (
  registration: ContextPersistenceRegistration,
  connected: boolean,
  capabilities: ContextPersistenceCapabilities,
): ContextPersistenceHealth =>
  freeze({
    status: connected ? 'healthy' : 'disconnected',
    healthy: connected,
    connected,
    provider: registration,
    capabilities,
    issues: connected ? [] : ['Provider is disconnected.'],
  });

const createError = (
  code: ContextPersistenceError['code'],
  message: string,
  options: ConstructorParameters<typeof ContextPersistenceError>[2],
): ContextPersistenceError => new ContextPersistenceError(code, message, options);

class InMemoryPersistenceProvider implements ContextPersistenceProvider {
  readonly #runtime: ContextRuntime;
  readonly #now: () => string;
  readonly #registration = registrationValue();
  readonly #capabilities = capabilitiesValue();
  #connected = false;
  #store: ContextStore | undefined;
  readonly #sessions = new Set<InMemoryPersistenceSession>();
  readonly #transactions = new Set<InMemoryPersistenceTransaction>();
  #sessionSequence = 0;

  constructor(options: ContextPersistenceOptions) {
    this.#runtime = options.runtime;
    this.#now = options.now ?? (() => new Date().toISOString());
  }

  get runtime(): ContextRuntime {
    return this.#runtime;
  }

  get registration(): ContextPersistenceRegistration {
    return this.#registration;
  }

  get state() {
    return this.#connected ? 'connected' : 'disconnected';
  }

  #buildStore(): ContextStore {
    return createInMemoryContextStore({
      runtime: this.#runtime,
      now: this.#now,
    });
  }

  #storeOrError(operation: ContextPersistenceOperation): ContextStore | ContextPersistenceFailure {
    if (!this.#connected || !this.#store) {
      return failure(
        operation,
        createError('context-persistence.not-connected', 'Persistence provider is not connected.', {
          operation,
          provider_id: this.#registration.provider_id,
        }),
      );
    }

    return this.#store;
  }

  #closeActiveResources(): void {
    for (const transaction of this.#transactions) {
      transaction.forceClose();
    }
    for (const session of this.#sessions) {
      session.forceClose();
    }
    this.#transactions.clear();
    this.#sessions.clear();
  }

  registerSession(session: InMemoryPersistenceSession): void {
    this.#sessions.add(session);
  }

  unregisterSession(session: InMemoryPersistenceSession): void {
    this.#sessions.delete(session);
  }

  registerTransaction(transaction: InMemoryPersistenceTransaction): void {
    this.#transactions.add(transaction);
  }

  unregisterTransaction(transaction: InMemoryPersistenceTransaction): void {
    this.#transactions.delete(transaction);
  }

  nextSessionId(): string {
    this.#sessionSequence += 1;
    return `ctx-session-${this.#sessionSequence}`;
  }

  async connect(): Promise<ContextPersistenceResult<ContextPersistenceConnectResult>> {
    if (this.#connected) {
      return failure(
        'connect',
        createError('context-persistence.already-connected', 'Persistence provider is already connected.', {
          operation: 'connect',
          provider_id: this.#registration.provider_id,
        }),
      );
    }

    this.#store = this.#buildStore();
    this.#connected = true;
    return success(
      'connect',
      freeze({
        provider: this.#registration,
        state: 'connected',
      }),
    );
  }

  async disconnect(): Promise<ContextPersistenceResult<ContextPersistenceDisconnectResult>> {
    if (!this.#connected) {
      return failure(
        'disconnect',
        createError('context-persistence.not-connected', 'Persistence provider is not connected.', {
          operation: 'disconnect',
          provider_id: this.#registration.provider_id,
        }),
      );
    }

    this.#closeActiveResources();
    this.#store = undefined;
    this.#connected = false;
    return success(
      'disconnect',
      freeze({
        provider: this.#registration,
        state: 'disconnected',
      }),
    );
  }

  async beginSession(): Promise<ContextPersistenceResult<ContextPersistenceSession>> {
    const store = this.#storeOrError('begin-session');
    if ('ok' in store) {
      return store;
    }

    const session = new InMemoryPersistenceSession(this, this.#registration, this.nextSessionId(), store);
    this.registerSession(session);
    return success('begin-session', session);
  }

  async beginTransaction(): Promise<ContextPersistenceResult<ContextPersistenceTransaction>> {
    const session = await this.beginSession();
    if (!session.ok) {
      return session;
    }

    return session.value.beginTransaction();
  }

  async capabilities(): Promise<ContextPersistenceResult<ContextPersistenceCapabilities>> {
    return success('capabilities', this.#capabilities);
  }

  async health(): Promise<ContextPersistenceResult<ContextPersistenceHealth>> {
    return success('health', healthValue(this.#registration, this.#connected, this.#capabilities));
  }
}

class InMemoryPersistenceSession implements ContextPersistenceSession {
  readonly #providerRef: InMemoryPersistenceProvider;
  readonly #registration: ContextPersistenceRegistration;
  readonly #store: ContextStore;
  readonly #id: string;
  #state: 'active' | 'closed' = 'active';

  constructor(provider: InMemoryPersistenceProvider, registration: ContextPersistenceRegistration, id: string, store: ContextStore) {
    this.#providerRef = provider;
    this.#registration = registration;
    this.#id = id;
    this.#store = store;
  }

  get id(): string {
    return this.#id;
  }

  get state() {
    return this.#state;
  }

  get provider(): ContextPersistenceRegistration {
    return this.#registration;
  }

  get store(): ContextStore {
    return this.#store;
  }

  forceClose(): void {
    this.#state = 'closed';
  }

  #ensureActive(operation: ContextPersistenceOperation): ContextPersistenceFailure | undefined {
    if (this.#state === 'active') {
      return undefined;
    }

    return failure(
      operation,
      createError('context-persistence.session-closed', `Persistence session ${this.#id} is closed.`, {
        operation,
        provider_id: this.#registration.provider_id,
        session_id: this.#id,
      }),
    );
  }

  async beginTransaction(): Promise<ContextPersistenceResult<ContextPersistenceTransaction>> {
    const closed = this.#ensureActive('begin-transaction');
    if (closed) {
      return closed;
    }

    const opened = await beginStoreTransaction(this.#store);
    if (!opened.ok) {
      return failure(
        'begin-transaction',
        createError('context-persistence.transaction-closed', opened.error.message, {
          operation: 'begin-transaction',
          provider_id: this.#registration.provider_id,
          session_id: this.#id,
        }),
      );
    }

    const transaction = new InMemoryPersistenceTransaction(this.#providerRef, this.#registration, this.#id, opened.value);
    this.#providerRef.registerTransaction(transaction);
    return success('begin-transaction', transaction);
  }

  async close(): Promise<ContextPersistenceResult<ContextPersistenceSessionCloseResult>> {
    const closed = this.#ensureActive('close-session');
    if (closed) {
      return closed;
    }

    this.#state = 'closed';
    this.#providerRef.unregisterSession(this);
    return success(
      'close-session',
      freeze({
        session_id: this.#id,
        state: 'closed',
      }),
    );
  }
}

class InMemoryPersistenceTransaction implements ContextPersistenceTransaction {
  readonly #providerRef: InMemoryPersistenceProvider;
  readonly #registration: ContextPersistenceRegistration;
  readonly #sessionId: string;
  readonly #store: ContextStoreTransaction;
  #state: ContextPersistenceTransactionState = 'active';

  constructor(
    provider: InMemoryPersistenceProvider,
    registration: ContextPersistenceRegistration,
    sessionId: string,
    store: ContextStoreTransaction,
  ) {
    this.#providerRef = provider;
    this.#registration = registration;
    this.#sessionId = sessionId;
    this.#store = store;
  }

  get id(): string {
    return this.#store.id;
  }

  get session_id(): string {
    return this.#sessionId;
  }

  get state(): ContextPersistenceTransactionState {
    return this.#state;
  }

  get provider(): ContextPersistenceRegistration {
    return this.#registration;
  }

  get store(): ContextStoreTransaction {
    return this.#store;
  }

  forceClose(): void {
    if (this.#state === 'active') {
      this.#state = 'closed';
    }
  }

  #ensureActive(operation: ContextPersistenceOperation): ContextPersistenceFailure | undefined {
    if (this.#state === 'active') {
      return undefined;
    }

    return failure(
      operation,
      createError('context-persistence.transaction-closed', `Persistence transaction ${this.id} is ${this.#state}.`, {
        operation,
        provider_id: this.#registration.provider_id,
        session_id: this.#sessionId,
        transaction_id: this.id,
      }),
    );
  }

  async commit(): Promise<ContextPersistenceResult<ContextPersistenceCommitResult>> {
    const closed = this.#ensureActive('commit');
    if (closed) {
      return closed;
    }

    const committed = await this.#store.commit();
    if (!committed.ok) {
      return failure(
        'commit',
        createError('context-persistence.transaction-closed', committed.error.message, {
          operation: 'commit',
          provider_id: this.#registration.provider_id,
          session_id: this.#sessionId,
          transaction_id: this.id,
        }),
      );
    }

    this.#state = 'committed';
    this.#providerRef.unregisterTransaction(this);
    return success('commit', mapCommit(committed.value));
  }

  async rollback(): Promise<ContextPersistenceResult<ContextPersistenceRollbackResult>> {
    const closed = this.#ensureActive('rollback');
    if (closed) {
      return closed;
    }

    const rolledBack = await this.#store.rollback();
    if (!rolledBack.ok) {
      return failure(
        'rollback',
        createError('context-persistence.transaction-closed', rolledBack.error.message, {
          operation: 'rollback',
          provider_id: this.#registration.provider_id,
          session_id: this.#sessionId,
          transaction_id: this.id,
        }),
      );
    }

    this.#state = 'rolled-back';
    this.#providerRef.unregisterTransaction(this);
    return success('rollback', mapRollback(rolledBack.value));
  }
}

const mapCommit = (value: ContextStoreCommitResult): ContextPersistenceCommitResult =>
  freeze({
    transaction_id: value.transaction_id,
    state: 'committed',
    revision: value.revision,
  });

const mapRollback = (value: ContextStoreRollbackResult): ContextPersistenceRollbackResult =>
  freeze({
    transaction_id: value.transaction_id,
    state: 'rolled-back',
  });

export const createInMemoryPersistenceProvider = (options: ContextPersistenceOptions): ContextPersistenceProvider =>
  new InMemoryPersistenceProvider(options);

export const createPersistenceProvider = (options: ContextPersistenceOptions): ContextPersistenceProvider =>
  createInMemoryPersistenceProvider(options);

export const connect = (provider: ContextPersistenceProvider): Promise<ContextPersistenceResult<ContextPersistenceConnectResult>> => provider.connect();

export const disconnect = (provider: ContextPersistenceProvider): Promise<ContextPersistenceResult<ContextPersistenceDisconnectResult>> => provider.disconnect();

export const beginSession = (provider: ContextPersistenceProvider): Promise<ContextPersistenceResult<ContextPersistenceSession>> => provider.beginSession();

export const beginTransaction = (
  target: ContextPersistenceProvider | ContextPersistenceSession,
): Promise<ContextPersistenceResult<ContextPersistenceTransaction>> => target.beginTransaction();

export const capabilities = (
  provider: ContextPersistenceProvider,
): Promise<ContextPersistenceResult<ContextPersistenceCapabilities>> => provider.capabilities();

export const health = (provider: ContextPersistenceProvider): Promise<ContextPersistenceResult<ContextPersistenceHealth>> => provider.health();
