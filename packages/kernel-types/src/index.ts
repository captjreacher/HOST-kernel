export type RegistryStatus = 'active' | 'inactive' | 'deprecated';
export type LifecycleState = 'proposed' | 'registered' | 'live' | 'suspended' | 'retired';
export type ObjectiveLifecycleState = 'draft' | 'proposed' | 'approved' | 'planned' | 'active' | 'implemented' | 'validated' | 'closed' | 'archived';
export type ValidationSeverity = 'info' | 'warning' | 'error';
export type ValidationOutcome = 'valid' | 'invalid';

export type CanonicalIdentifierType =
  | 'objective'
  | 'adr'
  | 'capability'
  | 'entity'
  | 'relationship'
  | 'workflow'
  | 'signal'
  | 'observation'
  | 'evidence'
  | 'event'
  | 'artifact'
  | 'task';
export type CanonicalType = CanonicalIdentifierType;
export type TaxonomyValueKind = 'objectType' | 'identifierPrefix' | 'lifecycleState' | 'relationshipType' | 'eventType';
export type TaxonomyObjectType =
  | 'objective'
  | 'decision'
  | 'adr'
  | 'policy'
  | 'standard'
  | 'roadmap'
  | 'epic'
  | 'initiative'
  | 'sprint'
  | 'milestone'
  | 'release'
  | 'entity'
  | 'relationship'
  | 'capability'
  | 'workflow'
  | 'signal'
  | 'observation'
  | 'evidence'
  | 'event'
  | 'state'
  | 'artifact'
  | 'task'
  | 'issue'
  | 'branch'
  | 'commit'
  | 'pull-request'
  | 'merge'
  | 'deployment'
  | 'session'
  | 'conversation'
  | 'agent'
  | 'job'
  | 'queue'
  | 'notification'
  | 'execution';
export type TaxonomyLifecycleState =
  | 'proposed'
  | 'active'
  | 'closed'
  | 'accepted'
  | 'superseded'
  | 'draft'
  | 'archived'
  | 'approved'
  | 'revised'
  | 'planned'
  | 'complete'
  | 'done'
  | 'reached'
  | 'registered'
  | 'deprecated'
  | 'captured'
  | 'verified'
  | 'collected'
  | 'emitted'
  | 'consumed'
  | 'current'
  | 'open'
  | 'triaged'
  | 'created'
  | 'referenced'
  | 'immutable'
  | 'reviewed'
  | 'merged'
  | 'deleted'
  | 'deployed'
  | 'rolled_back'
  | 'provisioned'
  | 'running'
  | 'queued'
  | 'delivered';
export type TaxonomyRelationshipType =
  | 'originates-from'
  | 'depends-on'
  | 'references'
  | 'derives-from'
  | 'owns'
  | 'contains'
  | 'traces-to'
  | 'links-to'
  | 'part-of'
  | 'implements';
export type TaxonomyEventType =
  | 'objective.created'
  | 'repository.registered'
  | 'document.updated'
  | 'identifier.generated'
  | 'validation.failed'
  | 'registry.updated';

export interface Identifier {
  type: CanonicalIdentifierType;
  prefix: string;
  sequence: number;
  value: string;
}

export interface IdentifierAllocation {
  identifier: Identifier;
  allocated_at: string;
}

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

export interface Objective extends RegistryRecord {
  objective_id: string;
  lifecycle_state: ObjectiveLifecycleState;
  dependencies: string[];
  references?: readonly ValidationReference[];
}

export interface Repository extends RegistryRecord {
  repository_url?: string;
  default_branch?: string;
  owning_objective?: string | null;
}

export interface Document extends RegistryRecord {
  document_type: string;
  owner_objective?: string | null;
  lineage: string[];
  relationships: string[];
}

export interface Capability extends RegistryRecord {
  owning_objective?: string | null;
  maturity: 'alpha' | 'beta' | 'stable' | 'deprecated';
  dependencies: string[];
}

export interface Confidence {
  score: number;
  note?: string | undefined;
}

export interface Freshness {
  observed_at: string;
  valid_at?: string | undefined;
  expires_at?: string | undefined;
}

export interface Provenance {
  source: string;
  recorded_at: string;
  source_objects: readonly ValidationReference[];
}

export interface ValidationIssue {
  code: ValidationIssueCode;
  path: string;
  message: string;
  severity: ValidationSeverity;
  subjectKind?: ValidationReferenceKind | undefined;
  subjectId?: string | undefined;
  expected?: string | undefined;
  actual?: string | undefined;
}

export const validationIssueCodes = {
  legacyIdentifierMalformed: 'identifier.malformed',
  legacyIdentifierUnsupportedType: 'identifier.unsupported-type',
  legacyIdentifierDuplicate: 'identifier.duplicate',
  legacyIdentifierCanonical: 'identifier.canonical',
  legacyTaxonomyValueEmpty: 'taxonomy.value.empty',
  legacyTaxonomyValueMalformed: 'taxonomy.value.malformed',
  legacyTaxonomyObjectTypeUnknown: 'taxonomy.object-type.unknown',
  legacyTaxonomyIdentifierPrefixUnknown: 'taxonomy.identifier-prefix.unknown',
  legacyTaxonomyLifecycleStateUnknown: 'taxonomy.lifecycle-state.unknown',
  legacyTaxonomyRelationshipTypeUnknown: 'taxonomy.relationship-type.unknown',
  legacyTaxonomyEventTypeUnknown: 'taxonomy.event-type.unknown',
  validationIdentifierMalformed: 'validation.identifier.malformed',
  validationIdentifierUnsupportedType: 'validation.identifier.unsupported-type',
  validationIdentifierDuplicate: 'validation.identifier.duplicate',
  validationTaxonomyUnsupportedValue: 'validation.taxonomy.unsupported-value',
  validationTaxonomyMalformedValue: 'validation.taxonomy.malformed-value',
  validationLifecycleInvalid: 'validation.lifecycle.invalid',
  validationRepositoryOwnerMissing: 'validation.repository.owner.missing',
  validationRepositoryLifecycleInvalid: 'validation.repository.lifecycle.invalid',
  validationDocumentVersionMissing: 'validation.document.version.missing',
  validationDocumentStatusInvalid: 'validation.document.status.invalid',
  validationDocumentReferenceBroken: 'validation.document.reference.broken',
  validationTraceabilityLinkBroken: 'validation.traceability.link.broken',
  validationRegistryRecordInvalid: 'validation.registry-record.invalid',
  validationRegistryRecordStatusInvalid: 'validation.registry-record.status.invalid',
  validationRegistryRecordFieldMissing: 'validation.registry-record.field.missing',
} as const;

