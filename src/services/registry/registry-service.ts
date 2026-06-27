import {
  type CapabilityRegistration,
  type CapabilityRegistrationInput,
  type EventRegistration,
  type EventRegistrationInput,
  type ProductRegistration,
  type ProductRegistrationInput,
  type ProductUpdateInput,
  type RepositoryRegistration,
  type RepositoryRegistrationInput,
} from '../../contracts/registry.js';

export class RegistryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RegistryError';
  }
}

interface RegistryState {
  products: Map<string, ProductRegistration>;
  repositories: Map<string, RepositoryRegistration>;
  capabilities: Map<string, CapabilityRegistration>;
  events: Map<string, EventRegistration>;
}

const nowIso = (): string => new Date().toISOString();

const createId = (): string => crypto.randomUUID();

const clone = <T>(value: T): T => structuredClone(value);

const sortByKey = <T extends { key: string }>(items: Iterable<T>): T[] =>
  [...items].sort((a, b) => a.key.localeCompare(b.key));

export class RegistryService {
  #state: RegistryState;

  constructor(seed?: Partial<RegistryState>) {
    this.#state = {
      products: seed?.products ?? new Map(),
      repositories: seed?.repositories ?? new Map(),
      capabilities: seed?.capabilities ?? new Map(),
      events: seed?.events ?? new Map(),
    };
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
    this.#state.events.set(event.key, clone(event));
    return clone(event);
  }
}
