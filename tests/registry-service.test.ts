import test from 'node:test';
import assert from 'node:assert/strict';
import { RegistryError, RegistryService } from '@host/kernel-registry';
import { registrySeed, seedRegistry } from './fixtures/registry-seed.js';
import type { RegistryEntry } from '@host/kernel-registry';

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

const createRegistryEntry = (overrides: Partial<RegistryEntry> = {}): RegistryEntry => ({
  kind: 'objective',
  id: 'objective-001',
  key: 'objective-001',
  display_name: 'Objective 001',
  description: 'Canonical objective record',
  status: 'active',
  version: '1.0.0',
  owner: 'host',
  created_at: '2026-06-28T00:00:00.000Z',
  updated_at: '2026-06-28T00:00:00.000Z',
  lifecycle_state: 'proposed',
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

test('successful registration', () => {
  const service = createService();
  const record = service.register(createRegistryEntry());

  assert.equal(record.kind, 'objective');
  assert.equal(service.exists(record.id), true);
});

test('duplicate registration rejection', () => {
  const service = createService();
  const record = createRegistryEntry();

  service.register(record);

  assert.throws(() => service.register({ ...record, id: 'objective-002' }), RegistryError);
});

test('successful update', () => {
  const service = createService();
  const record = service.register(createRegistryEntry());
  const updated = service.update(record.id, { description: 'Updated objective description' });

  assert.equal(updated.description, 'Updated objective description');
  assert.equal(service.lookup(record.id)?.description, 'Updated objective description');
});

test('update of missing record', () => {
  const service = createService();

  assert.throws(() => service.update('missing-record', { description: 'missing' }), RegistryError);
});

test('lookup by id', () => {
  const service = createService();
  const record = service.register(createRegistryEntry());
  const lookup = service.lookup(record.id);

  assert.equal(lookup && 'kind' in lookup ? lookup.kind : undefined, 'objective');
});

test('exists by id', () => {
  const service = createService();
  const record = service.register(createRegistryEntry());

  assert.equal(service.exists(record.id), true);
});

test('list records', () => {
  const service = createService();
  const record = service.register(createRegistryEntry());

  const records = service.list() as RegistryEntry[];
  assert.ok(records.some((item) => item.id === record.id));
});

test('find records by type status owner', () => {
  const service = createService();
  const record = service.register({
    ...createRegistryEntry({
      kind: 'repository',
      id: 'repository-001',
      key: 'repository-001',
      display_name: 'Repository 001',
      description: 'Canonical repository record',
      owner: 'platform-team',
      repository_url: 'https://example.com/host-kernel.git',
      default_branch: 'main',
      owning_product: 'platform-core',
      lifecycle_state: undefined,
    }),
  });

  const found = service.find({ kind: 'repository', status: 'active', owner: 'platform-team' });
  assert.ok(found.some((item) => item.id === record.id));
});

test('identifier reservation', () => {
  const service = createService();
  const reserved = service.reserveIdentifier({
    type: 'objective',
    prefix: 'OBJ',
    sequence: 1,
    value: 'OBJ-001',
  });

  assert.equal(reserved, true);
  assert.ok(service.lookupIdentifier('OBJ-001'));
});

test('duplicate identifier reservation', () => {
  const service = createService();
  service.reserveIdentifier({
    type: 'objective',
    prefix: 'OBJ',
    sequence: 1,
    value: 'OBJ-001',
  });

  assert.equal(
    service.reserveIdentifier({
      type: 'objective',
      prefix: 'OBJ',
      sequence: 1,
      value: 'OBJ-001',
    }),
    false,
  );
});

test('validation-backed rejection of invalid records', () => {
  const service = createService();

  assert.throws(
    () =>
      service.register({
        ...createRegistryEntry({
          id: 'objective-002',
          key: 'objective-002',
          status: 'broken' as never,
        }),
      }),
    RegistryError,
  );
});

test('validation-backed rejection of broken references', () => {
  const service = createService();

  assert.throws(
    () =>
      service.register({
        ...createRegistryEntry({
          kind: 'document',
          id: 'document-001',
          key: 'document-001',
          document_type: 'objective',
          references: [{ kind: 'objective', id: 'OBJ-404', relation: 'references' }],
        }),
      }),
    RegistryError,
  );
});

test('ValidationLookup adapter behaviour', () => {
  const service = createService();
  const record = service.register(createRegistryEntry());

  const lookup = service.lookup('objective', record.id);
  assert.equal(lookup?.id, record.id);
  assert.equal(service.lookup('registry-record', record.id)?.id, record.id);
});
