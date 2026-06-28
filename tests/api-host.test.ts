import test from 'node:test';
import assert from 'node:assert/strict';
import type {
  ContextQueryResult,
  ContextService,
  ContextServiceResult,
  ContextServiceTransaction,
  ContextStoreCommitResult,
  ContextStoreRecord,
  ContextStoreRollbackResult,
} from '@host/context-service';
import { createApiHost, type ApiHost, type ApiRequest } from '../packages/api-host/src/index.ts';

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

const handle = (host: ApiHost, request: ApiRequest | unknown) => host.handle(request as ApiRequest);

test('api-host routes CRUD requests to the injected Context Service', async () => {
  const { host, calls } = createMockHost();

  const createResponse = await handle(host, {
    route: 'context.create',
    input: { key: 'context/api/1', value: { runtime_kind: 'context-record' } },
  });
  assert.equal(createResponse.status, 201);

  const retrieveResponse = await handle(host, {
    route: 'context.retrieve',
    input: { key: 'context/api/1' },
  });
  assert.equal(retrieveResponse.status, 200);

  const updateResponse = await handle(host, {
    route: 'context.update',
    input: { key: 'context/api/1', value: { runtime_kind: 'context-record' } },
  });
  assert.equal(updateResponse.status, 200);

  const deleteResponse = await handle(host, {
    route: 'context.delete',
    input: { key: 'context/api/1' },
  });
  assert.equal(deleteResponse.status, 200);

  assert.deepEqual(calls, ['create:context/api/1', 'retrieve:context/api/1', 'update:context/api/1', 'delete:context/api/1']);
});

test('api-host routes query and transaction requests through stable host-managed dispatch', async () => {
  const { host, calls } = createMockHost();

  const queryResponse = await handle(host, {
    route: 'context.query',
    input: { query: { key_prefix: 'context/api' } },
  });
  assert.equal(queryResponse.status, 200);

  const beginResponse = await handle(host, {
    route: 'context.begin-transaction',
  });
  assert.equal(beginResponse.status, 201);
  assert.deepEqual(beginResponse.body.data, {
    transaction_id: 'tx-1',
    state: 'active',
  });

  const createInTx = await handle(host, {
    route: 'context.transaction.create',
    input: { transaction_id: 'tx-1', key: 'context/api/tx', value: { runtime_kind: 'context-record' } },
  });
  assert.equal(createInTx.status, 201);

  const queryInTx = await handle(host, {
    route: 'context.transaction.query',
    input: { transaction_id: 'tx-1', query: { key_prefix: 'context/api' } },
  });
  assert.equal(queryInTx.status, 200);

  const commitResponse = await handle(host, {
    route: 'context.transaction.commit',
    input: { transaction_id: 'tx-1' },
  });
  assert.equal(commitResponse.status, 200);

  assert.deepEqual(calls, ['query', 'begin-transaction', 'tx.create:context/api/tx', 'tx.query', 'tx.commit']);
});

test('api-host returns stable errors for unknown routes, malformed requests, and unknown transaction handles', async () => {
  const { host } = createMockHost();

  const unknownRoute = await handle(host, { route: 'context.unknown' });
  assert.equal(unknownRoute.status, 404);
  assert.deepEqual(unknownRoute.body.error.code, 'api-host.route.not-found');

  const malformed = await handle(host, {
    route: 'context.create',
    input: { key: '' },
  });
  assert.equal(malformed.status, 400);
  assert.deepEqual(malformed.body.error.code, 'api-host.request.invalid');

  const unknownTransaction = await handle(host, {
    route: 'context.transaction.commit',
    input: { transaction_id: 'missing-tx' },
  });
  assert.equal(unknownTransaction.status, 404);
  assert.deepEqual(unknownTransaction.body.error.code, 'api-host.context.transaction-not-found');
});

test('api-host translates context-service failures deterministically without leaking implementation details', async () => {
  const duplicateHost = createMockHost({
    create: async () => serviceFailure('create', 'context-service.duplicate-key', 'duplicate key'),
  }).host;
  const duplicate = await handle(duplicateHost, {
    route: 'context.create',
    input: { key: 'context/api/1', value: { runtime_kind: 'context-record' } },
  });
  assert.equal(duplicate.status, 409);
  assert.deepEqual(duplicate.body.error.code, 'api-host.context.duplicate-key');

  const invalidQueryHost = createMockHost({
    query: async () => serviceFailure('query', 'context-service.invalid-query', 'invalid query'),
  }).host;
  const invalidQuery = await handle(invalidQueryHost, {
    route: 'context.query',
    input: { query: { limit: -1 } },
  });
  assert.equal(invalidQuery.status, 400);
  assert.deepEqual(invalidQuery.body.error.code, 'api-host.context.invalid-query');

  const unavailableHost = createMockHost({
    retrieve: async () => serviceFailure('retrieve', 'context-service.unavailable', 'provider offline'),
  }).host;
  const unavailable = await handle(unavailableHost, {
    route: 'context.retrieve',
    input: { key: 'context/api/1' },
  });
  assert.equal(unavailable.status, 503);
  assert.deepEqual(unavailable.body.error.code, 'api-host.context.unavailable');
});

test('api-host supports dependency injection by dispatching exclusively through the provided service implementation', async () => {
  let injectedCalls = 0;
  const { host } = createMockHost({
    retrieve: async (key) => {
      injectedCalls += 1;
      return serviceSuccess('retrieve', createRecord(`${key}/from-injected-service`));
    },
  });

  const response = await handle(host, {
    route: 'context.retrieve',
    input: { key: 'context/api/injected' },
  });

  assert.equal(response.status, 200);
  assert.equal(injectedCalls, 1);
  assert.equal((response.body.data as ContextStoreRecord).key, 'context/api/injected/from-injected-service');
});

test('api-host routes rollback through the injected transaction and evicts the handle after success', async () => {
  const { host, calls } = createMockHost();

  await handle(host, { route: 'context.begin-transaction' });
  const rollbackResponse = await handle(host, {
    route: 'context.transaction.rollback',
    input: { transaction_id: 'tx-1' },
  });
  assert.equal(rollbackResponse.status, 200);

  const afterRollback = await handle(host, {
    route: 'context.transaction.commit',
    input: { transaction_id: 'tx-1' },
  });
  assert.equal(afterRollback.status, 404);
  assert.deepEqual(afterRollback.body.error.code, 'api-host.context.transaction-not-found');
  assert.deepEqual(calls, ['begin-transaction', 'tx.rollback']);
});
