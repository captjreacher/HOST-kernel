import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';
import {
  createKernel,
  type KernelConfidenceInput,
  type KernelContextRecordInput,
  KernelBootstrapError,
  type KernelContextReferenceInput,
  type KernelContextRuntimeKind,
  type KernelContextSnapshotInput,
  type KernelFreshnessInput,
  type KernelHealthCheckResult,
  type KernelProvenanceInput,
  type KernelRuntime,
  type KernelRuntimeConfig,
} from '@host/kernel-core';
import { RegistryError } from '@host/kernel-registry';
import type { ObjectiveCreateInput, ObjectiveUpdateInput } from '@host/kernel-objectives';
import type { Document, RegistryRecord, Repository, ValidationIssue, ValidationReference, ValidationResult } from '@host/kernel-types';
import {
  type KernelApiApplication,
  type KernelApiBootstrapStatus,
  type KernelApiConfig,
  type KernelContextCapabilitiesResponse,
  type KernelContextValidationEnvelope,
  type KernelApiErrorBody,
  type KernelApiResponse,
  KernelApiBootstrapError,
  type KernelHealthResponse,
  type KernelTaxonomyResponse,
  type KernelValidationEnvelope,
} from './contracts.js';

const expectedConstitutionalArtifacts = ['HOST-0', 'OBJ-000', 'OBJ-001', 'OBJ-002', 'OBJ-003', 'OBJ-004', 'OBJ-005', 'OBJ-006'] as const;
const contextSubjects = ['context-reference', 'confidence', 'freshness', 'provenance', 'context-record', 'context-snapshot'] as const;

type JsonRecord = Record<string, unknown>;

interface RouteMatch {
  params: Record<string, string>;
}

const isObject = (value: unknown): value is JsonRecord => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const response = <T>(status: number, data: T): KernelApiResponse<T> => ({
  status,
  body: { data },
});

const errorResponse = (status: number, code: string, message: string, issues?: ValidationIssue[]): KernelApiResponse => ({
  status,
  body: {
    error: {
      code,
      message,
      ...(issues && issues.length > 0 ? { issues } : {}),
    },
  } satisfies KernelApiErrorBody['error'] extends infer T ? { error: T } : never,
});

const parseJsonBody = (rawBody: string | undefined): { ok: true; value: unknown } | { ok: false; response: KernelApiResponse } => {
  if (!rawBody || rawBody.trim().length === 0) {
    return { ok: true, value: {} };
  }

  try {
    return { ok: true, value: JSON.parse(rawBody) };
  } catch {
    return {
      ok: false,
      response: errorResponse(400, 'kernel-api.request.invalid-json', 'Request body must be valid JSON.'),
    };
  }
};

const readRequestBody = async (request: IncomingMessage): Promise<string> => {
  const chunks: Buffer[] = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
};

const uniqueIssues = (issues: readonly ValidationIssue[]): ValidationIssue[] => {
  const merged = new Map<string, ValidationIssue>();
  for (const issue of issues) {
    const key = [issue.code, issue.path, issue.message, issue.severity, issue.subjectKind ?? '', issue.subjectId ?? '', issue.expected ?? '', issue.actual ?? ''].join('|');
    merged.set(key, issue);
  }
  return [...merged.values()];
};

const mergeValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const issues = uniqueIssues(results.flatMap((result) => result.issues));
  return {
    outcome: issues.some((issue) => issue.severity === 'error') ? 'invalid' : 'valid',
    valid: !issues.some((issue) => issue.severity === 'error'),
    issues,
    errors: issues.filter((issue) => issue.severity === 'error').length,
    warnings: issues.filter((issue) => issue.severity === 'warning').length,
    info: issues.filter((issue) => issue.severity === 'info').length,
  };
};

const validationContextFor = (record: JsonRecord, runtime: KernelRuntime): { lookup: KernelRuntime['registry']; references: ValidationReference[] } => ({
  lookup: runtime.registry,
  references: Array.isArray(record.references)
    ? record.references.filter(
        (value): value is ValidationReference =>
          isObject(value) &&
          typeof value.kind === 'string' &&
          typeof value.id === 'string' &&
          (value.relation === undefined || typeof value.relation === 'string') &&
          (value.required === undefined || typeof value.required === 'boolean'),
      )
    : [],
});

const detectValidationSubject = (record: JsonRecord): 'repository' | 'document' | 'registry-record' => {
  if (record.kind === 'repository' || 'repository_url' in record || 'git_url' in record) {
    return 'repository';
  }
  if (record.kind === 'document' || 'document_type' in record) {
    return 'document';
  }
  return 'registry-record';
};

