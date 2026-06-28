import type { Objective, ObjectiveLifecycleState, ValidationReference } from '@host/kernel-types';
import { validationIssueCodes } from '@host/kernel-types';
import { CanonicalIdentifierService, type IdentifierService } from '@host/kernel-identifiers';
import { RegistryError, RegistryService, type RegistryEntry, type RegistryUpdateInput } from '@host/kernel-registry';
import type { ObjectiveCreateInput, ObjectiveRegistry, ObjectiveRegistryOptions, ObjectiveUpdateInput } from './contracts.js';

const objectiveLifecycleOrder: readonly ObjectiveLifecycleState[] = [
  'draft',
  'proposed',
  'approved',
  'planned',
  'active',
  'implemented',
  'validated',
  'closed',
  'archived',
] as const;

const objectiveLifecycleTransitions = new Map<ObjectiveLifecycleState, readonly ObjectiveLifecycleState[]>(
  objectiveLifecycleOrder.map((state, index, states) => [state, states.slice(index + 1, index + 2)] as const),
);

const clone = <T>(value: T): T => structuredClone(value);

const nowIso = (): string => new Date().toISOString();

const uniqueStrings = (values: readonly string[] | null | undefined): string[] => [...new Set(values ?? [])];

const uniqueReferences = (values: readonly ValidationReference[] | null | undefined): ValidationReference[] => {
  const seen = new Set<string>();
  const references: ValidationReference[] = [];
  for (const reference of values ?? []) {
    const key = [reference.kind, reference.id, reference.relation ?? '', reference.required ?? false].join('|');
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    references.push(clone(reference));
  }
  return references;
};

const toObjective = (entry: RegistryEntry): Objective => ({
  id: entry.id,
  key: entry.key,
  display_name: entry.display_name,
  description: entry.description,
  status: entry.status,
  version: entry.version,
  owner: entry.owner,
  created_at: entry.created_at,
  updated_at: entry.updated_at,
  objective_id: entry.id,
  lifecycle_state: (entry.lifecycle_state ?? 'draft') as ObjectiveLifecycleState,
  dependencies: [...(entry.dependencies ?? [])],
  references: uniqueReferences(entry.references),
});

const toRegistryEntry = (
  objective: ObjectiveCreateInput | Objective,
  current?: Objective,
): RegistryEntry => ({
  kind: 'objective',
  id: current?.id ?? (objective as Objective).objective_id ?? objective.key ?? '',
  key: objective.key ?? current?.key ?? (current?.id ?? (objective as Objective).objective_id ?? ''),
  display_name: objective.display_name,
  description: objective.description,
  status: objective.status ?? current?.status ?? 'active',
  version: objective.version ?? current?.version ?? '1.0.0',
  owner: objective.owner,
  created_at: current?.created_at ?? nowIso(),
  updated_at: nowIso(),
  lifecycle_state: objective.lifecycle_state ?? current?.lifecycle_state ?? 'draft',
  dependencies: uniqueStrings(objective.dependencies ?? current?.dependencies),
  references: uniqueReferences(objective.references ?? current?.references),
});

const isTransitionAllowed = (from: ObjectiveLifecycleState, to: ObjectiveLifecycleState): boolean => {
  if (from === to) {
    return true;
  }

  return objectiveLifecycleTransitions.get(from)?.includes(to) ?? false;
};

const transitionIssue = (from: ObjectiveLifecycleState, to: ObjectiveLifecycleState) => ({
  code: validationIssueCodes.validationLifecycleInvalid,
  path: 'lifecycle_state',
  message: `Objective lifecycle transition is not allowed: ${from} -> ${to}`,
  severity: 'error' as const,
  subjectKind: 'objective' as const,
  expected: `allowed transition from ${from}`,
  actual: to,
});

export interface ObjectiveRegistryServiceOptions extends ObjectiveRegistryOptions {
  registry?: RegistryService;
  identifierService?: IdentifierService;
}

export class ObjectiveRegistryService implements ObjectiveRegistry {
  readonly #registry: RegistryService;
  readonly #identifierService: IdentifierService;

  constructor(options: ObjectiveRegistryServiceOptions = {}) {
    this.#registry = options.registry ?? new RegistryService();
    this.#identifierService = options.identifierService ?? new CanonicalIdentifierService({ registry: this.#registry });
  }

