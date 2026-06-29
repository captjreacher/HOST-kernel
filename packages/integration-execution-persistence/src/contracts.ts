import type { ContextPersistenceProvider } from '@host/context-persistence';
import type { EventEnvelope } from '../../integration-events/src/index.js';
import type {
  ExecutionContext,
  ExecutionDispatchRecord,
  ExecutionInstance,
  ExecutionStatus,
} from '../../integration-execution/src/index.js';
import type {
  RegisteredWorkflowDefinition,
  WorkflowCompensationMetadata,
  WorkflowExecutionContext,
  WorkflowExecutionState,
  WorkflowExecutionStatus,
  WorkflowExecutionTransition,
  WorkflowPrincipal,
} from '../../integration-workflow/src/index.js';

export const INTEGRATION_EXECUTION_PERSISTENCE_VERSION = '1.0.0' as const;

export type DurableExecutionRecordKind =
  | 'execution-workflow-definition'
  | 'execution-workflow-instance'
  | 'execution-instance'
  | 'execution-dispatch-record'
  | 'execution-event-history';

export interface PersistedRecordEnvelope<TValue> {
  readonly id: string;
  readonly version: number;
  readonly created_at: string;
  readonly updated_at: string;
  readonly value: TValue;
}

export interface RepositoryQueryResult<TValue> {
  readonly items: readonly PersistedRecordEnvelope<TValue>[];
  readonly total: number;
}

export interface RepositoryQueryOptions {
  readonly limit?: number | undefined;
  readonly offset?: number | undefined;
}

export interface RepositoryWriteOptions {
  readonly expected_version?: number | undefined;
}

export type ExecutionPersistenceErrorCode =
  | 'execution-persistence.not-found'
  | 'execution-persistence.conflict'
  | 'execution-persistence.immutable-record'
  | 'execution-persistence.provider-failure'
  | 'execution-persistence.invalid-record';

export class ExecutionPersistenceError extends Error {
  readonly code: ExecutionPersistenceErrorCode;
  readonly record_id?: string | undefined;
  readonly expected_version?: number | undefined;
  readonly actual_version?: number | undefined;

  constructor(
    code: ExecutionPersistenceErrorCode,
    message: string,
    options: {
      readonly record_id?: string | undefined;
      readonly expected_version?: number | undefined;
      readonly actual_version?: number | undefined;
    } = {},
  ) {
    super(message);
    this.name = 'ExecutionPersistenceError';
    this.code = code;
    this.record_id = options.record_id;
    this.expected_version = options.expected_version;
    this.actual_version = options.actual_version;
  }
}

export interface WorkflowPersistenceRecord {
  readonly workflow_definition_id: string;
  readonly workflow_version: string;
  readonly workflow_metadata: Readonly<Record<string, unknown>>;
  readonly definition: RegisteredWorkflowDefinition;
}

export interface WorkflowPersistenceQuery extends RepositoryQueryOptions {
  readonly workflow_definition_id?: string | undefined;
  readonly workflow_version?: string | undefined;
}

export interface WorkflowInstancePersistenceRecord<
  TPayload = unknown,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly workflow_instance_id: string;
  readonly workflow_definition_id: string;
  readonly workflow_version: string;
  readonly status: WorkflowExecutionStatus;
  readonly current_step_id?: string | undefined;
  readonly completed_step_ids: readonly string[];
  readonly correlation_id: string;
  readonly causation_id?: string | undefined;
  readonly tenant?: string | undefined;
  readonly principal?: WorkflowPrincipal | undefined;
  readonly workflow_metadata: Readonly<Record<string, unknown>>;
  readonly retry_metadata: WorkflowExecutionContext<TPayload, TEventMetadata>['execution']['retry'];
  readonly compensation_metadata?: WorkflowCompensationMetadata | undefined;
  readonly transition: WorkflowExecutionTransition;
  readonly context: WorkflowExecutionContext<TPayload, TEventMetadata>;
  readonly state: WorkflowExecutionState<TPayload, TEventMetadata>;
  readonly last_error?: WorkflowExecutionState<TPayload, TEventMetadata>['last_error'];
}

