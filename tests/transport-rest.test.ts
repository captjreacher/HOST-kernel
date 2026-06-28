import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { API_HOST_PROTOCOL_VERSION, type ApiResponse } from '../packages/api-host/src/index.ts';
import { createTransportMetadata } from '../packages/transport-adapter/src/index.ts';
import {
  createContextQueryFromRestQuery,
  createRestTransportAdapter,
  REST_ERROR_STATUS_REGISTRY,
  REST_RESOURCE_REGISTRY,
  REST_TRANSPORT_ADAPTER_VERSION,
  REST_TRANSPORT_PROTOCOL,
  type RestTransportRequest,
} from '../packages/transport-rest/src/index.ts';

const createRequest = (overrides: Partial<RestTransportRequest>): RestTransportRequest => ({
  method: 'GET',
  path: '/context',
  metadata: createTransportMetadata({
    protocol: REST_TRANSPORT_PROTOCOL,
    tracing: {
      correlation_id: 'corr-123',
      request_id: 'req-456',
      trace_id: 'trace-789',
      span_id: 'span-101',
      timestamp: '2026-06-29T10:00:00.000Z',
    },
  }),
  ...overrides,
});

test('transport-rest exposes the frozen HOST-3.6 registry and version', () => {
  assert.equal(REST_TRANSPORT_ADAPTER_VERSION, '1.0.0');
  assert.deepEqual(
    REST_RESOURCE_REGISTRY.map((entry) => `${entry.method} ${entry.template} -> ${entry.operation}`),
    [
      'POST /context -> context.create',
      'GET /context/{key} -> context.retrieve',
      'PUT /context/{key} -> context.update',
      'PATCH /context/{key} -> context.update',
      'DELETE /context/{key} -> context.delete',
      'GET /context -> context.query',
    ],
  );
});

test('transport-rest translates CRUD requests into canonical api-host requests', async () => {
  const adapter = createRestTransportAdapter();

  const createRequestResult = await adapter.translateRequest(
    createRequest({
      method: 'POST',
      path: '/context',
      body: { key: 'context/rest/1', value: { runtime_kind: 'context-record' } },
    }),
  );
  assert.equal(createRequestResult.operation, 'context.create');
  assert.deepEqual(createRequestResult.payload, { key: 'context/rest/1', value: { runtime_kind: 'context-record' } });

  const retrieveRequest = await adapter.translateRequest(
    createRequest({
      method: 'GET',
      path: '/context/context%2Frest%2F1',
    }),
  );
  assert.equal(retrieveRequest.operation, 'context.retrieve');
  assert.deepEqual(retrieveRequest.payload, { key: 'context/rest/1' });

  const updateRequest = await adapter.translateRequest(
    createRequest({
      method: 'PUT',
      path: '/context/context%2Frest%2F1',
      body: { value: { runtime_kind: 'context-record', source: 'rest' }, options: { expected_version: 2 } },
    }),
  );
  assert.equal(updateRequest.operation, 'context.update');
  assert.deepEqual(updateRequest.payload, {
    key: 'context/rest/1',
    value: { runtime_kind: 'context-record', source: 'rest' },
    options: { expected_version: 2 },
  });

  const deleteRequest = await adapter.translateRequest(
    createRequest({
      method: 'DELETE',
      path: '/context/context%2Frest%2F1',
      query: { expected_version: '3' },
    }),
  );
  assert.equal(deleteRequest.operation, 'context.delete');
  assert.deepEqual(deleteRequest.payload, {
    key: 'context/rest/1',
    options: { expected_version: 3 },
  });
});

test('transport-rest translates query parameters into canonical context query objects', async () => {
  const adapter = createRestTransportAdapter();
  const translated = await adapter.translateRequest(
    createRequest({
      method: 'GET',
      path: '/context',
      query: {
        key_prefix: 'context/rest',
        runtime_kind: ['context-record', 'observation'],
        limit: '25',
        offset: '5',
        order_by: 'updated_at:desc,key:asc',
      },
    }),
  );

  assert.equal(translated.operation, 'context.query');
  assert.deepEqual(translated.query, {
    key_prefix: 'context/rest',
    runtime_kind: ['context-record', 'observation'],
    limit: 25,
    offset: 5,
    order_by: [
      { field: 'updated_at', direction: 'desc' },
      { field: 'key', direction: 'asc' },
    ],
  });

  assert.deepEqual(
    createContextQueryFromRestQuery({
      keys: ['a,b', 'c'],
      min_version: '1',
      max_version: '4',
    }),
    {
      keys: ['a', 'b', 'c'],
      min_version: 1,
      max_version: 4,
    },
  );
});

