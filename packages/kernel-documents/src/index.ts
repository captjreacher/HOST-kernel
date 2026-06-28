import type { Document } from '@host/kernel-types';

export interface DocumentRegistry {
  register(document: Document): Document;
  update(document: Document): Document;
  lookup(id: string): Document | undefined;
  list(): Document[];
}
