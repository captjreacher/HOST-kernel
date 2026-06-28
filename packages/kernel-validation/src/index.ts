import type {
  Document,
  Identifier,
  RegistryRecord,
  Repository,
  TaxonomyResolver,
  ValidationContext,
  ValidationIssue,
  ValidationIssueCode,
  ValidationReference,
  ValidationReferenceKind,
  ValidationResult,
  ValidationSeverity,
} from '@host/kernel-types';
import { validationIssueCodes } from '@host/kernel-types';
import { CanonicalIdentifierService, type IdentifierService } from '@host/kernel-identifiers';
import { KernelTaxonomyResolver } from '@host/kernel-taxonomy';

export interface ValidationEngine {
  validateIdentifier(identifier: Identifier | string, context?: ValidationContext): ValidationResult;
  validateTaxonomy(value: string, context?: ValidationContext): ValidationResult;
  validateLifecycleState(lifecycleState: string, context?: ValidationContext): ValidationResult;
  validateRepository(repository: Repository, context?: ValidationContext): ValidationResult;
  validateDocument(document: Document, context?: ValidationContext): ValidationResult;
  validateDocumentReference(reference: ValidationReference, context?: ValidationContext): ValidationResult;
  validateTraceability(record: RegistryRecord, context?: ValidationContext): ValidationResult;
  validateRegistryRecord(record: RegistryRecord, context?: ValidationContext): ValidationResult;
}

export interface ValidationEngineOptions {
  identifierService?: IdentifierService;
  taxonomyResolver?: TaxonomyResolver;
}

