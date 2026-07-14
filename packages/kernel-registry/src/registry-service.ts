import type {
  CanonicalIdentifierType,
  Document,
  Identifier,
  IdentifierRegistry,
  RegistryRecord,
  Repository,
  ValidationContext,
  ValidationIssue,
  ValidationLookup,
  ValidationResult,
} from '@host/kernel-types';
import { createValidationEngine, type ValidationEngine, validationIssueCodes } from '@host/kernel-validation';
import type {
  CapabilityRegistration,
  CapabilityRegistrationInput,
  EventRegistration,
  EventRegistrationInput,
  IdentifierAllocationRecord,
  ProductRegistration,
  ProductRegistrationInput,
  ProductUpdateInput,
  RegistryEntry,
  RegistryEntryKind,
  RegistryFindQuery,
  RegistryRegisterInput,
  RegistryUpdateInput,
  RepositoryRegistration,
  RepositoryRegistrationInput,
} from './contracts.js';

export class RegistryError extends Error {
  readonly issues: ValidationIssue[];

  constructor(message: string, issues: ValidationIssue[] = []) {
    super(message);
    this.name = 'RegistryError';
    this.issues = issues;
  }
}

interface RegistryState {
  records: Map<string, RegistryEntry>;
  recordsByKey: Map<string, Set<string>>;
  products: Map<string, ProductRegistration>;
  repositories: Map<string, RepositoryRegistration>;
  capabilities: Map<string, CapabilityRegistration>;
  events: Map<string, EventRegistration>;
  identifiers: Map<string, IdentifierAllocationRecord>;
}

const nowIso = (): string => new Date().toISOString();
const createId = (): string => crypto.randomUUID();
const clone = <T>(value: T): T => structuredClone(value);
const canonicalIdentifierPattern = /^([A-Z]{2,5})-(\d{3})$/;

const sortByKey = <T extends { key: string }>(items: Iterable<T>): T[] => [...items].sort((a, b) => a.key.localeCompare(b.key));
const sortIdentifiers = (items: Iterable<Identifier>): Identifier[] => [...items].sort((a, b) => a.value.localeCompare(b.value));

const severityOrder = (issue: ValidationIssue): number => (issue.severity === 'error' ? 3 : issue.severity === 'warning' ? 2 : 1);

const issueKey = (issue: ValidationIssue): string =>
  [
    issue.code,
    issue.path,
    issue.message,
    issue.severity,
    issue.subjectKind ?? '',
    issue.subjectId ?? '',
    issue.expected ?? '',
    issue.actual ?? '',
  ].join('|');

const mergeIssues = (...issueSets: ValidationIssue[][]): ValidationIssue[] => {
  const merged = new Map<string, ValidationIssue>();
  for (const issue of issueSets.flat()) {
    const key = issueKey(issue);
    const current = merged.get(key);
    if (!current || severityOrder(issue) > severityOrder(current)) {
      merged.set(key, issue);
    }
  }
  return [...merged.values()];
};

const isCanonicalIdentifier = (value: string): boolean => canonicalIdentifierPattern.test(value);
const planningKinds = new Set<RegistryEntryKind>(['roadmap', 'epic', 'initiative', 'sprint', 'milestone', 'release']);
const acceptedObjectiveStates = new Set(['approved', 'planned', 'active', 'implemented', 'validated', 'closed']);

const queryKinds = (kind?: RegistryFindQuery['kind']): RegistryEntryKind[] | undefined => {
  if (!kind) {
    return undefined;
  }

  return Array.isArray(kind) ? ([...(kind as readonly RegistryEntryKind[])] as RegistryEntryKind[]) : [kind as RegistryEntryKind];
};

const queryStatuses = (status?: RegistryFindQuery['status']): RegistryRecord['status'][] | undefined => {
  if (!status) {
    return undefined;
  }

  return Array.isArray(status) ? ([...(status as readonly RegistryRecord['status'][])] as RegistryRecord['status'][]) : [status as RegistryRecord['status']];
};

const recordText = (record: RegistryEntry): string =>
  [
    record.key,
    record.display_name,
    record.description,
    record.kind,
    record.owner,
    record.status,
    record.version,
    record.lifecycle_state ?? '',
    record.owning_objective ?? '',
    record.owning_product ?? '',
    record.document_type ?? '',
    record.event_name ?? '',
    record.repository_url ?? record.git_url ?? '',
    JSON.stringify(record.metadata ?? {}),
  ]
    .join(' ')
    .toLowerCase();

