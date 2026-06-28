import type { Objective } from '@host/kernel-types';

export interface ObjectiveRegistry {
  register(objective: Objective): Objective;
  update(objective: Objective): Objective;
  lookup(id: string): Objective | undefined;
  list(): Objective[];
}
