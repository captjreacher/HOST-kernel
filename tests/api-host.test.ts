import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ContextQueryResult,
  ContextService,
  ContextServiceRequestContext,
  ContextServiceResult,
  ContextServiceTransaction,
  ContextStoreCommitResult,
  ContextStoreRecord,
  ContextStoreRollbackResult,
} from '@host/context-service';
import {
  API_HOST_OPERATION_REGISTRY,
  API_HOST_PROTOCOL_VERSION,
  createApiHost,
  type ApiHost,
  type ApiRequest,
} from '../packages/api-host/src/index.ts';

const freeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
      freeze(nested);
    }
  }

  return value;
};

const serviceSuccess = <TValue>(operation: ContextServiceResult<TValue>['operation'], value: TValue): ContextServiceResult<TValue> =>
  freeze({
    ok: true,
    operation,
    value,
  });

const serviceFailure = (
  operation: ContextServiceResult<unknown>['operation'],
  code: ConstructorParameters<typeof Error>[0] extends never ? never : string,
  message: string,
): ContextServiceResult<never> =>
  freeze({
    ok: false,
    operation,
    error: freeze({
      name: 'ContextServiceError',
      code,
      message,
      operation,
    }),
  }) as ContextServiceResult<never>;

const createRecord = (key: string): ContextStoreRecord =>
  freeze({
    key,
    runtime_kind: 'context-record',
    version: 1,
    created_at: '2026-06-29T07:00:00.000Z',
    updated_at: '2026-06-29T07:00:00.000Z',
    value: freeze({
      runtime_kind: 'context-record',
      source: { kind: 'observation', id: 'OBS-900' },
      provenance: { source: 'api-host-tests', source_objects: [] },
    }),
  }) as ContextStoreRecord;

const createQueryResult = (): ContextQueryResult =>
  freeze({
    items: [createRecord('context/api/1')],
    total: 1,
    limit: 50,
    offset: 0,
    has_more: false,
    order_by: freeze([{ field: 'key', direction: 'asc' }]),
    query: freeze({}),
  }) as ContextQueryResult;

const createCommitResult = (): ContextStoreCommitResult =>
  freeze({
    transaction_id: 'tx-1',
    state: 'committed',
    revision: 2,
  });

const createRollbackResult = (): ContextStoreRollbackResult =>
  freeze({
    transaction_id: 'tx-1',
    state: 'rolled-back',
  });

interface MockBundle {
  readonly host: ApiHost;
  readonly calls: string[];
}

const createMockHost = (overrides: Partial<ContextService> = {}, transactionOverrides: Partial<ContextServiceTransaction> = {}): MockBundle => {
  const calls: string[] = [];

  const transaction: ContextServiceTransaction = {
    id: 'tx-1',
    state: 'active',
    create: async (key) => {
      calls.push(`tx.create:${key}`);
      return serviceSuccess('create', createRecord(key));
    },
    retrieve: async (key) => {
      calls.push(`tx.retrieve:${key}`);
      return serviceSuccess('retrieve', createRecord(key));
    },
    update: async (key) => {
      calls.push(`tx.update:${key}`);
      return serviceSuccess('update', createRecord(key));
    },
    delete: async (key) => {
      calls.push(`tx.delete:${key}`);
      return serviceSuccess('delete', createRecord(key));
    },
    query: async () => {
      calls.push('tx.query');
      return serviceSuccess('query', createQueryResult());
    },
    commit: async () => {
      calls.push('tx.commit');
      return serviceSuccess('commit', createCommitResult());
    },
    rollback: async () => {
      calls.push('tx.rollback');
      return serviceSuccess('rollback', createRollbackResult());
    },
    ...transactionOverrides,
  };

  const service: ContextService = {
    create: async (key) => {
      calls.push(`create:${key}`);
      return serviceSuccess('create', createRecord(key));
    },
    retrieve: async (key) => {
      calls.push(`retrieve:${key}`);
      return serviceSuccess('retrieve', createRecord(key));
    },
    update: async (key) => {
      calls.push(`update:${key}`);
      return serviceSuccess('update', createRecord(key));
    },
    delete: async (key) => {
      calls.push(`delete:${key}`);
      return serviceSuccess('delete', createRecord(key));
    },
    query: async () => {
      calls.push('query');
      return serviceSuccess('query', createQueryResult());
    },
    beginTransaction: async () => {
      calls.push('begin-transaction');
      return serviceSuccess('begin-transaction', transaction);
    },
    ...overrides,
  };

  return {
    host: createApiHost({
      services: {
        context: service,
      },
    }),
    calls,
  };
};

