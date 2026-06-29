import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { createInMemoryPersistenceProvider } from '../packages/context-persistence/src/index.ts';
import { createSQLitePersistenceProviderFromPath } from '../packages/context-persistence-sqlite/src/index.ts';
import { createEventEnvelope, onEvent } from '../packages/integration-events/src/index.ts';
import { createExecutionRuntime } from '../packages/integration-execution/src/index.ts';
import { createWorkflowDefinition } from '../packages/integration-workflow/src/index.ts';
import {
  createDispatchPersistenceRecord,
  createDurableExecutionPersistence,
  createDurableExecutionPersistenceRuntime,
  createEventHistoryRecord,
  createExecutionPersistenceRecord,
  createWorkflowInstancePersistenceRecord,
  createWorkflowPersistenceRecord,
  type DurableExecutionPersistence,
} from '../packages/integration-execution-persistence/src/index.ts';

const fixedNow = '2026-06-29T12:00:00.000Z';

const createProviderRuntime = () => createDurableExecutionPersistenceRuntime('1.0.0');

const createWorkflowDefinitionForPersistence = () =>
  createWorkflowDefinition({
    workflow_id: 'durable-execution',
    trigger: onEvent({
      event_type: 'integration.execution.requested',
      metadata: {
        owner: 'host-4.9',
      },
      retry: {
        max_attempts: 3,
        backoff: 'exponential',
        delay_ms: 500,
      },
      idempotency: {
        key: 'durable-execution',
        scope: 'workflow',
      },
    }),
    steps: [
      {
        step_id: 'prepare',
        action: {
          kind: 'record-state',
          reference: 'workflow.prepare',
        },
        retry: {
          max_attempts: 5,
          backoff: 'exponential',
          delay_ms: 250,
        },
        compensation: {
          action: {
            kind: 'custom',
            reference: 'workflow.compensate.prepare',
          },
          metadata: {
            lane: 'execution',
          },
        },
        next_step_id: 'emit',
      },
      {
        step_id: 'emit',
        action: {
          kind: 'emit-event',
          reference: 'integration.execution.completed',
        },
      },
    ],
    metadata: {
      bounded_context: 'integration-runtime',
      owner: 'host-4.9',
    },
  });

const createExecutionFixture = () => {
  const runtime = createExecutionRuntime();
  const definition = createWorkflowDefinitionForPersistence();
  runtime.workflow_runtime.registry.register(definition);

  const startedEvent = createEventEnvelope({
    event_id: 'evt-durable-1',
    event_type: 'integration.execution.requested',
    source: '@host/integration-mcp',
    subject: 'execution/durable-1',
    timestamp: '2026-06-29T12:00:00.000Z',
    correlation_id: 'corr-durable-1',
    causation_id: 'cause-durable-1',
    tenant: 'tenant-a',
    payload: {
      request_id: 'durable-1',
    },
    metadata: {
      direction: 'inbound',
    },
  });

  const started = runtime.startExecution({
    execution_instance_id: 'exec-durable-1',
    workflow_id: definition.workflow_id,
    workflow_instance_id: 'wf-durable-1',
    event: startedEvent,
    principal: {
      id: 'svc-runtime',
      type: 'service',
      name: 'Runtime Service',
    },
    started_at: '2026-06-29T12:00:00.000Z',
    notes: {
      attempt: 1,
    },
  });

  const waiting = runtime.dispatchEvent({
    instance: started,
    dispatch_id: 'dispatch-durable-1',
    kind: 'workflow-to-event',
    source: 'durable-execution:prepare',
    target: 'integration.execution.completed',
    dispatched_at: '2026-06-29T12:01:00.000Z',
    metadata: {
      event_type: 'integration.execution.completed',
    },
  });

  const completed = runtime.completeExecution({
    instance: waiting,
    completed_at: '2026-06-29T12:02:00.000Z',
    notes: {
      outcome: 'ok',
    },
  });

  return {
    definition,
    startedEvent,
    execution: completed,
    dispatch: completed.dispatches[0],
    workflowRecord: createWorkflowPersistenceRecord(definition),
    workflowInstanceRecord: createWorkflowInstancePersistenceRecord(completed.workflow_state, definition.metadata),
    executionRecord: createExecutionPersistenceRecord(completed, definition.metadata),
    inboundHistory: createEventHistoryRecord({
      history_id: 'history-durable-in-1',
      direction: 'inbound',
      event: startedEvent,
      execution: completed,
    }),
    outboundHistory: createEventHistoryRecord({
      history_id: 'history-durable-out-1',
      direction: 'outbound',
      event: createEventEnvelope({
        event_id: 'evt-durable-2',
        event_type: 'integration.execution.completed',
        source: '@host/integration-execution',
        subject: 'execution/durable-1/outbound',
        timestamp: '2026-06-29T12:01:00.000Z',
        correlation_id: 'corr-durable-1',
        causation_id: 'evt-durable-1',
        tenant: 'tenant-a',
        payload: {
          request_id: 'durable-1',
        },
        metadata: {
          direction: 'outbound',
        },
      }),
      execution: completed,
    }),
  };
};

