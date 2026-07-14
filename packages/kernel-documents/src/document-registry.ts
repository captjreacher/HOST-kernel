import type { Document, ValidationReference } from '@host/kernel-types';
import { RegistryError, RegistryService, type RegistryEntry, type RegistryRegisterInput, type RegistryUpdateInput } from '@host/kernel-registry';
import type { ConstitutionalDocumentSeed, DocumentCreateInput, DocumentRegistry, DocumentRegistryOptions, DocumentUpdateInput } from './contracts.js';

const clone = <T>(value: T): T => structuredClone(value);
const nowIso = (): string => new Date().toISOString();
const uniqueStrings = (values: readonly string[] | null | undefined): string[] => [...new Set(values ?? [])];

const toDocumentReferences = (document: Pick<Document, 'lineage' | 'relationships'>): ValidationReference[] => [
  ...uniqueStrings(document.lineage).map<ValidationReference>((id) => ({
    kind: 'document',
    id,
    relation: 'lineage',
  })),
  ...uniqueStrings(document.relationships).map<ValidationReference>((id) => ({
    kind: 'document',
    id,
    relation: 'related-document',
  })),
];

const readDocumentLinks = (metadata: RegistryEntry['metadata']): Pick<Document, 'lineage' | 'relationships'> => {
  const lineage = Array.isArray(metadata?.lineage) ? metadata.lineage.filter((value): value is string => typeof value === 'string') : [];
  const relationships = Array.isArray(metadata?.relationships)
    ? metadata.relationships.filter((value): value is string => typeof value === 'string')
    : [];

  return {
    lineage: uniqueStrings(lineage),
    relationships: uniqueStrings(relationships),
  };
};

const toDocument = (entry: RegistryEntry): Document => ({
  id: entry.id,
  key: entry.key,
  display_name: entry.display_name,
  description: entry.description,
  status: entry.status,
  version: entry.version,
  owner: entry.owner,
  created_at: entry.created_at,
  updated_at: entry.updated_at,
  document_type: entry.document_type ?? 'document',
  owner_objective: ((entry as RegistryEntry & { owner_objective?: string | null }).owner_objective ?? null),
  ...readDocumentLinks(entry.metadata),
});

const toRegistryRegisterInput = (
  document: DocumentCreateInput | Document,
): RegistryRegisterInput & { owner_objective?: string | null } => ({
  kind: 'document',
  id: document.id,
  key: document.key,
  display_name: document.display_name,
  description: document.description,
  status: document.status,
  version: document.version,
  owner: document.owner,
  document_type: document.document_type,
  owner_objective: document.owner_objective ?? null,
  references: toDocumentReferences(document),
  metadata: {
    lineage: uniqueStrings(document.lineage),
    relationships: uniqueStrings(document.relationships),
  },
});

const toRegistryUpdateInput = (
  document: DocumentCreateInput | Document,
): RegistryUpdateInput & { owner_objective?: string | null } => ({
  kind: 'document',
  id: document.id,
  key: document.key,
  display_name: document.display_name,
  description: document.description,
  status: document.status,
  version: document.version,
  owner: document.owner,
  document_type: document.document_type,
  owner_objective: document.owner_objective ?? null,
  references: toDocumentReferences(document),
  metadata: {
    lineage: uniqueStrings(document.lineage),
    relationships: uniqueStrings(document.relationships),
  },
});