  #ensureObjective(record: RegistryEntry): Objective {
    return toObjective(record);
  }

  #commitObjective(objective: ObjectiveCreateInput | Objective, current?: Objective): Objective {
    const record = toRegistryEntry(objective, current);
    const committed = current
      ? this.#registry.update(current.id, {
          kind: 'objective',
          key: record.key,
          display_name: record.display_name,
          description: record.description,
          status: record.status,
          version: record.version,
          owner: record.owner,
          dependencies: uniqueStrings(record.dependencies),
          ...(record.lifecycle_state !== undefined && record.lifecycle_state !== null ? { lifecycle_state: record.lifecycle_state } : {}),
          ...(record.references ? { references: record.references } : {}),
        })
      : this.#registry.register(record);
    return this.#ensureObjective(committed as RegistryEntry);
  }

  create(input: ObjectiveCreateInput): Objective {
    return this.createObjective(input);
  }

  createObjective(input: ObjectiveCreateInput): Objective {
    const identifier = this.#identifierService.generate('objective');
    const objective: Objective = {
      id: identifier.value,
      key: input.key ?? identifier.value,
      display_name: input.display_name,
      description: input.description,
      status: input.status ?? 'active',
      version: input.version ?? '1.0.0',
      owner: input.owner,
      created_at: nowIso(),
      updated_at: nowIso(),
      objective_id: identifier.value,
      lifecycle_state: input.lifecycle_state ?? 'draft',
      dependencies: uniqueStrings(input.dependencies),
      references: uniqueReferences(input.references),
    };

    return this.#commitObjective(objective);
  }

  get(id: string): Objective | undefined {
    return this.retrieveObjective(id);
  }

  retrieveObjective(id: string): Objective | undefined {
    const record = this.#registry.lookup('objective', id);
    return record ? this.#ensureObjective(record as RegistryEntry) : undefined;
  }

  updateObjective(id: string, patch: ObjectiveUpdateInput): Objective {
    const current = this.retrieveObjective(id);
    if (!current) {
      throw new RegistryError(`Unknown objective id: ${id}`);
    }

    const next: Objective = {
      ...current,
      ...patch,
      id: current.id,
      objective_id: current.objective_id,
      lifecycle_state: current.lifecycle_state,
      created_at: current.created_at,
      updated_at: nowIso(),
      dependencies: uniqueStrings(patch.dependencies ?? current.dependencies),
      references: uniqueReferences(patch.references ?? current.references),
    };

    return this.#commitObjective(next, current);
  }

  transition(id: string, nextState: ObjectiveLifecycleState): Objective {
    return this.transitionObjective(id, nextState);
  }

  transitionObjective(id: string, nextState: ObjectiveLifecycleState): Objective {
    const current = this.retrieveObjective(id);
    if (!current) {
      throw new RegistryError(`Unknown objective id: ${id}`);
    }

    if (!isTransitionAllowed(current.lifecycle_state, nextState)) {
      throw new RegistryError(`Objective lifecycle transition rejected: ${current.lifecycle_state} -> ${nextState}`, [transitionIssue(current.lifecycle_state, nextState)]);
    }

    if (current.lifecycle_state === nextState) {
      return current;
    }

    const record = this.#registry.update(current.id, {
      kind: 'objective',
      key: current.key,
      display_name: current.display_name,
      description: current.description,
      status: current.status,
      version: current.version,
      owner: current.owner,
      lifecycle_state: nextState,
      dependencies: [...current.dependencies],
      references: uniqueReferences(current.references),
    });

    return this.#ensureObjective(record as RegistryEntry);
  }

  listObjectives(): Objective[] {
    return this.list();
  }

  lookup(id: string): Objective | undefined {
    return this.retrieveObjective(id);
  }

  list(): Objective[] {
    return this.#registry.find({ kind: 'objective' }).map((record) => this.#ensureObjective(record as RegistryEntry));
  }

  register(objective: Objective): Objective {
    if (objective.objective_id !== objective.id) {
      throw new RegistryError(`Objective id mismatch: ${objective.id} !== ${objective.objective_id}`);
    }

    const current = this.retrieveObjective(objective.id);
    return current ? this.updateObjective(objective.id, objective) : this.#commitObjective(objective);
  }

  update(objective: Objective): Objective {
    const current = this.retrieveObjective(objective.id);
    if (!current) {
      throw new RegistryError(`Unknown objective id: ${objective.id}`);
    }

    const patch: ObjectiveUpdateInput = {
      key: objective.key,
      display_name: objective.display_name,
      description: objective.description,
      owner: objective.owner,
      status: objective.status,
      version: objective.version,
      dependencies: objective.dependencies,
      ...(objective.references ? { references: objective.references } : {}),
    };

    return this.updateObjective(objective.id, patch);
  }
}

export const createObjectiveRegistry = (options: ObjectiveRegistryServiceOptions = {}): ObjectiveRegistry =>
  new ObjectiveRegistryService(options);