const validateGovernedObject = (record: JsonRecord, runtime: KernelRuntime): KernelValidationEnvelope => {
  const context = validationContextFor(record, runtime);
  const subject = detectValidationSubject(record);
  const registryRecord = record as unknown as RegistryRecord;

  const result =
    subject === 'repository'
      ? mergeValidationResults(
          runtime.validation.validateRepository(record as unknown as Repository, context),
          context.references.length > 0 ? runtime.validation.validateTraceability(registryRecord, context) : runtime.validation.validateRegistryRecord(registryRecord, context),
        )
      : subject === 'document'
        ? mergeValidationResults(
            runtime.validation.validateDocument(record as unknown as Document, context),
            context.references.length > 0 ? runtime.validation.validateTraceability(registryRecord, context) : runtime.validation.validateRegistryRecord(registryRecord, context),
          )
        : context.references.length > 0
          ? runtime.validation.validateTraceability(registryRecord, context)
          : runtime.validation.validateRegistryRecord(registryRecord, context);

  return {
    ...result,
    subject,
  };
};

const matchRoute = (pattern: string, pathname: string): RouteMatch | undefined => {
  const patternSegments = pattern.split('/').filter(Boolean);
  const pathSegments = pathname.split('/').filter(Boolean);
  if (patternSegments.length !== pathSegments.length) {
    return undefined;
  }

  const params: Record<string, string> = {};
  for (let index = 0; index < patternSegments.length; index += 1) {
    const patternSegment = patternSegments[index];
    const pathSegment = pathSegments[index];
    if (!patternSegment || !pathSegment) {
      return undefined;
    }

    if (patternSegment.startsWith(':')) {
      params[patternSegment.slice(1)] = decodeURIComponent(pathSegment);
      continue;
    }

    if (patternSegment !== pathSegment) {
      return undefined;
    }
  }

  return { params };
};

const routeParam = (match: RouteMatch, key: string): string => match.params[key] ?? '';

const hasContextRuntime = (runtime: KernelRuntime): boolean => runtime.adapters.context !== undefined;
const requireContextRuntime = (runtime: KernelRuntime) =>
  runtime.adapters.context ?? (() => {
    throw errorResponse(404, 'kernel-api.context.not-enabled', 'Context runtime adapter is not installed for this kernel runtime.');
  })();

const contextCapabilities = (runtime: KernelRuntime): KernelContextCapabilitiesResponse => ({
  installed: hasContextRuntime(runtime),
  ...(runtime.adapters.context !== undefined ? { version: runtime.adapters.context.version.version } : {}),
  create: [...contextSubjects],
  validate: [...contextSubjects],
});

const asContextSubject = (value: string): KernelContextRuntimeKind | undefined =>
  contextSubjects.find((candidate) => candidate === value);

const createContextValue = (
  runtime: KernelRuntime,
  subject: KernelContextRuntimeKind,
  payload: JsonRecord,
): unknown => {
  const adapter = requireContextRuntime(runtime);
  switch (subject) {
    case 'context-reference':
      return adapter.createReference(payload as unknown as KernelContextReferenceInput);
    case 'confidence':
      return adapter.createConfidence(payload as unknown as KernelConfidenceInput);
    case 'freshness':
      return adapter.createFreshness(payload as unknown as KernelFreshnessInput);
    case 'provenance':
      return adapter.createProvenance(payload as unknown as KernelProvenanceInput);
    case 'context-record':
      return adapter.createRecord(payload as unknown as KernelContextRecordInput);
    case 'context-snapshot':
      return adapter.createSnapshot(payload as unknown as KernelContextSnapshotInput);
  }
};

const validateContextValue = (
  runtime: KernelRuntime,
  subject: KernelContextRuntimeKind,
  payload: JsonRecord,
): KernelContextValidationEnvelope => {
  const adapter = requireContextRuntime(runtime);
  switch (subject) {
    case 'context-reference':
      return adapter.validateReference(payload as unknown as KernelContextReferenceInput);
    case 'confidence':
      return adapter.validateConfidence(payload as unknown as KernelConfidenceInput);
    case 'freshness':
      return adapter.validateFreshness(payload as unknown as KernelFreshnessInput);
    case 'provenance':
      return adapter.validateProvenance(payload as unknown as KernelProvenanceInput);
    case 'context-record':
      return adapter.validateRecord(payload as unknown as KernelContextRecordInput);
    case 'context-snapshot':
      return adapter.validateSnapshot(payload as unknown as KernelContextSnapshotInput);
  }
};

