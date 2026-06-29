import type {
  DurableExecutionPersistence,
  DurableExecutionPersistenceOptions,
  DispatchPersistenceRecord,
  EventHistoryDirection,
  EventHistoryRecord,
  ExecutionPersistenceRecord,
  WorkflowInstancePersistenceRecord,
  WorkflowPersistenceRecord,
} from './contracts.js';
import { INTEGRATION_EXECUTION_PERSISTENCE_VERSION } from './contracts.js';
import {
  createDispatchRepository,
  createEventHistoryRepository,
  createExecutionRepository,
  createWorkflowRepository,
} from './repositories.js';
import { createExecutionRecoveryService } from './recovery.js';

const deepFreeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object') {
      deepFreeze(nested);
    }
  }

  return value;
};

export const createWorkflowPersistenceRecord = (definition: WorkflowPersistenceRecord['definition']): WorkflowPersistenceRecord =>
  deepFreeze({
    workflow_definition_id: definition.workflow_id,
    workflow_version: definition.workflow_version,
    workflow_metadata: definition.metadata,
    definition,
  });

export const createWorkflowInstancePersistenceRecord = <
  TPayload,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  state: WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>['state'],
  workflow_metadata: Readonly<Record<string, unknown>>,
): WorkflowInstancePersistenceRecord<TPayload, TEventMetadata> =>
  deepFreeze({
    workflow_instance_id: state.workflow_instance_id,
    workflow_definition_id: state.workflow_definition_id,
    workflow_version: state.workflow_version,
    status: state.status,
    ...(state.current_step_id ? { current_step_id: state.current_step_id } : {}),
    completed_step_ids: state.completed_step_ids,
    correlation_id: state.context.correlation_id,
    ...(state.context.causation_id ? { causation_id: state.context.causation_id } : {}),
    ...(state.context.tenant ? { tenant: state.context.tenant } : {}),
    ...(state.context.principal ? { principal: state.context.principal } : {}),
    workflow_metadata,
    retry_metadata: state.context.execution.retry,
    ...(state.context.execution.compensation ? { compensation_metadata: state.context.execution.compensation } : {}),
    transition: state.context.execution.transition,
    context: state.context,
    state,
    ...(state.last_error ? { last_error: state.last_error } : {}),
  });

export const createExecutionPersistenceRecord = <
  TPayload,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  execution: ExecutionPersistenceRecord<TPayload, TEventMetadata>['execution'],
  workflow_metadata: Readonly<Record<string, unknown>>,
): ExecutionPersistenceRecord<TPayload, TEventMetadata> =>
  deepFreeze({
    execution_instance_id: execution.execution_instance_id,
    workflow_instance_id: execution.context.workflow_instance_id,
    workflow_definition_id: execution.workflow_state.workflow_definition_id,
    workflow_version: execution.workflow_state.workflow_version,
    status: execution.status,
    correlation_id: execution.context.correlation_id,
    ...(execution.context.causation_id ? { causation_id: execution.context.causation_id } : {}),
    ...(execution.context.tenant ? { tenant: execution.context.tenant } : {}),
    ...(execution.context.principal ? { principal: execution.context.principal } : {}),
    workflow_metadata,
    retry_metadata: execution.workflow_state.context.execution.retry,
    ...(execution.workflow_state.context.execution.compensation
      ? { compensation_metadata: execution.workflow_state.context.execution.compensation }
      : {}),
    execution_context: execution.context,
    workflow_state: execution.workflow_state,
    execution,
    ...(execution.last_error ? { last_error: execution.last_error } : {}),
  });

export const createDispatchPersistenceRecord = (
  execution: ExecutionPersistenceRecord['execution'],
  dispatch: DispatchPersistenceRecord['dispatch'],
): DispatchPersistenceRecord =>
  deepFreeze({
    dispatch_id: dispatch.dispatch_id,
    execution_instance_id: execution.execution_instance_id,
    workflow_instance_id: execution.context.workflow_instance_id,
    workflow_definition_id: execution.workflow_state.workflow_definition_id,
    correlation_id: execution.context.correlation_id,
    ...(execution.context.causation_id ? { causation_id: execution.context.causation_id } : {}),
    ...(execution.context.tenant ? { tenant: execution.context.tenant } : {}),
    ...(execution.context.principal ? { principal: execution.context.principal } : {}),
    dispatch,
  });

export const createEventHistoryRecord = <
  TPayload,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
>(
  input: {
    readonly history_id: string;
    readonly direction: EventHistoryDirection;
    readonly event: EventHistoryRecord<TPayload, TEventMetadata>['event'];
    readonly execution?: ExecutionPersistenceRecord<TPayload, TEventMetadata>['execution'] | undefined;
  },
): EventHistoryRecord<TPayload, TEventMetadata> =>
  deepFreeze({
    history_id: input.history_id,
    ...(input.execution ? { execution_instance_id: input.execution.execution_instance_id } : {}),
    ...(input.execution ? { workflow_instance_id: input.execution.context.workflow_instance_id } : {}),
    ...(input.execution ? { workflow_definition_id: input.execution.workflow_state.workflow_definition_id } : {}),
    correlation_id: input.event.correlation_id,
    ...(input.event.causation_id ? { causation_id: input.event.causation_id } : {}),
    ...(input.event.tenant ? { tenant: input.event.tenant } : {}),
    ...(input.execution?.context.principal ? { principal: input.execution.context.principal } : {}),
    direction: input.direction,
    event: input.event,
  });

export const createDurableExecutionPersistence = (
  options: DurableExecutionPersistenceOptions,
): DurableExecutionPersistence => {
  const workflows = createWorkflowRepository(options.provider);
  const executions = createExecutionRepository(options.provider);
  const dispatches = createDispatchRepository(options.provider);
  const eventHistory = createEventHistoryRepository(options.provider);

  return deepFreeze({
    version: INTEGRATION_EXECUTION_PERSISTENCE_VERSION,
    provider: options.provider,
    workflows,
    executions,
    dispatches,
    eventHistory,
    recovery: createExecutionRecoveryService({
      workflows,
      executions,
      dispatches,
      eventHistory,
    }),
  });
};
