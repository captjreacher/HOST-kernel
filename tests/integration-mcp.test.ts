import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { createKernel } from '@host/kernel-core';
import { createContextRuntime } from '../packages/context-runtime/src/index.ts';
import { createInMemoryPersistenceProvider } from '../packages/context-persistence/src/index.ts';
import { createIntegrationRegistry } from '../packages/integration-contracts/src/index.ts';
import { createRuntimeComposition } from '../packages/runtime-composition/src/index.ts';
import {
  createMcpIntegration,
  createMcpIntegrationRegistration,
  MCP_ERROR_CODE_BY_API_CODE,
  MCP_INTEGRATION_ID,
  MCP_INTEGRATION_VERSION,
  MCP_PROTOCOL_VERSION,
  MCP_RESOURCE_BASE_URI,
  MCP_RESOURCE_CATALOGUE,
  MCP_SERVER_NAME,
  MCP_TOOL_CATALOGUE,
} from '../packages/integration-mcp/src/index.ts';

const fixedNow = '2026-06-29T16:00:00.000Z';

const createProvider = () =>
  createInMemoryPersistenceProvider({
    runtime: createContextRuntime(createKernel(), {
      now: () => fixedNow,
      version: '1.0.0',
    }),
    now: () => fixedNow,
  });

test('integration-mcp registers through integration-contracts and exposes deterministic lifecycle and capability discovery', async () => {
  const provider = createProvider();
  const runtime = createRuntimeComposition({ provider });
  const registry = createIntegrationRegistry();
  const integration = createMcpIntegration({
    now: () => fixedNow,
    startup_order: 40,
  });

  registry.register(
    createMcpIntegrationRegistration(integration, {
      server_name: 'HOST Kernel MCP',
      server_version: '4.5.0',
    }),
  );

  assert.deepEqual(registry.list().map((entry) => entry.id), [MCP_INTEGRATION_ID]);

  await runtime.start();
  await integration.initialize({
    runtime,
    configuration: {
      server_name: 'HOST Kernel MCP',
      server_version: '4.5.0',
    },
    dependencies: {},
  });

  assert.equal(integration.state, 'initialized');
  assert.deepEqual(await integration.describeCapabilities(), [
    {
      key: 'mcp.tools',
      name: 'MCP Tools',
      description: 'Expose HOST context operations as MCP tools.',
      attributes: {
        tools: [...MCP_TOOL_CATALOGUE],
      },
    },
    {
      key: 'mcp.resources',
      name: 'MCP Resources',
      description: 'Expose HOST integration health and catalogue resources.',
      attributes: {
        resources: [...MCP_RESOURCE_CATALOGUE],
      },
    },
  ]);

  assert.deepEqual(await integration.health(), {
    status: 'healthy',
    checked_at: fixedNow,
    details: {
      integration: MCP_INTEGRATION_ID,
      state: 'initialized',
      runtime_state: 'connected',
      protocol_version: MCP_PROTOCOL_VERSION,
    },
  });

  await integration.shutdown();
  assert.equal(integration.state, 'shutdown');
  await runtime.stop();
});

test('integration-mcp exposes canonical MCP tools and read-only resources', async () => {
  const provider = createProvider();
  const runtime = createRuntimeComposition({ provider });
  const integration = createMcpIntegration({
    now: () => fixedNow,
  });

  await runtime.start();
  await integration.initialize({
    runtime,
    configuration: {},
    dependencies: {},
  });

  assert.equal(integration.server.name, MCP_SERVER_NAME);
  assert.equal(integration.server.version, MCP_INTEGRATION_VERSION);
  assert.equal(integration.server.protocolVersion, MCP_PROTOCOL_VERSION);

  assert.deepEqual(
    (await integration.listTools()).map((tool) => tool.name),
    [...MCP_TOOL_CATALOGUE],
  );
  assert.deepEqual(
    (await integration.listResources()).map((resource) => resource.uri),
    [...MCP_RESOURCE_CATALOGUE],
  );

  const healthResource = await integration.readResource(`${MCP_RESOURCE_BASE_URI}/health`);
  assert.deepEqual(JSON.parse(healthResource.contents[0]?.text ?? '{}'), {
    integration: MCP_INTEGRATION_ID,
    health: {
      status: 'healthy',
      checked_at: fixedNow,
      details: {
        integration: MCP_INTEGRATION_ID,
        state: 'initialized',
        runtime_state: 'connected',
        protocol_version: MCP_PROTOCOL_VERSION,
      },
    },
  });

  const capabilityResource = await integration.readResource(`${MCP_RESOURCE_BASE_URI}/capabilities`);
  assert.deepEqual(JSON.parse(capabilityResource.contents[0]?.text ?? '{}'), {
    server: integration.server,
    capabilities: integration.server.capabilities,
  });

  const catalogueResource = await integration.readResource(`${MCP_RESOURCE_BASE_URI}/operation-catalogue`);
  const cataloguePayload = JSON.parse(catalogueResource.contents[0]?.text ?? '{}');
  assert.deepEqual(cataloguePayload.operations, [...MCP_TOOL_CATALOGUE]);
  assert.deepEqual(
    cataloguePayload.tools.map((tool: { name: string }) => tool.name),
    [...MCP_TOOL_CATALOGUE],
  );

  const protocolResource = await integration.readResource(`${MCP_RESOURCE_BASE_URI}/protocol-version`);
  assert.deepEqual(JSON.parse(protocolResource.contents[0]?.text ?? '{}'), {
    mcp_protocol_version: MCP_PROTOCOL_VERSION,
    api_protocol_version: '1.0.0',
    error_translation: MCP_ERROR_CODE_BY_API_CODE,
  });

  await integration.shutdown();
  await runtime.stop();
});