const routeHealth = (_runtime: KernelRuntime, bootstrap: KernelApiBootstrapStatus, bootstrapHealth: KernelHealthCheckResult): KernelHealthResponse => ({
  runtime: bootstrapHealth,
  bootstrap,
  constitutional_seed: {
    status: bootstrapHealth.constitutionalArtifacts.length === expectedConstitutionalArtifacts.length && bootstrapHealth.healthy ? 'seeded' : 'unhealthy',
    expected: [...expectedConstitutionalArtifacts],
    discovered: [...bootstrapHealth.constitutionalArtifacts],
    issues: bootstrapHealth.checks.filter((check) => check.name === 'constitutional-artifacts' && !check.healthy).map((check) => check.message),
  },
  dependency_wiring: {
    status: bootstrapHealth.issues.length === 0 ? 'healthy' : 'unhealthy',
    checks: bootstrapHealth.checks.filter((check) => check.name !== 'constitutional-artifacts'),
    issues: bootstrapHealth.issues,
  },
});

const taxonomyResponse = (runtime: KernelRuntime): KernelTaxonomyResponse => ({
  object_types: runtime.taxonomy.listObjectTypes(),
  identifier_prefixes: runtime.taxonomy.listIdentifierPrefixes(),
  lifecycle: runtime.taxonomy.listLifecycleStates(),
  events: runtime.taxonomy.listEventTypes(),
  relationships: runtime.taxonomy.listRelationshipTypes(),
});

const objectiveCreateInput = (value: JsonRecord): ObjectiveCreateInput => {
  const input: ObjectiveCreateInput = {
    display_name: value.display_name as string,
    description: value.description as string,
    owner: value.owner as string,
  };

  if (typeof value.key === 'string') {
    input.key = value.key;
  }
  if (typeof value.status === 'string') {
    input.status = value.status as NonNullable<ObjectiveCreateInput['status']>;
  }
  if (typeof value.version === 'string') {
    input.version = value.version;
  }
  if (typeof value.lifecycle_state === 'string') {
    input.lifecycle_state = value.lifecycle_state as NonNullable<ObjectiveCreateInput['lifecycle_state']>;
  }
  if (Array.isArray(value.dependencies)) {
    input.dependencies = value.dependencies.filter((entry): entry is string => typeof entry === 'string');
  }
  if (Array.isArray(value.references)) {
    input.references = value.references.filter(
      (entry): entry is NonNullable<ObjectiveCreateInput['references']>[number] =>
        isObject(entry) && typeof entry.kind === 'string' && typeof entry.id === 'string',
    );
  }

  return input;
};

const objectiveUpdateInput = (value: JsonRecord): ObjectiveUpdateInput => {
  const input: ObjectiveUpdateInput = {};

  if (typeof value.key === 'string') {
    input.key = value.key;
  }
  if (typeof value.display_name === 'string') {
    input.display_name = value.display_name;
  }
  if (typeof value.description === 'string') {
    input.description = value.description;
  }
  if (typeof value.owner === 'string') {
    input.owner = value.owner;
  }
  if (typeof value.status === 'string') {
    input.status = value.status as NonNullable<ObjectiveUpdateInput['status']>;
  }
  if (typeof value.version === 'string') {
    input.version = value.version;
  }
  if (Array.isArray(value.dependencies)) {
    input.dependencies = value.dependencies.filter((entry): entry is string => typeof entry === 'string');
  }
  if (Array.isArray(value.references)) {
    input.references = value.references.filter(
      (entry): entry is NonNullable<ObjectiveUpdateInput['references']>[number] =>
        isObject(entry) && typeof entry.kind === 'string' && typeof entry.id === 'string',
    );
  }

  return input;
};

const normalizeError = (error: unknown): KernelApiResponse => {
  if (isKernelApiResponse(error)) {
    return error;
  }
  if (error instanceof RegistryError) {
    return errorResponse(400, 'kernel-api.validation.failed', error.message, error.issues);
  }
  if (isContextRuntimeError(error)) {
    return errorResponse(400, 'kernel-api.context.invalid', error.message, error.issues);
  }
  if (error instanceof Error) {
    return errorResponse(500, 'kernel-api.internal-error', error.message);
  }
  return errorResponse(500, 'kernel-api.internal-error', 'Unknown kernel API failure.');
};

const isKernelApiResponse = (value: unknown): value is KernelApiResponse => {
  return (
    isObject(value) &&
    typeof value.status === 'number' &&
    isObject(value.body) &&
    ('data' in value.body || 'error' in value.body)
  );
};

