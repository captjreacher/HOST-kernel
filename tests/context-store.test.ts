import test from 'node:test';
import assert from 'node:assert/strict';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import {
  beginTransaction,
  commit,
  createContextStore,
  createInMemoryContextStore,
  query,
  rollback,
  snapshot,
  type ContextStore,
} from '../packages/context-store/src/index.ts';

const fixedNow = '2026-06-29T00:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

const createStore = (): ContextStore =>
  createInMemoryContextStore({
    runtime: createRuntime(),
    now: () => fixedNow,
  });

const createRecord = () =>
  createRuntime().createRecord({
    source: { kind: 'observation', id: 'OBS-001', title: 'Observation' },
    references: [{ kind: 'document', id: 'OBJ-004' }],
    provenance: {
      source: 'context-store-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

const createSnapshotValue = () =>
  createRuntime().createSnapshot({
    records: [
      {
        source: { kind: 'observation', id: 'OBS-002' },
        provenance: {
          source: 'context-store-tests',
          source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
        },
      },
    ],
  });

test('factory functions create a usable context store boundary', async () => {
  const store = createContextStore({
    runtime: createRuntime(),
    now: () => fixedNow,
  });

  assert.equal(typeof store.create, 'function');
  assert.equal(typeof store.beginTransaction, 'function');
  assert.equal(store.runtime.version.version, '1.0.0');
});

test('create retrieve exists update and delete satisfy the storage contracts', async () => {
  const store = createStore();
  const record = createRecord();

  const created = await store.create('context/record/1', record);
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  assert.equal(created.value.version, 1);
  assert.equal(created.value.runtime_kind, 'context-record');

  const exists = await store.exists('context/record/1');
  assert.equal(exists.ok, true);
  if (!exists.ok) {
    return;
  }

  assert.equal(exists.value.exists, true);
  assert.equal(exists.value.version, 1);

  const retrieved = await store.retrieve('context/record/1');
  assert.equal(retrieved.ok, true);
  if (!retrieved.ok) {
    return;
  }

  assert.equal(retrieved.value.value.runtime_kind, 'context-record');
  assert.notEqual(retrieved.value.value, record);

  const updatedValue = createSnapshotValue();
  const updated = await store.update('context/record/1', updatedValue, { expected_version: 1 });
  assert.equal(updated.ok, true);
  if (!updated.ok) {
    return;
  }

  assert.equal(updated.value.version, 2);
  assert.equal(updated.value.runtime_kind, 'context-snapshot');

  const deleted = await store.delete('context/record/1', { expected_version: 2 });
  assert.equal(deleted.ok, true);
  if (!deleted.ok) {
    return;
  }

  assert.equal(deleted.value.version, 2);

  const missing = await store.exists('context/record/1');
  assert.equal(missing.ok, true);
  if (!missing.ok) {
    return;
  }

  assert.equal(missing.value.exists, false);
});

test('immutable runtime values are preserved across store boundaries', async () => {
  const store = createStore();
  const record = createRecord();

  await store.create('context/immutable/1', record);
  const retrieved = await store.retrieve('context/immutable/1');

  assert.equal(retrieved.ok, true);
  if (!retrieved.ok) {
    return;
  }

  assert.equal(Object.isFrozen(retrieved.value), true);
  assert.equal(Object.isFrozen(retrieved.value.value), true);
  assert.equal(Object.isFrozen(retrieved.value.value.source), true);
});

test('optimistic version handling is deterministic', async () => {
  const store = createStore();
  await store.create('context/version/1', createRecord());

  const conflict = await store.update('context/version/1', createRecord(), { expected_version: 99 });
  assert.equal(conflict.ok, false);
  if (conflict.ok) {
    return;
  }

  assert.equal(conflict.error.code, 'context-store.version-conflict');
  assert.equal(conflict.error.expected_version, 99);
  assert.equal(conflict.error.actual_version, 1);
});

test('duplicate keys and missing records return deterministic errors', async () => {
  const store = createStore();
  const record = createRecord();

  await store.create('context/error/1', record);

  const duplicate = await store.create('context/error/1', record);
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.error.code, 'context-store.duplicate-key');
  }

  const missing = await store.retrieve('context/missing/1');
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.error.code, 'context-store.not-found');
  }
});

