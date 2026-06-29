import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import { createInMemoryPersistenceProvider } from '../packages/context-persistence/src/index.ts';
import {
  createRuntimeComposition,
  RUNTIME_BOOTSTRAP_SEQUENCE,
  RUNTIME_COMPOSITION_VERSION,
} from '../packages/runtime-composition/src/index.ts';
import { createTransportMetadata } from '../packages/transport-adapter/src/index.ts';
import { REST_TRANSPORT_PROTOCOL } from '../packages/transport-rest/src/index.ts';

const fixedNow = '2026-06-29T10:00:00.000Z';

const createProvider = () =>
  createInMemoryPersistenceProvider({
    runtime: createContextRuntime(createKernel(), {
      now: () => fixedNow,
      version: '1.0.0',
    }),
    now: () => fixedNow,
  });

test('runtime-composition assembles the canonical bootstrap chain and handles REST requests end-to-end', async () => {
  const provider = createProvider();
  const composition = createRuntimeComposition({ provider });

  assert.equal(RUNTIME_COMPOSITION_VERSION, '1.0.0');
  assert.deepEqual(RUNTIME_BOOTSTRAP_SEQUENCE, [
    'provider.connect',
    'context-service.create',
    'api-host.create',
    'transport-rest.resolve',
    'rest-runtime-host.create',
  ]);

  const started = await composition.start();
  assert.equal(started.ok, true);
  assert.equal(composition.provider.state, 'connected');

  const createResponse = await composition.handleRestRequest({
    method: 'POST',
    path: '/context',
    body: {
      key: 'context/runtime-composition/1',
      value: {
        runtime_kind: 'context-record',
        source: { kind: 'observation', id: 'OBS-910' },
        provenance: { source: 'runtime-composition-test', source_objects: [{ kind: 'objective', id: 'OBJ-001' }] },
      },
    },
    metadata: createTransportMetadata({
      protocol: REST_TRANSPORT_PROTOCOL,
      authentication: {
        authenticated: true,
        principal: { id: 'principal-1', type: 'service' },
        subject: { id: 'subject-1', type: 'user' },
        roles: ['context-admin'],
        claims: { scope: 'context:write' },
        method: 'custom',
      },
      tracing: {
        correlation_id: 'runtime-composition-corr',
        request_id: 'runtime-composition-req',
        timestamp: fixedNow,
      },
    }),
  });

  assert.equal(createResponse.success, true);
  assert.equal(createResponse.status.code, 201);

  const retrieveResponse = await composition.handleRestRequest({
    method: 'GET',
    path: '/context/context%2Fruntime-composition%2F1',
    metadata: createTransportMetadata({
      protocol: REST_TRANSPORT_PROTOCOL,
      tracing: {
        correlation_id: 'runtime-composition-corr',
        request_id: 'runtime-composition-req-2',
        timestamp: fixedNow,
      },
    }),
  });

  assert.equal(retrieveResponse.success, true);
  assert.equal(retrieveResponse.status.code, 200);

  const stopped = await composition.stop();
  assert.equal(stopped.ok, true);
  assert.equal(composition.provider.state, 'disconnected');
});

test('runtime-composition stays framework-free and depends only on canonical runtime packages', () => {
  const root = process.cwd();
  const packageJsonPath = path.join(root, 'packages', 'runtime-composition', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), [
    '@host/api-host',
    '@host/context-persistence',
    '@host/context-service',
    '@host/rest-runtime-host',
    '@host/runtime-contracts',
    '@host/transport-rest',
  ]);

  const files = [
    path.join(root, 'packages', 'runtime-composition', 'src', 'contracts.ts'),
    path.join(root, 'packages', 'runtime-composition', 'src', 'runtime.ts'),
    path.join(root, 'packages', 'runtime-composition', 'README.md'),
  ];

  const bannedTerms = ['express', 'fastify', 'hono', 'oauth', 'jwt', 'opentelemetry', 'listen('];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const term of bannedTerms) {
      assert.equal(contents.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