const firstKnownRecordId = (ids: Set<string>, records: Map<string, RegistryEntry>): string | undefined => {
  for (const id of ids) {
    if (records.has(id)) {
      return id;
    }
  }

  return undefined;
};

const toRegistryEntry = (entry: RegistryRegisterInput | RegistryUpdateInput, fallback?: RegistryEntry): RegistryEntry => {
  const base = fallback ?? ({} as RegistryEntry);
  const kind = (entry.kind ?? base.kind) as RegistryEntryKind;
  return {
    ...base,
    ...entry,
    kind,
    id: entry.id ?? base.id ?? createId(),
    key: entry.key ?? base.key ?? entry.id ?? base.id ?? createId(),
    display_name: entry.display_name ?? base.display_name ?? '',
    description: entry.description ?? base.description ?? '',
    status: entry.status ?? base.status ?? 'active',
    version: entry.version ?? base.version ?? '0.1.0',
    owner: entry.owner ?? base.owner ?? '',
    created_at: base.created_at ?? nowIso(),
    updated_at: nowIso(),
  };
};

export interface RegistryServiceOptions {
  validationEngine?: ValidationEngine;
  seed?: Partial<RegistryState>;
}

export class RegistryService implements IdentifierRegistry, ValidationLookup {
  #state: RegistryState;
  readonly #validationEngine: ValidationEngine;

