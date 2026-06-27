export type RegistryStatus = 'active' | 'inactive' | 'deprecated';
export type LifecycleState = 'proposed' | 'registered' | 'live' | 'suspended' | 'retired';
export type IntegrationStatus = 'pending' | 'integrated' | 'blocked' | 'not_applicable';
export type CapabilityMaturity = 'alpha' | 'beta' | 'stable' | 'deprecated';

export interface RegistryRecord {
  id: string;
  key: string;
  display_name: string;
  description: string;
  status: RegistryStatus;
  version: string;
  owner: string;
  created_at: string;
  updated_at: string;
}

export interface ProductRegistration extends RegistryRecord {
  lifecycle_state: LifecycleState;
  integration_status: IntegrationStatus;
  registered_capabilities: string[];
}

export interface RepositoryRegistration extends RegistryRecord {
  git_url: string;
  default_branch: string;
  owning_product: string | null;
}

export interface CapabilityRegistration extends RegistryRecord {
  owning_product: string | null;
  maturity: CapabilityMaturity;
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
