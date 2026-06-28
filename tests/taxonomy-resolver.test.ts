import test from 'node:test';
import assert from 'node:assert/strict';
import { KernelTaxonomyResolver, canonicalTaxonomySeed } from '@host/kernel-taxonomy';

const resolver = new KernelTaxonomyResolver();

test('resolves known object types and identifier prefixes', () => {
  const objectiveType = resolver.resolveObjectType('objective');
  const objectivePrefix = resolver.resolveIdentifierPrefix('OBJ');
  const relationshipType = resolver.resolveObjectType('relationship');
  const relationshipPrefix = resolver.resolveIdentifierPrefix('RLT');
  const signalType = resolver.resolveObjectType('signal');
  const observationType = resolver.resolveObjectType('observation');
  const evidenceType = resolver.resolveObjectType('evidence');

  assert.equal(objectiveType.resolved, true);
  assert.equal(objectiveType.entry?.prefix, 'OBJ');
  assert.equal(objectivePrefix.resolved, true);
  assert.equal(objectivePrefix.entry?.identifierType, 'objective');
  assert.equal(relationshipType.entry?.identifierType, 'relationship');
  assert.equal(relationshipType.entry?.prefix, 'RLT');
  assert.equal(relationshipPrefix.entry?.identifierType, 'relationship');
  assert.equal(signalType.entry?.identifierType, 'signal');
  assert.equal(observationType.entry?.identifierType, 'observation');
  assert.equal(evidenceType.entry?.identifierType, 'evidence');
});

test('resolves lifecycle, event, and relationship taxonomy values', () => {
  const lifecycle = resolver.resolveLifecycleState('draft');
  const eventType = resolver.resolveEventType('registry.updated');
  const relationshipType = resolver.resolveRelationshipType('depends-on');

  assert.equal(lifecycle.resolved, true);
  assert.equal(lifecycle.entry?.value, 'draft');
  assert.equal(eventType.resolved, true);
  assert.equal(eventType.entry?.value, 'registry.updated');
  assert.equal(relationshipType.resolved, true);
  assert.equal(relationshipType.entry?.value, 'depends-on');
});

test('lists canonical taxonomy entries for discovery', () => {
  const objectTypes = resolver.listObjectTypes();
  const prefixes = resolver.listIdentifierPrefixes();
  const lifecycleStates = resolver.listLifecycleStates();

  assert.ok(objectTypes.length >= canonicalTaxonomySeed.objectTypes.length);
  assert.ok(prefixes.length >= canonicalTaxonomySeed.identifierPrefixes.length);
  assert.ok(lifecycleStates.some((state) => state.value === 'draft'));
  assert.ok(objectTypes.some((entry) => entry.value === 'objective'));
  assert.ok(prefixes.some((entry) => entry.value === 'OBJ'));
});

test('rejects unsupported taxonomy values with structured errors', () => {
  const objectType = resolver.resolveObjectType('unknown-object');
  const subordinateType = resolver.resolveObjectType('context-record');
  const prefix = resolver.resolveIdentifierPrefix('ZZZ');
  const malformed = resolver.validateTaxonomyValue(' objective ');

  assert.equal(objectType.resolved, false);
  assert.equal(subordinateType.resolved, false);
  assert.equal(prefix.resolved, false);
  assert.equal(malformed.valid, false);
  assert.ok(malformed.issues.some((issue) => issue.code === 'taxonomy.value.malformed'));
});

test('validation accepts canonical taxonomy values', () => {
  const objectType = resolver.validateTaxonomyValue('objective');
  const prefix = resolver.validateTaxonomyValue('OBJ');
  const lifecycle = resolver.validateTaxonomyValue('draft');

  assert.equal(objectType.valid, true);
  assert.equal(prefix.valid, true);
  assert.equal(lifecycle.valid, true);
});
