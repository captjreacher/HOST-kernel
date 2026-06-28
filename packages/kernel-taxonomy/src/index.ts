import type {
  CanonicalIdentifierType,
  TaxonomyEntry,
  TaxonomyEventEntry,
  TaxonomyEventType,
  TaxonomyIdentifierPrefixEntry,
  TaxonomyLifecycleEntry,
  TaxonomyLifecycleState,
  TaxonomyObjectEntry,
  TaxonomyObjectType,
  TaxonomyPrefixEntry,
  TaxonomyRelationshipEntry,
  TaxonomyRelationshipType,
  TaxonomyResolutionResult,
  TaxonomyResolver,
  TaxonomyValidationResult,
  TaxonomyValueKind,
  ValidationIssue,
  ValidationIssueCode,
} from '@host/kernel-types';
import { validationIssueCodes } from '@host/kernel-types';

const makeIssue = (kind: TaxonomyValueKind, code: ValidationIssueCode, path: string, message: string): ValidationIssue => ({
  code,
  path,
  message,
  severity: 'error',
});

const success = <TEntry extends TaxonomyEntry>(kind: TaxonomyValueKind, input: string, entry: TEntry): TaxonomyResolutionResult<TEntry> => ({
  kind,
  input,
  resolved: true,
  entry,
  issues: [],
});

const failure = (kind: TaxonomyValueKind, input: string, code: ValidationIssueCode, path: string, message: string): TaxonomyResolutionResult => ({
  kind,
  input,
  resolved: false,
  issues: [makeIssue(kind, code, path, message)],
});

const validationSuccess = (kind: TaxonomyValueKind, input: string, entry: TaxonomyEntry): TaxonomyValidationResult => ({
  kind,
  input,
  valid: true,
  outcome: 'valid',
  issues: [],
  entry,
  errors: 0,
  warnings: 0,
  info: 0,
});

const validationFailure = (kind: TaxonomyValueKind, input: string, code: ValidationIssueCode, path: string, message: string): TaxonomyValidationResult => ({
  kind,
  input,
  valid: false,
  outcome: 'invalid',
  issues: [makeIssue(kind, code, path, message)],
  errors: 1,
  warnings: 0,
  info: 0,
});