const request = (overrides: Partial<ApiRequest>): ApiRequest => ({
  version: API_HOST_PROTOCOL_VERSION,
  resource: 'context',
  operation: 'context.query',
  ...overrides,
});

const handle = (host: ApiHost, input: ApiRequest | unknown) => host.handle(input as ApiRequest);

test('api-host exposes the frozen HOST-3.3 operation registry', () => {
  assert.deepEqual(API_HOST_OPERATION_REGISTRY, [
    'context.create',
    'context.retrieve',
    'context.update',
    'context.delete',
    'context.query',
    'context.transaction.begin',
    'context.transaction.create',
    'context.transaction.retrieve',
    'context.transaction.update',
    'context.transaction.delete',
    'context.transaction.query',
    'context.transaction.commit',
    'context.transaction.rollback',
  ]);
});

test('api-host routes CRUD requests through the canonical operation contract', async () => {
  const { host, calls } = createMockHost();

  const createResponse = await handle(
    host,
    request({
      operation: 'context.create',
      payload: { key: 'context/api/1', value: { runtime_kind: 'context-record' } },
      request_id: 'REQ-001',
      correlation_id: 'COR-001',
      timestamp: '2026-06-29T08:00:00.000Z',
    }),
  );
  assert.equal(createResponse.success, true);
  if (createResponse.success) {
    assert.equal(createResponse.version, API_HOST_PROTOCOL_VERSION);
    assert.equal(createResponse.metadata.operation, 'context.create');
    assert.equal(createResponse.metadata.resource, 'context');
    assert.equal(createResponse.metadata.request_id, 'REQ-001');
    assert.equal(createResponse.metadata.correlation_id, 'COR-001');
    assert.equal(createResponse.metadata.timestamp, '2026-06-29T08:00:00.000Z');
  }

  const retrieveResponse = await handle(
    host,
    request({
      operation: 'context.retrieve',
      payload: { key: 'context/api/1' },
    }),
  );
  assert.equal(retrieveResponse.success, true);

  const updateResponse = await handle(
    host,
    request({
      operation: 'context.update',
      payload: { key: 'context/api/1', value: { runtime_kind: 'context-record' } },
    }),
  );
  assert.equal(updateResponse.success, true);

  const deleteResponse = await handle(
    host,
    request({
      operation: 'context.delete',
      payload: { key: 'context/api/1' },
    }),
  );
  assert.equal(deleteResponse.success, true);

  assert.deepEqual(calls, ['create:context/api/1', 'retrieve:context/api/1', 'update:context/api/1', 'delete:context/api/1']);
});