test('integration-mcp translates MCP tool requests through runtime composition and returns deterministic responses', async () => {
  const provider = createProvider();
  const runtime = createRuntimeComposition({ provider });
  const integration = createMcpIntegration({
    now: () => fixedNow,
  });

  await runtime.start();
  await integration.initialize({
    runtime,
    configuration: {},
    dependencies: {},
  });

  const created = await integration.callTool({
    name: 'context.create',
    arguments: {
      key: 'context/mcp/1',
      value: {
        runtime_kind: 'context-record',
        source: { kind: 'observation', id: 'OBS-911' },
        provenance: { source: 'integration-mcp-test', source_objects: [{ kind: 'objective', id: 'OBJ-001' }] },
      },
    },
  });

  assert.equal(created.isError, false);
  const createdRecord = created.structuredContent as {
    key: string;
    version: number;
    created_at: string;
    updated_at: string;
    value: {
      runtime_kind: string;
      source: { kind: string; id: string };
      provenance: { source: string; source_objects: Array<{ kind: string; id: string }> };
    };
  };
  assert.equal(createdRecord.key, 'context/mcp/1');
  assert.equal(createdRecord.version, 1);
  assert.equal(createdRecord.created_at, fixedNow);
  assert.equal(createdRecord.updated_at, fixedNow);
  assert.equal(createdRecord.value.runtime_kind, 'context-record');
  assert.equal(createdRecord.value.source.kind, 'observation');
  assert.equal(createdRecord.value.source.id, 'OBS-911');
  assert.equal(createdRecord.value.provenance.source, 'integration-mcp-test');
  assert.deepEqual(createdRecord.value.provenance.source_objects, [{ kind: 'objective', id: 'OBJ-001' }]);

  const retrieved = await integration.callTool({
    name: 'context.retrieve',
    arguments: {
      key: 'context/mcp/1',
    },
  });
  assert.equal(retrieved.isError, false);
  assert.deepEqual(retrieved.structuredContent, created.structuredContent);

  const queried = await integration.callTool({
    name: 'context.query',
    arguments: {
      query: {
        key_prefix: 'context/mcp',
        limit: 10,
      },
    },
  });
  assert.equal(queried.isError, false);
  assert.deepEqual((queried.structuredContent as { items: unknown[] }).items.length, 1);

  const updated = await integration.callTool({
    name: 'context.update',
    arguments: {
      key: 'context/mcp/1',
      value: {
        runtime_kind: 'context-record',
        source: { kind: 'observation', id: 'OBS-912' },
        provenance: { source: 'integration-mcp-test', source_objects: [{ kind: 'objective', id: 'OBJ-001' }] },
      },
      options: {
        expected_version: 1,
      },
    },
  });
  assert.equal(updated.isError, false);
  assert.equal((updated.structuredContent as { version: number }).version, 2);

  const deleted = await integration.callTool({
    name: 'context.delete',
    arguments: {
      key: 'context/mcp/1',
      options: {
        expected_version: 2,
      },
    },
  });
  assert.equal(deleted.isError, false);
  assert.equal((deleted.structuredContent as { key: string }).key, 'context/mcp/1');

  await integration.shutdown();
  await runtime.stop();
});

test('integration-mcp maps API Host failures into deterministic MCP errors', async () => {
  const provider = createProvider();
  const runtime = createRuntimeComposition({ provider });
  const integration = createMcpIntegration({
    now: () => fixedNow,
  });

  await runtime.start();
  await integration.initialize({
    runtime,
    configuration: {},
    dependencies: {},
  });

  const missing = await integration.callTool({
    name: 'context.retrieve',
    arguments: {
      key: 'context/mcp/missing',
    },
  });

  assert.equal(missing.isError, true);
  assert.deepEqual(missing.error, {
    code: -32004,
    message: 'Unknown context store key: context/mcp/missing',
    data: {
      api_error_code: 'api.not_found',
      api_protocol_version: '1.0.0',
      status: 404,
    },
  });

  const invalid = await integration.callTool({
    name: 'context.retrieve',
    arguments: {},
  });

  assert.equal(invalid.isError, true);
  assert.deepEqual(invalid.error, {
    code: -32603,
    message: 'context.retrieve requires argument "key".',
  });

  await integration.shutdown();
  await runtime.stop();
});

test('HOST-4.5 keeps integration-mcp provider-neutral, product-neutral, and layered above integration-contracts only', () => {
  const root = process.cwd();
  const packageJsonPath = path.join(root, 'packages', 'integration-mcp', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/integration-contracts']);

  const files = [
    path.join(root, 'packages', 'integration-mcp', 'src', 'contracts.ts'),
    path.join(root, 'packages', 'integration-mcp', 'src', 'runtime.ts'),
    path.join(root, 'packages', 'integration-mcp', 'src', 'support.ts'),
    path.join(root, 'packages', 'integration-mcp', 'README.md'),
  ];

  const bannedTerms = ['context-service', 'context-persistence', 'sqlite', 'filesystem provider', 'openai', 'anthropic', 'graphql client', 'listen('];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const term of bannedTerms) {
      assert.equal(contents.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
