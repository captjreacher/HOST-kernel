import type { KernelContextRuntimeAdapter, KernelRuntimeAdapterHost } from '@host/kernel-core';
import type {
  ContextRecord,
  ContextReference,
  ContextSnapshot,
  Identifier,
  RegistryRecord,
  ValidationIssue,
  ValidationReference,
  ValidationReferenceKind,
  ValidationResult,
} from '@host/kernel-types';
import { validationIssueCodes } from '@host/kernel-types';
import {
  type ConfidenceInput,
  type ContextRecordInput,
  type ContextReferenceInput,
  type ContextRuntime,
  type ContextRuntimeKind,
  ContextRuntimeError,
  type ContextRuntimeOptions,
  type ContextRuntimeValidationResult,
  type ContextRuntimeValue,
  type ContextSnapshotInput,
  type FreshnessInput,
  type ProvenanceInput,
  type RuntimeConfidence,
  type RuntimeContextRecord,
  type RuntimeContextReference,
  type RuntimeContextSnapshot,
  type RuntimeFreshness,
  type RuntimeProvenance,
} from './contracts.js';

const contextRuntimeName = 'context-runtime' as const;
const defaultRuntimeVersion = '1.0.0';
const referenceKinds: readonly ValidationReferenceKind[] = [
  'objective',
  'adr',
  'entity',
  'relationship',
  'document',
  'repository',
  'capability',
  'signal',
  'observation',
  'evidence',
  'event',
  'artifact',
  'workflow',
  'task',
  'registry-record',
] as const;
const canonicalIdentifierReferenceKinds = new Set<ValidationReferenceKind>([
  'objective',
  'adr',
  'entity',
  'relationship',
  'capability',
  'signal',
  'observation',
  'evidence',
  'event',
  'artifact',
  'workflow',
  'task',
]);

const kindSet = new Set<string>(referenceKinds);

const issue = (
  code: ValidationIssue['code'],
  path: string,
  message: string,
  extra: Partial<Pick<ValidationIssue, 'expected' | 'actual' | 'subjectKind' | 'subjectId'>> = {},
): ValidationIssue => ({
  code,
  path,
  message,
  severity: 'error',
  ...extra,
});

const counts = (issues: readonly ValidationIssue[]) =>
  issues.reduce(
    (result, current) => {
      if (current.severity === 'warning') {
        result.warnings += 1;
      } else if (current.severity === 'info') {
        result.info += 1;
      } else {
        result.errors += 1;
      }

      return result;
    },
    { errors: 0, warnings: 0, info: 0 },
  );

const validationResult = (subject: ContextRuntimeValidationResult['subject'], issues: readonly ValidationIssue[]): ContextRuntimeValidationResult => {
  const summary = counts(issues);
  return {
    subject,
    valid: summary.errors === 0,
    outcome: summary.errors === 0 ? 'valid' : 'invalid',
    issues: [...issues],
    ...summary,
  };
};

const clone = <TValue>(value: TValue): TValue => structuredClone(value);

const uniqueBy = <TValue>(values: readonly TValue[], keyFor: (value: TValue) => string): TValue[] => {
  const seen = new Set<string>();
  const result: TValue[] = [];

  for (const value of values) {
    const key = keyFor(value);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(value);
  }

  return result;
};

const stable = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map((entry) => stable(entry));
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entry]) => entry !== undefined)
      .sort(([left], [right]) => left.localeCompare(right));

    return Object.fromEntries(entries.map(([key, entry]) => [key, stable(entry)]));
  }

  return value;
};

const stableStringify = (value: unknown): string => JSON.stringify(stable(value));

const deepFreeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
      deepFreeze(nested);
    }
  }

  return value;
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const notBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const isIsoTimestamp = (value: unknown): value is string => {
  if (!notBlank(value)) {
    return false;
  }

  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
};

const maybeTimestamp = (value: string | undefined, fallback: string): string => (value === undefined ? fallback : value);

const metadata = (
  runtime_kind: ContextRuntimeKind,
  version: string,
  timestamp: string,
  overrides: { created_at: string | undefined; updated_at: string | undefined } = { created_at: undefined, updated_at: undefined },
) => ({
  runtime_kind,
  runtime_version: version,
  created_at: maybeTimestamp(overrides.created_at, timestamp),
  updated_at: maybeTimestamp(overrides.updated_at, maybeTimestamp(overrides.created_at, timestamp)),
});

