import test from 'node:test';
import assert from 'node:assert/strict';
import { createKernel } from '@host/kernel-core';
import { ContextRuntimeError, createContextRuntime } from '../packages/context-runtime/src/index.ts';

const fixedNow = '2026-06-28T12:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

test('immutable runtime creation', () => {
  const runtime = createRuntime();
  const record = runtime.createRecord({
    source: { kind: 'observation', id: 'OBS-001', title: 'Observation' },
    references: [{ kind: 'document', id: 'OBJ-004', title: 'Context Domain Model' }],
    confidence: { score: 0.9, note: 'Validated' },
    freshness: {},
    provenance: {
      source: 'host-kernel-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

  assert.equal(Object.isFrozen(record), true);
  assert.equal(Object.isFrozen(record.source), true);
  assert.equal(Object.isFrozen(record.references), true);
  assert.equal(Object.isFrozen(record.provenance), true);
});

test('serialization round-trip and deserialization', () => {
  const runtime = createRuntime();
  const snapshot = runtime.createSnapshot({
    records: [
      {
        source: { kind: 'observation', id: 'OBS-001' },
        provenance: {
          source: 'host-kernel-tests',
          source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
        },
      },
    ],
  });

  const serialized = runtime.serialize(snapshot);
  const deserialized = runtime.deserialize(serialized);

  assert.equal(runtime.equals(snapshot, deserialized), true);
  assert.equal(deserialized.runtime_kind, 'context-snapshot');
});

test('validation success for canonical references and records', () => {
  const runtime = createRuntime();
  const referenceValidation = runtime.validateReference({ kind: 'observation', id: 'OBS-001' });
  const recordValidation = runtime.validateRecord({
    source: { kind: 'observation', id: 'OBS-001' },
    references: [{ kind: 'document', id: 'OBJ-004' }],
    provenance: {
      source: 'host-kernel-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

  assert.equal(referenceValidation.valid, true);
  assert.equal(recordValidation.valid, true);
});

test('validation failures are deterministic', () => {
  const runtime = createRuntime();
  const badReference = runtime.validateReference({ kind: 'observation', id: 'OBS001' });
  const badFreshness = runtime.validateFreshness({ observed_at: 'not-a-timestamp' });
  const badConfidence = runtime.validateConfidence({ score: Number.NaN });

  assert.equal(badReference.valid, false);
  assert.equal(badFreshness.valid, false);
  assert.equal(badConfidence.valid, false);
});

test('canonical identifier references are enforced', () => {
  const runtime = createRuntime();

  assert.equal(runtime.validateReference({ kind: 'evidence', id: 'EVD-001' }).valid, true);
  assert.equal(runtime.validateReference({ kind: 'evidence', id: 'evidence-001' }).valid, false);
});

test('equality and cloning', () => {
  const runtime = createRuntime();
  const left = runtime.createReference({ kind: 'observation', id: 'OBS-001', title: 'Observation' });
  const right = runtime.clone(left);

  assert.equal(runtime.equals(left, right), true);
  assert.notEqual(left, right);
});

test('deterministic defaults and version metadata', () => {
  const runtime = createRuntime();
  const freshness = runtime.createFreshness();
  const snapshot = runtime.createSnapshot();

  assert.equal(freshness.observed_at, fixedNow);
  assert.equal(freshness.runtime_version, '1.0.0');
  assert.equal(snapshot.captured_at, fixedNow);
  assert.equal(snapshot.runtime_version, '1.0.0');
});

test('timestamp handling preserves canonical ISO values', () => {
  const runtime = createRuntime();
  const reference = runtime.createReference({
    kind: 'document',
    id: 'OBJ-004',
    created_at: fixedNow,
    updated_at: fixedNow,
  });

  assert.equal(reference.created_at, fixedNow);
  assert.equal(reference.updated_at, fixedNow);
});

test('invalid runtime payloads throw context runtime errors', () => {
  const runtime = createRuntime();

  assert.throws(
    () =>
      runtime.createRecord({
        source: { kind: 'observation', id: 'OBS001' },
        provenance: {
          source: 'host-kernel-tests',
          source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
        },
      }),
    ContextRuntimeError,
  );
});
