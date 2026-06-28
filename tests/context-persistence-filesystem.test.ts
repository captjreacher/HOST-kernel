import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import {
  createFilesystemPersistenceProvider,
  createFilesystemPersistenceProviderFromPath,
  filesystemPersistenceCapabilities,
} from '../packages/context-persistence-filesystem/src/index.ts';

const fixedNow = '2026-06-29T02:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

const createRecord = (id = 'OBS-500') =>
  createRuntime().createRecord({
    source: { kind: 'observation', id, title: `Observation ${id}` },
    provenance: {
      source: 'context-persistence-filesystem-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

const createSnapshotValue = () =>
  createRuntime().createSnapshot({
    records: [
      {
        source: { kind: 'observation', id: 'OBS-777' },
        provenance: {
          source: 'context-persistence-filesystem-tests',
          source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
        },
      },
    ],
  });

const withTempDir = async (name: string, run: (directory: string) => Promise<void>) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
};

const stateFilePath = (directory: string) => path.join(directory, 'context-store.json');
const tempFilePath = (directory: string) => `${stateFilePath(directory)}.tmp`;
const backupFilePath = (directory: string) => `${stateFilePath(directory)}.bak`;

test('provider factories expose the filesystem persistence provider surface', async () => {
  await withTempDir('host-fs-provider-factory', async (directory) => {
    const provider = createFilesystemPersistenceProviderFromPath(directory, {
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    assert.equal(provider.registration.provider_kind, 'filesystem');
    assert.equal(provider.registration.provider_id, 'context-provider-filesystem.local-json');
    assert.equal(provider.state, 'disconnected');
    assert.deepEqual(filesystemPersistenceCapabilities(), {
      transactions: true,
      optimistic_locking: true,
      snapshots: true,
      version_history: false,
      bulk_operations: false,
      streaming_support: false,
    });
  });
});

test('connect initializes the directory and canonical JSON file safely', async () => {
  await withTempDir('host-fs-provider-init-root', async (root) => {
    const directory = path.join(root, 'nested', 'context-store');
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    const connected = await provider.connect();
    assert.equal(connected.ok, true);
    if (!connected.ok) {
      return;
    }

    const stored = JSON.parse(await fs.readFile(stateFilePath(directory), 'utf8')) as {
      format: string;
      revision: number;
      records: unknown[];
    };
    assert.equal(stored.format, 'host-context-persistence-filesystem.v1');
    assert.equal(stored.revision, 0);
    assert.deepEqual(stored.records, []);

    const disconnected = await provider.disconnect();
    assert.equal(disconnected.ok, true);

    await assert.rejects(fs.stat(tempFilePath(directory)));
    await assert.rejects(fs.stat(backupFilePath(directory)));
  });
});

test('records persist across reconnect and support CRUD operations', async () => {
  await withTempDir('host-fs-provider-crud', async (directory) => {
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    const created = await session.value.store.create('context/fs/1', createRecord('OBS-501'));
    assert.equal(created.ok, true);

    await provider.disconnect();
    await provider.connect();

    const reopened = await provider.beginSession();
    assert.equal(reopened.ok, true);
    if (!reopened.ok) {
      return;
    }

    const retrieved = await reopened.value.store.retrieve('context/fs/1');
    assert.equal(retrieved.ok, true);
    if (!retrieved.ok) {
      return;
    }

    assert.equal(retrieved.value.value.source.id, 'OBS-501');

    const updated = await reopened.value.store.update('context/fs/1', createSnapshotValue(), { expected_version: 1 });
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.value.version, 2);
    }

    const deleted = await reopened.value.store.delete('context/fs/1', { expected_version: 2 });
    assert.equal(deleted.ok, true);

    await provider.disconnect();
    await provider.connect();

    const afterDelete = await provider.beginSession();
    assert.equal(afterDelete.ok, true);
    if (!afterDelete.ok) {
      return;
    }

    const missing = await afterDelete.value.store.retrieve('context/fs/1');
    assert.equal(missing.ok, false);
  });
});

test('sessions and transactions support commit and rollback with persistent storage', async () => {
  await withTempDir('host-fs-provider-tx', async (directory) => {
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const committed = await provider.beginTransaction();
    assert.equal(committed.ok, true);
    if (!committed.ok) {
      return;
    }

    await committed.value.store.create('context/fs/tx/1', createRecord('OBS-502'));
    const commitResult = await committed.value.commit();
    assert.equal(commitResult.ok, true);

    const rolledBack = await provider.beginTransaction();
    assert.equal(rolledBack.ok, true);
    if (!rolledBack.ok) {
      return;
    }

    await rolledBack.value.store.create('context/fs/tx/rollback', createRecord('OBS-503'));
    const rollbackResult = await rolledBack.value.rollback();
    assert.equal(rollbackResult.ok, true);

    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    const persisted = await session.value.store.retrieve('context/fs/tx/1');
    assert.equal(persisted.ok, true);

    const missing = await session.value.store.retrieve('context/fs/tx/rollback');
    assert.equal(missing.ok, false);
  });
});

test('query and snapshot behavior remain deterministic with filesystem persistence', async () => {
  await withTempDir('host-fs-provider-query', async (directory) => {
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    await session.value.store.create('context/query/3', createRecord('OBS-510'));
    await session.value.store.create('context/query/1', createRuntime().createReference({ kind: 'document', id: 'OBJ-004' }));
    await session.value.store.create('context/query/2', createSnapshotValue());

    const queried = await session.value.store.query({
      key_prefix: 'context/query/',
      order_by: [{ field: 'key', direction: 'asc' }],
      limit: 2,
      offset: 0,
    });
    assert.equal(queried.ok, true);
    if (queried.ok) {
      assert.deepEqual(
        queried.value.items.map((item) => item.key),
        ['context/query/1', 'context/query/2'],
      );
      assert.equal(queried.value.next_offset, 2);
    }

    const snapshotted = await session.value.store.snapshot({ key_prefix: 'context/query/' });
    assert.equal(snapshotted.ok, true);
    if (snapshotted.ok) {
      assert.equal(snapshotted.value.total, 3);
      assert.equal(snapshotted.value.revision, 3);
    }
  });
});

test('optimistic version conflicts do not write partial transaction state', async () => {
  await withTempDir('host-fs-provider-conflict', async (directory) => {
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    await session.value.store.create('context/conflict/1', createRecord('OBS-520'));

    const tx = await provider.beginTransaction();
    assert.equal(tx.ok, true);
    if (!tx.ok) {
      return;
    }

    await tx.value.store.update('context/conflict/1', createSnapshotValue(), { expected_version: 1 });
    await session.value.store.update('context/conflict/1', createRecord('OBS-521'), { expected_version: 1 });
    const expectedFile = await fs.readFile(stateFilePath(directory), 'utf8');

    const conflict = await tx.value.commit();
    assert.equal(conflict.ok, false);
    if (!conflict.ok) {
      assert.equal(conflict.error.code, 'context-persistence.version-conflict');
    }

    const actualFile = await fs.readFile(stateFilePath(directory), 'utf8');
    assert.equal(actualFile, expectedFile);
  });
});

test('corruption is detected deterministically on connect', async () => {
  await withTempDir('host-fs-provider-corrupt', async (directory) => {
    await fs.writeFile(stateFilePath(directory), '{"format":"host-context-persistence-filesystem.v1","revision":0,"records":[', 'utf8');

    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    const connected = await provider.connect();
    assert.equal(connected.ok, false);
    if (!connected.ok) {
      assert.equal(connected.error.code, 'context-persistence.storage-corrupted');
    }
  });
});

test('filesystem path errors and atomic cleanup are deterministic', async () => {
  await withTempDir('host-fs-provider-io', async (directory) => {
    const filePath = path.join(directory, 'not-a-directory');
    await fs.writeFile(filePath, 'occupied', 'utf8');

    const provider = createFilesystemPersistenceProvider({
      directory: filePath,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    const connected = await provider.connect();
    assert.equal(connected.ok, false);
    if (!connected.ok) {
      assert.equal(connected.error.code, 'context-persistence.io-failure');
    }
  });

  await withTempDir('host-fs-provider-atomic', async (directory) => {
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    const created = await session.value.store.create('context/atomic/1', createRecord('OBS-530'));
    assert.equal(created.ok, true);

    await assert.rejects(fs.stat(tempFilePath(directory)));
    await assert.rejects(fs.stat(backupFilePath(directory)));
  });
});
