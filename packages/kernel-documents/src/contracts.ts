import type { RegistryService } from '@host/kernel-registry';
import type { Document, RegistryStatus } from '@host/kernel-types';

export interface DocumentCreateInput extends Omit<Document, 'created_at' | 'updated_at'> {}

export interface DocumentUpdateInput extends Partial<Omit<Document, 'created_at' | 'updated_at'>> {}

export interface DocumentRegistry {
  registerDocument(document: DocumentCreateInput): Document;
  retrieveDocument(id: string): Document | undefined;
  updateDocument(id: string, patch: DocumentUpdateInput): Document;
  discoverConstitutionalArtifacts(): Document[];
  lookup(id: string): Document | undefined;
  list(): Document[];
  register(document: DocumentCreateInput): Document;
  update(document: Document): Document;
  listDocuments(): Document[];
}

export interface DocumentRegistryOptions {
  registry?: RegistryService;
  seedConstitutionalArtifacts?: boolean;
}

export interface ConstitutionalDocumentSeed extends DocumentCreateInput {
  readonly status: RegistryStatus;
}
