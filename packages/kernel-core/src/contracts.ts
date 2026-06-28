import type { DocumentRegistry } from '@host/kernel-documents';
import type { IdentifierService } from '@host/kernel-identifiers';
import type { ObjectiveRegistry } from '@host/kernel-objectives';
import type { RegistryService } from '@host/kernel-registry';
import type { Repository } from '@host/kernel-types';
import type { TaxonomyResolver } from '@host/kernel-types';
import type { ValidationEngine } from '@host/kernel-validation';

export interface KernelRepositoryAccessor {
  lookup(id: string): Repository | undefined;
  list(): Repository[];
}

export interface KernelRuntimeConfig {
  registry?: RegistryService;
  taxonomyResolver?: TaxonomyResolver;
  validationEngine?: ValidationEngine;
  identifierService?: IdentifierService;
  seedConstitutionalArtifacts?: boolean;
}

export interface KernelHealthCheckItem {
  name: string;
  healthy: boolean;
  message: string;
}

export interface KernelHealthCheckResult {
  healthy: boolean;
  status: 'healthy' | 'unhealthy';
  checks: KernelHealthCheckItem[];
  constitutionalArtifacts: string[];
  issues: string[];
}

export interface KernelRuntime {
  readonly identifiers: IdentifierService;
  readonly taxonomy: TaxonomyResolver;
  readonly validation: ValidationEngine;
  readonly registry: RegistryService;
  readonly objectives: ObjectiveRegistry;
  readonly documents: DocumentRegistry;
  readonly repositories: KernelRepositoryAccessor;
  healthCheck(): KernelHealthCheckResult;
}

export class KernelBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KernelBootstrapError';
  }
}
