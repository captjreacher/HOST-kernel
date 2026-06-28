import type { Repository } from '@host/kernel-types';

export interface RepositoryRegistry {
  register(repository: Repository): Repository;
  update(repository: Repository): Repository;
  lookup(id: string): Repository | undefined;
  list(): Repository[];
}
