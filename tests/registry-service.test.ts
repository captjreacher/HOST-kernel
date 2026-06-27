import test from 'node:test';
import assert from 'node:assert/strict';
import { RegistryError, RegistryService } from '../src/services/registry/index.js';
import { registrySeed, seedRegistry } from './fixtures/registry-seed.js';

const createService = (): RegistryService => new RegistryService();

const registerProduct = (service: RegistryService, overrides: Partial<Parameters<RegistryService['registerProduct']>[0]> = {}) =>
  service.registerProduct({
    key: 'platform-core',
    display_name: 'Platform Core',
    description: 'Kernel registry product',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    lifecycle_state: 'registered',
    integration_status: 'pending',
    registered_capabilities: [],
    ...overrides,
  });

test('product registration', () => {
  const service = createService();
  const product = registerProduct(service);

  assert.equal(product.key, 'platform-core');
  assert.equal(product.lifecycle_state, 'registered');
  assert.deepEqual(product.registered_capabilities, []);
  assert.ok(product.id.length > 0);
});

test('duplicate product key rejection', () => {
  const service = createService();
  registerProduct(service);

  assert.throws(() => registerProduct(service), RegistryError);
});

test('derived capability state is deduplicated on the owning product', () => {
  const service = createService();
  registerProduct(service);

  service.registerCapability({
    key: 'registry-read',
    display_name: 'Registry Read',
    description: 'Read registry records',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    owning_product: 'platform-core',
    maturity: 'alpha',
    dependencies: [],
  });

  assert.throws(
    () =>
      service.registerCapability({
        key: 'registry-read',
        display_name: 'Registry Read',
        description: 'Duplicate capability',
        status: 'active',
        version: '0.1.0',
        owner: 'platform-team',
        owning_product: 'platform-core',
        maturity: 'alpha',
        dependencies: [],
      }),
    RegistryError,
  );

  const product = service.getProductByKey('platform-core');
  assert.deepEqual(product?.registered_capabilities, ['registry-read']);
});

test('repository registration linked to a product', () => {
  const service = createService();
  registerProduct(service);

  const repository = service.registerRepository({
    key: 'host-kernel',
    display_name: 'HOST-kernel',
    description: 'Kernel runtime repository',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    git_url: 'https://example.com/org/host-kernel.git',
    default_branch: 'main',
    owning_product: 'platform-core',
  });

  assert.equal(repository.owning_product, 'platform-core');
});

test('platform repositories can exist without owning_product', () => {
  const service = createService();

  const repository = service.registerRepository({
    key: 'mgrnz-roadmap',
    display_name: 'MGRNZ Roadmap',
    description: 'Platform roadmap repository',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    git_url: 'https://example.com/mgrnz/roadmap.git',
    default_branch: 'main',
    owning_product: null,
  });

  assert.equal(repository.owning_product, null);
});

test('capability registration linked to a product', () => {
  const service = createService();
  registerProduct(service);

  const capability = service.registerCapability({
    key: 'registry-read',
    display_name: 'Registry Read',
    description: 'Read registry records',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    owning_product: 'platform-core',
    maturity: 'alpha',
    dependencies: [],
  });

  const product = service.getProductByKey('platform-core');
  assert.ok(product);
  assert.equal(capability.owning_product, 'platform-core');
  assert.deepEqual(product?.registered_capabilities, ['registry-read']);
});

test('platform capabilities can exist without owning_product', () => {
  const service = createService();

  const capability = service.registerCapability({
    key: 'platform-capability',
    display_name: 'Platform Capability',
    description: 'Kernel-owned capability',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    owning_product: null,
    maturity: 'alpha',
    dependencies: [],
  });

  assert.equal(capability.owning_product, null);
});

test('capability dependency validation', () => {
  const service = createService();
  registerProduct(service);

  service.registerCapability({
    key: 'registry-base',
    display_name: 'Registry Base',
    description: 'Base capability',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    owning_product: 'platform-core',
    maturity: 'alpha',
    dependencies: [],
  });

  const dependent = service.registerCapability({
    key: 'registry-extended',
    display_name: 'Registry Extended',
    description: 'Depends on base capability',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    owning_product: 'platform-core',
    maturity: 'beta',
    dependencies: ['registry-base'],
  });

  assert.deepEqual(dependent.dependencies, ['registry-base']);
});

test('event contract registration', () => {
  const service = createService();
  registerProduct(service);

  const event = service.registerEventContract({
    key: 'product-registered.v1',
    display_name: 'Product Registered',
    description: 'Emitted when a product is registered',
    status: 'active',
    version: '1.0.0',
    owner: 'platform-team',
    event_name: 'product.registered',
    producer: 'platform-core',
    consumers: ['cockpit'],
    schema_version: '1.0.0',
    payload_schema: {
      type: 'object',
      properties: {
        key: { type: 'string' },
      },
    },
  });

  assert.equal(event.event_name, 'product.registered');
  assert.equal(event.producer, 'platform-core');
});

test('invalid dependency rejection', () => {
  const service = createService();
  registerProduct(service);

  assert.throws(
    () =>
      service.registerCapability({
        key: 'registry-broken',
        display_name: 'Registry Broken',
        description: 'Has a missing dependency',
        status: 'active',
        version: '0.1.0',
        owner: 'platform-team',
        owning_product: 'platform-core',
        maturity: 'alpha',
        dependencies: ['missing-capability'],
      }),
    RegistryError,
  );
});

test('seed data can be registered without violating constraints', () => {
  const service = createService();
  seedRegistry(service);

  const products = service.listProducts();
  assert.equal(products.length, registrySeed.products.length);
  assert.ok(products.some((product) => product.key === 'findyourvertical'));
  assert.ok(products.some((product) => product.key === 'funkmyfans'));

  const seededProduct = service.getProductByKey('findyourvertical');
  assert.ok(seededProduct);
  assert.ok(seededProduct.registered_capabilities.includes('product-registration'));

  const platformCapability = service.registerCapability({
    key: 'seeded-platform-capability-check',
    display_name: 'Seeded Platform Capability Check',
    description: 'Verifies platform capability registration',
    status: 'active',
    version: '0.1.0',
    owner: 'platform-team',
    owning_product: null,
    maturity: 'beta',
    dependencies: ['product-registration'],
  });

  assert.equal(platformCapability.owning_product, null);
});
