import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import { createInMemoryPersistenceProvider, type ContextPersistenceProvider } from '../packages/context-persistence/src/index.ts';
import { createFilesystemPersistenceProvider } from '../packages/context-persistence-filesystem/src/index.ts';
import { createSQLitePersistenceProvider } from '../packages/context-persistence-sqlite/src/index.ts';
import { createContextService } from '../packages/context-service/src/index.ts';

const fixedNow = '2026-06-29T06:00:00.000Z';

const createRuntime = () =>
  createContextRuntime(createKernel(), {
    now: () => fixedNow,
    version: '1.0.0',
  });

const createRecord = (id: string) =>
  createRuntime().createRecord({
    source: { kind: 'observation', id, title: `Observation ${id}` },
    provenance: {
      source: 'context-service-tests',
      source_objects: [{ kind: 'objective', id: 'OBJ-001' }],
    },
  });

const createSnapshotValue = (id: string) =>
  createRuntime().createSnapshot({
    records: [
      {
        source: { kind: 'observation', id, title: `Observation ${id}` },
        provenance: {
          source: 'context-service-tests',
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

type ProviderFactory = (directory?: string) => Promise<ContextPersistenceProvider>;

const createInMemoryProvider: ProviderFactory = async () => {
  const provider = createInMemoryPersistenceProvider({
    runtime: createRuntime(),
    now: () => fixedNow,
  });
  await provider.connect();
  return provider;
};

const createFilesystemProvider: ProviderFactory = async (directory) => {
  const provider = createFilesystemPersistenceProvider({
    directory: directory ?? path.join(os.tmpdir(), 'host-context-service-fs'),
    runtime: createRuntime(),
    now: () => fixedNow,
  });
  await provider.connect();
  return provider;
};

const createSQLiteProvider: ProviderFactory = async (directory) => {
  const provider = createSQLitePersistenceProvider({
    file_path: path.join(directory ?? os.tmpdir(), 'context-service.sqlite'),
    runtime: createRuntime(),
    now: () => fixedNow,
  });
  await provider.connect();
  return provider;
};

const providerDefinitions = [
  { label: 'in-memory', createProvider: createInMemoryProvider },
  { label: 'filesystem', createProvider: createFilesystemProvider },
  { label: 'sqlite', createProvider: createSQLiteProvider },
] as const;

const exerciseCrudAndQuery = async (provider: ContextPersistenceProvider, prefix: string) => {
  const service = createContextService({ provider });

  const created = await service.create(`${prefix}/1`, createRecord('OBS-801'));
  assert.equal(created.ok, true);
  if (!created.ok) {
    return;
  }

  const retrieved = await service.retrieve(`${prefix}/1`);
  assert.equal(retrieved.ok, true);
  if (retrieved.ok) {
    assert.equal(retrieved.value.value.source.id, 'OBS-801');
  }

  const updated = await service.update(`${prefix}/1`, createSnapshotValue('OBS-802'), { expected_version: 1 });
  assert.equal(updated.ok, true);
  if (updated.ok) {
    assert.equal(updated.value.version, 2);
  }

  const queried = await service.query({ key_prefix: prefix, order_by: [{ field: 'key', direction: 'asc' }] });
  assert.equal(queried.ok, true);
  if (queried.ok) {
    assert.equal(queried.value.total, 1);
  }

  const deleted = await service.delete(`${prefix}/1`, { expected_version: 2 });
  assert.equal(deleted.ok, true);

  const missing = await service.retrieve(`${prefix}/1`);
  assert.equal(missing.ok, false);
  if (!missing.ok) {
    assert.equal(missing.error.code, 'context-service.not-found');
  }
};

const exerciseTransactions = async (provider: ContextPersistenceProvider, prefix: string) => {
  const service = createContextService({ provider });

  const begun = await service.beginTransaction();
  assert.equal(begun.ok, true);
  if (!begun.ok) {
    return;
  }

  const created = await begun.value.create(`${prefix}/tx`, createRecord('OBS-803'));
  assert.equal(created.ok, true);

  const committed = await begun.value.commit();
  assert.equal(committed.ok, true);

  const persisted = await service.retrieve(`${prefix}/tx`);
  assert.equal(persisted.ok, true);

  const rollbackTx = await service.beginTransaction();
  assert.equal(rollbackTx.ok, true);
  if (!rollbackTx.ok) {
    return;
  }

  await rollbackTx.value.create(`${prefix}/rollback`, createRecord('OBS-804'));
  const rolledBack = await rollbackTx.value.rollback();
  assert.equal(rolledBack.ok, true);

  const rolledBackMissing = await service.retrieve(`${prefix}/rollback`);
  assert.equal(rolledBackMissing.ok, false);
  if (!rolledBackMissing.ok) {
    assert.equal(rolledBackMissing.error.code, 'context-service.not-found');
  }
};

test('context-service exposes canonical CRUD and query operations across all provider types', async () => {
  for (const definition of providerDefinitions) {
    if (definition.label === 'in-memory') {
      const provider = await definition.createProvider();
      try {
        await exerciseCrudAndQuery(provider, `context/service/${definition.label}`);
      } finally {
        await provider.disconnect();
      }
      continue;
    }

    await withTempDir(`host-context-service-${definition.label}`, async (directory) => {
      const provider = await definition.createProvider(directory);
      try {
        await exerciseCrudAndQuery(provider, `context/service/${definition.label}`);
      } finally {
        await provider.disconnect();
      }
    });
  }
});

test('context-service manages transaction lifecycle across all provider types', async () => {
  for (const definition of providerDefinitions) {
    if (definition.label === 'in-memory') {
      const provider = await definition.createProvider();
      try {
        await exerciseTransactions(provider, `context/service/${definition.label}`);
      } finally {
        await provider.disconnect();
      }
      continue;
    }

    await withTempDir(`host-context-service-${definition.label}-tx`, async (directory) => {
      const provider = await definition.createProvider(directory);
      try {
        await exerciseTransactions(provider, `context/service/${definition.label}`);
      } finally {
        await provider.disconnect();
      }
    });
  }
});

test('context-service translates duplicate, invalid-query, and disconnected failures deterministically across providers', async () => {
  for (const definition of providerDefinitions) {
    if (definition.label === 'in-memory') {
      const provider = await definition.createProvider();
      try {
        const service = createContextService({ provider });
        const key = `context/service/${definition.label}/independent`;

        await service.create(key, createRecord('OBS-805'));

        const duplicate = await service.create(key, createRecord('OBS-806'));
        assert.equal(duplicate.ok, false);
        if (!duplicate.ok) {
          assert.equal(duplicate.error.code, 'context-service.duplicate-key');
        }

        const invalidQuery = await service.query({ limit: -1 });
        assert.equal(invalidQuery.ok, false);
        if (!invalidQuery.ok) {
          assert.equal(invalidQuery.error.code, 'context-service.invalid-query');
        }

        await provider.disconnect();

        const unavailable = await service.retrieve(key);
        assert.equal(unavailable.ok, false);
        if (!unavailable.ok) {
          assert.equal(unavailable.error.code, 'context-service.unavailable');
        }
      } finally {
        if (provider.state === 'connected') {
          await provider.disconnect();
        }
      }
      continue;
    }

    await withTempDir(`host-context-service-${definition.label}-errors`, async (directory) => {
      const provider = await definition.createProvider(directory);
      try {
        const service = createContextService({ provider });
        const key = `context/service/${definition.label}/independent`;

        await service.create(key, createRecord('OBS-805'));

        const duplicate = await service.create(key, createRecord('OBS-806'));
        assert.equal(duplicate.ok, false);
        if (!duplicate.ok) {
          assert.equal(duplicate.error.code, 'context-service.duplicate-key');
        }

        const invalidQuery = await service.query({ limit: -1 });
        assert.equal(invalidQuery.ok, false);
        if (!invalidQuery.ok) {
          assert.equal(invalidQuery.error.code, 'context-service.invalid-query');
        }

        await provider.disconnect();

        const unavailable = await service.retrieve(key);
        assert.equal(unavailable.ok, false);
        if (!unavailable.ok) {
          assert.equal(unavailable.error.code, 'context-service.unavailable');
        }
      } finally {
        if (provider.state === 'connected') {
          await provider.disconnect();
        }
      }
    });
  }
});

test('context-service preserves committed filesystem and sqlite persistence without exposing provider details in the service contract', async () => {
  await withTempDir('host-context-service-filesystem-persist', async (directory) => {
    const provider = await createFilesystemProvider(directory);
    const service = createContextService({ provider });
    const key = 'context/service/filesystem/persisted';

    await service.create(key, createRecord('OBS-807'));
    await provider.disconnect();
    await provider.connect();

    const reopenedService = createContextService({ provider });
    const persisted = await reopenedService.retrieve(key);
    assert.equal(persisted.ok, true);
    await provider.disconnect();
  });

  await withTempDir('host-context-service-sqlite-persist', async (directory) => {
    const filePath = path.join(directory, 'context-service.sqlite');
    const provider = createSQLitePersistenceProvider({
      file_path: filePath,
      runtime: createRuntime(),
      now: () => fixedNow,
    });
    await provider.connect();

    const service = createContextService({ provider });
    const begun = await service.beginTransaction();
    assert.equal(begun.ok, true);
    if (begun.ok) {
      await begun.value.create('context/service/sqlite/committed', createRecord('OBS-809'));
      await begun.value.commit();
    }

    await provider.disconnect();

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
        filePath,
      ],
      { encoding: 'utf8' },
    );

    assert.equal(JSON.parse(inspected).total, 1);
  });
});
