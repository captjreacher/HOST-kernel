import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import {
  createSQLitePersistenceProvider,
  createSQLitePersistenceProviderFromPath,
  sqlitePersistenceCapabilities,
} from '../packages/context-persistence-sqlite/src/index.ts';

const fixedNow = '2026-06-29T03:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

const createRecord = (id = 'OBS-600') =>
  createRuntime().createRecord({
    source: { kind: 'observation', id, title: `Observation ${id}` },
    provenance: {
      source: 'context-persistence-sqlite-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

const createSnapshotValue = () =>
  createRuntime().createSnapshot({
    records: [
      {
        source: { kind: 'observation', id: 'OBS-777' },
        provenance: {
          source: 'context-persistence-sqlite-tests',
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
    for (let attempt = 0; attempt < 20; attempt += 1) {
      try {
        await fs.rm(directory, { recursive: true, force: true });
        return;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'EBUSY' || attempt === 19) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }
  }
};

const databasePath = (directory: string) => path.join(directory, 'context-store.sqlite');

test('provider factories expose the sqlite persistence provider surface', async () => {
  await withTempDir('host-sqlite-provider-factory', async (directory) => {
    const provider = createSQLitePersistenceProviderFromPath(databasePath(directory), {
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    assert.equal(provider.registration.provider_kind, 'sqlite');
    assert.equal(provider.registration.provider_id, 'context-provider-sqlite.local-file');
    assert.equal(provider.state, 'disconnected');
    assert.deepEqual(sqlitePersistenceCapabilities(), {
      transactions: true,
      optimistic_locking: true,
      snapshots: true,
      version_history: false,
      bulk_operations: false,
      streaming_support: false,
    });
  });
});

test('connect initializes schema and canonical metadata automatically', async () => {
  await withTempDir('host-sqlite-provider-init', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    const connected = await provider.connect();
    assert.equal(connected.ok, true);
    if (!connected.ok) {
      return;
    }

    const disconnected = await provider.disconnect();
    assert.equal(disconnected.ok, true);

    const inspected = JSON.parse(
      execFileSync(
        process.execPath,
        [
          '--input-type=module',
          '-e',
          `
            import { DatabaseSync } from 'node:sqlite';
            const db = new DatabaseSync(process.argv[1], { readOnly: true });
            const tables = db
              .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('context_records', 'metadata') ORDER BY name ASC")
              .all();
            const metadata = db.prepare('SELECT key, value FROM metadata ORDER BY key ASC').all();
            db.close();
            console.log(JSON.stringify({ tables, metadata }));
          `,
          databasePath(directory),
        ],
        { encoding: 'utf8' },
      ),
    ) as {
      tables: { name: string }[];
      metadata: { key: string; value: string }[];
    };
    assert.deepEqual(
      inspected.tables.map((row) => row.name),
      ['context_records', 'metadata'],
    );
    assert.deepEqual(inspected.metadata, [
      { key: 'revision', value: '0' },
      { key: 'schema_version', value: '1' },
    ]);
  });
});

test('records persist across reconnect and support CRUD operations', async () => {
  await withTempDir('host-sqlite-provider-crud', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    const created = await session.value.store.create('context/sqlite/1', createRecord('OBS-601'));
    assert.equal(created.ok, true);

    await provider.disconnect();
    await provider.connect();

    const reopened = await provider.beginSession();
    assert.equal(reopened.ok, true);
    if (!reopened.ok) {
      return;
    }

    const retrieved = await reopened.value.store.retrieve('context/sqlite/1');
    assert.equal(retrieved.ok, true);
    if (!retrieved.ok) {
      return;
    }

    assert.equal(retrieved.value.value.source.id, 'OBS-601');

    const updated = await reopened.value.store.update('context/sqlite/1', createSnapshotValue(), { expected_version: 1 });
    assert.equal(updated.ok, true);
    if (updated.ok) {
      assert.equal(updated.value.version, 2);
    }

    const deleted = await reopened.value.store.delete('context/sqlite/1', { expected_version: 2 });
    assert.equal(deleted.ok, true);

    await provider.disconnect();
    await provider.connect();

    const afterDelete = await provider.beginSession();
    assert.equal(afterDelete.ok, true);
    if (!afterDelete.ok) {
      return;
    }

    const missing = await afterDelete.value.store.retrieve('context/sqlite/1');
    assert.equal(missing.ok, false);

    const disconnected = await provider.disconnect();
    assert.equal(disconnected.ok, true);
  });
});

test('sessions and transactions support commit and rollback with persistent storage', async () => {
  await withTempDir('host-sqlite-provider-tx', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const committed = await provider.beginTransaction();
    assert.equal(committed.ok, true);
    if (!committed.ok) {
      return;
    }

    await committed.value.store.create('context/sqlite/tx/1', createRecord('OBS-602'));
    const commitResult = await committed.value.commit();
    assert.equal(commitResult.ok, true);

    const rolledBack = await provider.beginTransaction();
    assert.equal(rolledBack.ok, true);
    if (!rolledBack.ok) {
      return;
    }

    await rolledBack.value.store.create('context/sqlite/tx/rollback', createRecord('OBS-603'));
    const rollbackResult = await rolledBack.value.rollback();
    assert.equal(rollbackResult.ok, true);

    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    const persisted = await session.value.store.retrieve('context/sqlite/tx/1');
    assert.equal(persisted.ok, true);

    const missing = await session.value.store.retrieve('context/sqlite/tx/rollback');
    assert.equal(missing.ok, false);

    const disconnected = await provider.disconnect();
    assert.equal(disconnected.ok, true);
  });
});

test('query and snapshot behavior remain deterministic with sqlite persistence', async () => {
  await withTempDir('host-sqlite-provider-query', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    await session.value.store.create('context/query/3', createRecord('OBS-610'));
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

    const disconnected = await provider.disconnect();
    assert.equal(disconnected.ok, true);
  });
});

test('optimistic version conflicts do not write partial transaction state', async () => {
  await withTempDir('host-sqlite-provider-conflict', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const session = await provider.beginSession();
    assert.equal(session.ok, true);
    if (!session.ok) {
      return;
    }

    await session.value.store.create('context/conflict/1', createRecord('OBS-620'));

    const tx = await provider.beginTransaction();
    assert.equal(tx.ok, true);
    if (!tx.ok) {
      return;
    }

    await tx.value.store.update('context/conflict/1', createSnapshotValue(), { expected_version: 1 });
    await session.value.store.update('context/conflict/1', createRecord('OBS-621'), { expected_version: 1 });

    const beforeDb = new DatabaseSync(databasePath(directory), { readOnly: true });
    const before = beforeDb.prepare('SELECT version, value FROM context_records WHERE key = ?').get('context/conflict/1') as {
      version: number;
      value: string;
    };
    beforeDb.close();

    const conflict = await tx.value.commit();
    assert.equal(conflict.ok, false);
    if (!conflict.ok) {
      assert.equal(conflict.error.code, 'context-persistence.version-conflict');
    }

    const afterDb = new DatabaseSync(databasePath(directory), { readOnly: true });
    const after = afterDb.prepare('SELECT version, value FROM context_records WHERE key = ?').get('context/conflict/1') as {
      version: number;
      value: string;
    };
    assert.deepEqual(after, before);
    afterDb.close();

    const disconnected = await provider.disconnect();
    assert.equal(disconnected.ok, true);
  });
});

test('schema version mismatch and corruption are detected deterministically on connect', async () => {
  await withTempDir('host-sqlite-provider-schema-mismatch', async (directory) => {
    const db = new DatabaseSync(databasePath(directory));
    db.exec(`
      CREATE TABLE context_records (
        key TEXT PRIMARY KEY,
        runtime_kind TEXT NOT NULL,
        version INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        value TEXT NOT NULL
      );
      CREATE TABLE metadata (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);
    db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('schema_version', '99');
    db.prepare('INSERT INTO metadata (key, value) VALUES (?, ?)').run('revision', '0');
    db.close();

    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    const connected = await provider.connect();
    assert.equal(connected.ok, false);
    if (!connected.ok) {
      assert.equal(connected.error.code, 'context-persistence.storage-corrupted');
    }
  });

  await withTempDir('host-sqlite-provider-corrupt', async (directory) => {
    await fs.writeFile(databasePath(directory), 'this is not sqlite', 'utf8');

    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
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

test('provider health and lifecycle remain deterministic', async () => {
  await withTempDir('host-sqlite-provider-health', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: databasePath(directory),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    const before = await provider.health();
    assert.equal(before.ok, true);
    if (before.ok) {
      assert.equal(before.value.connected, false);
      assert.equal(before.value.status, 'disconnected');
    }

    await provider.connect();

    const after = await provider.health();
    assert.equal(after.ok, true);
    if (after.ok) {
      assert.equal(after.value.connected, true);
      assert.equal(after.value.status, 'healthy');
    }

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
});