test('api-host routes query and transaction requests through host-managed transaction ownership', async () => {
  const { host, calls } = createMockHost();

  const queryResponse = await handle(
    host,
    request({
      operation: 'context.query',
      query: { key_prefix: 'context/api' },
    }),
  );
  assert.equal(queryResponse.success, true);

  const beginResponse = await handle(
    host,
    request({
      operation: 'context.transaction.begin',
      request_id: 'REQ-BEGIN',
    }),
  );
  assert.equal(beginResponse.success, true);
  if (!beginResponse.success) {
    return;
  }
  assert.deepEqual(beginResponse.result, {
    transaction_id: 'tx-1',
    state: 'active',
  });
  assert.deepEqual(beginResponse.metadata.transaction, {
    id: 'tx-1',
    ownership: 'host-local',
    expiry: 'until-finalized-or-host-disposal',
    lifecycle: 'active',
  });

  const createInTx = await handle(
    host,
    request({
      operation: 'context.transaction.create',
      transaction: { id: 'tx-1' },
      payload: { key: 'context/api/tx', value: { runtime_kind: 'context-record' } },
    }),
  );
  assert.equal(createInTx.success, true);

  const queryInTx = await handle(
    host,
    request({
      operation: 'context.transaction.query',
      transaction: { id: 'tx-1' },
      query: { key_prefix: 'context/api' },
    }),
  );
  assert.equal(queryInTx.success, true);

  const commitResponse = await handle(
    host,
    request({
      operation: 'context.transaction.commit',
      transaction: { id: 'tx-1' },
    }),
  );
  assert.equal(commitResponse.success, true);
  if (commitResponse.success) {
    assert.deepEqual(commitResponse.metadata.transaction, {
      id: 'tx-1',
      ownership: 'host-local',
      expiry: 'until-finalized-or-host-disposal',
      lifecycle: 'finalized',
    });
  }

  assert.deepEqual(calls, ['query', 'begin-transaction', 'tx.create:context/api/tx', 'tx.query', 'tx.commit']);
});

test('api-host returns stable contract errors for malformed envelopes and unknown transaction handles', async () => {
  const { host } = createMockHost();

  const malformed = await handle(
    host,
    request({
      operation: 'context.create',
      payload: { key: '' },
    }),
  );
  assert.equal(malformed.success, false);
  if (!malformed.success) {
    assert.equal(malformed.error.code, 'api.invalid_request');
  }

  const unsupportedVersion = await handle(host, {
    operation: 'context.query',
    resource: 'context',
    version: '2.0.0',
  });
  assert.equal(unsupportedVersion.success, false);
  if (!unsupportedVersion.success) {
    assert.equal(unsupportedVersion.error.code, 'api.invalid_request');
  }

  const unknownTransaction = await handle(
    host,
    request({
      operation: 'context.transaction.commit',
      transaction: { id: 'missing-tx' },
    }),
  );
  assert.equal(unknownTransaction.success, false);
  if (!unknownTransaction.success) {
    assert.equal(unknownTransaction.error.code, 'api.not_found');
    assert.equal(unknownTransaction.error.message, 'Unknown transaction handle.');
  }
});

test('api-host translates context-service failures into the stable HOST-3.3 taxonomy', async () => {
  const duplicateHost = createMockHost({
    create: async () => serviceFailure('create', 'context-service.duplicate-key', 'duplicate key'),
  }).host;
  const duplicate = await handle(
    duplicateHost,
    request({
      operation: 'context.create',
      payload: { key: 'context/api/1', value: { runtime_kind: 'context-record' } },
    }),
  );
  assert.equal(duplicate.success, false);
  if (!duplicate.success) {
    assert.equal(duplicate.error.code, 'api.conflict');
  }

  const invalidQueryHost = createMockHost({
    query: async () => serviceFailure('query', 'context-service.invalid-query', 'invalid query'),
  }).host;
  const invalidQuery = await handle(
    invalidQueryHost,
    request({
      operation: 'context.query',
      query: { limit: -1 },
    }),
  );
  assert.equal(invalidQuery.success, false);
  if (!invalidQuery.success) {
    assert.equal(invalidQuery.error.code, 'api.validation_failed');
  }

  const unavailableHost = createMockHost({
    retrieve: async () => serviceFailure('retrieve', 'context-service.unavailable', 'provider offline'),
  }).host;
  const unavailable = await handle(
    unavailableHost,
    request({
      operation: 'context.retrieve',
      payload: { key: 'context/api/1' },
    }),
  );
  assert.equal(unavailable.success, false);
  if (!unavailable.success) {
    assert.equal(unavailable.error.code, 'api.unavailable');
  }
});

