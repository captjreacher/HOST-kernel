import test from 'node:test';
import assert from 'node:assert/strict';
import { RegistryError, RegistryService } from '@host/kernel-registry';
import { validationIssueCodes } from '@host/kernel-types';
import { ObjectiveRegistryService } from '@host/kernel-objectives';

const timestamp = '2026-06-28T00:00:00.000Z';

const createRegistryRecord = (overrides: Record<string, unknown> = {}) => ({
  id: 'record-001',
  key: 'record-001',
  display_name: 'Record 001',
  description: 'Support record for objective traceability tests.',
  status: 'active',
  version: '1.0.0',
  owner: 'host',
  created_at: timestamp,
  updated_at: timestamp,
  ...overrides,
});

const createSupportRegistry = (): RegistryService => {
  const registry = new RegistryService();

  registry.register({
    ...createRegistryRecord({
      kind: 'objective',
      id: 'OBJ-900',
      key: 'OBJ-900',
      display_name: 'Seed Objective',
      description: 'Reference objective for traceability tests.',
      lifecycle_state: 'active',
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'adr',
      id: 'ADR-001',
      key: 'ADR-001',
      display_name: 'ADR 001',
      description: 'Architecture decision record.',
      lifecycle_state: 'draft',
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'repository',
      id: 'repository-001',
      key: 'repository-001',
      display_name: 'Repository 001',
      description: 'Repository supporting traceability tests.',
      repository_url: 'https://example.com/host/repository-001.git',
      default_branch: 'main',
      owning_objective: 'OBJ-900',
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'document',
      id: 'document-001',
      key: 'document-001',
      display_name: 'Document 001',
      description: 'Document supporting traceability tests.',
      document_type: 'objective',
      owner_objective: 'OBJ-900',
      lineage: [],
      relationships: [],
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'capability',
      id: 'CAP-001',
      key: 'CAP-001',
      display_name: 'Capability 001',
      description: 'Capability supporting traceability tests.',
      owning_objective: 'OBJ-900',
      maturity: 'alpha',
      dependencies: [],
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'task',
      id: 'TASK-001',
      key: 'TASK-001',
      display_name: 'Task 001',
      description: 'Task supporting traceability tests.',
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'artifact',
      id: 'ART-001',
      key: 'ART-001',
      display_name: 'Artifact 001',
      description: 'Artifact supporting traceability tests.',
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'workflow',
      id: 'WF-001',
      key: 'WF-001',
      display_name: 'Workflow 001',
      description: 'Workflow supporting traceability tests.',
    }),
  });

  registry.register({
    ...createRegistryRecord({
      kind: 'event',
      id: 'EVT-001',
      key: 'EVT-001',
      display_name: 'Event 001',
      description: 'Event supporting traceability tests.',
      event_name: 'objective.created',
    }),
  });

  return registry;
};

test('create objective', () => {
  const service = new ObjectiveRegistryService();

  const objective = service.createObjective({
    key: 'objective-registry',
    display_name: 'Objective Registry',
    description: 'Governed objective registry',
    owner: 'host',
  });

  assert.match(objective.objective_id, /^OBJ-\d{3}$/);
  assert.equal(objective.lifecycle_state, 'draft');
  assert.equal(service.lookup(objective.id)?.objective_id, objective.objective_id);
});

test('create duplicate objective rejection', () => {
  const service = new ObjectiveRegistryService();

  service.createObjective({
    key: 'objective-registry',
    display_name: 'Objective Registry',
    description: 'Governed objective registry',
    owner: 'host',
  });

  assert.throws(
    () =>
      service.createObjective({
        key: 'objective-registry',
        display_name: 'Objective Registry Duplicate',
        description: 'Duplicate governed objective registry',
        owner: 'host',
      }),
    RegistryError,
  );
});

test('retrieve objective', () => {
  const service = new ObjectiveRegistryService();
  const objective = service.createObjective({
    key: 'objective-retrieve',
    display_name: 'Objective Retrieve',
    description: 'Objective retrieval test',
    owner: 'host',
  });

  assert.equal(service.retrieveObjective(objective.id)?.display_name, 'Objective Retrieve');
});

test('update objective', () => {
  const service = new ObjectiveRegistryService();
  const objective = service.createObjective({
    key: 'objective-update',
    display_name: 'Objective Update',
    description: 'Objective update test',
    owner: 'host',
  });

  const updated = service.updateObjective(objective.id, {
    display_name: 'Objective Update v2',
    description: 'Updated objective description',
    dependencies: ['OBJ-900'],
  });

  assert.equal(updated.display_name, 'Objective Update v2');
  assert.deepEqual(updated.dependencies, ['OBJ-900']);
  assert.equal(service.lookup(objective.id)?.description, 'Updated objective description');
});

test('update missing objective', () => {
  const service = new ObjectiveRegistryService();

  assert.throws(() => service.updateObjective('OBJ-404', { display_name: 'Missing' }), RegistryError);
});

test('valid lifecycle transition', () => {
  const service = new ObjectiveRegistryService();
  const objective = service.createObjective({
    key: 'objective-transition',
    display_name: 'Objective Transition',
    description: 'Objective transition test',
    owner: 'host',
  });

  const transitioned = service.transitionObjective(objective.id, 'proposed');

  assert.equal(transitioned.lifecycle_state, 'proposed');
  assert.equal(service.lookup(objective.id)?.lifecycle_state, 'proposed');
});

test('invalid lifecycle transition', () => {
  const service = new ObjectiveRegistryService();
  const objective = service.createObjective({
    key: 'objective-transition-invalid',
    display_name: 'Objective Transition Invalid',
    description: 'Objective transition invalid test',
    owner: 'host',
  });

  assert.throws(
    () => service.transitionObjective(objective.id, 'active'),
    (error: unknown) => {
      assert.ok(error instanceof RegistryError);
      const registryError = error as RegistryError;
      assert.ok(registryError.issues.some((issue) => issue.code === validationIssueCodes.validationLifecycleInvalid));
      return true;
    },
  );
});

test('objective with valid traceability links', () => {
  const registry = createSupportRegistry();
  const service = new ObjectiveRegistryService({ registry });

  const objective = service.createObjective({
    key: 'objective-traceability',
    display_name: 'Objective Traceability',
    description: 'Objective with valid traceability links',
    owner: 'host',
    references: [
      { kind: 'objective', id: 'OBJ-900', relation: 'references' },
      { kind: 'adr', id: 'ADR-001', relation: 'references' },
      { kind: 'repository', id: 'repository-001', relation: 'references' },
      { kind: 'document', id: 'document-001', relation: 'references' },
      { kind: 'capability', id: 'CAP-001', relation: 'depends-on' },
      { kind: 'task', id: 'TASK-001', relation: 'implements' },
      { kind: 'artifact', id: 'ART-001', relation: 'traces-to' },
      { kind: 'workflow', id: 'WF-001', relation: 'depends-on' },
      { kind: 'event', id: 'EVT-001', relation: 'references' },
    ],
  });

  assert.equal(objective.references?.length, 9);
});

test('objective with broken traceability links', () => {
  const registry = createSupportRegistry();
  const service = new ObjectiveRegistryService({ registry });

  assert.throws(
    () =>
      service.createObjective({
        key: 'objective-traceability-broken',
        display_name: 'Objective Traceability Broken',
        description: 'Objective with broken traceability links',
        owner: 'host',
        references: [{ kind: 'document', id: 'document-404', relation: 'references' }],
      }),
    RegistryError,
  );
});