const asIdentifierOrRecord = (value: Identifier | RegistryRecord | undefined): RegistryRecord | Identifier | undefined => value;
const hasRuntimeKind = (value: unknown): value is { runtime_kind: string } => isRecord(value) && typeof value.runtime_kind === 'string';

const resolveReference = (kernel: KernelRuntimeAdapterHost, reference: ValidationReference): Identifier | RegistryRecord | undefined => {
  switch (reference.kind) {
    case 'document':
      return kernel.documents.lookup(reference.id);
    case 'repository':
      return asIdentifierOrRecord(kernel.registry.lookup(reference.id));
    case 'registry-record':
      return asIdentifierOrRecord(kernel.registry.lookup(reference.id));
    default:
      return undefined;
  }
};

class ContextRuntimeService implements ContextRuntime {
  readonly #kernel: KernelRuntimeAdapterHost;
  readonly #now: () => string;
  readonly #version: string;

  constructor(kernel: KernelRuntimeAdapterHost, options: ContextRuntimeOptions = {}) {
    this.#kernel = kernel;
    this.#now = options.now ?? (() => new Date().toISOString());
    this.#version = options.version ?? defaultRuntimeVersion;
  }

  get kernel(): KernelRuntimeAdapterHost {
    return this.#kernel;
  }

  get version() {
    return {
      name: contextRuntimeName,
      version: this.#version,
    } as const;
  }

  isReferenceKind(kind: string): kind is ValidationReferenceKind {
    return kindSet.has(kind);
  }