const withTempDir = async (name: string, run: (directory: string) => Promise<void>) => {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), `${name}-`));
  try {
    await run(directory);
  } finally {
    await fs.rm(directory, { recursive: true, force: true });
  }
};

const connectInMemoryStore = async (): Promise<{
  readonly store: DurableExecutionPersistence;
  readonly disconnect: () => Promise<void>;
}> => {
  const provider = createInMemoryPersistenceProvider({
    runtime: createProviderRuntime(),
    now: () => fixedNow,
  });
  const connected = await provider.connect();
  assert.equal(connected.ok, true);

  return {
    store: createDurableExecutionPersistence({ provider }),
    disconnect: async () => {
      const disconnected = await provider.disconnect();
      assert.equal(disconnected.ok, true);
    },
  };
};

const connectSqliteStore = async (directory: string): Promise<{
  readonly store: DurableExecutionPersistence;
  readonly disconnect: () => Promise<void>;
}> => {
  const provider = createSQLitePersistenceProviderFromPath(path.join(directory, 'durable-execution.sqlite'), {
    runtime: createProviderRuntime(),
    now: () => fixedNow,
  });
  const connected = await provider.connect();
  assert.equal(connected.ok, true);

  return {
    store: createDurableExecutionPersistence({ provider }),
    disconnect: async () => {
      const disconnected = await provider.disconnect();
      assert.equal(disconnected.ok, true);
    },
  };
};

const persistFixture = async (store: DurableExecutionPersistence) => {
  const fixture = createExecutionFixture();
  await store.workflows.createDefinition(fixture.workflowRecord);
  await store.workflows.createInstance(fixture.workflowInstanceRecord);
  await store.executions.create(fixture.executionRecord);
  await store.dispatches.create(createDispatchPersistenceRecord(fixture.execution, fixture.dispatch));
  await store.eventHistory.create(fixture.inboundHistory);
  await store.eventHistory.create(fixture.outboundHistory);
  return fixture;
};

const runProviderNeutralAssertions = async (store: DurableExecutionPersistence) => {
  const fixture = await persistFixture(store);

  const execution = await store.executions.retrieve(fixture.execution.execution_instance_id);
  assert.equal(execution.value.status, 'completed');
  assert.equal(execution.value.correlation_id, 'corr-durable-1');
  assert.deepEqual(execution.value.retry_metadata, {
    attempts: 0,
    max_attempts: 5,
    delay_ms: 250,
    exponential_backoff: true,
  });
  assert.deepEqual(execution.value.compensation_metadata, {
    action: {
      kind: 'custom',
      reference: 'workflow.compensate.prepare',
    },
    metadata: {
      lane: 'execution',
    },
  });

  const queried = await store.executions.query({
    status: 'completed',
    correlation_id: 'corr-durable-1',
  });
  assert.equal(queried.total, 1);
  assert.equal(queried.items[0]?.value.execution_instance_id, 'exec-durable-1');

  const recovered = await store.recovery.recover(fixture.execution.execution_instance_id);
  assert.equal(recovered.execution_instance.value.status, 'completed');
  assert.equal(recovered.workflow_instance.value.status, 'completed');
  assert.equal(recovered.dispatch_history.length, 1);
  assert.equal(recovered.event_history.length, 2);
  assert.deepEqual(recovered.execution_instance.value.execution_context, fixture.execution.context);
  assert.deepEqual(recovered.execution_instance.value.workflow_state, fixture.execution.workflow_state);
};

test('HOST-4.9 persists execution state, recovery metadata, and queries through the in-memory provider-neutral contract', async () => {
  const connected = await connectInMemoryStore();
  try {
    await runProviderNeutralAssertions(connected.store);
  } finally {
    await connected.disconnect();
  }
});

