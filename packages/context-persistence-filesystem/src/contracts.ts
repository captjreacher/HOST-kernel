import type {
  ContextPersistenceCapabilities,
  ContextPersistenceHealth,
  ContextPersistenceOptions,
  ContextPersistenceRegistration,
} from '@host/context-persistence';

export interface FilesystemPersistenceProviderOptions extends ContextPersistenceOptions {
  readonly directory: string;
  readonly file_name?: string | undefined;
}

export interface FilesystemPersistenceProviderFromPathOptions extends ContextPersistenceOptions {
  readonly file_name?: string | undefined;
}

export interface FilesystemPersistenceStorageDescriptor {
  readonly directory: string;
  readonly file_path: string;
  readonly file_name: string;
}

export interface FilesystemPersistenceProviderHealth extends ContextPersistenceHealth {
  readonly provider: ContextPersistenceRegistration & {
    readonly provider_kind: 'filesystem';
  };
  readonly storage: FilesystemPersistenceStorageDescriptor;
}

export type FilesystemPersistenceCapabilities = ContextPersistenceCapabilities;
