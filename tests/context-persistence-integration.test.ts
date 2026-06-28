import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import {
  createContextStoreFromProvider,
  createInMemoryPersistenceProvider,
  type ContextPersistenceProvider,
  type ContextStore,
} from '../packages/context-persistence/src/index.ts';
import { createFilesystemPersistenceProvider } from '../packages/context-persistence-filesystem/src/index.ts';
import { createSQLitePersistenceProvider } from '../packages/context-persistence-sqlite/src/index.ts';

const fixedNow = '2026-06-29T04:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

const createRecord = (id: string) =>
  createRuntime().createRecord({
    source: { kind: 'observation', id, title: `Observation ${id}` },
    provenance: {
      source: 'context-persistence-integration-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

const createSnapshotValue = () =>
  createRuntime().createSnapshot({
    records: [
      {
        source: { kind: 'observation', id: 'OBS-999' },
        provenance: {
          source: 'context-persistence-integration-tests',
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

const exerciseStore = async (store: ContextStore, prefix: string) => {
  const created = await store.create(`${prefix}/1`, createRecord('OBS-701'));
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const retrieved = await store.retrieve(`${prefix}/1`);
  assert.equal(retrieved.ok, true);
  if (!retrieved.ok) {
    return;
  }

  assert.equal(retrieved.value.value.source.id, 'OBS-701');

  const updated = await store.update(`${prefix}/1`, createSnapshotValue(), { expected_version: 1 });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.value.version, 2);
  }

  const transaction = await store.beginTransaction();
  assert.equal(transaction.ok, true);
  if (!transaction.ok) {
    return;
  }

  await transaction.value.create(`${prefix}/tx`, createRecord('OBS-702'));
  const committed = await transaction.value.commit();
  assert.equal(committed.ok, true);

  const queried = await store.query({ key_prefix: prefix, order_by: [{ field: 'key', direction: 'asc' }] });
  assert.equal(queried.ok, true);
  if (queried.ok) {
    assert.equal(queried.value.total, 2);
  }
};

test('in-memory persistence can be composed into a canonical context store', async () => {
  const provider = createInMemoryPersistenceProvider({
    runtime: createRuntime(),
    now: () => fixedNow,
  });

  await provider.connect();
  const store = createContextStoreFromProvider({ provider });
  await exerciseStore(store, 'context/integration/memory');
  await provider.disconnect();
});

test('filesystem persistence can be composed into a canonical context store', async () => {
  await withTempDir('host-context-store-fs', async (directory) => {
    const provider = createFilesystemPersistenceProvider({
      directory,
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const store = createContextStoreFromProvider({ provider });
    await exerciseStore(store, 'context/integration/filesystem');

    await provider.disconnect();
    await provider.connect();

    const reopenedStore = createContextStoreFromProvider({ provider });
    const persisted = await reopenedStore.retrieve('context/integration/filesystem/tx');
    assert.equal(persisted.ok, true);

    await provider.disconnect();
  });
});

test('sqlite persistence can be composed into a canonical context store', async () => {
  await withTempDir('host-context-store-sqlite', async (directory) => {
    const provider = createSQLitePersistenceProvider({
      file_path: path.join(directory, 'context-store.sqlite'),
      runtime: createRuntime(),
      now: () => fixedNow,
    });

    await provider.connect();
    const store = createContextStoreFromProvider({ provider });
    await exerciseStore(store, 'context/integration/sqlite');

    await provider.disconnect();
    await provider.connect();

    const reopenedStore = createContextStoreFromProvider({ provider });
    const persisted = await reopenedStore.retrieve('context/integration/sqlite/tx');
    assert.equal(persisted.ok, true);

    const inspected = execFileSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `
          import { DatabaseSync } from 'node:sqlite';
          const db = new DatabaseSync(process.argv[1], { readOnly: true });
          const row = db.prepare('SELECT COUNT(*) AS total FROM context_records').get();
          db.close();
          console.log(JSON.stringify(row));
        `,
        path.join(directory, 'context-store.sqlite'),
      ],
      { encoding: 'utf8' },
    );
    assert.equal(JSON.parse(inspected).total, 2);

    await provider.disconnect();
  });
});

test('provider-backed composition returns deterministic failures when the provider is disconnected', async () => {
  const provider: ContextPersistenceProvider = createInMemoryPersistenceProvider({
    runtime: createRuntime(),
    now: () => fixedNow,
  });

  const store = createContextStoreFromProvider({ provider });
  const retrieved = await store.retrieve('context/integration/disconnected');
  assert.equal(retrieved.ok, false);
  if (!retrieved.ok) {
    assert.equal(retrieved.error.code, 'context-store.io-failure');
  }
});
