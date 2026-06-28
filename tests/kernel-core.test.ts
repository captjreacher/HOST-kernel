import test from 'node:test';
import assert from 'node:assert/strict';
import { createKernel, KernelBootstrapError } from '@host/kernel-core';

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
});

test('service availability', () => {
  const kernel = createKernel();
  const objective = kernel.objectives.createObjective({
    key: 'kernel-bootstrap-objective',
    display_name: 'Kernel Bootstrap Objective',
    description: 'Bootstrap runtime objective.',
    owner: 'HOST',
  });

  assert.match(objective.objective_id, /^OBJ-\d{3}$/);
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
  assert.deepEqual(Object.keys(kernel).sort(), ['documents', 'healthCheck', 'identifiers', 'objectives', 'repositories', 'registry', 'taxonomy', 'validation'].sort());
});
