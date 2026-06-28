import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  createTransportAuthenticationContext,
  createTransportMetadata,
  createTransportTracingMetadata,
  DEFAULT_TRANSPORT_CORRELATION_ID,
  DEFAULT_TRANSPORT_PROTOCOL,
  DEFAULT_TRANSPORT_REQUEST_ID,
  DEFAULT_TRANSPORT_TIMESTAMP,
  TRANSPORT_ADAPTER_CONTRACT_VERSION,
  TRANSPORT_ADAPTER_TARGET_API_PROTOCOL_VERSION,
  type TransportAdapter,
  type TransportRequest,
  type TransportResponse,
} from '../packages/transport-adapter/src/index.ts';
import { API_HOST_PROTOCOL_VERSION } from '../packages/api-host/src/index.ts';

test('transport-adapter exports the frozen HOST-3.5 contract versions', () => {
  assert.equal(TRANSPORT_ADAPTER_CONTRACT_VERSION, '1.0.0');
  assert.equal(TRANSPORT_ADAPTER_TARGET_API_PROTOCOL_VERSION, API_HOST_PROTOCOL_VERSION);
});

test('transport-adapter exposes deterministic metadata defaults', () => {
  const authentication = createTransportAuthenticationContext();
  const tracing = createTransportTracingMetadata();
  const metadata = createTransportMetadata();

  assert.deepEqual(authentication, {
    authenticated: false,
    principal: 'anonymous',
    subject: 'anonymous',
    roles: [],
    claims: {},
    method: 'anonymous',
  });

  assert.deepEqual(tracing, {
    correlation_id: DEFAULT_TRANSPORT_CORRELATION_ID,
    request_id: DEFAULT_TRANSPORT_REQUEST_ID,
    timestamp: DEFAULT_TRANSPORT_TIMESTAMP,
  });

  assert.deepEqual(metadata, {
    protocol: DEFAULT_TRANSPORT_PROTOCOL,
    direction: 'inbound',
    version: TRANSPORT_ADAPTER_CONTRACT_VERSION,
    authentication,
    tracing,
    attributes: {},
  });

  assert.equal(Object.isFrozen(metadata), true);
  assert.equal(Object.isFrozen(metadata.authentication), true);
  assert.equal(Object.isFrozen(metadata.tracing), true);
});

test('transport-adapter supports transport-neutral adapter typing without assuming protocol semantics', async () => {
  const adapter: TransportAdapter = {
    version: TRANSPORT_ADAPTER_CONTRACT_VERSION,
    translateRequest: async (request: TransportRequest) => ({
      version: API_HOST_PROTOCOL_VERSION,
      operation: 'context.query',
      resource: 'context',
      payload: request.payload,
      correlation_id: request.metadata.tracing.correlation_id,
      request_id: request.metadata.tracing.request_id,
      timestamp: request.metadata.tracing.timestamp,
    }),
    translateResponse: async (response) =>
      ({
        payload: response,
        metadata: createTransportMetadata({ direction: 'outbound', protocol: 'test' }),
        success: response.success,
      }) satisfies TransportResponse,
  };

  const translatedRequest = await adapter.translateRequest({
    payload: { query: { key_prefix: 'context/' } },
    metadata: createTransportMetadata(),
  });

  assert.equal(translatedRequest.operation, 'context.query');
  assert.equal(translatedRequest.resource, 'context');

  const translatedResponse = await adapter.translateResponse({
    success: true,
    result: { items: [] },
    metadata: {},
    diagnostics: { handled_by: '@host/api-host', category: 'success' },
    warnings: [],
    version: API_HOST_PROTOCOL_VERSION,
  });

  assert.equal(translatedResponse.success, true);
  assert.equal(translatedResponse.metadata.direction, 'outbound');
});

test('HOST-3.5 keeps transport-adapter free of framework dependencies and runtime coupling', () => {
  const root = process.cwd();
  const packageJsonPath = path.join(root, 'packages', 'transport-adapter', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/api-host']);

  const files = [
    path.join(root, 'packages', 'transport-adapter', 'src', 'contracts.ts'),
    path.join(root, 'packages', 'transport-adapter', 'src', 'adapter.ts'),
    path.join(root, 'packages', 'transport-adapter', 'README.md'),
  ];

  const bannedTerms = ['express', 'fastify', 'hono', 'mcp sdk', 'websocket server', 'queue consumer'];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const term of bannedTerms) {
      assert.equal(contents.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
