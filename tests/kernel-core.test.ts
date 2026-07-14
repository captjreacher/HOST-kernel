import test from 'node:test';
import assert from 'node:assert/strict';
import { createKernel, KernelBootstrapError } from '@host/kernel-core';
import { createContextRuntimeAdapter } from '../packages/context-runtime/src/index.ts';

test('bootstrap success', () => {
  const kernel = createKernel();

  assert.ok(kernel);
  assert.equal(typeof kernel.healthCheck, 'function');
  assert.equal(typeof kernel.identifiers.generate, 'function');
  assert.equal(typeof kernel.taxonomy.resolveObjectType, 'function');
  assert.equal(typeof kernel.validation.validateRegistryRecord, 'function');
  assert.equal(typeof kernel.registry.find, 'function');
  assert.equal(typeof kernel.objectives.createObjective, 'function');
  assert.equal(typeof kernel.documents.discoverConstitutionalArtifacts, 'function');
  assert.equal(typeof kernel.repositories.list, 'function');
  assert.equal(kernel.adapters.context, undefined);
});

test('context runtime adapter can be composed without reversing package dependencies', () => {
  const kernel = createKernel({
    runtimeAdapters: {
      context: createContextRuntimeAdapter({
        now: () => '2026-06-28T12:00:00.000Z',
        version: '1.0.0',
      }),
    },
  });

  const snapshot = kernel.adapters.context?.createSnapshot({
    records: [
      {
        source: { kind: 'observation', id: 'OBS-001' },
        provenance: {
          source: 'kernel-core-test',
          source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
        },
      },
    ],
  });

  assert.ok(snapshot);
  assert.equal(snapshot?.runtime_kind, 'context-snapshot');
  assert.equal(kernel.healthCheck().checks.some((check) => check.name === 'context-runtime-adapter' && check.healthy), true);
});

test('service availability', () => {
  const kernel = createKernel();
  const objective = kernel.objectives.createObjective({
    key: 'kernel-bootstrap-objective',
    display_name: 'Kernel Bootstrap Objective',
    description: 'Bootstrap runtime objective.',
    owner: 'HOST',
  });

  assert.equal(objective.objective_id, 'OBJ-007');
  assert.equal(kernel.objectives.retrieveObjective(objective.id)?.id, objective.id);
  assert.ok(kernel.registry.lookup('objective', objective.id));
});

test('seed discovery', () => {
  const kernel = createKernel();
  const artifacts = kernel.documents.discoverConstitutionalArtifacts();

  assert.equal(artifacts.length, 8);
  assert.deepEqual(
    artifacts.map((artifact) => artifact.id).sort(),
    ['HOST-0', 'OBJ-000', 'OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004', 'OBJ-005', 'OBJ-006'].sort(),
  );
  assert.equal(kernel.objectives.listObjectives().length, 7);
  assert.ok(kernel.objectives.listObjectives().every((objective) => objective.lifecycle_state === 'approved'));
  assert.ok(kernel.registry.lookup('objective', 'OBJ-000'));
  assert.equal(kernel.registry.lookup('document', 'OBJ-000'), undefined);
  assert.equal(kernel.documents.retrieveDocument('OBJ-000')?.document_type, 'constitution');
});

test('health success', () => {
  const kernel = createKernel();
  const health = kernel.healthCheck();

  assert.equal(health.healthy, true);
  assert.equal(health.status, 'healthy');
  assert.equal(health.checks.every((check) => check.healthy), true);
  assert.equal(health.constitutionalArtifacts.length, 8);
});

test('invalid config rejection', () => {
  assert.throws(() => createKernel({ seedConstitutionalArtifacts: 'yes' as never }), KernelBootstrapError);
});

test('no product-specific dependencies', () => {
  const kernel = createKernel();

  assert.equal('products' in kernel, false);
  assert.equal('productRegistry' in kernel, false);
  assert.deepEqual(
    Object.keys(kernel).sort(),
    ['adapters', 'documents', 'healthCheck', 'identifiers', 'objectives', 'repositories', 'registry', 'taxonomy', 'validation'].sort(),
  );
});
