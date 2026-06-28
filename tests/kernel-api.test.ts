import test from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createKernelApi, KernelApiBootstrapError } from '../packages/kernel-api/src/index.ts';
import { RegistryService } from '@host/kernel-registry';
import { seedRegistry } from './fixtures/registry-seed.ts';

const startApiServer = async (seeded = false) => {
  const registry = new RegistryService();
  if (seeded) {
    seedRegistry(registry);
  }

  const api = createKernelApi({
    kernelConfig: {
      registry,
    },
  });

  const server = api.createHttpServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Expected an address with an ephemeral port.');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    api,
    baseUrl,
    close: async () => {
      server.close();
      await once(server, 'close');
    },
  };
};

test('kernel api bootstrap success exposes a single runtime', () => {
  const api = createKernelApi();

  assert.ok(api.runtime);
  assert.equal(api.bootstrap.status, 'ready');
  assert.equal(typeof api.runtime.healthCheck, 'function');
});

test('kernel api health endpoint reports runtime, bootstrap, constitutional seed, and dependency wiring status', async () => {
  const harness = await startApiServer();
  try {
    const response = await fetch(`${harness.baseUrl}/kernel/health`);
    assert.equal(response.status, 200);

    const payload = await response.json();
    assert.equal(payload.data.runtime.status, 'healthy');
    assert.equal(payload.data.bootstrap.status, 'ready');
    assert.equal(payload.data.constitutional_seed.status, 'seeded');
    assert.equal(payload.data.dependency_wiring.status, 'healthy');
    assert.deepEqual(payload.data.constitutional_seed.expected.sort(), ['HOST-0', 'OBJ-000', 'OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004', 'OBJ-005', 'OBJ-006'].sort());
  } finally {
    await harness.close();
  }
});

test('kernel api registry endpoints support discovery and lookup', async () => {
  const harness = await startApiServer(true);
  try {
    const listResponse = await fetch(`${harness.baseUrl}/kernel/registry?kind=repository`);
    assert.equal(listResponse.status, 200);
    const listPayload = await listResponse.json();
    assert.ok(Array.isArray(listPayload.data));
    assert.ok(listPayload.data.some((record: { kind: string; key: string }) => record.kind === 'repository' && record.key === 'host-kernel'));

    const record = listPayload.data.find((entry: { key: string }) => entry.key === 'host-kernel');
    assert.ok(record);

    const lookupResponse = await fetch(`${harness.baseUrl}/kernel/registry/${record.id}`);
    assert.equal(lookupResponse.status, 200);
    const lookupPayload = await lookupResponse.json();
    assert.equal(lookupPayload.data.id, record.id);
    assert.equal(lookupPayload.data.kind, 'repository');
  } finally {
    await harness.close();
  }
});

test('kernel api taxonomy endpoints are read-only and expose canonical lists', async () => {
  const harness = await startApiServer();
  try {
    const taxonomyResponse = await fetch(`${harness.baseUrl}/kernel/taxonomy`);
    assert.equal(taxonomyResponse.status, 200);
    const taxonomyPayload = await taxonomyResponse.json();
    assert.ok(Array.isArray(taxonomyPayload.data.object_types));
    assert.ok(Array.isArray(taxonomyPayload.data.lifecycle));
    assert.ok(Array.isArray(taxonomyPayload.data.events));
    assert.ok(Array.isArray(taxonomyPayload.data.relationships));

    const objectTypesResponse = await fetch(`${harness.baseUrl}/kernel/taxonomy/object-types`);
    const lifecycleResponse = await fetch(`${harness.baseUrl}/kernel/taxonomy/lifecycle`);
    const eventsResponse = await fetch(`${harness.baseUrl}/kernel/taxonomy/events`);
    const relationshipsResponse = await fetch(`${harness.baseUrl}/kernel/taxonomy/relationships`);

    assert.equal(objectTypesResponse.status, 200);
    assert.equal(lifecycleResponse.status, 200);
    assert.equal(eventsResponse.status, 200);
    assert.equal(relationshipsResponse.status, 200);
  } finally {
    await harness.close();
  }
});