test('transport-rest preserves correlation and tracing metadata on translated requests', async () => {
  const adapter = createRestTransportAdapter();
  const translated = await adapter.translateRequest(createRequest({}));

  assert.equal(translated.version, API_HOST_PROTOCOL_VERSION);
  assert.equal(translated.correlation_id, 'corr-123');
  assert.equal(translated.request_id, 'req-456');
  assert.equal(translated.timestamp, '2026-06-29T10:00:00.000Z');
  assert.deepEqual(translated.metadata, {
    transport: {
      protocol: 'rest',
      method: 'GET',
      path: '/context',
      route_template: '/context',
    },
    transport_metadata: createRequest({}).metadata,
  });
});

test('transport-rest translates api-host responses into deterministic REST responses and HTTP semantics', async () => {
  const adapter = createRestTransportAdapter();

  const successResponse = await adapter.translateResponse({
    success: true,
    result: { key: 'context/rest/1' },
    metadata: {
      operation: 'context.create',
      resource: 'context',
      correlation_id: 'corr-123',
      request_id: 'req-456',
      timestamp: '2026-06-29T10:00:00.000Z',
    },
    diagnostics: { handled_by: '@host/api-host', category: 'success' },
    warnings: [],
    version: API_HOST_PROTOCOL_VERSION,
  });

  assert.equal(successResponse.success, true);
  assert.equal(successResponse.status.code, 201);
  assert.deepEqual(successResponse.headers, {
    'content-type': 'application/json',
    'x-correlation-id': 'corr-123',
    'x-request-id': 'req-456',
  });

  const errorResponse = await adapter.translateResponse({
    success: false,
    error: {
      code: 'api.validation_failed',
      message: 'invalid query',
    },
    metadata: {
      operation: 'context.query',
      resource: 'context',
      correlation_id: 'corr-123',
      request_id: 'req-456',
      timestamp: '2026-06-29T10:00:00.000Z',
    },
    diagnostics: { handled_by: '@host/api-host', category: 'error' },
    warnings: [],
    version: API_HOST_PROTOCOL_VERSION,
  } satisfies ApiResponse);

  assert.equal(errorResponse.success, false);
  assert.equal(errorResponse.status.code, 422);
  assert.deepEqual(errorResponse.payload, {
    error: {
      code: 'api.validation_failed',
      message: 'invalid query',
    },
    metadata: {
      operation: 'context.query',
      resource: 'context',
      correlation_id: 'corr-123',
      request_id: 'req-456',
      timestamp: '2026-06-29T10:00:00.000Z',
    },
    diagnostics: { handled_by: '@host/api-host', category: 'error' },
    warnings: [],
    version: API_HOST_PROTOCOL_VERSION,
  });
});

test('transport-rest exposes deterministic API error to HTTP status mappings', () => {
  assert.deepEqual(REST_ERROR_STATUS_REGISTRY, {
    'api.invalid_request': 400,
    'api.validation_failed': 422,
    'api.not_found': 404,
    'api.conflict': 409,
    'api.transaction_closed': 409,
    'api.unavailable': 503,
    'api.internal': 500,
  });
});

test('HOST-3.6 keeps transport-rest free of server frameworks and direct application/provider dependencies', () => {
  const root = process.cwd();
  const packageJsonPath = path.join(root, 'packages', 'transport-rest', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/api-host', '@host/transport-adapter']);

  const files = [
    path.join(root, 'packages', 'transport-rest', 'src', 'contracts.ts'),
    path.join(root, 'packages', 'transport-rest', 'src', 'adapter.ts'),
    path.join(root, 'packages', 'transport-rest', 'README.md'),
  ];

  const bannedTerms = ['express', 'fastify', 'hono', 'cloudflare workers', 'aws lambda', 'azure functions', 'listen(', 'createServer'];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8');
    for (const term of bannedTerms) {
      assert.equal(contents.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
