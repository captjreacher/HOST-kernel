import type { Identifier, RegistryRecord, ValidationReference } from '@host/kernel-types';

export interface RegistryStatusRecord extends RegistryRecord {}

export interface ProductRegistration extends RegistryRecord {
  lifecycle_state: 'proposed' | 'registered' | 'live' | 'suspended' | 'retired';
  integration_status: 'pending' | 'integrated' | 'blocked' | 'not_applicable';
  registered_capabilities: string[];
}

export interface RepositoryRegistration extends RegistryRecord {
  git_url: string;
  default_branch: string;
  owning_product: string | null;
}

export interface CapabilityRegistration extends RegistryRecord {
  owning_product: string | null;
  maturity: 'alpha' | 'beta' | 'stable' | 'deprecated';
  dependencies: string[];
}

export interface EventRegistration extends RegistryRecord {
  event_name: string;
  producer: string;
  consumers: string[];
  schema_version: string;
  payload_schema: Record<string, unknown>;
}

export type ProductRegistrationInput = Omit<ProductRegistration, 'id' | 'created_at' | 'updated_at' | 'registered_capabilities'> & {
  registered_capabilities?: string[];
};

export type ProductUpdateInput = Partial<Omit<ProductRegistration, 'id' | 'key' | 'created_at' | 'updated_at'>>;
export type RepositoryRegistrationInput = Omit<RepositoryRegistration, 'id' | 'created_at' | 'updated_at'>;
export type CapabilityRegistrationInput = Omit<CapabilityRegistration, 'id' | 'created_at' | 'updated_at'>;
export type EventRegistrationInput = Omit<EventRegistration, 'id' | 'created_at' | 'updated_at'>;

export interface IdentifierAllocationRecord {
  identifier: Identifier;
  allocated_at: string;
}

export type RegistryEntryKind =
  | 'objective'
  | 'decision'
  | 'adr'
  | 'repository'
  | 'taxonomy'
  | 'capability'
  | 'document'
  | 'naming'
  | 'relationship'
  | 'product'
  | 'event'
  | 'artifact'
  | 'workflow'
  | 'task';

export interface RegistryEntry extends RegistryRecord {
  kind: RegistryEntryKind;
  lifecycle_state?: string | null;
  integration_status?: string | null;
  registered_capabilities?: string[] | null;
  owning_objective?: string | null;
  owning_product?: string | null;
  git_url?: string | null;
  repository_url?: string | null;
  default_branch?: string | null;
  document_type?: string | null;
  event_name?: string | null;
  producer?: string | null;
  consumers?: string[] | null;
  schema_version?: string | null;
  payload_schema?: Record<string, unknown> | null;
  maturity?: string | null;
  dependencies?: string[] | null;
  references?: readonly ValidationReference[] | null;
  metadata?: Record<string, unknown> | null;
}

export interface RegistryFindQuery {
  kind?: RegistryEntryKind | readonly RegistryEntryKind[];
  status?: RegistryRecord['status'] | readonly RegistryRecord['status'][];
  owner?: string;
  key?: string;
  text?: string;
  lifecycle_state?: string;
}

export type RegistryRegisterInput = Omit<RegistryEntry, 'created_at' | 'updated_at'>;
export type RegistryUpdateInput = Partial<Omit<RegistryEntry, 'created_at' | 'updated_at'>> & {
  id?: string;
  kind?: RegistryEntryKind;
};