export type ValidationIssueCode = (typeof validationIssueCodes)[keyof typeof validationIssueCodes];

export type ValidationReferenceKind =
  | 'objective'
  | 'adr'
  | 'entity'
  | 'relationship'
  | 'document'
  | 'repository'
  | 'capability'
  | 'signal'
  | 'observation'
  | 'evidence'
  | 'event'
  | 'artifact'
  | 'workflow'
  | 'task'
  | 'registry-record';

export interface ValidationReference {
  kind: ValidationReferenceKind;
  id: string;
  relation?: string | undefined;
  required?: boolean | undefined;
}

export interface ContextReference extends ValidationReference {
  title?: string | undefined;
}

export interface ContextRecord {
  source: ContextReference;
  references: readonly ContextReference[];
  confidence?: Confidence | undefined;
  freshness?: Freshness | undefined;
  provenance: Provenance;
}

export interface ContextSnapshot {
  captured_at: string;
  records: readonly ContextRecord[];
  references?: readonly ContextReference[] | undefined;
}

export interface ValidationLookup {
  lookup(kind: ValidationReferenceKind, id: string): Identifier | RegistryRecord | undefined;
}

export interface ValidationContext {
  subjectKind?: ValidationReferenceKind | undefined;
  subjectId?: string | undefined;
  lookup?: ValidationLookup | undefined;
  references?: readonly ValidationReference[] | undefined;
  expectedLifecycleState?: string | undefined;
  expectedStatus?: RegistryStatus | undefined;
  expectedOwner?: string | null | undefined;
  source?: string | undefined;
}

export interface ValidationResult {
  outcome: ValidationOutcome;
  valid: boolean;
  issues: ValidationIssue[];
  context?: ValidationContext | undefined;
  errors: number;
  warnings: number;
  info: number;
}

export interface IdentifierRegistry {
  exists(identifier: string): boolean;
  reserve(identifier: Identifier): boolean;
  release(identifier: string): void;
  lookup(identifier: string): Identifier | RegistryRecord | undefined;
  list(type?: CanonicalIdentifierType): Identifier[] | RegistryRecord[];
}

export interface IdentifierFormatRule {
  type: CanonicalIdentifierType;
  prefix: string;
  pattern: RegExp;
  description: string;
}

export interface TaxonomyEntry {
  kind: TaxonomyValueKind;
  code: string;
  value: string;
  label: string;
  description: string;
  aliases?: string[];
  identifierType?: CanonicalIdentifierType;
  prefix?: string;
}

export type TaxonomyObjectEntry = TaxonomyEntry & { kind: 'objectType'; value: TaxonomyObjectType };
export type TaxonomyPrefixEntry = TaxonomyEntry & { kind: 'identifierPrefix'; value: string; identifierType?: CanonicalIdentifierType };
export type TaxonomyIdentifierPrefixEntry = TaxonomyPrefixEntry;
export type TaxonomyLifecycleEntry = TaxonomyEntry & { kind: 'lifecycleState'; value: TaxonomyLifecycleState };
export type TaxonomyRelationshipEntry = TaxonomyEntry & { kind: 'relationshipType'; value: TaxonomyRelationshipType };
export type TaxonomyEventEntry = TaxonomyEntry & { kind: 'eventType'; value: TaxonomyEventType };

export interface TaxonomyIssue {
  code: ValidationIssueCode;
  path: string;
  message: string;
  severity: ValidationSeverity;
}

export interface TaxonomyResolutionResult<TEntry extends TaxonomyEntry = TaxonomyEntry> {
  kind: TaxonomyValueKind;
  input: string;
  resolved: boolean;
  entry?: TEntry;
  issues: TaxonomyIssue[];
}

export interface TaxonomyValidationResult extends ValidationResult {
  kind: TaxonomyValueKind;
  input: string;
  entry?: TaxonomyEntry;
}

export interface TaxonomyResolver {
  resolveObjectType(value: string): TaxonomyResolutionResult;
  resolveIdentifierPrefix(value: string): TaxonomyResolutionResult;
  resolveLifecycleState(value: string): TaxonomyResolutionResult;
  resolveEventType(value: string): TaxonomyResolutionResult;
  resolveRelationshipType(value: string): TaxonomyResolutionResult;
  listObjectTypes(): TaxonomyEntry[];
  listIdentifierPrefixes(): TaxonomyEntry[];
  listLifecycleStates(): TaxonomyEntry[];
  listEventTypes(): TaxonomyEntry[];
  listRelationshipTypes(): TaxonomyEntry[];
  validateTaxonomyValue(value: string): TaxonomyValidationResult;
}