export interface WorkflowInstancePersistenceQuery extends RepositoryQueryOptions {
  readonly workflow_instance_id?: string | undefined;
  readonly workflow_definition_id?: string | undefined;
  readonly workflow_version?: string | undefined;
  readonly status?: WorkflowExecutionStatus | readonly WorkflowExecutionStatus[] | undefined;
  readonly correlation_id?: string | undefined;
  readonly tenant?: string | undefined;
}

export interface ExecutionPersistenceRecord<
  TPayload = unknown,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly execution_instance_id: string;
  readonly workflow_instance_id: string;
  readonly workflow_definition_id: string;
  readonly workflow_version: string;
  readonly status: ExecutionStatus;
  readonly correlation_id: string;
  readonly causation_id?: string | undefined;
  readonly tenant?: string | undefined;
  readonly principal?: WorkflowPrincipal | undefined;
  readonly workflow_metadata: Readonly<Record<string, unknown>>;
  readonly retry_metadata: WorkflowExecutionContext<TPayload, TEventMetadata>['execution']['retry'];
  readonly compensation_metadata?: WorkflowCompensationMetadata | undefined;
  readonly execution_context: ExecutionContext<TPayload, TEventMetadata>;
  readonly workflow_state: WorkflowExecutionState<TPayload, TEventMetadata>;
  readonly execution: ExecutionInstance<TPayload, TEventMetadata>;
  readonly last_error?: ExecutionInstance<TPayload, TEventMetadata>['last_error'];
}

export interface ExecutionPersistenceQuery extends RepositoryQueryOptions {
  readonly execution_instance_id?: string | undefined;
  readonly workflow_instance_id?: string | undefined;
  readonly workflow_definition_id?: string | undefined;
  readonly status?: ExecutionStatus | readonly ExecutionStatus[] | undefined;
  readonly correlation_id?: string | undefined;
  readonly tenant?: string | undefined;
}

export interface DispatchPersistenceRecord {
  readonly dispatch_id: string;
  readonly execution_instance_id: string;
  readonly workflow_instance_id: string;
  readonly workflow_definition_id: string;
  readonly correlation_id: string;
  readonly causation_id?: string | undefined;
  readonly tenant?: string | undefined;
  readonly principal?: WorkflowPrincipal | undefined;
  readonly dispatch: ExecutionDispatchRecord;
}

export interface DispatchPersistenceQuery extends RepositoryQueryOptions {
  readonly dispatch_id?: string | undefined;
  readonly execution_instance_id?: string | undefined;
  readonly workflow_instance_id?: string | undefined;
  readonly workflow_definition_id?: string | undefined;
  readonly correlation_id?: string | undefined;
  readonly tenant?: string | undefined;
}

export type EventHistoryDirection = 'inbound' | 'outbound' | 'internal';

export interface EventHistoryRecord<
  TPayload = unknown,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly history_id: string;
  readonly execution_instance_id?: string | undefined;
  readonly workflow_instance_id?: string | undefined;
  readonly workflow_definition_id?: string | undefined;
  readonly correlation_id: string;
  readonly causation_id?: string | undefined;
  readonly tenant?: string | undefined;
  readonly principal?: WorkflowPrincipal | undefined;
  readonly direction: EventHistoryDirection;
  readonly event: EventEnvelope<TPayload, TEventMetadata>;
}

export interface EventHistoryQuery extends RepositoryQueryOptions {
  readonly history_id?: string | undefined;
  readonly execution_instance_id?: string | undefined;
  readonly workflow_instance_id?: string | undefined;
  readonly workflow_definition_id?: string | undefined;
  readonly correlation_id?: string | undefined;
  readonly tenant?: string | undefined;
  readonly direction?: EventHistoryDirection | readonly EventHistoryDirection[] | undefined;
}

export interface WorkflowRepository {
  createDefinition(record: WorkflowPersistenceRecord, options?: RepositoryWriteOptions | undefined): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>>;
  retrieveDefinition(workflow_definition_id: string, workflow_version: string): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>>;
  updateDefinition(record: WorkflowPersistenceRecord, options?: RepositoryWriteOptions | undefined): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>>;
  deleteDefinition(workflow_definition_id: string, workflow_version: string, options?: RepositoryWriteOptions | undefined): Promise<PersistedRecordEnvelope<WorkflowPersistenceRecord>>;
  queryDefinitions(query?: WorkflowPersistenceQuery | undefined): Promise<RepositoryQueryResult<WorkflowPersistenceRecord>>;

  createInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>>;
  retrieveInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    workflow_instance_id: string,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>>;
  updateInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>>;
  deleteInstance<TPayload, TEventMetadata extends Record<string, unknown>>(
    workflow_instance_id: string,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>>;
  queryInstances<TPayload, TEventMetadata extends Record<string, unknown>>(
    query?: WorkflowInstancePersistenceQuery | undefined,
  ): Promise<RepositoryQueryResult<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>>;
}

export interface ExecutionRepository {
  create<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: ExecutionPersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
  retrieve<TPayload, TEventMetadata extends Record<string, unknown>>(
    execution_instance_id: string,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
  update<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: ExecutionPersistenceRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
  delete<TPayload, TEventMetadata extends Record<string, unknown>>(
    execution_instance_id: string,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
  query<TPayload, TEventMetadata extends Record<string, unknown>>(
    query?: ExecutionPersistenceQuery | undefined,
  ): Promise<RepositoryQueryResult<ExecutionPersistenceRecord<TPayload, TEventMetadata>>>;
}

export interface DispatchRepository {
  create(record: DispatchPersistenceRecord, options?: RepositoryWriteOptions | undefined): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>>;
  retrieve(dispatch_id: string, execution_instance_id: string): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>>;
  update(record: DispatchPersistenceRecord, options?: RepositoryWriteOptions | undefined): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>>;
  delete(dispatch_id: string, execution_instance_id: string, options?: RepositoryWriteOptions | undefined): Promise<PersistedRecordEnvelope<DispatchPersistenceRecord>>;
  query(query?: DispatchPersistenceQuery | undefined): Promise<RepositoryQueryResult<DispatchPersistenceRecord>>;
}

export interface EventHistoryRepository {
  create<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: EventHistoryRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  retrieve<TPayload, TEventMetadata extends Record<string, unknown>>(
    history_id: string,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  update<TPayload, TEventMetadata extends Record<string, unknown>>(
    record: EventHistoryRecord<TPayload, TEventMetadata>,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  delete<TPayload, TEventMetadata extends Record<string, unknown>>(
    history_id: string,
    options?: RepositoryWriteOptions | undefined,
  ): Promise<PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>>;
  query<TPayload, TEventMetadata extends Record<string, unknown>>(
    query?: EventHistoryQuery | undefined,
  ): Promise<RepositoryQueryResult<EventHistoryRecord<TPayload, TEventMetadata>>>;
}

export interface ExecutionRecoveryResult<
  TPayload = unknown,
  TEventMetadata extends Record<string, unknown> = Record<string, unknown>,
> {
  readonly workflow_definition: PersistedRecordEnvelope<WorkflowPersistenceRecord>;
  readonly workflow_instance: PersistedRecordEnvelope<WorkflowInstancePersistenceRecord<TPayload, TEventMetadata>>;
  readonly execution_instance: PersistedRecordEnvelope<ExecutionPersistenceRecord<TPayload, TEventMetadata>>;
  readonly dispatch_history: readonly PersistedRecordEnvelope<DispatchPersistenceRecord>[];
  readonly event_history: readonly PersistedRecordEnvelope<EventHistoryRecord<TPayload, TEventMetadata>>[];
}

export interface ExecutionRecoveryService {
  recover<TPayload, TEventMetadata extends Record<string, unknown>>(
    execution_instance_id: string,
  ): Promise<ExecutionRecoveryResult<TPayload, TEventMetadata>>;
}

export interface DurableExecutionPersistenceOptions {
  readonly provider: ContextPersistenceProvider;
  readonly now?: (() => string) | undefined;
}

export interface DurableExecutionPersistence {
  readonly version: typeof INTEGRATION_EXECUTION_PERSISTENCE_VERSION;
  readonly provider: ContextPersistenceProvider;
  readonly workflows: WorkflowRepository;
  readonly executions: ExecutionRepository;
  readonly dispatches: DispatchRepository;
  readonly eventHistory: EventHistoryRepository;
  readonly recovery: ExecutionRecoveryService;
}