const objectTypes: readonly TaxonomyObjectEntry[] = [
  { kind: 'objectType', code: 'G1', value: 'objective', label: 'Objective', description: 'The smallest governed unit of intended work.', identifierType: 'objective', prefix: 'OBJ' },
  { kind: 'objectType', code: 'G2', value: 'decision', label: 'Decision', description: 'A recorded choice made in response to an objective or design need.' },
  { kind: 'objectType', code: 'G3', value: 'adr', label: 'ADR', description: 'A formal architecture decision record.', identifierType: 'adr', prefix: 'ADR' },
  { kind: 'objectType', code: 'G4', value: 'policy', label: 'Policy', description: 'A mandatory rule that constrains behaviour across the ecosystem.' },
  { kind: 'objectType', code: 'G5', value: 'standard', label: 'Standard', description: 'A prescribed way of naming, structuring, or implementing an ecosystem object.' },
  { kind: 'objectType', code: 'P1', value: 'roadmap', label: 'Roadmap', description: 'A time-ordered planning view that sequences outcomes.' },
  { kind: 'objectType', code: 'P2', value: 'epic', label: 'Epic', description: 'A strategic work container that groups related implementation efforts.' },
  { kind: 'objectType', code: 'P3', value: 'initiative', label: 'Initiative', description: 'A coordinated body of work inside an epic.' },
  { kind: 'objectType', code: 'P4', value: 'sprint', label: 'Sprint', description: 'A timeboxed delivery interval.' },
  { kind: 'objectType', code: 'P5', value: 'milestone', label: 'Milestone', description: 'A checkpoint used to confirm progress or readiness.' },
  { kind: 'objectType', code: 'P6', value: 'release', label: 'Release', description: 'A declared delivery version or outcome package.' },
  { kind: 'objectType', code: 'K1', value: 'entity', label: 'Entity', description: 'A named thing that exists in the ecosystem knowledge model.', identifierType: 'entity', prefix: 'ENT' },
  { kind: 'objectType', code: 'K2', value: 'relationship', label: 'Relationship', description: 'A directed or undirected link between two knowledge objects.', identifierType: 'relationship', prefix: 'RLT' },
  { kind: 'objectType', code: 'K3', value: 'capability', label: 'Capability', description: 'A stable ability that a product, platform, or team can provide.', identifierType: 'capability', prefix: 'CAP' },
  { kind: 'objectType', code: 'K4', value: 'workflow', label: 'Workflow', description: 'An ordered set of steps that transforms state.', identifierType: 'workflow', prefix: 'WF' },
  { kind: 'objectType', code: 'K5', value: 'signal', label: 'Signal', description: 'A measurable indication that something changed or may change.', identifierType: 'signal', prefix: 'SIG' },
  { kind: 'objectType', code: 'K6', value: 'observation', label: 'Observation', description: 'A human or machine note about what was seen.', identifierType: 'observation', prefix: 'OBS' },
  { kind: 'objectType', code: 'K7', value: 'evidence', label: 'Evidence', description: 'A verifiable record supporting a claim or observation.', identifierType: 'evidence', prefix: 'EVD' },
  { kind: 'objectType', code: 'K8', value: 'event', label: 'Event', description: 'A fact that something happened at a specific point in time.', identifierType: 'event', prefix: 'EVT' },
  { kind: 'objectType', code: 'K9', value: 'state', label: 'State', description: 'The current condition of an object at a moment in time.' },
  { kind: 'objectType', code: 'K10', value: 'artifact', label: 'Artifact', description: 'A durable document or record produced by the ecosystem.', identifierType: 'artifact', prefix: 'ART' },
  { kind: 'objectType', code: 'D1', value: 'task', label: 'Task', description: 'A discrete unit of delivery work.', identifierType: 'task', prefix: 'TASK' },
  { kind: 'objectType', code: 'D2', value: 'issue', label: 'Issue', description: 'A tracked problem, request, or defect.' },
  { kind: 'objectType', code: 'D3', value: 'branch', label: 'Branch', description: 'A version-control line of development.' },
  { kind: 'objectType', code: 'D4', value: 'commit', label: 'Commit', description: 'A version-control change set.' },
  { kind: 'objectType', code: 'D5', value: 'pull-request', label: 'Pull Request', description: 'A reviewable change proposal.' },
  { kind: 'objectType', code: 'D6', value: 'merge', label: 'Merge', description: 'The act of integrating a branch or pull request.' },
  { kind: 'objectType', code: 'D7', value: 'deployment', label: 'Deployment', description: 'The act of releasing a change into a target environment.' },
  { kind: 'objectType', code: 'R1', value: 'session', label: 'Session', description: 'A bounded runtime interaction period.' },
  { kind: 'objectType', code: 'R2', value: 'conversation', label: 'Conversation', description: 'A bounded exchange between participants or agents.' },
  { kind: 'objectType', code: 'R3', value: 'agent', label: 'Agent', description: 'An autonomous or semi-autonomous actor.' },
  { kind: 'objectType', code: 'R4', value: 'job', label: 'Job', description: 'A scheduled or ad hoc unit of execution.' },
  { kind: 'objectType', code: 'R5', value: 'queue', label: 'Queue', description: 'A holding structure for waiting work.' },
  { kind: 'objectType', code: 'R6', value: 'notification', label: 'Notification', description: 'A runtime message delivered to a person or system.' },
  { kind: 'objectType', code: 'R7', value: 'execution', label: 'Execution', description: 'A concrete run of a job, workflow, or task.' },
] as const satisfies readonly TaxonomyObjectEntry[];

