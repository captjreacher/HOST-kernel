import type { ContextStore, ContextStoreTransaction } from '@host/context-store';
import type { ContextRuntime } from '@host/context-runtime';

export type ContextPersistenceOperation =
  | 'connect'
  | 'disconnect'
  | 'begin-session'
  | 'close-session'
  | 'begin-transaction'
  | 'commit'
  | 'rollback'
  | 'capabilities'
  | 'health';

export type ContextPersistenceProviderState = 'disconnected' | 'connected';
export type ContextPersistenceSessionState = 'active' | 'closed';
export type ContextPersistenceTransactionState = 'active' | 'committed' | 'rolled-back' | 'closed';

export type ContextPersistenceErrorCode =
  | 'context-persistence.already-connected'
  | 'context-persistence.not-connected'
  | 'context-persistence.session-closed'
  | 'context-persistence.transaction-closed'
  | 'context-persistence.version-conflict'
  | 'context-persistence.io-failure'
  | 'context-persistence.storage-corrupted';

export interface ContextPersistenceRegistration {
  readonly provider_id: string;
  readonly provider_name: string;
  readonly provider_version: string;
  readonly provider_kind: 'reference' | 'filesystem' | 'sqlite' | 'postgres' | 'supabase' | 'graph';
}

export interface ContextPersistenceCapabilities {
  readonly transactions: boolean;
  readonly optimistic_locking: boolean;
  readonly snapshots: boolean;
  readonly version_history: boolean;
  readonly bulk_operations: boolean;
  readonly streaming_support: boolean;
}

export interface ContextPersistenceHealth {
  readonly status: 'healthy' | 'disconnected';
  readonly healthy: boolean;
  readonly connected: boolean;
  readonly provider: ContextPersistenceRegistration;
  readonly capabilities: ContextPersistenceCapabilities;
  readonly issues: readonly string[];
}

export interface ContextPersistenceErrorOptions {
  readonly operation: ContextPersistenceOperation;
  readonly provider_id: string;
  readonly session_id?: string | undefined;
  readonly transaction_id?: string | undefined;
  readonly key?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;
}

export class ContextPersistenceError extends Error {
  readonly code: ContextPersistenceErrorCode;
  readonly operation: ContextPersistenceOperation;
  readonly provider_id: string;
  readonly session_id?: string | undefined;
  readonly transaction_id?: string | undefined;
  readonly key?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;

  constructor(code: ContextPersistenceErrorCode, message: string, options: ContextPersistenceErrorOptions) {
    super(message);
    this.name = 'ContextPersistenceError';
    this.code = code;
    this.operation = options.operation;
    this.provider_id = options.provider_id;
    this.session_id = options.session_id;
    this.transaction_id = options.transaction_id;
    this.key = options.key;
    this.expected_version = options.expected_version;
    this.actual_version = options.actual_version;
  }
}

export interface ContextPersistenceSuccess<TValue> {
  readonly ok: true;
  readonly operation: ContextPersistenceOperation;
  readonly value: TValue;
}

export interface ContextPersistenceFailure {
  readonly ok: false;
  readonly operation: ContextPersistenceOperation;
  readonly error: ContextPersistenceError;
}

export type ContextPersistenceResult<TValue> = ContextPersistenceSuccess<TValue> | ContextPersistenceFailure;

export interface ContextPersistenceConnectResult {
  readonly provider: ContextPersistenceRegistration;
  readonly state: 'connected';
}

export interface ContextPersistenceDisconnectResult {
  readonly provider: ContextPersistenceRegistration;
  readonly state: 'disconnected';
}

export interface ContextPersistenceSessionCloseResult {
  readonly session_id: string;
  readonly state: 'closed';
}

export interface ContextPersistenceCommitResult {
  readonly transaction_id: string;
  readonly state: 'committed';
  readonly revision: number;
}

export interface ContextPersistenceRollbackResult {
  readonly transaction_id: string;
  readonly state: 'rolled-back';
}

export interface ContextPersistenceOptions {
  readonly runtime: ContextRuntime;
  readonly now?: (() => string) | undefined;
}

export interface ContextPersistenceProvider {
  readonly runtime: ContextRuntime;
  readonly registration: ContextPersistenceRegistration;
  readonly state: ContextPersistenceProviderState;
  connect(): Promise<ContextPersistenceResult<ContextPersistenceConnectResult>>;
  disconnect(): Promise<ContextPersistenceResult<ContextPersistenceDisconnectResult>>;
  beginSession(): Promise<ContextPersistenceResult<ContextPersistenceSession>>;
  beginTransaction(): Promise<ContextPersistenceResult<ContextPersistenceTransaction>>;
  capabilities(): Promise<ContextPersistenceResult<ContextPersistenceCapabilities>>;
  health(): Promise<ContextPersistenceResult<ContextPersistenceHealth>>;
}

export interface ContextPersistenceSession {
  readonly id: string;
  readonly state: ContextPersistenceSessionState;
  readonly provider: ContextPersistenceRegistration;
  readonly store: ContextStore;
  beginTransaction(): Promise<ContextPersistenceResult<ContextPersistenceTransaction>>;
  close(): Promise<ContextPersistenceResult<ContextPersistenceSessionCloseResult>>;
}

export interface ContextPersistenceTransaction {
  readonly id: string;
  readonly session_id: string;
  readonly state: ContextPersistenceTransactionState;
  readonly provider: ContextPersistenceRegistration;
  readonly store: ContextStoreTransaction;
  commit(): Promise<ContextPersistenceResult<ContextPersistenceCommitResult>>;
  rollback(): Promise<ContextPersistenceResult<ContextPersistenceRollbackResult>>;
}
