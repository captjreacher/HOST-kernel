import type { Repository } from '@host/kernel-types';
import { CanonicalIdentifierService, type IdentifierService } from '@host/kernel-identifiers';
import { DocumentRegistryService, type DocumentRegistry } from '@host/kernel-documents';
import { ObjectiveRegistryService, type ObjectiveRegistry } from '@host/kernel-objectives';
import { RegistryService } from '@host/kernel-registry';
import { KernelTaxonomyResolver } from '@host/kernel-taxonomy';
import type { TaxonomyResolver } from '@host/kernel-types';
import { KernelValidationEngine, type ValidationEngine } from '@host/kernel-validation';
import { KernelBootstrapError } from './contracts.js';
import type { KernelHealthCheckItem, KernelHealthCheckResult, KernelRepositoryAccessor, KernelRuntime, KernelRuntimeConfig } from './contracts.js';

const assertBoolean = (value: unknown, name: string): void => {
  if (value !== undefined && typeof value !== 'boolean') {
    throw new KernelBootstrapError(`Invalid kernel bootstrap config: ${name} must be a boolean when provided.`);
  }
};

const assertObjectWithMethods = (value: unknown, name: string, methodNames: readonly string[]): void => {
  if (!value || typeof value !== 'object') {
    throw new KernelBootstrapError(`Invalid kernel bootstrap config: ${name} must be an object when provided.`);
  }

  const candidate = value as Record<string, unknown>;
  if (!methodNames.every((methodName) => typeof candidate[methodName] === 'function')) {
    throw new KernelBootstrapError(`Invalid kernel bootstrap config: ${name} does not expose the required service methods.`);
  }
};

const sortedStrings = (values: readonly string[]): string[] => [...values].sort((left, right) => left.localeCompare(right));

class KernelRepositoryCatalog implements KernelRepositoryAccessor {
  readonly #registry: RegistryService;

  constructor(registry: RegistryService) {
    this.#registry = registry;
  }

  lookup(id: string): Repository | undefined {
    const record = this.#registry.lookup('repository', id);
    if (!record) {
      return undefined;
    }

    const repositoryUrl = record.repository_url ?? record.git_url;

    return {
      id: record.id,
      key: record.key,
      display_name: record.display_name,
      description: record.description,
      status: record.status,
      version: record.version,
      owner: record.owner,
      created_at: record.created_at,
      updated_at: record.updated_at,
      ...(typeof repositoryUrl === 'string' && repositoryUrl.length > 0 ? { repository_url: repositoryUrl } : {}),
      ...(typeof record.default_branch === 'string' && record.default_branch.length > 0 ? { default_branch: record.default_branch } : {}),
      ...(record.owning_objective !== undefined ? { owning_objective: record.owning_objective } : {}),
    };
  }

  list(): Repository[] {
    return this.#registry
      .find({ kind: 'repository' })
      .map((record) => this.lookup(record.id))
      .filter((record): record is Repository => Boolean(record));
  }
}

const validateConfig = (config: KernelRuntimeConfig): void => {
  assertBoolean(config.seedConstitutionalArtifacts, 'seedConstitutionalArtifacts');

  if (config.registry !== undefined) {
    assertObjectWithMethods(config.registry, 'registry', ['register', 'update', 'lookup', 'find', 'list', 'reserve']);
  }
  if (config.taxonomyResolver !== undefined) {
    assertObjectWithMethods(config.taxonomyResolver, 'taxonomyResolver', [
      'resolveObjectType',
      'resolveIdentifierPrefix',
      'resolveLifecycleState',
      'resolveEventType',
      'resolveRelationshipType',
      'listObjectTypes',
      'listIdentifierPrefixes',
      'listLifecycleStates',
      'validateTaxonomyValue',
    ]);
  }
  if (config.identifierService !== undefined) {
    assertObjectWithMethods(config.identifierService, 'identifierService', ['generate', 'validate', 'parse']);
  }
  if (config.validationEngine !== undefined) {
    assertObjectWithMethods(config.validationEngine, 'validationEngine', [
      'validateIdentifier',
      'validateTaxonomy',
      'validateLifecycleState',
      'validateRepository',
      'validateDocument',
      'validateDocumentReference',
      'validateTraceability',
      'validateRegistryRecord',
    ]);
  }
};

