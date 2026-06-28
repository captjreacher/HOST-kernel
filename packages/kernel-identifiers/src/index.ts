import type {
  CanonicalIdentifierType,
  Identifier,
  IdentifierRegistry,
  TaxonomyResolver,
  ValidationIssue,
  ValidationIssueCode,
  ValidationResult,
} from '@host/kernel-types';
import { KernelTaxonomyResolver } from '@host/kernel-taxonomy';

export interface IdentifierService {
  generate(type: CanonicalIdentifierType): Identifier;
  validate(id: string): ValidationResult;
  parse(id: string): Identifier;
}

export interface IdentifierServiceOptions {
  registry?: IdentifierRegistry;
  taxonomyResolver?: TaxonomyResolver;
  sequenceWidth?: number;
}

export class IdentifierServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IdentifierServiceError';
  }
}

const defaultSequenceWidth = 3;
const canonicalPattern = /^([A-Z]{2,5})-(\d{3})$/;

const unsupportedTypeIssue = (message: string): ValidationIssue => ({
  code: 'identifier.unsupported-type' as ValidationIssueCode,
  path: 'type',
  message,
  severity: 'error',
});

const malformedIssue = (message: string): ValidationIssue => ({
  code: 'identifier.malformed' as ValidationIssueCode,
  path: 'value',
  message,
  severity: 'error',
});

const duplicateIssue = (message: string): ValidationIssue => ({
  code: 'identifier.duplicate' as ValidationIssueCode,
  path: 'value',
  message,
  severity: 'error',
});

const canonicalIssue = (message: string): ValidationIssue => ({
  code: 'identifier.canonical' as ValidationIssueCode,
  path: 'value',
  message,
  severity: 'error',
});

const formatCanonical = (prefix: string, sequence: number, width: number): string => `${prefix}-${sequence.toString().padStart(width, '0')}`;

const clone = <T>(value: T): T => structuredClone(value);
const issueCounts = (issues: ValidationIssue[]) =>
  issues.reduce(
    (counts, issue) => {
      if (issue.severity === 'warning') {
        counts.warnings += 1;
      } else if (issue.severity === 'info') {
        counts.info += 1;
      } else {
        counts.errors += 1;
      }

      return counts;
    },
    { errors: 0, warnings: 0, info: 0 },
  );

export class CanonicalIdentifierService implements IdentifierService {
  readonly #taxonomyResolver: TaxonomyResolver;
  readonly #registry: IdentifierRegistry | undefined;
  readonly #sequenceWidth: number;
  #reservations = new Map<string, Identifier>();

  constructor(options: IdentifierServiceOptions = {}) {
    this.#taxonomyResolver = options.taxonomyResolver ?? new KernelTaxonomyResolver();
    this.#registry = options.registry;
    this.#sequenceWidth = options.sequenceWidth ?? defaultSequenceWidth;
  }

  #parseCanonical(id: string): { prefix: string; sequence: number; canonical: string } | undefined {
    const match = canonicalPattern.exec(id);
    if (!match) {
      return undefined;
    }

    const prefix = match[1]!;
    const sequenceText = match[2]!;
    return {
      prefix,
      sequence: Number.parseInt(sequenceText, 10),
      canonical: id,
    };
  }

  #reserve(candidate: Identifier): boolean {
    if (this.#registry) {
      return this.#registry.reserve(candidate);
    }

    if (this.#reservations.has(candidate.value)) {
      return false;
    }

    this.#reservations.set(candidate.value, clone(candidate));
    return true;
  }

  #alreadyAllocated(value: string): boolean {
    return this.#registry ? this.#registry.exists(value) : this.#reservations.has(value);
  }

  generate(type: CanonicalIdentifierType): Identifier {
    const objectTypeResolution = this.#taxonomyResolver.resolveObjectType(type);
    const prefix = objectTypeResolution.entry?.prefix;
    if (!objectTypeResolution.resolved || !prefix) {
      throw new IdentifierServiceError(`Unsupported canonical identifier type: ${type}`);
    }

    const prefixResolution = this.#taxonomyResolver.resolveIdentifierPrefix(prefix);
    const prefixEntry = prefixResolution.entry;
    const canonicalType = prefixEntry?.identifierType;
    if (!prefixResolution.resolved || !prefixEntry || !canonicalType) {
      throw new IdentifierServiceError(`Unsupported canonical identifier prefix: ${prefix}`);
    }

    for (let sequence = 1; sequence < 1_000_000; sequence += 1) {
      const value = formatCanonical(prefixEntry.value, sequence, this.#sequenceWidth);
      const candidate: Identifier = {
        type: canonicalType,
        prefix: prefixEntry.value,
        sequence,
        value,
      };

      if (this.#reserve(candidate)) {
        return clone(candidate);
      }
    }

    throw new IdentifierServiceError(`Unable to allocate a unique identifier for type: ${type}`);
  }

  parse(id: string): Identifier {
    const parsed = this.#parseCanonical(id);
    if (!parsed) {
      throw new IdentifierServiceError(`Malformed identifier: ${id}`);
    }

    const prefixResolution = this.#taxonomyResolver.resolveIdentifierPrefix(parsed.prefix);
    if (!prefixResolution.resolved || !prefixResolution.entry?.identifierType) {
      throw new IdentifierServiceError(`Unsupported identifier prefix: ${parsed.prefix}`);
    }

    return {
      type: prefixResolution.entry.identifierType,
      prefix: prefixResolution.entry.value,
      sequence: parsed.sequence,
      value: parsed.canonical,
    };
  }

  validate(id: string): ValidationResult {
    const issues: ValidationIssue[] = [];

    if (id.trim() !== id || id.length === 0) {
      issues.push(malformedIssue('Identifier must not contain leading or trailing whitespace.'));
    }

    const parsed = this.#parseCanonical(id);
    if (!parsed) {
      issues.push(malformedIssue('Identifier must match the canonical pattern PREFIX-###.'));
    } else {
      const prefixResolution = this.#taxonomyResolver.resolveIdentifierPrefix(parsed.prefix);
      if (!prefixResolution.resolved || !prefixResolution.entry) {
        issues.push(unsupportedTypeIssue(`Unsupported identifier prefix: ${parsed.prefix}`));
      } else {
        if (parsed.sequence < 1) {
          issues.push(malformedIssue('Identifier sequence must be greater than zero.'));
        }
        const expected = formatCanonical(prefixResolution.entry.value, parsed.sequence, this.#sequenceWidth);
        if (expected !== id) {
          const objectType = prefixResolution.entry.identifierType ?? 'objective';
          issues.push(canonicalIssue(`Identifier must use canonical formatting for ${objectType.toUpperCase()} identifiers.`));
        }
      }
    }

    if (parsed && this.#alreadyAllocated(id)) {
      issues.push(duplicateIssue(`Identifier is already allocated: ${id}`));
    }

    const counts = issueCounts(issues);
    return {
      outcome: issues.some((issue) => issue.severity === 'error') ? 'invalid' : 'valid',
      valid: !issues.some((issue) => issue.severity === 'error'),
      issues,
      ...counts,
    };
  }
}

export const createCanonicalIdentifierService = (options: IdentifierServiceOptions = {}): IdentifierService =>
  new CanonicalIdentifierService(options);
