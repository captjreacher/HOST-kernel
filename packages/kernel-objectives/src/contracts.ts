import type { IdentifierService } from '@host/kernel-identifiers';
import type { RegistryService } from '@host/kernel-registry';
import type { Objective, ObjectiveLifecycleState, RegistryRecord, ValidationReference } from '@host/kernel-types';

export type ObjectiveTraceabilityLink = ValidationReference;

export interface ObjectiveCreateInput {
  key?: string;
  display_name: string;
  description: string;
  owner: string;
  status?: RegistryRecord['status'];
  version?: string;
  lifecycle_state?: ObjectiveLifecycleState;
  dependencies?: readonly string[];
  references?: readonly ObjectiveTraceabilityLink[];
}

export interface ObjectiveUpdateInput {
  key?: string;
  display_name?: string;
  description?: string;
  owner?: string;
  status?: RegistryRecord['status'];
  version?: string;
  dependencies?: readonly string[];
  references?: readonly ObjectiveTraceabilityLink[];
}

export interface ObjectiveTransition {
  from: ObjectiveLifecycleState;
  to: ObjectiveLifecycleState;
}

export interface ObjectiveRegistry {
  create(input: ObjectiveCreateInput): Objective;
  createObjective(input: ObjectiveCreateInput): Objective;
  get(id: string): Objective | undefined;
  retrieveObjective(id: string): Objective | undefined;
  updateObjective(id: string, patch: ObjectiveUpdateInput): Objective;
  transition(id: string, nextState: ObjectiveLifecycleState): Objective;
  transitionObjective(id: string, nextState: ObjectiveLifecycleState): Objective;
  listObjectives(): Objective[];
  lookup(id: string): Objective | undefined;
  list(): Objective[];
  register(objective: Objective): Objective;
  update(objective: Objective): Objective;
}

export interface ObjectiveRegistryOptions {
  registry?: RegistryService;
  identifierService?: IdentifierService;
  seedConstitutionalObjectives?: boolean;
}
