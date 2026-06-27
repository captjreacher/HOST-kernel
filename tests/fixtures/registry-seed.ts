import { type CapabilityRegistrationInput, type EventRegistrationInput, type ProductRegistrationInput, type RepositoryRegistrationInput } from '../../src/contracts/registry.js';
import { RegistryService } from '../../src/services/registry/index.js';

export const registrySeed = {
  products: [
    {
      key: 'findyourvertical',
      display_name: 'FindYourVertical',
      description: 'Seed product for validation and ecosystem linkage tests',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      lifecycle_state: 'registered',
      integration_status: 'pending',
      registered_capabilities: [],
    },
    {
      key: 'funkmyfans',
      display_name: 'FunkMyFans',
      description: 'Seed product for validation and ecosystem linkage tests',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      lifecycle_state: 'registered',
      integration_status: 'pending',
      registered_capabilities: [],
    },
  ] satisfies ProductRegistrationInput[],
  repositories: [
    {
      key: 'mgrnz-roadmap',
      display_name: 'MGRNZ Roadmap',
      description: 'Platform roadmap repository',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      git_url: 'https://example.com/mgrnz/roadmap.git',
      default_branch: 'main',
      owning_product: null,
    },
    {
      key: 'context',
      display_name: 'CONTEXT',
      description: 'Platform context repository',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      git_url: 'https://example.com/mgrnz/context.git',
      default_branch: 'main',
      owning_product: null,
    },
    {
      key: 'host-kernel',
      display_name: 'HOST-kernel',
      description: 'Kernel runtime repository',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      git_url: 'https://example.com/mgrnz/host-kernel.git',
      default_branch: 'main',
      owning_product: null,
    },
    {
      key: 'findyourvertical',
      display_name: 'FindYourVertical',
      description: 'Product repository',
      status: 'active',
      version: '0.1.0',
      owner: 'findyourvertical-team',
      git_url: 'https://example.com/findyourvertical/app.git',
      default_branch: 'main',
      owning_product: 'findyourvertical',
    },
    {
      key: 'funkmyfans',
      display_name: 'FunkMyFans',
      description: 'Product repository',
      status: 'active',
      version: '0.1.0',
      owner: 'funkmyfans-team',
      git_url: 'https://example.com/funkmyfans/app.git',
      default_branch: 'main',
      owning_product: 'funkmyfans',
    },
  ] satisfies RepositoryRegistrationInput[],
  capabilities: [
    {
      key: 'product-registration',
      display_name: 'Product Registration',
      description: 'Registers product records',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      owning_product: 'findyourvertical',
      maturity: 'alpha',
      dependencies: [],
    },
    {
      key: 'repository-registration',
      display_name: 'Repository Registration',
      description: 'Registers repository records',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      owning_product: null,
      maturity: 'alpha',
      dependencies: [],
    },
    {
      key: 'capability-registration',
      display_name: 'Capability Registration',
      description: 'Registers capability records',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      owning_product: null,
      maturity: 'alpha',
      dependencies: ['product-registration', 'repository-registration'],
    },
    {
      key: 'event-contract-registration',
      display_name: 'Event Contract Registration',
      description: 'Registers event contract records',
      status: 'active',
      version: '0.1.0',
      owner: 'platform-team',
      owning_product: null,
      maturity: 'beta',
      dependencies: ['capability-registration'],
    },
  ] satisfies CapabilityRegistrationInput[],
  eventContracts: [
    {
      key: 'product.registered',
      display_name: 'Product Registered',
      description: 'Emitted when a product is registered',
      status: 'active',
      version: '1.0.0',
      owner: 'platform-team',
      event_name: 'product.registered',
      producer: 'findyourvertical',
      consumers: ['funkmyfans'],
      schema_version: '1.0.0',
      payload_schema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
        },
      },
    },
    {
      key: 'repository.registered',
      display_name: 'Repository Registered',
      description: 'Emitted when a repository is registered',
      status: 'active',
      version: '1.0.0',
      owner: 'platform-team',
      event_name: 'repository.registered',
      producer: 'funkmyfans',
      consumers: ['findyourvertical'],
      schema_version: '1.0.0',
      payload_schema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
        },
      },
    },
    {
      key: 'capability.registered',
      display_name: 'Capability Registered',
      description: 'Emitted when a capability is registered',
      status: 'active',
      version: '1.0.0',
      owner: 'platform-team',
      event_name: 'capability.registered',
      producer: 'findyourvertical',
      consumers: ['funkmyfans'],
      schema_version: '1.0.0',
      payload_schema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
        },
      },
    },
    {
      key: 'event_contract.registered',
      display_name: 'Event Contract Registered',
      description: 'Emitted when an event contract is registered',
      status: 'active',
      version: '1.0.0',
      owner: 'platform-team',
      event_name: 'event_contract.registered',
      producer: 'funkmyfans',
      consumers: ['findyourvertical'],
      schema_version: '1.0.0',
      payload_schema: {
        type: 'object',
        properties: {
          key: { type: 'string' },
        },
      },
    },
  ] satisfies EventRegistrationInput[],
} as const;

export const seedRegistry = (service: RegistryService): void => {
  for (const product of registrySeed.products) {
    service.registerProduct(product);
  }

  for (const repository of registrySeed.repositories) {
    service.registerRepository(repository);
  }

  for (const capability of registrySeed.capabilities) {
    service.registerCapability(capability);
  }

  for (const eventContract of registrySeed.eventContracts) {
    service.registerEventContract(eventContract);
  }
};