  #validateCanonicalIdentifierReference(reference: ValidationReference): ValidationIssue[] {
    try {
      const parsed = this.#kernel.identifiers.parse(reference.id);
      if (parsed.type !== reference.kind) {
        return [
          issue(
            validationIssueCodes.validationIdentifierUnsupportedType,
            'id',
            `Reference identifier type does not match kind: expected ${reference.kind}, received ${parsed.type}.`,
            {
              expected: reference.kind,
              actual: parsed.type,
              subjectKind: reference.kind,
              subjectId: reference.id,
            },
          ),
        ];
      }

      return [];
    } catch (error) {
      return error instanceof Error
        ? [issue(validationIssueCodes.validationIdentifierMalformed, 'id', error.message, { subjectKind: reference.kind, subjectId: reference.id })]
        : [issue(validationIssueCodes.validationIdentifierMalformed, 'id', 'Reference identifier is malformed.')];
    }
  }

  createReference(input: ContextReferenceInput): RuntimeContextReference {
    const timestamp = this.#now();
    const reference = deepFreeze({
      kind: input.kind,
      id: input.id,
      ...(input.relation !== undefined ? { relation: input.relation } : {}),
      ...(input.required !== undefined ? { required: input.required } : {}),
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...metadata('context-reference', this.#version, timestamp, { created_at: input.created_at, updated_at: input.updated_at }),
    } satisfies RuntimeContextReference);

    const validation = this.validateReference(reference);
    if (!validation.valid) {
      throw new ContextRuntimeError('Context reference creation failed.', { issues: validation.issues });
    }

    return reference;
  }

  createConfidence(input: ConfidenceInput): RuntimeConfidence {
    const timestamp = this.#now();
    const confidence = deepFreeze({
      score: input.score,
      ...(input.note !== undefined ? { note: input.note } : {}),
      ...metadata('confidence', this.#version, timestamp, { created_at: input.created_at, updated_at: input.updated_at }),
    } satisfies RuntimeConfidence);

    const validation = this.validateConfidence(confidence);
    if (!validation.valid) {
      throw new ContextRuntimeError('Confidence creation failed.', { issues: validation.issues });
    }

    return confidence;
  }

  createFreshness(input: FreshnessInput = {}): RuntimeFreshness {
    const timestamp = this.#now();
    const freshness = deepFreeze({
      observed_at: input.observed_at ?? timestamp,
      ...(input.valid_at !== undefined ? { valid_at: input.valid_at } : {}),
      ...(input.expires_at !== undefined ? { expires_at: input.expires_at } : {}),
      ...metadata('freshness', this.#version, timestamp, { created_at: input.created_at, updated_at: input.updated_at }),
    } satisfies RuntimeFreshness);

    const validation = this.validateFreshness(freshness);
    if (!validation.valid) {
      throw new ContextRuntimeError('Freshness creation failed.', { issues: validation.issues });
    }

    return freshness;
  }

  createProvenance(input: ProvenanceInput): RuntimeProvenance {
    const timestamp = this.#now();
    const source_objects = uniqueBy(input.source_objects?.map((reference) => clone(reference)) ?? [], (reference) =>
      stableStringify([reference.kind, reference.id, reference.relation ?? '', reference.required ?? false]),
    );
    const provenance = deepFreeze({
      source: input.source,
      recorded_at: input.recorded_at ?? timestamp,
      source_objects,
      ...metadata('provenance', this.#version, timestamp, { created_at: input.created_at, updated_at: input.updated_at }),
    } satisfies RuntimeProvenance);

    const validation = this.validateProvenance(provenance);
    if (!validation.valid) {
      throw new ContextRuntimeError('Provenance creation failed.', { issues: validation.issues });
    }

    return provenance;
  }

  createRecord(input: ContextRecordInput): RuntimeContextRecord {
    const timestamp = this.#now();
    const record = deepFreeze({
      source: this.createReference(input.source),
      references: uniqueBy((input.references ?? []).map((reference) => this.createReference(reference)), (reference) => stableStringify(reference)),
      ...(input.confidence !== undefined ? { confidence: this.createConfidence(input.confidence) } : {}),
      ...(input.freshness !== undefined ? { freshness: this.createFreshness(input.freshness) } : {}),
      provenance: this.createProvenance(input.provenance),
      ...metadata('context-record', this.#version, timestamp, { created_at: input.created_at, updated_at: input.updated_at }),
    } satisfies RuntimeContextRecord);

    const validation = this.validateRecord(record);
    if (!validation.valid) {
      throw new ContextRuntimeError('Context record creation failed.', { issues: validation.issues });
    }

    return record;
  }

  createSnapshot(input: ContextSnapshotInput = {}): RuntimeContextSnapshot {
    const timestamp = this.#now();
    const snapshot = deepFreeze({
      captured_at: input.captured_at ?? timestamp,
      records: (input.records ?? []).map((record) => this.createRecord(record)),
      ...(input.references !== undefined
        ? { references: uniqueBy(input.references.map((reference) => this.createReference(reference)), (reference) => stableStringify(reference)) }
        : {}),
      ...metadata('context-snapshot', this.#version, timestamp, { created_at: input.created_at, updated_at: input.updated_at }),
    } satisfies RuntimeContextSnapshot);

    const validation = this.validateSnapshot(snapshot);
    if (!validation.valid) {
      throw new ContextRuntimeError('Context snapshot creation failed.', { issues: validation.issues });
    }

    return snapshot;
  }

  validateReference(reference: ContextReferenceInput | RuntimeContextReference): ContextRuntimeValidationResult {
    const issues: ValidationIssue[] = [];
    const source = reference as ContextReferenceInput;

    if (!this.isReferenceKind(String(source.kind ?? ''))) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'kind', `Unsupported context reference kind: ${String(source.kind ?? '')}`));
    }

    if (!notBlank(source.id)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'id', 'Context reference id is required.'));
    }

    if (source.title !== undefined && !notBlank(source.title)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'title', 'Context reference title must not be blank.'));
    }

    if ('runtime_version' in source && !notBlank(source.runtime_version)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'runtime_version', 'Runtime version is required.'));
    }

    if ('created_at' in source && !isIsoTimestamp(source.created_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'created_at', 'Created timestamp must use canonical ISO formatting.'));
    }

    if ('updated_at' in source && !isIsoTimestamp(source.updated_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'updated_at', 'Updated timestamp must use canonical ISO formatting.'));
    }

    if (issues.length === 0 && this.isReferenceKind(source.kind)) {
      const kernelReference: ContextReference = {
        kind: source.kind,
        id: source.id,
        ...(source.relation !== undefined ? { relation: source.relation } : {}),
        ...(source.required !== undefined ? { required: source.required } : {}),
      };

      if (canonicalIdentifierReferenceKinds.has(kernelReference.kind)) {
        issues.push(...this.#validateCanonicalIdentifierReference(kernelReference));
      } else if (kernelReference.kind === 'document') {
        const validation = this.#kernel.validation.validateDocumentReference(kernelReference, {
          lookup: {
            lookup: (kind, id) => (kind === 'document' ? this.#kernel.documents.lookup(id) : undefined),
          },
        });
        issues.push(...validation.issues);
      } else if (kernelReference.kind === 'repository' || kernelReference.kind === 'registry-record') {
        const resolved = resolveReference(this.#kernel, kernelReference);
        if (!resolved || !('id' in resolved)) {
          issues.push(issue(validationIssueCodes.validationDocumentReferenceBroken, 'id', 'Reference could not be resolved.', {
            expected: kernelReference.kind,
            actual: kernelReference.id,
          }));
        }
      }
    }

    return validationResult('context-reference', issues);
  }

  validateConfidence(confidence: ConfidenceInput | RuntimeConfidence): ContextRuntimeValidationResult {
    const issues: ValidationIssue[] = [];
    const source = confidence as ConfidenceInput;

    if (!Number.isFinite(source.score)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'score', 'Confidence score must be a finite number.'));
    }

    if (source.note !== undefined && !notBlank(source.note)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'note', 'Confidence note must not be blank.'));
    }

    if ('runtime_version' in source && !notBlank(source.runtime_version)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'runtime_version', 'Runtime version is required.'));
    }

    if ('created_at' in source && !isIsoTimestamp(source.created_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'created_at', 'Created timestamp must use canonical ISO formatting.'));
    }

    if ('updated_at' in source && !isIsoTimestamp(source.updated_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'updated_at', 'Updated timestamp must use canonical ISO formatting.'));
    }

    return validationResult('confidence', issues);
  }

  validateFreshness(freshness: FreshnessInput | RuntimeFreshness): ContextRuntimeValidationResult {
    const issues: ValidationIssue[] = [];
    const source = freshness as FreshnessInput;
    const observedAt = source.observed_at ?? (!hasRuntimeKind(source) ? this.#now() : undefined);

    if (!isIsoTimestamp(observedAt)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'observed_at', 'Observed timestamp must use canonical ISO formatting.'));
    }

    if (source.valid_at !== undefined && !isIsoTimestamp(source.valid_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'valid_at', 'Valid-at timestamp must use canonical ISO formatting.'));
    }

    if (source.expires_at !== undefined && !isIsoTimestamp(source.expires_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'expires_at', 'Expiry timestamp must use canonical ISO formatting.'));
    }

    if ('runtime_version' in source && !notBlank(source.runtime_version)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'runtime_version', 'Runtime version is required.'));
    }

    if ('created_at' in source && !isIsoTimestamp(source.created_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'created_at', 'Created timestamp must use canonical ISO formatting.'));
    }

    if ('updated_at' in source && !isIsoTimestamp(source.updated_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'updated_at', 'Updated timestamp must use canonical ISO formatting.'));
    }

    return validationResult('freshness', issues);
  }

  validateProvenance(provenance: ProvenanceInput | RuntimeProvenance): ContextRuntimeValidationResult {
    const issues: ValidationIssue[] = [];
    const source = provenance as ProvenanceInput;
    const recordedAt = source.recorded_at ?? (!hasRuntimeKind(source) ? this.#now() : undefined);

    if (!notBlank(source.source)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'source', 'Provenance source is required.'));
    }

    if (!isIsoTimestamp(recordedAt)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'recorded_at', 'Recorded timestamp must use canonical ISO formatting.'));
    }

    for (const [index, reference] of (source.source_objects ?? []).entries()) {
      const validation = this.validateReference({
        kind: reference.kind,
        id: reference.id,
        ...(reference.relation !== undefined ? { relation: reference.relation } : {}),
        ...(reference.required !== undefined ? { required: reference.required } : {}),
      });
      for (const found of validation.issues) {
        issues.push({
          ...found,
          path: `source_objects[${index}].${found.path}`,
        });
      }
    }

    if ('runtime_version' in source && !notBlank(source.runtime_version)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'runtime_version', 'Runtime version is required.'));
    }

    if ('created_at' in source && !isIsoTimestamp(source.created_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'created_at', 'Created timestamp must use canonical ISO formatting.'));
    }

    if ('updated_at' in source && !isIsoTimestamp(source.updated_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'updated_at', 'Updated timestamp must use canonical ISO formatting.'));
    }

    return validationResult('provenance', issues);
  }

  validateRecord(record: ContextRecordInput | RuntimeContextRecord): ContextRuntimeValidationResult {
    const issues: ValidationIssue[] = [];
    const source = record as ContextRecordInput | RuntimeContextRecord;

    const sourceValidation = this.validateReference(source.source);
    issues.push(...sourceValidation.issues.map((found) => ({ ...found, path: `source.${found.path}` })));

    for (const [index, reference] of (source.references ?? []).entries()) {
      const validation = this.validateReference(reference);
      issues.push(...validation.issues.map((found) => ({ ...found, path: `references[${index}].${found.path}` })));
    }

    if (source.confidence !== undefined) {
      const validation = this.validateConfidence(source.confidence);
      issues.push(...validation.issues.map((found) => ({ ...found, path: `confidence.${found.path}` })));
    }

    if (source.freshness !== undefined) {
      const validation = this.validateFreshness(source.freshness);
      issues.push(...validation.issues.map((found) => ({ ...found, path: `freshness.${found.path}` })));
    }

    const provenanceValidation = this.validateProvenance(source.provenance);
    issues.push(...provenanceValidation.issues.map((found) => ({ ...found, path: `provenance.${found.path}` })));

    if ('runtime_version' in source && !notBlank(source.runtime_version)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'runtime_version', 'Runtime version is required.'));
    }

    if ('created_at' in source && !isIsoTimestamp(source.created_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'created_at', 'Created timestamp must use canonical ISO formatting.'));
    }

    if ('updated_at' in source && !isIsoTimestamp(source.updated_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'updated_at', 'Updated timestamp must use canonical ISO formatting.'));
    }

    return validationResult('context-record', issues);
  }

  validateSnapshot(snapshot: ContextSnapshotInput | RuntimeContextSnapshot): ContextRuntimeValidationResult {
    const issues: ValidationIssue[] = [];
    const source = snapshot as ContextSnapshotInput | RuntimeContextSnapshot;
    const capturedAt = source.captured_at ?? (!hasRuntimeKind(source) ? this.#now() : undefined);

    if (!isIsoTimestamp(capturedAt)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'captured_at', 'Snapshot timestamp must use canonical ISO formatting.'));
    }

    for (const [index, record] of (source.records ?? []).entries()) {
      const validation = this.validateRecord(record);
      issues.push(...validation.issues.map((found) => ({ ...found, path: `records[${index}].${found.path}` })));
    }

    for (const [index, reference] of (source.references ?? []).entries()) {
      const validation = this.validateReference(reference);
      issues.push(...validation.issues.map((found) => ({ ...found, path: `references[${index}].${found.path}` })));
    }

    if ('runtime_version' in source && !notBlank(source.runtime_version)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'runtime_version', 'Runtime version is required.'));
    }

    if ('created_at' in source && !isIsoTimestamp(source.created_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'created_at', 'Created timestamp must use canonical ISO formatting.'));
    }

    if ('updated_at' in source && !isIsoTimestamp(source.updated_at)) {
      issues.push(issue(validationIssueCodes.validationRegistryRecordInvalid, 'updated_at', 'Updated timestamp must use canonical ISO formatting.'));
    }

    return validationResult('context-snapshot', issues);
  }

  serialize(value: ContextRuntimeValue): string {
    return stableStringify(value);
  }

  deserialize(value: string | Record<string, unknown>): ContextRuntimeValue {
    const parsed = typeof value === 'string' ? JSON.parse(value) : clone(value);
    if (!isRecord(parsed) || !notBlank(parsed.runtime_kind)) {
      throw new ContextRuntimeError('Deserialization requires a context runtime payload with a runtime_kind discriminator.');
    }

    switch (parsed.runtime_kind) {
      case 'context-reference':
        return this.createReference(parsed as unknown as ContextReferenceInput);
      case 'confidence':
        return this.createConfidence(parsed as unknown as ConfidenceInput);
      case 'freshness':
        return this.createFreshness(parsed as unknown as FreshnessInput);
      case 'provenance':
        return this.createProvenance(parsed as unknown as ProvenanceInput);
      case 'context-record':
        return this.createRecord(parsed as unknown as ContextRecordInput);
      case 'context-snapshot':
        return this.createSnapshot(parsed as unknown as ContextSnapshotInput);
      default:
        throw new ContextRuntimeError(`Unsupported runtime kind during deserialization: ${String(parsed.runtime_kind)}`);
    }
  }

  clone<TValue extends ContextRuntimeValue>(value: TValue): TValue {
    return this.deserialize(this.serialize(value)) as TValue;
  }

  equals(left: ContextRuntimeValue, right: ContextRuntimeValue): boolean {
    return this.serialize(left) === this.serialize(right);
  }
}

export const createContextRuntime = (kernel: KernelRuntimeAdapterHost, options: ContextRuntimeOptions = {}): ContextRuntime =>
  new ContextRuntimeService(kernel, options);

export const createContextRuntimeAdapter = (
  options: ContextRuntimeOptions = {},
): ((kernel: KernelRuntimeAdapterHost) => KernelContextRuntimeAdapter) => {
  return (kernel: KernelRuntimeAdapterHost): KernelContextRuntimeAdapter => createContextRuntime(kernel, options);
};