const identifierPrefixes: readonly TaxonomyIdentifierPrefixEntry[] = [
  { kind: 'identifierPrefix', code: 'OBJ', value: 'OBJ', label: 'Objective', description: 'Canonical identifier prefix for objectives.', identifierType: 'objective' },
  { kind: 'identifierPrefix', code: 'ADR', value: 'ADR', label: 'ADR', description: 'Canonical identifier prefix for ADRs.', identifierType: 'adr' },
  { kind: 'identifierPrefix', code: 'CAP', value: 'CAP', label: 'Capability', description: 'Canonical identifier prefix for capabilities.', identifierType: 'capability' },
  { kind: 'identifierPrefix', code: 'ENT', value: 'ENT', label: 'Entity', description: 'Canonical identifier prefix for entities.', identifierType: 'entity' },
  { kind: 'identifierPrefix', code: 'WF', value: 'WF', label: 'Workflow', description: 'Canonical identifier prefix for workflows.', identifierType: 'workflow' },
  { kind: 'identifierPrefix', code: 'EVT', value: 'EVT', label: 'Event', description: 'Canonical identifier prefix for events.', identifierType: 'event' },
  { kind: 'identifierPrefix', code: 'ART', value: 'ART', label: 'Artifact', description: 'Canonical identifier prefix for artifacts.', identifierType: 'artifact' },
  { kind: 'identifierPrefix', code: 'TASK', value: 'TASK', label: 'Task', description: 'Canonical identifier prefix for tasks.', identifierType: 'task' },
  { kind: 'identifierPrefix', code: 'DEC', value: 'DEC', label: 'Decision', description: 'Canonical identifier prefix for decisions.' },
  { kind: 'identifierPrefix', code: 'POL', value: 'POL', label: 'Policy', description: 'Canonical identifier prefix for policies.' },
  { kind: 'identifierPrefix', code: 'STD', value: 'STD', label: 'Standard', description: 'Canonical identifier prefix for standards.' },
  { kind: 'identifierPrefix', code: 'RDM', value: 'RDM', label: 'Roadmap', description: 'Canonical identifier prefix for roadmaps.' },
  { kind: 'identifierPrefix', code: 'EPC', value: 'EPC', label: 'Epic', description: 'Canonical identifier prefix for epics.' },
  { kind: 'identifierPrefix', code: 'INI', value: 'INI', label: 'Initiative', description: 'Canonical identifier prefix for initiatives.' },
  { kind: 'identifierPrefix', code: 'SPT', value: 'SPT', label: 'Sprint', description: 'Canonical identifier prefix for sprints.' },
  { kind: 'identifierPrefix', code: 'MST', value: 'MST', label: 'Milestone', description: 'Canonical identifier prefix for milestones.' },
  { kind: 'identifierPrefix', code: 'RLS', value: 'RLS', label: 'Release', description: 'Canonical identifier prefix for releases.' },
  { kind: 'identifierPrefix', code: 'RLT', value: 'RLT', label: 'Relationship', description: 'Canonical identifier prefix for relationships.', identifierType: 'relationship' },
  { kind: 'identifierPrefix', code: 'SIG', value: 'SIG', label: 'Signal', description: 'Canonical identifier prefix for signals.', identifierType: 'signal' },
  { kind: 'identifierPrefix', code: 'OBS', value: 'OBS', label: 'Observation', description: 'Canonical identifier prefix for observations.', identifierType: 'observation' },
  { kind: 'identifierPrefix', code: 'EVD', value: 'EVD', label: 'Evidence', description: 'Canonical identifier prefix for evidence.', identifierType: 'evidence' },
  { kind: 'identifierPrefix', code: 'ISS', value: 'ISS', label: 'Issue', description: 'Canonical identifier prefix for issues.' },
  { kind: 'identifierPrefix', code: 'BR', value: 'BR', label: 'Branch', description: 'Canonical identifier prefix for branches.' },
  { kind: 'identifierPrefix', code: 'COM', value: 'COM', label: 'Commit', description: 'Canonical identifier prefix for commits.' },
  { kind: 'identifierPrefix', code: 'PR', value: 'PR', label: 'Pull Request', description: 'Canonical identifier prefix for pull requests.' },
  { kind: 'identifierPrefix', code: 'MRG', value: 'MRG', label: 'Merge', description: 'Canonical identifier prefix for merges.' },
  { kind: 'identifierPrefix', code: 'DPL', value: 'DPL', label: 'Deployment', description: 'Canonical identifier prefix for deployments.' },
  { kind: 'identifierPrefix', code: 'SES', value: 'SES', label: 'Session', description: 'Canonical identifier prefix for sessions.' },
  { kind: 'identifierPrefix', code: 'CVS', value: 'CVS', label: 'Conversation', description: 'Canonical identifier prefix for conversations.' },
  { kind: 'identifierPrefix', code: 'AGT', value: 'AGT', label: 'Agent', description: 'Canonical identifier prefix for agents.' },
  { kind: 'identifierPrefix', code: 'JOB', value: 'JOB', label: 'Job', description: 'Canonical identifier prefix for jobs.' },
  { kind: 'identifierPrefix', code: 'QUE', value: 'QUE', label: 'Queue', description: 'Canonical identifier prefix for queues.' },
  { kind: 'identifierPrefix', code: 'NOT', value: 'NOT', label: 'Notification', description: 'Canonical identifier prefix for notifications.' },
  { kind: 'identifierPrefix', code: 'EXE', value: 'EXE', label: 'Execution', description: 'Canonical identifier prefix for executions.' },
] as const satisfies readonly TaxonomyIdentifierPrefixEntry[];