test('HOST-4.9 persists execution state, recovery metadata, and queries through the SQLite provider-neutral contract', async () => {
  await withTempDir('host-4.9-sqlite-neutral', async (directory) => {
    const connected = await connectSqliteStore(directory);
    try {
      await runProviderNeutralAssertions(connected.store);
    } finally {
      await connected.disconnect();
    }
  });
});

test('HOST-4.9 detects optimistic concurrency conflicts without overwriting durable execution state', async () => {
  const connected = await connectInMemoryStore();
  try {
    const fixture = await persistFixture(connected.store);
    const current = await connected.store.executions.retrieve(fixture.execution.execution_instance_id);
    const next = createExecutionPersistenceRecord(
      {
        ...fixture.execution,
        status: 'failed',
        last_error: {
          code: 'execution.conflict-test',
          message: 'Version conflict check.',
        },
      },
      fixture.definition.metadata,
    );

    const updated = await connected.store.executions.update(next, { expected_version: current.version });
    assert.equal(updated.value.status, 'failed');

    await assert.rejects(
      connected.store.executions.update(fixture.executionRecord, { expected_version: current.version }),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'execution-persistence.conflict',
    );

    const recovered = await connected.store.executions.retrieve(fixture.execution.execution_instance_id);
    assert.equal(recovered.value.status, 'failed');
  } finally {
    await connected.disconnect();
  }
});

test('HOST-4.9 preserves immutable dispatch and event history records', async () => {
  const connected = await connectInMemoryStore();
  try {
    const fixture = await persistFixture(connected.store);

    await assert.rejects(
      async () => connected.store.dispatches.update(createDispatchPersistenceRecord(fixture.execution, fixture.dispatch)),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'execution-persistence.immutable-record',
    );

    await assert.rejects(
      async () => connected.store.eventHistory.update(fixture.inboundHistory),
      (error: unknown) =>
        error instanceof Error &&
        'code' in error &&
        error.code === 'execution-persistence.immutable-record',
    );
  } finally {
    await connected.disconnect();
  }
});

test('HOST-4.9 recovers deterministic execution state after process restart with SQLite persistence', async () => {
  await withTempDir('host-4.9-sqlite-recovery', async (directory) => {
    const first = await connectSqliteStore(directory);
    const fixture = await persistFixture(first.store);
    const beforeRestart = await first.store.recovery.recover(fixture.execution.execution_instance_id);
    await first.disconnect();

    const second = await connectSqliteStore(directory);
    try {
      const afterRestart = await second.store.recovery.recover(fixture.execution.execution_instance_id);
      assert.deepEqual(afterRestart, beforeRestart);
      assert.equal(afterRestart.execution_instance.value.status, 'completed');
      assert.equal(afterRestart.execution_instance.value.execution_context.event.event_id, 'evt-durable-1');
    } finally {
      await second.disconnect();
    }
  });
});

test('HOST-4.9 keeps integration-execution-persistence dependency boundaries explicit and scheduler-free', async () => {
  const packageJson = JSON.parse(
    await fs.readFile(path.join(process.cwd(), 'packages', 'integration-execution-persistence', 'package.json'), 'utf8'),
  ) as {
    dependencies?: Record<string, string>;
  };

  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), [
    '@host/context-persistence',
    '@host/integration-events',
    '@host/integration-execution',
    '@host/integration-workflow',
  ]);

  const files = [
    path.join(process.cwd(), 'packages', 'integration-execution-persistence', 'src', 'contracts.ts'),
    path.join(process.cwd(), 'packages', 'integration-execution-persistence', 'src', 'factories.ts'),
    path.join(process.cwd(), 'packages', 'integration-execution-persistence', 'src', 'recovery.ts'),
    path.join(process.cwd(), 'packages', 'integration-execution-persistence', 'src', 'repositories.ts'),
    path.join(process.cwd(), 'packages', 'integration-execution-persistence', 'src', 'runtime.ts'),
  ];
  const bannedTerms = ['background worker', 'queue', 'scheduler', 'timer', 'leader election', 'hermes'];

  for (const file of files) {
    const contents = await fs.readFile(file, 'utf8');
    const lowered = contents.toLowerCase();
    for (const term of bannedTerms) {
      assert.equal(lowered.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