test('query filtering ordering and pagination are deterministic', async () => {
  const store = createStore();
  await store.create('context/query/3', createRecord());
  await store.create('context/query/1', createRuntime().createReference({ kind: 'document', id: 'OBJ-004' }));
  await store.create('context/query/2', createSnapshotValue());

  const result = await query(store, {
    key_prefix: 'context/query/',
    order_by: [{ field: 'key', direction: 'asc' }],
    limit: 2,
    offset: 0,
  });

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(
    result.value.items.map((item) => item.key),
    ['context/query/1', 'context/query/2'],
  );
  assert.equal(result.value.total, 3);
  assert.equal(result.value.has_more, true);
  assert.equal(result.value.next_offset, 2);

  const filtered = await store.query({
    runtime_kind: 'context-record',
    key_prefix: 'context/query/',
  });
  assert.equal(filtered.ok, true);
  if (!filtered.ok) {
    return;
  }

  assert.deepEqual(filtered.value.items.map((item) => item.key), ['context/query/3']);
});

test('invalid query input returns deterministic contract errors', async () => {
  const store = createStore();
  const result = await store.query({ limit: -1 });

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'context-store.invalid-query');
  }
});

test('snapshot retrieval returns deterministic store state', async () => {
  const store = createStore();
  await store.create('context/snapshot/1', createRecord());
  await store.create('context/snapshot/2', createSnapshotValue());

  const result = await snapshot(store, { key_prefix: 'context/snapshot/' });
  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.equal(result.value.captured_at, fixedNow);
  assert.equal(result.value.revision, 2);
  assert.equal(result.value.total, 2);
  assert.deepEqual(
    result.value.items.map((item) => item.key),
    ['context/snapshot/1', 'context/snapshot/2'],
  );
});

test('transaction commit applies staged writes', async () => {
  const store = createStore();
  const opened = await beginTransaction(store);
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  const tx = opened.value;
  await tx.create('context/tx/1', createRecord());
  const committed = await commit(tx);

  assert.equal(committed.ok, true);
  if (!committed.ok) {
    return;
  }

  assert.equal(committed.value.state, 'committed');

  const persisted = await store.retrieve('context/tx/1');
  assert.equal(persisted.ok, true);
});

test('transaction rollback discards staged writes', async () => {
  const store = createStore();
  const opened = await store.beginTransaction();
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  const tx = opened.value;
  await tx.create('context/rollback/1', createRecord());
  const rolledBack = await rollback(tx);

  assert.equal(rolledBack.ok, true);
  if (!rolledBack.ok) {
    return;
  }

  assert.equal(rolledBack.value.state, 'rolled-back');

  const missing = await store.retrieve('context/rollback/1');
  assert.equal(missing.ok, false);
});

test('transaction commit detects optimistic conflicts against parent state', async () => {
  const store = createStore();
  await store.create('context/conflict/1', createRecord());

  const opened = await store.beginTransaction();
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  const tx = opened.value;
  await tx.update('context/conflict/1', createSnapshotValue(), { expected_version: 1 });
  await store.update('context/conflict/1', createRecord(), { expected_version: 1 });

  const committed = await tx.commit();
  assert.equal(committed.ok, false);
  if (!committed.ok) {
    assert.equal(committed.error.code, 'context-store.version-conflict');
  }
});

test('closed transactions reject further operations deterministically', async () => {
  const store = createStore();
  const opened = await store.beginTransaction();
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  const tx = opened.value;
  await tx.rollback();
  const result = await tx.create('context/closed/1', createRecord());

  assert.equal(result.ok, false);
  if (!result.ok) {
    assert.equal(result.error.code, 'context-store.transaction-closed');
  }
});
