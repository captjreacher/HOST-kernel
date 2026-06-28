import type {
  ContextPersistenceCapabilities,
  ContextPersistenceHealth,
  ContextPersistenceOptions,
  ContextPersistenceRegistration,
} from '@host/context-persistence';

export interface SQLitePersistenceProviderOptions extends ContextPersistenceOptions {
  readonly file_path: string;
}

export interface SQLitePersistenceProviderFromPathOptions extends ContextPersistenceOptions {}

export interface SQLitePersistenceStorageDescriptor {
  readonly directory: string;
  readonly file_path: string;
  readonly file_name: string;
  readonly schema_version: number;
}

export interface SQLitePersistenceProviderHealth extends ContextPersistenceHealth {
  readonly provider: ContextPersistenceRegistration & {
    readonly provider_kind: 'sqlite';
  };
  readonly storage: SQLitePersistenceStorageDescriptor;
}

export type SQLitePersistenceCapabilities = ContextPersistenceCapabilities;