const lifecycleStates: readonly TaxonomyLifecycleEntry[] = [
  'proposed',
  'active',
  'closed',
  'accepted',
  'superseded',
  'draft',
  'archived',
  'approved',
  'revised',
  'planned',
  'complete',
  'done',
  'reached',
  'registered',
  'deprecated',
  'captured',
  'verified',
  'collected',
  'emitted',
  'consumed',
  'current',
  'open',
  'triaged',
  'created',
  'referenced',
  'immutable',
  'reviewed',
  'merged',
  'deleted',
  'deployed',
  'rolled_back',
  'provisioned',
  'running',
  'queued',
  'delivered',
].map((value) => ({
  kind: 'lifecycleState',
  code: value.toUpperCase(),
  value,
  label: value.replace(/[_-]/g, ' '),
  description: `Canonical lifecycle state: ${value}.`,
})) as readonly TaxonomyLifecycleEntry[];

const relationshipTypes: readonly TaxonomyRelationshipEntry[] = [
  'originates-from',
  'depends-on',
  'references',
  'derives-from',
  'owns',
  'contains',
  'traces-to',
  'links-to',
  'part-of',
  'implements',
].map((value) => ({
  kind: 'relationshipType',
  code: value.toUpperCase().replace(/-/g, '_'),
  value,
  label: value.replace(/-/g, ' '),
  description: `Canonical relationship type: ${value}.`,
})) as readonly TaxonomyRelationshipEntry[];

const eventTypes: readonly TaxonomyEventEntry[] = [
  'objective.created',
  'repository.registered',
  'document.updated',
  'identifier.generated',
  'validation.failed',
  'registry.updated',
].map((value) => ({
  kind: 'eventType',
  code: value.toUpperCase().replace(/[.]/g, '_'),
  value,
  label: value.replace(/[.]/g, ' '),
  description: `Canonical runtime event type: ${value}.`,
})) as readonly TaxonomyEventEntry[];

const objectTypesByValue = new Map<TaxonomyObjectType, TaxonomyObjectEntry>(objectTypes.map((entry) => [entry.value, entry]));
const identifierPrefixesByValue = new Map<string, TaxonomyIdentifierPrefixEntry>(identifierPrefixes.map((entry) => [entry.value, entry]));
const lifecycleStatesByValue = new Map<TaxonomyLifecycleState, TaxonomyLifecycleEntry>(lifecycleStates.map((entry) => [entry.value, entry]));
const relationshipTypesByValue = new Map<TaxonomyRelationshipType, TaxonomyRelationshipEntry>(relationshipTypes.map((entry) => [entry.value, entry]));
const eventTypesByValue = new Map<TaxonomyEventType, TaxonomyEventEntry>(eventTypes.map((entry) => [entry.value, entry]));
const identifierPrefixByIdentifierType = new Map<CanonicalIdentifierType, TaxonomyIdentifierPrefixEntry>(
  identifierPrefixes.filter((entry): entry is TaxonomyIdentifierPrefixEntry & { identifierType: CanonicalIdentifierType } => Boolean(entry.identifierType)).map((entry) => [entry.identifierType, entry]),
);

