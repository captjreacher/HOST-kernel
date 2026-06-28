import test from 'node:test';
import assert from 'node:assert/strict';
import { RegistryError } from '@host/kernel-registry';
import { DocumentRegistryService } from '@host/kernel-documents';

const createDocument = (overrides: Record<string, unknown> = {}) => ({
  id: 'DOC-001',
  key: 'DOC-001',
  display_name: 'Document 001',
  description: 'Canonical document metadata.',
  status: 'active',
  version: '1.0.0',
  owner: 'HOST',
  document_type: 'architecture',
  owner_objective: null,
  lineage: [],
  relationships: [],
  ...overrides,
});

test('register document', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });

  const document = service.registerDocument(createDocument());

  assert.equal(document.id, 'DOC-001');
  assert.equal(document.document_type, 'architecture');
  assert.equal(service.lookup(document.id)?.display_name, 'Document 001');
});

test('duplicate document rejection', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });

  service.registerDocument(createDocument());

  assert.throws(
    () =>
      service.registerDocument({
        ...createDocument({
          display_name: 'Document Duplicate',
        }),
      }),
    RegistryError,
  );
});

test('retrieve document', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });
  const document = service.registerDocument(createDocument());

  assert.equal(service.retrieveDocument(document.id)?.key, 'DOC-001');
});

test('update document metadata', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });
  const document = service.registerDocument(createDocument());

  const updated = service.updateDocument(document.id, {
    display_name: 'Document 001 v2',
    description: 'Updated document metadata.',
    version: '1.1.0',
  });

  assert.equal(updated.display_name, 'Document 001 v2');
  assert.equal(updated.version, '1.1.0');
  assert.deepEqual(updated.relationships, []);
});

test('missing document rejection', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });

  assert.throws(() => service.updateDocument('DOC-404', { display_name: 'missing' }), RegistryError);
});

test('invalid document status rejection', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });

  assert.throws(
    () =>
      service.registerDocument({
        ...createDocument({ status: 'broken' as never }),
      }),
    RegistryError,
  );
});

test('missing version rejection', () => {
  const service = new DocumentRegistryService({ seedConstitutionalArtifacts: false });

  assert.throws(
    () =>
      service.registerDocument({
        ...createDocument({ version: ' ' }),
      }),
    RegistryError,
  );
});

test('valid lineage link', () => {
  const service = new DocumentRegistryService();

  const document = service.registerDocument(
    createDocument({
      id: 'DOC-LINEAGE',
      key: 'DOC-LINEAGE',
      display_name: 'Document Lineage',
      lineage: ['OBJ-000'],
    }),
  );

  assert.deepEqual(document.lineage, ['OBJ-000']);
});

test('broken lineage link', () => {
  const service = new DocumentRegistryService();

  assert.throws(
    () =>
      service.registerDocument(
        createDocument({
          id: 'DOC-LINEAGE-BROKEN',
          key: 'DOC-LINEAGE-BROKEN',
          display_name: 'Broken Lineage',
          lineage: ['DOC-404'],
        }),
      ),
    RegistryError,
  );
});

test('valid related-document link', () => {
  const service = new DocumentRegistryService();

  const document = service.registerDocument(
    createDocument({
      id: 'DOC-RELATED',
      key: 'DOC-RELATED',
      display_name: 'Document Related',
      relationships: ['OBJ-003'],
    }),
  );

  assert.deepEqual(document.relationships, ['OBJ-003']);
});

test('broken related-document link', () => {
  const service = new DocumentRegistryService();

  assert.throws(
    () =>
      service.registerDocument(
        createDocument({
          id: 'DOC-RELATED-BROKEN',
          key: 'DOC-RELATED-BROKEN',
          display_name: 'Broken Related',
          relationships: ['DOC-404'],
        }),
      ),
    RegistryError,
  );
});

test('discovery of constitutional artefacts', () => {
  const service = new DocumentRegistryService();
  const documents = service.discoverConstitutionalArtifacts();

  assert.equal(documents.length, 8);
  assert.ok(documents.some((document) => document.id === 'OBJ-000'));
  assert.ok(documents.some((document) => document.id === 'OBJ-001'));
  assert.ok(documents.some((document) => document.id === 'OBJ-002'));
  assert.ok(documents.some((document) => document.id === 'OBJ-003'));
  assert.ok(documents.some((document) => document.id === 'OBJ-004'));
  assert.ok(documents.some((document) => document.id === 'OBJ-005'));
  assert.ok(documents.some((document) => document.id === 'OBJ-006'));
  assert.ok(documents.some((document) => document.id === 'HOST-0'));
});
