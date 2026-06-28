import test from 'node:test';
import assert from 'node:assert/strict';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import {
  beginSession,
  beginTransaction,
  capabilities,
  connect,
  createInMemoryPersistenceProvider,
  createPersistenceProvider,
  disconnect,
  health,
} from '../packages/context-persistence/src/index.ts';

const fixedNow = '2026-06-29T01:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

const createProvider = () =>
  createInMemoryPersistenceProvider({
    runtime: createRuntime(),
    now: () => fixedNow,
  });

const createRecord = () =>
  createRuntime().createRecord({
    source: { kind: 'observation', id: 'OBS-100', title: 'Persistence observation' },
    provenance: {
      source: 'context-persistence-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

test('provider factories expose the canonical provider framework', async () => {
  const provider = createPersistenceProvider({
    runtime: createRuntime(),
    now: () => fixedNow,
  });

  assert.equal(provider.registration.provider_id, 'context-persistence.in-memory');
  assert.equal(provider.registration.provider_kind, 'reference');
  assert.equal(provider.state, 'disconnected');
});

test('capability discovery is deterministic', async () => {
  const provider = createProvider();
  const result = await capabilities(provider);

  assert.equal(result.ok, true);
  if (!result.ok) {
    return;
  }

  assert.deepEqual(result.value, {
    transactions: true,
    optimistic_locking: true,
    snapshots: true,
    version_history: false,
    bulk_operations: false,
    streaming_support: false,
  });
});

test('provider health reports disconnected and connected states deterministically', async () => {
  const provider = createProvider();

  const before = await health(provider);
  assert.equal(before.ok, true);
  if (before.ok) {
    assert.equal(before.value.connected, false);
    assert.equal(before.value.status, 'disconnected');
  }

  await connect(provider);
  const after = await provider.health();
  assert.equal(after.ok, true);
  if (after.ok) {
    assert.equal(after.value.connected, true);
    assert.equal(after.value.status, 'healthy');
  }
});

test('connect and disconnect manage provider lifecycle', async () => {
  const provider = createProvider();

  const connected = await connect(provider);
  assert.equal(connected.ok, true);
  if (connected.ok) {
    assert.equal(connected.value.state, 'connected');
  }

  const duplicate = await provider.connect();
  assert.equal(duplicate.ok, false);
  if (!duplicate.ok) {
    assert.equal(duplicate.error.code, 'context-persistence.already-connected');
  }

  const disconnected = await disconnect(provider);
  assert.equal(disconnected.ok, true);
  if (disconnected.ok) {
    assert.equal(disconnected.value.state, 'disconnected');
  }
});

test('sessions require an active provider and expose the wrapped store', async () => {
  const provider = createProvider();

  const disconnected = await beginSession(provider);
  assert.equal(disconnected.ok, false);
  if (!disconnected.ok) {
    assert.equal(disconnected.error.code, 'context-persistence.not-connected');
  }

  await provider.connect();
  const opened = await provider.beginSession();
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  const created = await opened.value.store.create('context/provider/session/1', createRecord());
  assert.equal(created.ok, true);

  const closed = await opened.value.close();
  assert.equal(closed.ok, true);
  if (closed.ok) {
    assert.equal(closed.value.state, 'closed');
  }
});

test('session lifecycle errors are deterministic after closure', async () => {
  const provider = createProvider();
  await provider.connect();

  const opened = await provider.beginSession();
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  await opened.value.close();
  const transaction = await opened.value.beginTransaction();
  assert.equal(transaction.ok, false);
  if (!transaction.ok) {
    assert.equal(transaction.error.code, 'context-persistence.session-closed');
  }
});

test('transactions can be opened from providers and committed', async () => {
  const provider = createProvider();
  await provider.connect();

  const opened = await beginTransaction(provider);
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  const created = await opened.value.store.create('context/provider/tx/1', createRecord());
  assert.equal(created.ok, true);

  const committed = await opened.value.commit();
  assert.equal(committed.ok, true);
  if (!committed.ok) {
    return;
  }

  assert.equal(committed.value.state, 'committed');

  const session = await provider.beginSession();
  assert.equal(session.ok, true);
  if (!session.ok) {
    return;
  }

  const retrieved = await session.value.store.retrieve('context/provider/tx/1');
  assert.equal(retrieved.ok, true);
});

test('transactions can be rolled back without persisting writes', async () => {
  const provider = createProvider();
  await provider.connect();

  const session = await provider.beginSession();
  assert.equal(session.ok, true);
  if (!session.ok) {
    return;
  }

  const transaction = await session.value.beginTransaction();
  assert.equal(transaction.ok, true);
  if (!transaction.ok) {
    return;
  }

  await transaction.value.store.create('context/provider/tx/rollback', createRecord());
  const rolledBack = await transaction.value.rollback();
  assert.equal(rolledBack.ok, true);
  if (rolledBack.ok) {
    assert.equal(rolledBack.value.state, 'rolled-back');
  }

  const missing = await session.value.store.retrieve('context/provider/tx/rollback');
  assert.equal(missing.ok, false);
});

test('transaction lifecycle errors are deterministic after completion', async () => {
  const provider = createProvider();
  await provider.connect();

  const opened = await provider.beginTransaction();
  assert.equal(opened.ok, true);
  if (!opened.ok) {
    return;
  }

  await opened.value.rollback();
  const committed = await opened.value.commit();
  assert.equal(committed.ok, false);
  if (!committed.ok) {
    assert.equal(committed.error.code, 'context-persistence.transaction-closed');
  }
});

test('provider shutdown closes active sessions and transactions', async () => {
  const provider = createProvider();
  await provider.connect();

  const session = await provider.beginSession();
  assert.equal(session.ok, true);
  if (!session.ok) {
    return;
  }

  const transaction = await session.value.beginTransaction();
  assert.equal(transaction.ok, true);
  if (!transaction.ok) {
    return;
  }

  await provider.disconnect();

  const sessionAfterShutdown = await session.value.close();
  assert.equal(sessionAfterShutdown.ok, false);
  if (!sessionAfterShutdown.ok) {
    assert.equal(sessionAfterShutdown.error.code, 'context-persistence.session-closed');
  }

  const transactionAfterShutdown = await transaction.value.rollback();
  assert.equal(transactionAfterShutdown.ok, false);
  if (!transactionAfterShutdown.ok) {
    assert.equal(transactionAfterShutdown.error.code, 'context-persistence.transaction-closed');
  }
});

test('reconnecting creates a fresh in-memory provider store', async () => {
  const provider = createProvider();
  await provider.connect();

  const session = await provider.beginSession();
  assert.equal(session.ok, true);
  if (!session.ok) {
    return;
  }

  await session.value.store.create('context/provider/fresh/1', createRecord());
  await provider.disconnect();
  await provider.connect();

  const reopened = await provider.beginSession();
  assert.equal(reopened.ok, true);
  if (!reopened.ok) {
    return;
  }

  const missing = await reopened.value.store.retrieve('context/provider/fresh/1');
  assert.equal(missing.ok, false);
});