const normalize = (value: string): string => value;

const maybeValidateIdentifierPrefix = (value: string): TaxonomyResolutionResult => {
  const normalized = normalize(value);
  const entry = identifierPrefixesByValue.get(normalized);
  return entry
    ? success('identifierPrefix', value, entry)
    : failure('identifierPrefix', value, 'taxonomy.identifier-prefix.unknown', 'value', `Unsupported identifier prefix: ${value}`);
};

const maybeValidateObjectType = (value: string): TaxonomyResolutionResult => {
  const normalized = normalize(value) as TaxonomyObjectType;
  const entry = objectTypesByValue.get(normalized);
  return entry
    ? success('objectType', value, entry)
    : failure('objectType', value, 'taxonomy.object-type.unknown', 'value', `Unsupported object type: ${value}`);
};

const maybeValidateLifecycleState = (value: string): TaxonomyResolutionResult => {
  const normalized = normalize(value) as TaxonomyLifecycleState;
  const entry = lifecycleStatesByValue.get(normalized);
  return entry
    ? success('lifecycleState', value, entry)
    : failure('lifecycleState', value, 'taxonomy.lifecycle-state.unknown', 'value', `Unsupported lifecycle state: ${value}`);
};

const maybeValidateRelationshipType = (value: string): TaxonomyResolutionResult => {
  const normalized = normalize(value) as TaxonomyRelationshipType;
  const entry = relationshipTypesByValue.get(normalized);
  return entry
    ? success('relationshipType', value, entry)
    : failure('relationshipType', value, 'taxonomy.relationship-type.unknown', 'value', `Unsupported relationship type: ${value}`);
};

const maybeValidateEventType = (value: string): TaxonomyResolutionResult => {
  const normalized = normalize(value) as TaxonomyEventType;
  const entry = eventTypesByValue.get(normalized);
  return entry
    ? success('eventType', value, entry)
    : failure('eventType', value, 'taxonomy.event-type.unknown', 'value', `Unsupported event type: ${value}`);
};

const validationFor = (result: TaxonomyResolutionResult): TaxonomyValidationResult =>
  result.resolved && result.entry
    ? validationSuccess(result.kind, result.input, result.entry)
    : validationFailure(
        result.kind,
        result.input,
        result.issues[0]?.code ?? validationIssueCodes.legacyTaxonomyValueMalformed,
        result.issues[0]?.path ?? 'value',
        result.issues[0]?.message ?? 'Unsupported taxonomy value.',
      );

const inferUnsupportedKind = (value: string): TaxonomyValueKind =>
  value.includes('.')
    ? 'eventType'
    : /^[A-Z]{2,5}$/.test(value)
      ? 'identifierPrefix'
      : value.includes('-')
        ? 'objectType'
        : 'objectType';

export const canonicalTaxonomySeed = {
  objectTypes,
  identifierPrefixes,
  lifecycleStates,
  relationshipTypes,
  eventTypes,
} as const;

export class KernelTaxonomyResolver implements TaxonomyResolver {
  resolveObjectType(value: string): TaxonomyResolutionResult {
    return maybeValidateObjectType(value);
  }

  resolveIdentifierPrefix(value: string): TaxonomyResolutionResult {
    return maybeValidateIdentifierPrefix(value);
  }

  resolveLifecycleState(value: string): TaxonomyResolutionResult {
    return maybeValidateLifecycleState(value);
  }

