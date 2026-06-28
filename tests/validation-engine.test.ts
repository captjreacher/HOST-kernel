import test from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalIdentifierService } from '@host/kernel-identifiers';
import { RegistryService } from '@host/kernel-registry';
import { createValidationEngine, validationIssueCodes } from '@host/kernel-validation';
import type { Document, RegistryRecord, Repository, ValidationLookup } from '@host/kernel-types';

const timestamp = '2026-06-28T00:00:00.000Z';

const createRegistryRecord = (overrides: Partial<RegistryRecord> = {}): RegistryRecord => ({
  id: 'record-001',
  key: 'record-001',
  display_name: 'Record 001',
  description: 'Canonical registry record for validation tests.',
  status: 'active',
  version: '1.0.0',
  owner: 'host',
  created_at: timestamp,
  updated_at: timestamp,
  ...overrides,
});

const createRepository = (overrides: Partial<Repository> = {}): Repository =>
  ({
    ...createRegistryRecord({
      key: 'repository-001',
      display_name: 'Repository 001',
    }),
    repository_url: 'https://example.com/host/repository-001.git',
    default_branch: 'main',
    owning_objective: 'OBJ-001',
    ...overrides,
  }) as Repository;

const createDocument = (overrides: Partial<Document> = {}): Document =>
  ({
    ...createRegistryRecord({
      key: 'document-001',
      display_name: 'Document 001',
    }),
    document_type: 'objective',
    owner_objective: 'OBJ-001',
    lineage: ['OBJ-001'],
    relationships: ['OBJ-001'],
    ...overrides,
  }) as Document;

const missingLookup: ValidationLookup = {
  lookup: () => undefined,
};

const objectiveLookup: ValidationLookup = {
  lookup: (kind, id) => {
    if (kind === 'objective' && id === 'OBJ-001') {
      return createRegistryRecord({
        id: 'objective-001',
        key: 'objective-001',
        display_name: 'Objective 001',
        description: 'Lookup result for traceability tests.',
      });
    }

    return undefined;
  },
};

test('valid identifier', () => {
  const engine = createValidationEngine();
  const validation = engine.validateIdentifier('OBJ-001');

  assert.equal(validation.valid, true);
  assert.equal(validation.outcome, 'valid');
});

test('malformed identifier', () => {
  const engine = createValidationEngine();
  const validation = engine.validateIdentifier('OBJ001');

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'identifier.malformed'));
});

test('duplicate identifier', () => {
  const registry = new RegistryService();
  const identifierService = new CanonicalIdentifierService({ registry });
  const engine = createValidationEngine({ identifierService });

  const allocated = identifierService.generate('objective');
  const validation = engine.validateIdentifier(allocated.value);

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'identifier.duplicate'));
});

test('unsupported taxonomy value', () => {
  const engine = createValidationEngine();
  const validation = engine.validateTaxonomy('unsupported-value');

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationTaxonomyUnsupportedValue));
});

test('invalid lifecycle state', () => {
  const engine = createValidationEngine();
  const validation = engine.validateLifecycleState('obsolete');

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationLifecycleInvalid));
});

test('missing repository owner', () => {
  const engine = createValidationEngine();
  const validation = engine.validateRepository(createRepository({ owning_objective: null }));

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationRepositoryOwnerMissing));
});

test('invalid repository lifecycle', () => {
  const engine = createValidationEngine();
  const validation = engine.validateRepository(createRepository({ status: 'broken' as unknown as Repository['status'] }));

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationRepositoryLifecycleInvalid));
});

test('missing document version', () => {
  const engine = createValidationEngine();
  const validation = engine.validateDocument(createDocument({ version: ' ' }));

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationDocumentVersionMissing));
});

test('invalid document status', () => {
  const engine = createValidationEngine();
  const validation = engine.validateDocument(createDocument({ status: 'broken' as unknown as Document['status'] }));

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationDocumentStatusInvalid));
});

test('broken document reference', () => {
  const engine = createValidationEngine();
  const validation = engine.validateDocumentReference({ kind: 'document', id: 'document-404' }, { lookup: missingLookup });

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationDocumentReferenceBroken));
});

test('broken traceability link', () => {
  const engine = createValidationEngine();
  const validation = engine.validateTraceability(createRegistryRecord(), {
    lookup: missingLookup,
    references: [{ kind: 'objective', id: 'OBJ-404', relation: 'depends-on' }],
  });

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationTraceabilityLinkBroken));
});

test('valid registry record', () => {
  const engine = createValidationEngine();
  const validation = engine.validateRegistryRecord(createRegistryRecord());

  assert.equal(validation.valid, true);
  assert.equal(validation.outcome, 'valid');
});

test('invalid registry record', () => {
  const engine = createValidationEngine();
  const validation = engine.validateRegistryRecord(createRegistryRecord({ status: 'broken' as unknown as RegistryRecord['status'] }));

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === validationIssueCodes.validationRegistryRecordStatusInvalid));
});

test('valid document reference', () => {
  const engine = createValidationEngine();
  const validation = engine.validateDocumentReference({ kind: 'objective', id: 'OBJ-001' }, { lookup: objectiveLookup });

  assert.equal(validation.valid, true);
});

test('validates canonical context reference kinds through identifier rules', () => {
  const engine = createValidationEngine();
  const validation = engine.validateDocumentReference({ kind: 'observation', id: 'OBS-001' });

  assert.equal(validation.valid, true);
});
