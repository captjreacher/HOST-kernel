import type { DocumentRegistry } from '@host/kernel-documents';
import type { IdentifierService } from '@host/kernel-identifiers';
import type { ObjectiveRegistry } from '@host/kernel-objectives';
import type { RegistryService } from '@host/kernel-registry';
import type {
  Confidence,
  ContextRecord,
  ContextReference,
  ContextSnapshot,
  Freshness,
  Provenance,
  Repository,
  TaxonomyResolver,
  ValidationIssue,
  ValidationReference,
  ValidationReferenceKind,
  ValidationResult,
} from '@host/kernel-types';
import type { ValidationEngine } from '@host/kernel-validation';

export interface KernelRepositoryAccessor {
  lookup(id: string): Repository | undefined;
  list(): Repository[];
}

export type KernelContextRuntimeKind =
  | 'context-reference'
  | 'confidence'
  | 'freshness'
  | 'provenance'
  | 'context-record'
  | 'context-snapshot';

export interface KernelContextRuntimeMetadata {
  readonly runtime_kind: KernelContextRuntimeKind;
  readonly runtime_version: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface KernelContextReferenceInput extends ContextReference {
  readonly title?: string | undefined;
  readonly created_at?: string | undefined;
  readonly updated_at?: string | undefined;
}

export interface KernelConfidenceInput extends Confidence {
  readonly created_at?: string | undefined;
  readonly updated_at?: string | undefined;
}

export interface KernelFreshnessInput {
  readonly observed_at?: string | undefined;
  readonly valid_at?: string | undefined;
  readonly expires_at?: string | undefined;
  readonly created_at?: string | undefined;
  readonly updated_at?: string | undefined;
}

export interface KernelProvenanceInput {
  readonly source: string;
  readonly recorded_at?: string | undefined;
  readonly source_objects?: readonly ValidationReference[] | undefined;
  readonly created_at?: string | undefined;
  readonly updated_at?: string | undefined;
}

export interface KernelContextRecordInput {
  readonly source: KernelContextReferenceInput;
  readonly references?: readonly KernelContextReferenceInput[] | undefined;
  readonly confidence?: KernelConfidenceInput | undefined;
  readonly freshness?: KernelFreshnessInput | undefined;
  readonly provenance: KernelProvenanceInput;
  readonly created_at?: string | undefined;
  readonly updated_at?: string | undefined;
}

export interface KernelContextSnapshotInput {
  readonly captured_at?: string | undefined;
  readonly records?: readonly KernelContextRecordInput[] | undefined;
  readonly references?: readonly KernelContextReferenceInput[] | undefined;
  readonly created_at?: string | undefined;
  readonly updated_at?: string | undefined;
}

export interface KernelRuntimeContextReference extends ContextReference, KernelContextRuntimeMetadata {}

export interface KernelRuntimeConfidence extends Confidence, KernelContextRuntimeMetadata {}

export interface KernelRuntimeFreshness extends Freshness, KernelContextRuntimeMetadata {}

export interface KernelRuntimeProvenance extends Provenance, KernelContextRuntimeMetadata {}

export interface KernelRuntimeContextRecord extends ContextRecord, KernelContextRuntimeMetadata {
  readonly source: KernelRuntimeContextReference;
  readonly references: readonly KernelRuntimeContextReference[];
  readonly confidence?: KernelRuntimeConfidence | undefined;
  readonly freshness?: KernelRuntimeFreshness | undefined;
  readonly provenance: KernelRuntimeProvenance;
}

export interface KernelRuntimeContextSnapshot extends ContextSnapshot, KernelContextRuntimeMetadata {
  readonly records: readonly KernelRuntimeContextRecord[];
  readonly references?: readonly KernelRuntimeContextReference[] | undefined;
}

export type KernelContextRuntimeValue =
  | KernelRuntimeContextReference
  | KernelRuntimeConfidence
  | KernelRuntimeFreshness
  | KernelRuntimeProvenance
  | KernelRuntimeContextRecord
  | KernelRuntimeContextSnapshot;

export interface KernelContextRuntimeVersion {
  readonly name: 'context-runtime';
  readonly version: string;
}

export interface KernelContextRuntimeValidationResult extends ValidationResult {
  readonly subject: KernelContextRuntimeKind;
}

export interface KernelContextRuntimeCreateError {
  readonly message: string;
  readonly issues: readonly ValidationIssue[];
}

export interface KernelContextRuntimeAdapter {
  readonly version: KernelContextRuntimeVersion;
  createReference(input: KernelContextReferenceInput): KernelRuntimeContextReference;
  createConfidence(input: KernelConfidenceInput): KernelRuntimeConfidence;
  createFreshness(input?: KernelFreshnessInput): KernelRuntimeFreshness;
  createProvenance(input: KernelProvenanceInput): KernelRuntimeProvenance;
  createRecord(input: KernelContextRecordInput): KernelRuntimeContextRecord;
  createSnapshot(input?: KernelContextSnapshotInput): KernelRuntimeContextSnapshot;
  validateReference(reference: KernelContextReferenceInput | KernelRuntimeContextReference): KernelContextRuntimeValidationResult;
  validateConfidence(confidence: KernelConfidenceInput | KernelRuntimeConfidence): KernelContextRuntimeValidationResult;
  validateFreshness(freshness: KernelFreshnessInput | KernelRuntimeFreshness): KernelContextRuntimeValidationResult;
  validateProvenance(provenance: KernelProvenanceInput | KernelRuntimeProvenance): KernelContextRuntimeValidationResult;
  validateRecord(record: KernelContextRecordInput | KernelRuntimeContextRecord): KernelContextRuntimeValidationResult;
  validateSnapshot(snapshot: KernelContextSnapshotInput | KernelRuntimeContextSnapshot): KernelContextRuntimeValidationResult;
  serialize(value: KernelContextRuntimeValue): string;
  deserialize(value: string | Record<string, unknown>): KernelContextRuntimeValue;
  clone<TValue extends KernelContextRuntimeValue>(value: TValue): TValue;
  equals(left: KernelContextRuntimeValue, right: KernelContextRuntimeValue): boolean;
  isReferenceKind(kind: string): kind is ValidationReferenceKind;
}

export interface KernelRuntimeAdapters {
  readonly context?: KernelContextRuntimeAdapter | undefined;
}

export interface KernelRuntimeAdapterHost {
  readonly identifiers: IdentifierService;
  readonly taxonomy: TaxonomyResolver;
  readonly validation: ValidationEngine;
  readonly registry: RegistryService;
  readonly objectives: ObjectiveRegistry;
  readonly documents: DocumentRegistry;
  readonly repositories: KernelRepositoryAccessor;
  healthCheck(): KernelHealthCheckResult;
}

export interface KernelRuntimeAdapterConfig {
  readonly context?: ((kernel: KernelRuntimeAdapterHost) => KernelContextRuntimeAdapter) | undefined;
}

export interface KernelRuntimeConfig {
  registry?: RegistryService;
  taxonomyResolver?: TaxonomyResolver;
  validationEngine?: ValidationEngine;
  identifierService?: IdentifierService;
  seedConstitutionalArtifacts?: boolean;
  runtimeAdapters?: KernelRuntimeAdapterConfig;
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

export interface KernelRuntime extends KernelRuntimeAdapterHost {
  readonly adapters: KernelRuntimeAdapters;
}

export class KernelBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KernelBootstrapError';
  }
}