  resolveEventType(value: string): TaxonomyResolutionResult {
    return maybeValidateEventType(value);
  }

  resolveRelationshipType(value: string): TaxonomyResolutionResult {
    return maybeValidateRelationshipType(value);
  }

  listObjectTypes(): TaxonomyEntry[] {
    return [...objectTypes];
  }

  listIdentifierPrefixes(): TaxonomyEntry[] {
    return [...identifierPrefixes];
  }

  listLifecycleStates(): TaxonomyEntry[] {
    return [...lifecycleStates];
  }

  listEventTypes(): TaxonomyEntry[] {
    return [...eventTypes];
  }

  listRelationshipTypes(): TaxonomyEntry[] {
    return [...relationshipTypes];
  }

  validateTaxonomyValue(value: string): TaxonomyValidationResult {
    const trimmed = value.trim();
    if (!trimmed) {
      return {
        kind: 'objectType',
        input: value,
        valid: false,
        outcome: 'invalid',
        issues: [makeIssue('objectType', 'taxonomy.value.empty', 'value', 'Taxonomy value must not be empty.')],
        errors: 1,
        warnings: 0,
        info: 0,
      };
    }

    if (trimmed !== value) {
      return {
        kind: 'objectType',
        input: value,
        valid: false,
        outcome: 'invalid',
        issues: [makeIssue('objectType', 'taxonomy.value.malformed', 'value', 'Taxonomy values must not contain leading or trailing whitespace.')],
        errors: 1,
        warnings: 0,
        info: 0,
      };
    }

    return validationFor(
      objectTypesByValue.has(trimmed as TaxonomyObjectType)
        ? maybeValidateObjectType(value)
        : identifierPrefixesByValue.has(trimmed)
          ? maybeValidateIdentifierPrefix(value)
          : lifecycleStatesByValue.has(trimmed as TaxonomyLifecycleState)
            ? maybeValidateLifecycleState(value)
            : relationshipTypesByValue.has(trimmed as TaxonomyRelationshipType)
              ? maybeValidateRelationshipType(value)
              : inferUnsupportedKind(trimmed) === 'eventType'
                ? maybeValidateEventType(value)
                : inferUnsupportedKind(trimmed) === 'identifierPrefix'
                  ? maybeValidateIdentifierPrefix(value)
                  : maybeValidateObjectType(value),
    );
  }
}

export const taxonomyResolver = new KernelTaxonomyResolver();

export const resolveObjectType = (value: string): TaxonomyResolutionResult => taxonomyResolver.resolveObjectType(value);
export const resolveIdentifierPrefix = (value: string): TaxonomyResolutionResult => taxonomyResolver.resolveIdentifierPrefix(value);
export const resolveLifecycleState = (value: string): TaxonomyResolutionResult => taxonomyResolver.resolveLifecycleState(value);
export const resolveEventType = (value: string): TaxonomyResolutionResult => taxonomyResolver.resolveEventType(value);
export const resolveRelationshipType = (value: string): TaxonomyResolutionResult => taxonomyResolver.resolveRelationshipType(value);
export const listObjectTypes = (): TaxonomyEntry[] => taxonomyResolver.listObjectTypes();
export const listIdentifierPrefixes = (): TaxonomyEntry[] => taxonomyResolver.listIdentifierPrefixes();
export const listLifecycleStates = (): TaxonomyEntry[] => taxonomyResolver.listLifecycleStates();
export const listEventTypes = (): TaxonomyEntry[] => taxonomyResolver.listEventTypes();
export const listRelationshipTypes = (): TaxonomyEntry[] => taxonomyResolver.listRelationshipTypes();
export const validateTaxonomyValue = (value: string): TaxonomyValidationResult => taxonomyResolver.validateTaxonomyValue(value);

export type {
  TaxonomyEntry,
  TaxonomyEventEntry,
  TaxonomyIdentifierPrefixEntry,
  TaxonomyLifecycleEntry,
  TaxonomyObjectEntry,
  TaxonomyPrefixEntry,
  TaxonomyRelationshipEntry,
};