const healthItem = (name: string, healthy: boolean, message: string): KernelHealthCheckItem => ({
  name,
  healthy,
  message,
});

const documentIds = (documents: { id: string }[]): string[] => sortedStrings(documents.map((document) => document.id));

export const createKernel = (config: KernelRuntimeConfig = {}): KernelRuntime => {
  validateConfig(config);
  const registry = config.registry ?? new RegistryService();
  const taxonomy: TaxonomyResolver = config.taxonomyResolver ?? new KernelTaxonomyResolver();
  const identifiers: IdentifierService = config.identifierService ?? new CanonicalIdentifierService({ registry, taxonomyResolver: taxonomy });
  const validation: ValidationEngine = config.validationEngine ?? new KernelValidationEngine({ identifierService: identifiers, taxonomyResolver: taxonomy });
  const objectives: ObjectiveRegistry = new ObjectiveRegistryService({ registry, identifierService: identifiers });
  const documents: DocumentRegistry =
    config.seedConstitutionalArtifacts === undefined
      ? new DocumentRegistryService({ registry })
      : new DocumentRegistryService({ registry, seedConstitutionalArtifacts: config.seedConstitutionalArtifacts });
  const repositories = new KernelRepositoryCatalog(registry);

  const runtime: KernelRuntime = Object.freeze({
    identifiers,
    taxonomy,
    validation,
    registry,
    objectives,
    documents,
    repositories,
    healthCheck(): KernelHealthCheckResult {
      const constitutionalArtifacts = documents.discoverConstitutionalArtifacts();
      const expectedArtifactIds = ['OBJ-000', 'OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004', 'OBJ-005', 'OBJ-006', 'HOST-0'];
      const discoveredArtifactIds = documentIds(constitutionalArtifacts);
      const checks: KernelHealthCheckItem[] = [
        healthItem('registry', typeof registry.find === 'function' && typeof registry.lookup === 'function', 'Registry service is available.'),
        healthItem('taxonomy', typeof taxonomy.listObjectTypes === 'function', 'Taxonomy resolver is available.'),
        healthItem('identifiers', typeof identifiers.generate === 'function', 'Identifier service is available.'),
        healthItem('validation', typeof validation.validateRegistryRecord === 'function', 'Validation engine is available.'),
        healthItem('objectives', typeof objectives.listObjectives === 'function', 'Objective registry is available.'),
        healthItem('documents', typeof documents.discoverConstitutionalArtifacts === 'function', 'Document registry is available.'),
        healthItem('repositories', typeof repositories.list === 'function', 'Repository accessor is available.'),
        healthItem(
          'constitutional-artifacts',
          expectedArtifactIds.every((id) => discoveredArtifactIds.includes(id)) && discoveredArtifactIds.length === expectedArtifactIds.length,
          `Discovered ${discoveredArtifactIds.length} constitutional artefacts.`,
        ),
      ];

      const issues = checks.filter((check) => !check.healthy).map((check) => check.message);
      return {
        healthy: issues.length === 0,
        status: issues.length === 0 ? 'healthy' : 'unhealthy',
        checks,
        constitutionalArtifacts: discoveredArtifactIds,
        issues,
      };
    },
  });

  const bootstrapHealth = runtime.healthCheck();
  if (config.seedConstitutionalArtifacts !== false && !bootstrapHealth.healthy) {
    throw new KernelBootstrapError(`Kernel bootstrap failed: ${bootstrapHealth.issues.join('; ')}`);
  }

  return runtime;
};