test('api-host supports dependency injection by dispatching exclusively through the provided service implementation', async () => {
  let injectedCalls = 0;
  const { host } = createMockHost({
    retrieve: async (key) => {
      injectedCalls += 1;
      return serviceSuccess('retrieve', createRecord(`${key}/from-injected-service`));
    },
  });

  const response = await handle(
    host,
    request({
      operation: 'context.retrieve',
      payload: { key: 'context/api/injected' },
    }),
  );

  assert.equal(response.success, true);
  assert.equal(injectedCalls, 1);
  if (response.success) {
    assert.equal((response.result as ContextStoreRecord).key, 'context/api/injected/from-injected-service');
  }
});

test('api-host propagates authentication and correlation context through the application service boundary', async () => {
  let capturedContext: ContextServiceRequestContext | undefined;
  const { host } = createMockHost({
    retrieve: async (key, requestContext) => {
      capturedContext = requestContext;
      return serviceSuccess('retrieve', createRecord(`${key}/with-context`));
    },
  });

  const response = await handle(
    host,
    request({
      operation: 'context.retrieve',
      payload: { key: 'context/api/authenticated' },
      correlation_id: 'COR-CTX-001',
      request_id: 'REQ-CTX-001',
      timestamp: '2026-06-29T09:00:00.000Z',
      metadata: {
        transport_metadata: {
          authentication: {
            authenticated: true,
            principal: { id: 'principal-ctx', type: 'service' },
            subject: { id: 'subject-ctx', type: 'user' },
            tenant: { id: 'tenant-ctx' },
            roles: ['context-reader'],
            claims: { scope: 'context:read' },
            method: 'bearer',
            metadata: {
              issuer: 'test-suite',
              session_id: 'session-ctx',
              attributes: {
                source: 'api-host-test',
              },
            },
          },
          tracing: {
            correlation_id: 'COR-CTX-001',
            request_id: 'REQ-CTX-001',
            trace_id: 'TRACE-CTX-001',
            span_id: 'SPAN-CTX-001',
            timestamp: '2026-06-29T09:00:00.000Z',
          },
        },
      },
    }),
  );

  assert.equal(response.success, true);
  assert.deepEqual(capturedContext, {
    authentication: {
      authenticated: true,
      principal: { id: 'principal-ctx', type: 'service' },
      subject: { id: 'subject-ctx', type: 'user' },
      tenant: { id: 'tenant-ctx' },
      roles: ['context-reader'],
      claims: { scope: 'context:read' },
      method: 'bearer',
      metadata: {
        issuer: 'test-suite',
        session_id: 'session-ctx',
        attributes: {
          source: 'api-host-test',
        },
      },
    },
    correlation: {
      correlation_id: 'COR-CTX-001',
      request_id: 'REQ-CTX-001',
      trace_id: 'TRACE-CTX-001',
      span_id: 'SPAN-CTX-001',
      timestamp: '2026-06-29T09:00:00.000Z',
    },
    attributes: {},
  });
});

test('api-host evicts transaction handles after rollback and reports finalized lifecycle metadata', async () => {
  const { host, calls } = createMockHost();

  await handle(
    host,
    request({
      operation: 'context.transaction.begin',
    }),
  );

  const rollbackResponse = await handle(
    host,
    request({
      operation: 'context.transaction.rollback',
      transaction: { id: 'tx-1' },
    }),
  );
  assert.equal(rollbackResponse.success, true);
  if (rollbackResponse.success) {
    assert.deepEqual(rollbackResponse.metadata.transaction, {
      id: 'tx-1',
      ownership: 'host-local',
      expiry: 'until-finalized-or-host-disposal',
      lifecycle: 'finalized',
    });
  }

  const afterRollback = await handle(
    host,
    request({
      operation: 'context.transaction.commit',
      transaction: { id: 'tx-1' },
    }),
  );
  assert.equal(afterRollback.success, false);
  if (!afterRollback.success) {
    assert.equal(afterRollback.error.code, 'api.not_found');
  }
  assert.deepEqual(calls, ['begin-transaction', 'tx.rollback']);
});
