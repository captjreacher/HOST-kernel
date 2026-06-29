import type {
  DispatchRepository,
  EventHistoryRepository,
  ExecutionRecoveryResult,
  ExecutionRecoveryService,
  ExecutionRepository,
  WorkflowRepository,
} from './contracts.js';

class DurableExecutionRecoveryService implements ExecutionRecoveryService {
  readonly #workflows: WorkflowRepository;
  readonly #executions: ExecutionRepository;
  readonly #dispatches: DispatchRepository;
  readonly #eventHistory: EventHistoryRepository;

  constructor(options: {
    readonly workflows: WorkflowRepository;
    readonly executions: ExecutionRepository;
    readonly dispatches: DispatchRepository;
    readonly eventHistory: EventHistoryRepository;
  }) {
    this.#workflows = options.workflows;
    this.#executions = options.executions;
    this.#dispatches = options.dispatches;
    this.#eventHistory = options.eventHistory;
  }

  async recover<TPayload, TEventMetadata extends Record<string, unknown>>(
    execution_instance_id: string,
  ): Promise<ExecutionRecoveryResult<TPayload, TEventMetadata>> {
    const execution = await this.#executions.retrieve<TPayload, TEventMetadata>(execution_instance_id);
    const workflowInstance = await this.#workflows.retrieveInstance<TPayload, TEventMetadata>(execution.value.workflow_instance_id);
    const workflowDefinition = await this.#workflows.retrieveDefinition(
      execution.value.workflow_definition_id,
      execution.value.workflow_version,
    );
    const dispatches = await this.#dispatches.query({
      execution_instance_id,
    });
    const history = await this.#eventHistory.query<TPayload, TEventMetadata>({
      execution_instance_id,
    });

    return Object.freeze({
      workflow_definition: workflowDefinition,
      workflow_instance: workflowInstance,
      execution_instance: execution,
      dispatch_history: Object.freeze(dispatches.items),
      event_history: Object.freeze(history.items),
    });
  }
}

export const createExecutionRecoveryService = (options: {
  readonly workflows: WorkflowRepository;
  readonly executions: ExecutionRepository;
  readonly dispatches: DispatchRepository;
  readonly eventHistory: EventHistoryRepository;
}): ExecutionRecoveryService => new DurableExecutionRecoveryService(options);