test('kernel api objective endpoints support create, list, lookup, and patch through the composed runtime', async () => {
  const harness = await startApiServer();
  try {
    const createResponse = await fetch(`${harness.baseUrl}/kernel/objectives`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        display_name: 'Kernel API Objective',
        description: 'Expose control plane services through the kernel API.',
        owner: 'HOST',
      }),
    });
    assert.equal(createResponse.status, 201);
    const created = await createResponse.json();
    assert.match(created.data.id, /^OBJ-\d{3}$/);

    const listResponse = await fetch(`${harness.baseUrl}/kernel/objectives`);
    assert.equal(listResponse.status, 200);
    const listPayload = await listResponse.json();
    assert.ok(listPayload.data.some((objective: { id: string }) => objective.id === created.data.id));

    const lookupResponse = await fetch(`${harness.baseUrl}/kernel/objectives/${created.data.id}`);
    assert.equal(lookupResponse.status, 200);
    const lookupPayload = await lookupResponse.json();
    assert.equal(lookupPayload.data.display_name, 'Kernel API Objective');

    const patchResponse = await fetch(`${harness.baseUrl}/kernel/objectives/${created.data.id}`, {
      method: 'PATCH',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        description: 'Expose stable runtime service endpoints through the kernel API.',
      }),
    });
    assert.equal(patchResponse.status, 200);
    const patched = await patchResponse.json();
    assert.equal(patched.data.description, 'Expose stable runtime service endpoints through the kernel API.');
  } finally {
    await harness.close();
  }
});

test('kernel api document endpoints expose metadata only', async () => {
  const harness = await startApiServer();
  try {
    const listResponse = await fetch(`${harness.baseUrl}/kernel/documents`);
    assert.equal(listResponse.status, 200);
    const listPayload = await listResponse.json();
    assert.ok(Array.isArray(listPayload.data));
    assert.ok(listPayload.data.some((document: { id: string }) => document.id === 'HOST-0'));

    const lookupResponse = await fetch(`${harness.baseUrl}/kernel/documents/HOST-0`);
    assert.equal(lookupResponse.status, 200);
    const lookupPayload = await lookupResponse.json();
    assert.equal(lookupPayload.data.id, 'HOST-0');
    assert.equal('content' in lookupPayload.data, false);
  } finally {
    await harness.close();
  }
});

test('kernel api repository endpoints expose repository metadata from the registry-backed runtime', async () => {
  const harness = await startApiServer(true);
  try {
    const listResponse = await fetch(`${harness.baseUrl}/kernel/repositories`);
    assert.equal(listResponse.status, 200);
    const listPayload = await listResponse.json();
    assert.ok(listPayload.data.some((repository: { key: string }) => repository.key === 'host-kernel'));

    const repository = listPayload.data.find((entry: { key: string }) => entry.key === 'host-kernel');
    const lookupResponse = await fetch(`${harness.baseUrl}/kernel/repositories/${repository.id}`);
    assert.equal(lookupResponse.status, 200);
    const lookupPayload = await lookupResponse.json();
    assert.equal(lookupPayload.data.key, 'host-kernel');
    assert.equal(typeof lookupPayload.data.repository_url, 'string');
  } finally {
    await harness.close();
  }
});

test('kernel api validation endpoint returns deterministic validation results without mutation', async () => {
  const harness = await startApiServer();
  try {
    const response = await fetch(`${harness.baseUrl}/kernel/validation`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        kind: 'repository',
        id: 'host-kernel',
        key: 'host-kernel',
        display_name: 'HOST-kernel',
        description: 'Kernel runtime repository',
        status: 'active',
        version: '1.0.0',
        owner: 'HOST',
      }),
    });
    assert.equal(response.status, 200);
    const payload = await response.json();
    assert.equal(payload.data.subject, 'repository');
    assert.equal(payload.data.valid, false);
    assert.ok(payload.data.issues.some((issue: { code: string }) => issue.code === 'validation.repository.owner.missing'));
  } finally {
    await harness.close();
  }
});

test('kernel api returns deterministic structured errors for unknown endpoints', async () => {
  const harness = await startApiServer();
  try {
    const response = await fetch(`${harness.baseUrl}/kernel/unknown`);
    assert.equal(response.status, 404);
    const payload = await response.json();
    assert.equal(payload.error.code, 'kernel-api.route.not-found');
  } finally {
    await harness.close();
  }
});

test('kernel api rejects malformed request payloads without exposing stack traces', async () => {
  const harness = await startApiServer();
  try {
    const response = await fetch(`${harness.baseUrl}/kernel/objectives`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: '{"display_name":"Broken"',
    });
    assert.equal(response.status, 400);
    const payload = await response.json();
    assert.equal(payload.error.code, 'kernel-api.request.invalid-json');
    assert.equal('stack' in payload.error, false);
  } finally {
    await harness.close();
  }
});

test('kernel api surfaces bootstrap failures deterministically', () => {
  assert.throws(
    () =>
      createKernelApi({
        kernelConfig: {
          seedConstitutionalArtifacts: 'invalid' as never,
        },
      }),
    KernelApiBootstrapError,
  );
});