  constructor(options: RegistryServiceOptions = {}) {
    this.#validationEngine = options.validationEngine ?? createValidationEngine();
    this.#state = {
      records: options.seed?.records ?? new Map(),
      recordsByKey: options.seed?.recordsByKey ?? new Map(),
      products: options.seed?.products ?? new Map(),
      repositories: options.seed?.repositories ?? new Map(),
      capabilities: options.seed?.capabilities ?? new Map(),
      events: options.seed?.events ?? new Map(),
      identifiers: options.seed?.identifiers ?? new Map(),
    };
  }

  #recordValidationContext(record: RegistryEntry): ValidationContext {
    return {
      subjectKind: record.kind as ValidationContext['subjectKind'],
      subjectId: record.id,
      lookup: this,
      references: record.references ?? [],
      expectedStatus: record.status,
      expectedLifecycleState: record.lifecycle_state ?? undefined,
      expectedOwner: record.owner,
      source: 'registry-service',
    };
  }

  #recordIssues(record: RegistryEntry): ValidationIssue[] {
    const context = this.#recordValidationContext(record);
    const legacyRepository = record.kind === 'repository' && record.owning_product !== undefined && !record.owning_objective;
    const issues = [
      this.#validationEngine.validateRegistryRecord(record, context).issues,
      record.lifecycle_state ? this.#validationEngine.validateLifecycleState(record.lifecycle_state, context).issues : [],
      record.references?.length ? this.#validationEngine.validateTraceability(record, context).issues : [],
    ];

    if (record.kind === 'repository' && !legacyRepository) {
      issues.push(this.#validationEngine.validateRepository(record as Repository, context).issues);
    }

    if (record.kind === 'document') {
      issues.push(this.#validationEngine.validateDocument(record as unknown as Document, context).issues);
    }

    if (record.owning_objective) {
      issues.push(this.#validationEngine.validateIdentifier(record.owning_objective, {
        subjectKind: 'objective',
        subjectId: record.owning_objective,
        lookup: this,
        source: 'registry-service',
      }).issues);
    }

    if (record.kind === 'adr' || planningKinds.has(record.kind)) {
      if (!record.owning_objective) {
        issues.push([{
          code: validationIssueCodes.validationRegistryRecordFieldMissing,
          path: 'owning_objective',
          message: `${record.kind} records require an allocated governing objective.`,
          severity: 'error',
          subjectKind: record.kind as ValidationContext['subjectKind'],
          subjectId: record.id,
          expected: 'allocated OBJ-###',
        }]);
      } else {
        const objective = this.lookup('objective', record.owning_objective) as RegistryEntry | undefined;
        if (!objective) {
          issues.push([{
            code: validationIssueCodes.validationTraceabilityLinkBroken,
            path: 'owning_objective',
            message: `Governing objective is not allocated: ${record.owning_objective}`,
            severity: 'error',
            subjectKind: record.kind as ValidationContext['subjectKind'],
            subjectId: record.id,
            expected: 'allocated objective record',
            actual: record.owning_objective,
          }]);
        } else if (objective.lifecycle_state === 'archived') {
          issues.push([{
            code: validationIssueCodes.validationTraceabilityLinkBroken,
            path: 'owning_objective',
            message: `Governing objective is archived: ${record.owning_objective}`,
            severity: 'error',
            subjectKind: record.kind as ValidationContext['subjectKind'],
            subjectId: record.id,
            expected: 'non-archived objective',
            actual: 'archived',
          }]);
        } else if (planningKinds.has(record.kind) && !acceptedObjectiveStates.has(objective.lifecycle_state ?? '')) {
          issues.push([{
            code: validationIssueCodes.validationTraceabilityLinkBroken,
            path: 'owning_objective',
            message: `Planning records require an approved governing objective: ${record.owning_objective}`,
            severity: 'error',
            subjectKind: record.kind as ValidationContext['subjectKind'],
            subjectId: record.id,
            expected: 'approved objective',
            actual: objective.lifecycle_state ?? 'unknown',
          }]);
        }
      }
    }

    return mergeIssues(...issues);
  }

  #throwIfInvalid(record: RegistryEntry, issues: ValidationIssue[]): void {
    if (issues.length > 0) {
      throw new RegistryError(`Registry record rejected: ${record.kind}/${record.key}`, issues);
    }
  }

  #storeRecord(record: RegistryEntry): RegistryEntry {
    this.#state.records.set(record.id, clone(record));
    const ids = this.#state.recordsByKey.get(record.key) ?? new Set<string>();
    ids.add(record.id);
    this.#state.recordsByKey.set(record.key, ids);
    return clone(record);
  }

  #detachRecord(record: RegistryEntry): void {
    const ids = this.#state.recordsByKey.get(record.key);
    if (!ids) {
      return;
    }

    ids.delete(record.id);
    if (ids.size === 0) {
      this.#state.recordsByKey.delete(record.key);
    }
  }

  #syncLegacyStores(record: RegistryEntry): void {
    switch (record.kind) {
      case 'product':
        this.#state.products.set(record.key, clone(record as ProductRegistration));
        break;
      case 'repository':
        this.#state.repositories.set(record.key, clone(record as RepositoryRegistration));
        break;
      case 'capability':
        this.#state.capabilities.set(record.key, clone(record as CapabilityRegistration));
        break;
      case 'event':
        this.#state.events.set(record.key, clone(record as EventRegistration));
        break;
      default:
        break;
    }
  }

  #removeLegacyStore(record: RegistryEntry): void {
    switch (record.kind) {
      case 'product':
        this.#state.products.delete(record.key);
        break;
      case 'repository':
        this.#state.repositories.delete(record.key);
        break;
      case 'capability':
        this.#state.capabilities.delete(record.key);
        break;
      case 'event':
        this.#state.events.delete(record.key);
        break;
      default:
        break;
    }
  }

  #checkDuplicate(record: RegistryEntry, currentId?: string): ValidationIssue[] {
    const issues: ValidationIssue[] = [];
    const existingById = this.#state.records.get(record.id);
    const existingByKey = this.#state.recordsByKey.get(record.key);

    if (existingById && existingById.id !== currentId) {
      issues.push({
        code: validationIssueCodes.validationRegistryRecordInvalid,
        path: 'id',
        message: `Duplicate registry id: ${record.id}`,
        severity: 'error',
        subjectKind: record.kind as ValidationContext['subjectKind'],
        subjectId: record.id,
        actual: record.id,
      });
    }

    if (existingByKey) {
      for (const existingId of existingByKey) {
        const existing = this.#state.records.get(existingId);
        if (existing && existing.kind === record.kind && existingId !== currentId) {
          issues.push({
            code: validationIssueCodes.validationRegistryRecordInvalid,
            path: 'key',
            message: `Duplicate registry key: ${record.key}`,
            severity: 'error',
            subjectKind: record.kind as ValidationContext['subjectKind'],
            subjectId: record.id,
            actual: record.key,
          });
          break;
        }
      }
    }

    return issues;
  }

  register(entry: RegistryRegisterInput): RegistryEntry {
    const record = toRegistryEntry(entry);
    const validationIssues = this.#recordIssues(record);
    const duplicateIssues = this.#checkDuplicate(record);
    const issues = mergeIssues(validationIssues, duplicateIssues);
    this.#throwIfInvalid(record, issues);
    this.#syncLegacyStores(record);
    return this.#storeRecord(record);
  }

  update(entry: RegistryUpdateInput & { id: string }): RegistryEntry;
  update(id: string, patch: RegistryUpdateInput): RegistryEntry;
  update(entryOrId: (RegistryUpdateInput & { id: string }) | string, patch?: RegistryUpdateInput): RegistryEntry {
    const currentId = typeof entryOrId === 'string' ? entryOrId : entryOrId.id;
    const current = this.#state.records.get(currentId);
    if (!current) {
      throw new RegistryError(`Unknown registry id: ${currentId}`);
    }

    const next = toRegistryEntry(typeof entryOrId === 'string' ? { ...patch, id: currentId } : entryOrId, current);
    if (next.kind !== current.kind) {
      throw new RegistryError(`Registry kind cannot change during update: ${current.kind} -> ${next.kind}`);
    }

    const validationIssues = this.#recordIssues(next);
    const duplicateIssues = this.#checkDuplicate(next, currentId);
    const issues = mergeIssues(validationIssues, duplicateIssues);
    this.#throwIfInvalid(next, issues);

    this.#removeLegacyStore(current);
    this.#detachRecord(current);
    this.#syncLegacyStores(next);
    this.#state.records.set(currentId, clone(next));
    const ids = this.#state.recordsByKey.get(next.key) ?? new Set<string>();
    ids.add(currentId);
    this.#state.recordsByKey.set(next.key, ids);
    return clone(next);
  }

  lookup(id: string): Identifier | RegistryEntry | undefined;
  lookup(kind: RegistryEntryKind | 'registry-record', id: string): RegistryEntry | undefined;
  lookup(first: string, second?: string): Identifier | RegistryEntry | undefined {
    if (second) {
      const record = this.#state.records.get(second);
      if (!record) {
        return undefined;
      }

      if (first === 'registry-record' || record.kind === first) {
        return clone(record);
      }

      return undefined;
    }

    if (isCanonicalIdentifier(first)) {
      const identifier = this.lookupIdentifier(first);
      if (identifier) {
        return identifier;
      }
    }

    const record = this.#state.records.get(first);
    if (record) {
      return clone(record);
    }

    const keyedIds = this.#state.recordsByKey.get(first);
    const keyedRecordId = keyedIds ? firstKnownRecordId(keyedIds, this.#state.records) : undefined;
    const keyedRecord = keyedRecordId ? this.#state.records.get(keyedRecordId) : undefined;
    if (keyedRecord) {
      return clone(keyedRecord);
    }

    return this.lookupIdentifier(first);
  }

  exists(identifier: string): boolean {
    return this.#state.identifiers.has(identifier) || this.#state.records.has(identifier) || this.#state.recordsByKey.has(identifier);
  }

  find(query: RegistryFindQuery = {}): RegistryEntry[] {
    const kinds = queryKinds(query.kind);
    const statuses = queryStatuses(query.status);
    const text = query.text?.trim().toLowerCase();

    return sortByKey(this.#state.records.values()).filter((record) => {
      if (kinds && !kinds.includes(record.kind)) {
        return false;
      }
      if (statuses && !statuses.includes(record.status)) {
        return false;
      }
      if (query.owner && record.owner !== query.owner) {
        return false;
      }
      if (query.key && record.key !== query.key) {
        return false;
      }
      if (query.lifecycle_state && record.lifecycle_state !== query.lifecycle_state) {
        return false;
      }
      if (text && !recordText(record).includes(text)) {
        return false;
      }
      return true;
    }).map(clone);
  }

  list(type?: CanonicalIdentifierType): Identifier[] | RegistryEntry[] {
    if (type) {
      return this.listIdentifiers(type);
    }

    return this.find();
  }

  reserve(identifier: Identifier): boolean {
    return this.reserveIdentifier(identifier);
  }

  release(identifier: string): void {
    this.#state.identifiers.delete(identifier);
  }

  lookupIdentifier(identifier: string): Identifier | undefined {
    const record = this.#state.identifiers.get(identifier);
    return record ? clone(record.identifier) : undefined;
  }

  listIdentifiers(type?: CanonicalIdentifierType): Identifier[] {
    const identifiers = [...this.#state.identifiers.values()].map((record) => record.identifier);
    const filtered = type ? identifiers.filter((identifier) => identifier.type === type) : identifiers;
    return sortIdentifiers(filtered).map(clone);
  }

  reserveIdentifier(identifier: Identifier): boolean {
    if (this.exists(identifier.value)) {
      return false;
    }

    this.#state.identifiers.set(identifier.value, {
      identifier: clone(identifier),
      allocated_at: nowIso(),
    });
    return true;
  }

  lookupRecord(kind: RegistryEntryKind, id: string): RegistryEntry | undefined {
    return this.lookup(kind, id) as RegistryEntry | undefined;
  }

  validateDuplicateKey(collection: Map<string, { key: string }>, key: string): void {
    if (collection.has(key)) {
      throw new RegistryError(`Duplicate registry key: ${key}`);
    }
  }

  validateDependencyReferences(dependencies: string[]): void {
    for (const dependency of dependencies) {
      if (!this.#state.capabilities.has(dependency)) {
        throw new RegistryError(`Unknown capability dependency: ${dependency}`);
      }
    }
  }

  registerProduct(input: ProductRegistrationInput): ProductRegistration {
    this.validateDuplicateKey(this.#state.products, input.key);
    const timestamp = nowIso();
    const product: ProductRegistration = {
      ...input,
      registered_capabilities: input.registered_capabilities ?? [],
      id: createId(),
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.register({
      ...product,
      kind: 'product',
      metadata: {
        integration_status: product.integration_status,
        registered_capabilities: product.registered_capabilities,
      },
    });
    this.#state.products.set(product.key, clone(product));
    return clone(product);
  }

  updateProduct(key: string, input: ProductUpdateInput): ProductRegistration {
    const current = this.#state.products.get(key);
    if (!current) {
      throw new RegistryError(`Unknown product key: ${key}`);
    }

    const updated: ProductRegistration = {
      ...current,
      ...input,
      registered_capabilities: input.registered_capabilities ?? current.registered_capabilities,
      updated_at: nowIso(),
    };
    this.update({
      ...updated,
      kind: 'product',
      metadata: {
        integration_status: updated.integration_status,
        registered_capabilities: updated.registered_capabilities,
      },
    });
    this.#state.products.set(key, clone(updated));
    return clone(updated);
  }

  getProductByKey(key: string): ProductRegistration | undefined {
    const product = this.#state.products.get(key);
    return product ? clone(product) : undefined;
  }

  listProducts(): ProductRegistration[] {
    return sortByKey(this.#state.products.values()).map(clone);
  }

  registerRepository(input: RepositoryRegistrationInput): RepositoryRegistration {
    this.validateDuplicateKey(this.#state.repositories, input.key);
    if (input.owning_product !== null && !this.#state.products.has(input.owning_product)) {
      throw new RegistryError(`Unknown owning product: ${input.owning_product}`);
    }

    const timestamp = nowIso();
    const repository: RepositoryRegistration = {
      ...input,
      id: createId(),
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.register({
      ...repository,
      kind: 'repository',
      git_url: repository.git_url,
      repository_url: repository.git_url,
      owning_product: repository.owning_product,
    });
    this.#state.repositories.set(repository.key, clone(repository));
    return clone(repository);
  }

  registerCapability(input: CapabilityRegistrationInput): CapabilityRegistration {
    this.validateDuplicateKey(this.#state.capabilities, input.key);
    if (input.owning_product !== null && !this.#state.products.has(input.owning_product)) {
      throw new RegistryError(`Unknown owning product: ${input.owning_product}`);
    }
    this.validateDependencyReferences(input.dependencies);

    const timestamp = nowIso();
    const capability: CapabilityRegistration = {
      ...input,
      id: createId(),
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.register({
      ...capability,
      kind: 'capability',
      owning_product: capability.owning_product,
      dependencies: capability.dependencies,
    });
    this.#state.capabilities.set(capability.key, clone(capability));

    const product = input.owning_product ? this.#state.products.get(input.owning_product) : undefined;
    if (product) {
      const registered_capabilities = new Set(product.registered_capabilities);
      registered_capabilities.add(capability.key);
      this.#state.products.set(product.key, {
        ...product,
        registered_capabilities: [...registered_capabilities],
        updated_at: timestamp,
      });
    }

    return clone(capability);
  }

  registerEventContract(input: EventRegistrationInput): EventRegistration {
    this.validateDuplicateKey(this.#state.events, input.key);
    if (!this.#state.products.has(input.producer)) {
      throw new RegistryError(`Unknown producer: ${input.producer}`);
    }

    const timestamp = nowIso();
    const event: EventRegistration = {
      ...input,
      id: createId(),
      created_at: timestamp,
      updated_at: timestamp,
    };
    this.register({
      ...event,
      kind: 'event',
      producer: event.producer,
      consumers: event.consumers,
      schema_version: event.schema_version,
      payload_schema: event.payload_schema,
    });
    this.#state.events.set(event.key, clone(event));
    return clone(event);
  }

  lookupIdentifierByKey(key: string): Identifier | undefined {
    const record = this.#state.identifiers.get(key);
    return record ? clone(record.identifier) : undefined;
  }
}