const isContextRuntimeError = (value: unknown): value is { message: string; issues: ValidationIssue[] } => {
  return (
    isObject(value) &&
    typeof value.message === 'string' &&
    Array.isArray(value.issues) &&
    value.issues.every((issue) => isObject(issue) && typeof issue.code === 'string' && typeof issue.path === 'string')
  );
};

class KernelApiRuntime implements KernelApiApplication {
  readonly runtime: KernelRuntime;
  readonly bootstrap: KernelApiBootstrapStatus;
  readonly bootstrapHealth: KernelHealthCheckResult;

  constructor(config: KernelApiConfig = {}) {
    let runtime: KernelRuntime;
    try {
      runtime = createKernel(config.kernelConfig ?? {});
    } catch (error) {
      if (error instanceof KernelBootstrapError) {
        throw new KernelApiBootstrapError(error.message);
      }
      throw error;
    }

    this.runtime = runtime;
    this.bootstrapHealth = runtime.healthCheck();
    this.bootstrap = {
      status: 'ready',
      bootstrapped_at: new Date().toISOString(),
      healthy: this.bootstrapHealth.healthy,
      issues: [...this.bootstrapHealth.issues],
    };
  }

  async dispatch(method: string, url: string, body?: string): Promise<KernelApiResponse> {
    const target = new URL(url, 'http://kernel.local');
    const pathname = target.pathname;

    try {
      if (method === 'GET' && pathname === '/kernel/health') {
        return response(200, routeHealth(this.runtime, this.bootstrap, this.bootstrapHealth));
      }

      if (method === 'GET' && pathname === '/kernel/registry') {
        const kind = target.searchParams.getAll('kind');
        const status = target.searchParams.getAll('status');
        return response(
          200,
          this.runtime.registry.find({
            ...(kind.length === 1 ? { kind: kind[0] as never } : kind.length > 1 ? { kind: kind as never } : {}),
            ...(status.length === 1 ? { status: status[0] as never } : status.length > 1 ? { status: status as never } : {}),
            ...(target.searchParams.get('owner') ? { owner: target.searchParams.get('owner') as string } : {}),
            ...(target.searchParams.get('key') ? { key: target.searchParams.get('key') as string } : {}),
            ...(target.searchParams.get('text') ? { text: target.searchParams.get('text') as string } : {}),
            ...(target.searchParams.get('lifecycle_state') ? { lifecycle_state: target.searchParams.get('lifecycle_state') as string } : {}),
          }),
        );
      }

      const registryMatch = matchRoute('/kernel/registry/:id', pathname);
      if (method === 'GET' && registryMatch) {
        const recordId = routeParam(registryMatch, 'id');
        const record = this.runtime.registry.lookup('registry-record', recordId);
        return record ? response(200, record) : errorResponse(404, 'kernel-api.registry.not-found', `Unknown registry record: ${recordId}`);
      }

      if (method === 'GET' && pathname === '/kernel/taxonomy') {
        return response(200, taxonomyResponse(this.runtime));
      }
      if (method === 'GET' && pathname === '/kernel/taxonomy/object-types') {
        return response(200, this.runtime.taxonomy.listObjectTypes());
      }
      if (method === 'GET' && pathname === '/kernel/taxonomy/lifecycle') {
        return response(200, this.runtime.taxonomy.listLifecycleStates());
      }
      if (method === 'GET' && pathname === '/kernel/taxonomy/events') {
        return response(200, taxonomyResponse(this.runtime).events);
      }
      if (method === 'GET' && pathname === '/kernel/taxonomy/relationships') {
        return response(200, taxonomyResponse(this.runtime).relationships);
      }

      if (method === 'GET' && pathname === '/kernel/documents') {
        return response(200, this.runtime.documents.listDocuments());
      }
      const documentMatch = matchRoute('/kernel/documents/:id', pathname);
      if (method === 'GET' && documentMatch) {
        const documentId = routeParam(documentMatch, 'id');
        const document = this.runtime.documents.retrieveDocument(documentId);
        return document ? response(200, document) : errorResponse(404, 'kernel-api.documents.not-found', `Unknown document: ${documentId}`);
      }

      if (method === 'GET' && pathname === '/kernel/objectives') {
        return response(200, this.runtime.objectives.listObjectives());
      }
      const objectiveMatch = matchRoute('/kernel/objectives/:id', pathname);
      if (method === 'GET' && objectiveMatch) {
        const objectiveId = routeParam(objectiveMatch, 'id');
        const objective = this.runtime.objectives.retrieveObjective(objectiveId);
        return objective ? response(200, objective) : errorResponse(404, 'kernel-api.objectives.not-found', `Unknown objective: ${objectiveId}`);
      }
      if (method === 'POST' && pathname === '/kernel/objectives') {
        const parsed = parseJsonBody(body);
        if (!parsed.ok) {
          return parsed.response;
        }
        if (!isObject(parsed.value)) {
          return errorResponse(400, 'kernel-api.request.invalid-body', 'Request body must be a JSON object.');
        }
        return response(201, this.runtime.objectives.createObjective(objectiveCreateInput(parsed.value)));
      }
      if (method === 'PATCH' && objectiveMatch) {
        const objectiveId = routeParam(objectiveMatch, 'id');
        const parsed = parseJsonBody(body);
        if (!parsed.ok) {
          return parsed.response;
        }
        if (!isObject(parsed.value)) {
          return errorResponse(400, 'kernel-api.request.invalid-body', 'Request body must be a JSON object.');
        }
        return response(200, this.runtime.objectives.updateObjective(objectiveId, objectiveUpdateInput(parsed.value)));
      }

      if (method === 'GET' && pathname === '/kernel/repositories') {
        return response(200, this.runtime.repositories.list());
      }
      const repositoryMatch = matchRoute('/kernel/repositories/:id', pathname);
      if (method === 'GET' && repositoryMatch) {
        const repositoryId = routeParam(repositoryMatch, 'id');
        const repository = this.runtime.repositories.lookup(repositoryId);
        return repository ? response(200, repository) : errorResponse(404, 'kernel-api.repositories.not-found', `Unknown repository: ${repositoryId}`);
      }

      if (method === 'POST' && pathname === '/kernel/validation') {
        const parsed = parseJsonBody(body);
        if (!parsed.ok) {
          return parsed.response;
        }
        if (!isObject(parsed.value)) {
          return errorResponse(400, 'kernel-api.request.invalid-body', 'Request body must be a JSON object.');
        }
        return response(200, validateGovernedObject(parsed.value, this.runtime));
      }

      if (method === 'GET' && pathname === '/kernel/context') {
        return response(200, contextCapabilities(this.runtime));
      }

      const contextCreateMatch = matchRoute('/kernel/context/:subject', pathname);
      if (method === 'POST' && contextCreateMatch) {
        const subject = asContextSubject(routeParam(contextCreateMatch, 'subject'));
        if (!subject) {
          return errorResponse(404, 'kernel-api.route.not-found', `Unknown endpoint: ${method} ${pathname}`);
        }

        const parsed = parseJsonBody(body);
        if (!parsed.ok) {
          return parsed.response;
        }
        if (!isObject(parsed.value)) {
          return errorResponse(400, 'kernel-api.request.invalid-body', 'Request body must be a JSON object.');
        }

        return response(201, createContextValue(this.runtime, subject, parsed.value));
      }

      const contextValidationMatch = matchRoute('/kernel/context/validate/:subject', pathname);
      if (method === 'POST' && contextValidationMatch) {
        const subject = asContextSubject(routeParam(contextValidationMatch, 'subject'));
        if (!subject) {
          return errorResponse(404, 'kernel-api.route.not-found', `Unknown endpoint: ${method} ${pathname}`);
        }

        const parsed = parseJsonBody(body);
        if (!parsed.ok) {
          return parsed.response;
        }
        if (!isObject(parsed.value)) {
          return errorResponse(400, 'kernel-api.request.invalid-body', 'Request body must be a JSON object.');
        }

        return response(200, validateContextValue(this.runtime, subject, parsed.value));
      }

      return errorResponse(404, 'kernel-api.route.not-found', `Unknown endpoint: ${method} ${pathname}`);
    } catch (error) {
      return normalizeError(error);
    }
  }

  async handleNodeRequest(request: IncomingMessage, responseStream: ServerResponse): Promise<void> {
    const body = await readRequestBody(request);
    const result = await this.dispatch(request.method ?? 'GET', request.url ?? '/', body);
    responseStream.statusCode = result.status;
    responseStream.setHeader('content-type', 'application/json; charset=utf-8');
    responseStream.end(JSON.stringify(result.body));
  }

  createHttpServer() {
    return createServer((request, responseStream) => {
      void this.handleNodeRequest(request, responseStream);
    });
  }
}

export const createKernelApi = (config: KernelApiConfig = {}): KernelApiApplication => new KernelApiRuntime(config);

export const createKernelRuntime = (config: KernelRuntimeConfig = {}): KernelRuntime => createKernel(config);
