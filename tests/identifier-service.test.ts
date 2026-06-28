import test from 'node:test';
import assert from 'node:assert/strict';
import { CanonicalIdentifierService } from '@host/kernel-identifiers';
import { RegistryService } from '@host/kernel-registry';

const supportedTypes = [
  ['objective', 'OBJ-001'],
  ['adr', 'ADR-001'],
  ['capability', 'CAP-001'],
  ['entity', 'ENT-001'],
  ['workflow', 'WF-001'],
  ['event', 'EVT-001'],
  ['artifact', 'ART-001'],
  ['task', 'TASK-001'],
] as const;

test('generates canonical identifiers for every supported type', () => {
  const service = new CanonicalIdentifierService();

  for (const [type, expected] of supportedTypes) {
    const identifier = service.generate(type);

    assert.equal(identifier.type, type);
    assert.equal(identifier.value, expected);
    assert.match(identifier.value, /^[A-Z]{2,5}-\d{3}$/);
  }
});

test('parses canonical identifier metadata', () => {
  const service = new CanonicalIdentifierService();
  const generated = service.generate('task');
  const parsed = service.parse(generated.value);

  assert.equal(parsed.type, 'task');
  assert.equal(parsed.prefix, 'TASK');
  assert.equal(parsed.sequence, 1);
  assert.equal(parsed.value, 'TASK-001');
});

test('validates malformed identifiers', () => {
  const service = new CanonicalIdentifierService();
  const malformed = ['OBJ001', 'OBJ-1', 'obj-001', 'OBJ-000', ' OBJ-001', 'OBJ-001 '];

  for (const candidate of malformed) {
    const validation = service.validate(candidate);
    assert.equal(validation.valid, false, candidate);
    assert.ok(validation.issues.length > 0, candidate);
  }
});

test('rejects unsupported identifier prefixes', () => {
  const service = new CanonicalIdentifierService();
  const validation = service.validate('XYZ-001');

  assert.equal(validation.valid, false);
  assert.ok(validation.issues.some((issue) => issue.code === 'identifier.unsupported-type'));
  assert.throws(() => service.parse('XYZ-001'));
});

test('duplicate allocation is prevented through the registry abstraction', () => {
  const registry = new RegistryService();
  const firstService = new CanonicalIdentifierService({ registry });
  const secondService = new CanonicalIdentifierService({ registry });

  const first = firstService.generate('objective');
  const second = secondService.generate('objective');

  assert.equal(first.value, 'OBJ-001');
  assert.equal(second.value, 'OBJ-002');

  const duplicateValidation = secondService.validate(first.value);
  assert.equal(duplicateValidation.valid, false);
  assert.ok(duplicateValidation.issues.some((issue) => issue.code === 'identifier.duplicate'));
});