const canonicalReferenceKinds = new Set<ValidationReferenceKind>([
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

const registryStatusValues = new Set(['active', 'inactive', 'deprecated']);

const issue = (
  code: ValidationIssueCode,
  path: string,
  message: string,
  severity: ValidationSeverity = 'error',
  extra: Pick<ValidationIssue, 'subjectKind' | 'subjectId' | 'expected' | 'actual'> = {},
): ValidationIssue => ({
  code,
  path,
  message,
  severity,
  ...extra,
});

const severityCounts = (issues: ValidationIssue[]): Pick<ValidationResult, 'errors' | 'warnings' | 'info'> =>
  issues.reduce(
    (counts, current) => {
      if (current.severity === 'warning') {
        counts.warnings += 1;
      } else if (current.severity === 'info') {
        counts.info += 1;
      } else {
        counts.errors += 1;
      }

      return counts;
    },
    { errors: 0, warnings: 0, info: 0 },
  );

const result = (issues: ValidationIssue[], context?: ValidationContext): ValidationResult => {
  const counts = severityCounts(issues);
  return {
    outcome: issues.some((issue) => issue.severity === 'error') ? 'invalid' : 'valid',
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    context,
    ...counts,
  };
};

const notBlank = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;

const idToString = (identifier: Identifier | string): string => (typeof identifier === 'string' ? identifier : identifier.value);

export class KernelValidationEngine implements ValidationEngine {
  readonly #identifierService: IdentifierService;
  readonly #taxonomyResolver: TaxonomyResolver;

  constructor(options: ValidationEngineOptions = {}) {
    this.#taxonomyResolver = options.taxonomyResolver ?? new KernelTaxonomyResolver();
    this.#identifierService = options.identifierService ?? new CanonicalIdentifierService({ taxonomyResolver: this.#taxonomyResolver });
  }

  validateIdentifier(identifier: Identifier | string, context?: ValidationContext): ValidationResult {
    const validation = this.#identifierService.validate(idToString(identifier));
    return result(validation.issues, context);
  }

  validateTaxonomy(value: string, context?: ValidationContext): ValidationResult {
    const taxonomy = this.#taxonomyResolver.validateTaxonomyValue(value);
    if (taxonomy.valid) {
      return result([], context);
    }

    const [firstIssue] = taxonomy.issues;
    const mappedIssue = issue(
      firstIssue?.code === 'taxonomy.value.malformed' || firstIssue?.code === 'taxonomy.value.empty'
        ? validationIssueCodes.validationTaxonomyMalformedValue
        : validationIssueCodes.validationTaxonomyUnsupportedValue,
      firstIssue?.path ?? 'value',
      firstIssue?.message ?? 'Taxonomy value is invalid.',
      firstIssue?.severity ?? 'error',
      { subjectKind: context?.subjectKind, subjectId: context?.subjectId },
    );

    return result([mappedIssue], context);
  }

  validateLifecycleState(lifecycleState: string, context?: ValidationContext): ValidationResult {
    const resolved = this.#taxonomyResolver.resolveLifecycleState(lifecycleState);
    if (resolved.resolved) {
      return result([], context);
    }

    return result(
      [
        issue(
          validationIssueCodes.validationLifecycleInvalid,
          'lifecycle_state',
          resolved.issues[0]?.message ?? `Unsupported lifecycle state: ${lifecycleState}`,
          'error',
          {
            subjectKind: context?.subjectKind,
            subjectId: context?.subjectId,
            expected: 'canonical lifecycle state',
            actual: lifecycleState,
          },
        ),
      ],
      context,
    );
  }

  validateRegistryRecord(record: RegistryRecord, context?: ValidationContext): ValidationResult {
    return this.#validateRegistryRecord(record, { ...context, subjectKind: 'registry-record' });
  }

  validateRepository(repository: Repository, context?: ValidationContext): ValidationResult {
    const issues = this.#validateRegistryRecord(repository, { ...context, subjectKind: 'repository' }).issues;

    if (!notBlank(repository.owning_objective)) {
      issues.push(
        issue(
          validationIssueCodes.validationRepositoryOwnerMissing,
          'owning_objective',
          'Repository owning objective is required.',
          'error',
          { subjectKind: 'repository', subjectId: repository.id },
        ),
      );
    } else {
      const ownerValidation = this.validateIdentifier(repository.owning_objective, { ...context, subjectKind: 'objective', subjectId: repository.owning_objective });
      if (!ownerValidation.valid) {
        issues.push(
          issue(
            validationIssueCodes.validationDocumentReferenceBroken,
            'owning_objective',
            'Repository owning objective reference is invalid.',
            'error',
            { subjectKind: 'repository', subjectId: repository.id, actual: repository.owning_objective },
          ),
        );
        issues.push(...ownerValidation.issues);
      }
    }

    return result(issues, context);
  }

  validateDocument(document: Document, context?: ValidationContext): ValidationResult {
    const issues = this.#validateRegistryRecord(document, { ...context, subjectKind: 'document' }).issues;

    if (!notBlank(document.version)) {
      issues.push(
        issue(
          validationIssueCodes.validationDocumentVersionMissing,
          'version',
          'Document version is required.',
          'error',
          { subjectKind: 'document', subjectId: document.id },
        ),
      );
    }

    if (document.owner_objective !== null && document.owner_objective !== undefined) {
      const ownerValidation = this.validateIdentifier(document.owner_objective, {
        ...context,
        subjectKind: 'objective',
        subjectId: document.owner_objective,
      });
      if (!ownerValidation.valid) {
        issues.push(
          issue(
            validationIssueCodes.validationDocumentReferenceBroken,
            'owner_objective',
            'Document owner objective reference is invalid.',
            'error',
            { subjectKind: 'document', subjectId: document.id, actual: document.owner_objective },
          ),
        );
        issues.push(...ownerValidation.issues);
      }
    }

    return result(issues, context);
  }

  validateDocumentReference(reference: ValidationReference, context?: ValidationContext): ValidationResult {
    return result(this.#validateReference(reference, context, validationIssueCodes.validationDocumentReferenceBroken), context);
  }

  validateTraceability(record: RegistryRecord, context?: ValidationContext): ValidationResult {
    const issues = this.#validateRegistryRecord(record, { ...context, subjectKind: context?.subjectKind ?? 'registry-record' }).issues;
    const references = context?.references ?? [];

    for (const reference of references) {
      issues.push(...this.#validateReference(reference, context, validationIssueCodes.validationTraceabilityLinkBroken));
    }

    return result(issues, context);
  }

  #validateRegistryRecord(record: RegistryRecord, context?: ValidationContext): ValidationResult {
    const issues: ValidationIssue[] = [];
    const subjectKind = context?.subjectKind ?? 'registry-record';
    const subjectId = context?.subjectId ?? record.id;

    if (!notBlank(record.id)) {
      issues.push(
        issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'id', 'Record id is required.', 'error', {
          subjectKind,
          subjectId,
        }),
      );
    }

    if (!notBlank(record.key)) {
      issues.push(
        issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'key', 'Record key is required.', 'error', {
          subjectKind,
          subjectId,
        }),
      );
    }

    if (!notBlank(record.display_name)) {
      issues.push(
        issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'display_name', 'Display name is required.', 'error', {
          subjectKind,
          subjectId,
        }),
      );
    }

    if (!notBlank(record.description)) {
      issues.push(
        issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'description', 'Description is required.', 'error', {
          subjectKind,
          subjectId,
        }),
      );
    }

    if (!notBlank(record.version)) {
      issues.push(
        issue(
          validationIssueCodes.validationRegistryRecordFieldMissing,
          'version',
          'Record version is required.',
          'error',
          { subjectKind, subjectId },
        ),
      );
    }

    if (!notBlank(record.owner)) {
      issues.push(
        issue(validationIssueCodes.validationRegistryRecordFieldMissing, 'owner', 'Record owner is required.', 'error', {
          subjectKind,
          subjectId,
        }),
      );
    }

    if (!registryStatusValues.has(record.status)) {
      issues.push(
        issue(
          subjectKind === 'document'
            ? validationIssueCodes.validationDocumentStatusInvalid
            : subjectKind === 'repository'
              ? validationIssueCodes.validationRepositoryLifecycleInvalid
              : validationIssueCodes.validationRegistryRecordStatusInvalid,
          'status',
          `Unsupported record status: ${record.status}`,
          'error',
          { subjectKind, subjectId, expected: 'active | inactive | deprecated', actual: record.status },
        ),
      );
    }

    if (issues.length > 0) {
      issues.unshift(
        issue(validationIssueCodes.validationRegistryRecordInvalid, 'record', 'Registry record failed validation.', 'error', {
          subjectKind,
          subjectId,
        }),
      );
    }

    return result(issues, context);
  }

  #validateReference(reference: ValidationReference, context: ValidationContext | undefined, failureCode: ValidationIssueCode): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const subjectKind = context?.subjectKind ?? 'registry-record';
    const subjectId = context?.subjectId;

    if (!notBlank(reference.id)) {
      issues.push(
        issue(failureCode, 'id', 'Reference id is required.', 'error', {
          subjectKind,
          subjectId,
          expected: reference.kind,
          actual: reference.id,
        }),
      );
      return issues;
    }

    if (canonicalReferenceKinds.has(reference.kind)) {
      const identifierValidation = this.validateIdentifier(reference.id, {
        ...context,
        subjectKind: reference.kind,
        subjectId: reference.id,
      });

      if (!identifierValidation.valid) {
        issues.push(...identifierValidation.issues);
      }
    }

    const lookup = context?.lookup;
    if (lookup) {
      const resolved = lookup.lookup(reference.kind, reference.id);
      if (!resolved) {
        issues.push(
          issue(failureCode, 'id', 'Reference could not be resolved.', 'error', {
            subjectKind,
            subjectId,
            expected: reference.kind,
            actual: reference.id,
          }),
        );
      }
    }

    return issues;
  }
}

export const createValidationEngine = (options: ValidationEngineOptions = {}): ValidationEngine => new KernelValidationEngine(options);

export { validationIssueCodes };