const constitutionalDocumentSeeds: readonly ConstitutionalDocumentSeed[] = [
  {
    id: 'OBJ-000',
    key: 'OBJ-000',
    display_name: 'Ecosystem Constitution',
    description: 'Canonical constitutional entry point for HOST governance.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'constitution',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'OBJ-001',
    key: 'OBJ-001',
    display_name: 'Ecosystem Taxonomy Registry',
    description: 'Canonical taxonomy and numbering registry.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'taxonomy',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'OBJ-002',
    key: 'OBJ-002',
    display_name: 'HOST Kernel Operating Model',
    description: 'Canonical operating model for the HOST kernel.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'operating-model',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'OBJ-003',
    key: 'OBJ-003',
    display_name: 'Registry Service Specification',
    description: 'Canonical technical specification for the Registry Service.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'registry-specification',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'OBJ-004',
    key: 'OBJ-004',
    display_name: 'Context Domain Model',
    description: 'Canonical CONTEXT domain model specification.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'context-model',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'OBJ-005',
    key: 'OBJ-005',
    display_name: 'Ecosystem State Machine',
    description: 'Canonical lifecycle state machine for ecosystem objects.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'state-machine',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'OBJ-006',
    key: 'OBJ-006',
    display_name: 'HOST Changelog',
    description: 'Canonical changelog baseline for HOST-kernel implementation work.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'changelog',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
  {
    id: 'HOST-0',
    key: 'HOST-0',
    display_name: 'Ecosystem System Architecture',
    description: 'Canonical system architecture bridge between governance and implementation.',
    status: 'active',
    version: '1.0',
    owner: 'HOST',
    document_type: 'architecture',
    owner_objective: null,
    lineage: [],
    relationships: [],
  },
];
const constitutionalDocumentSeedById = new Map(constitutionalDocumentSeeds.map((seed) => [seed.id, seed] as const));

export class DocumentRegistryService implements DocumentRegistry {
  readonly #registry: RegistryService;
  readonly #seedIds = new Set(constitutionalDocumentSeeds.map((seed) => seed.id));

  constructor(options: DocumentRegistryOptions = {}) {
    this.#registry = options.registry ?? new RegistryService();
    if (options.seedConstitutionalArtifacts !== false) {
      this.#seedConstitutionalArtifacts();
    }
  }

  #seedConstitutionalArtifacts(): void {
    for (const seed of constitutionalDocumentSeeds) {
      if (this.#registry.lookup(seed.id)) {
        continue;
      }
      this.registerDocument(seed);
    }
  }

  #ensureDocument(record: RegistryEntry): Document {
    const document = toDocument(record);
    const constitutionalSeed = constitutionalDocumentSeedById.get(record.id);
    return constitutionalSeed
      ? {
          ...document,
          document_type: constitutionalSeed.document_type,
          owner_objective: constitutionalSeed.owner_objective ?? null,
          lineage: [...constitutionalSeed.lineage],
          relationships: [...constitutionalSeed.relationships],
        }
      : document;
  }

  #commit(document: DocumentCreateInput | Document, current?: Document): Document {
    const committed = current ? this.#registry.update(current.id, toRegistryUpdateInput(document)) : this.#registry.register(toRegistryRegisterInput(document));
    return this.#ensureDocument(committed as RegistryEntry);
  }

  register(document: DocumentCreateInput): Document {
    return this.registerDocument(document);
  }

  registerDocument(document: DocumentCreateInput): Document {
    return this.#commit(document);
  }

  retrieveDocument(id: string): Document | undefined {
    const record = this.#registry.lookup('document', id) ?? (this.#seedIds.has(id) ? this.#registry.lookup('objective', id) : undefined);
    return record ? this.#ensureDocument(record as RegistryEntry) : undefined;
  }

  updateDocument(id: string, patch: DocumentUpdateInput): Document {
    const current = this.retrieveDocument(id);
    if (!current) {
      throw new RegistryError(`Unknown document id: ${id}`);
    }

    const ownerObjective = patch.owner_objective !== undefined ? patch.owner_objective : current.owner_objective ?? null;

    const next: Document = {
      ...current,
      ...patch,
      id: current.id,
      key: patch.key ?? current.key,
      document_type: patch.document_type ?? current.document_type,
      owner_objective: ownerObjective,
      created_at: current.created_at,
      updated_at: nowIso(),
      lineage: patch.lineage !== undefined ? uniqueStrings(patch.lineage) : current.lineage,
      relationships: patch.relationships !== undefined ? uniqueStrings(patch.relationships) : current.relationships,
    };

    return this.#commit(next, current);
  }

  update(document: Document): Document {
    return this.updateDocument(document.id, document);
  }

  discoverConstitutionalArtifacts(): Document[] {
    return this.list().filter((document) => this.#seedIds.has(document.id));
  }

  lookup(id: string): Document | undefined {
    return this.retrieveDocument(id);
  }

  list(): Document[] {
    const documents = this.#registry.find({ kind: 'document' });
    const constitutionalObjectives = this.#registry
      .find({ kind: 'objective' })
      .filter((record) => this.#seedIds.has(record.id));
    return [...documents, ...constitutionalObjectives].map((record) => this.#ensureDocument(record as RegistryEntry));
  }

  listDocuments(): Document[] {
    return this.list();
  }
}

export const createDocumentRegistry = (options: DocumentRegistryOptions = {}): DocumentRegistry => new DocumentRegistryService(options);
