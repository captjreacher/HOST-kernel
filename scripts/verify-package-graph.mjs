import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const packagesDir = path.join(root, 'packages');
const workspacePackages = fs
  .readdirSync(packagesDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name);

const packageByName = new Map();
for (const packageName of workspacePackages) {
  const packageJsonPath = path.join(packagesDir, packageName, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  packageByName.set(packageJson.name, packageJson);
}

const edges = new Map();
for (const [name, packageJson] of packageByName.entries()) {
  const dependencies = Object.keys(packageJson.dependencies ?? {}).filter((dependency) => packageByName.has(dependency));
  edges.set(name, dependencies);
}

const executionPackages = {
  runtime: '@host/context-runtime',
  store: '@host/context-store',
  persistence: '@host/context-persistence',
};

const providerPackagePrefixes = ['@host/context-provider-'];
const applicationPackagePrefixes = ['@host/app-', '@host/product-'];
const applicationPackages = new Set(['@host/context-service', '@host/api-host']);
const transportPackages = new Set(['@host/transport-adapter', '@host/transport-rest']);
const runtimeHostPackages = new Set(['@host/rest-runtime-host']);
const runtimeCompositionPackages = new Set(['@host/runtime-composition']);
const integrationPackagePrefixes = ['@host/integration-'];
const integrationFoundationPackages = new Set(['@host/integration-contracts']);

const layerRank = {
  knowledge: 0,
  executionRuntime: 1,
  executionStore: 2,
  executionPersistence: 3,
  provider: 4,
  application: 5,
  transport: 6,
  runtimeHost: 7,
  runtimeComposition: 8,
  integrationFoundation: 9,
  integrationImplementation: 10,
};

const allowedDependencies = new Map([
  [executionPackages.runtime, new Set(['@host/kernel-core', '@host/kernel-types'])],
  [executionPackages.store, new Set(['@host/context-runtime', '@host/kernel-core', '@host/kernel-types'])],
  [executionPackages.persistence, new Set(['@host/context-store', '@host/context-runtime', '@host/kernel-core', '@host/kernel-types'])],
]);
const allowedProviderDependencies = new Set([
  '@host/context-persistence',
]);
const allowedApplicationDependencies = new Map([
  ['@host/context-service', new Set(['@host/context-persistence', '@host/runtime-contracts'])],
  ['@host/api-host', new Set(['@host/context-service', '@host/runtime-contracts'])],
]);
const allowedTransportDependencies = new Map([
  ['@host/transport-adapter', new Set(['@host/api-host', '@host/runtime-contracts'])],
  ['@host/transport-rest', new Set(['@host/api-host', '@host/transport-adapter'])],
]);
const allowedRuntimeHostDependencies = new Map([
  ['@host/rest-runtime-host', new Set(['@host/api-host', '@host/transport-rest'])],
]);
const allowedRuntimeCompositionDependencies = new Map([
  [
    '@host/runtime-composition',
    new Set([
      '@host/api-host',
      '@host/context-persistence',
      '@host/context-service',
      '@host/rest-runtime-host',
      '@host/runtime-contracts',
      '@host/transport-rest',
    ]),
  ],
]);
const allowedIntegrationFoundationDependencies = new Set(['@host/runtime-composition']);
const allowedIntegrationImplementationDependencies = new Set(['@host/integration-contracts']);

const startsWithAny = (value, prefixes) => prefixes.some((prefix) => value.startsWith(prefix));

const layerFor = (packageName) => {
  if (packageName === executionPackages.runtime) {
    return 'executionRuntime';
  }
  if (packageName === executionPackages.store) {
    return 'executionStore';
  }
  if (packageName === executionPackages.persistence) {
    return 'executionPersistence';
  }
  if (startsWithAny(packageName, providerPackagePrefixes)) {
    return 'provider';
  }
  if (applicationPackages.has(packageName) || startsWithAny(packageName, applicationPackagePrefixes)) {
    return 'application';
  }
  if (transportPackages.has(packageName)) {
    return 'transport';
  }
  if (runtimeHostPackages.has(packageName)) {
    return 'runtimeHost';
  }
  if (runtimeCompositionPackages.has(packageName)) {
    return 'runtimeComposition';
  }
  if (integrationFoundationPackages.has(packageName)) {
    return 'integrationFoundation';
  }
  if (startsWithAny(packageName, integrationPackagePrefixes)) {
    return 'integrationImplementation';
  }

  return 'knowledge';
};

for (const [name, dependencies] of edges.entries()) {
  const allowed = allowedDependencies.get(name);
  if (allowed) {
    for (const dependency of dependencies) {
      if (!allowed.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowed].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }
  }

  const allowedApplication = allowedApplicationDependencies.get(name);
  if (allowedApplication) {
    for (const dependency of dependencies) {
      if (!allowedApplication.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedApplication].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }
  }

  const allowedTransport = allowedTransportDependencies.get(name);
  if (allowedTransport) {
    for (const dependency of dependencies) {
      if (!allowedTransport.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedTransport].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }
  }

  const allowedRuntimeHost = allowedRuntimeHostDependencies.get(name);
  if (allowedRuntimeHost) {
    for (const dependency of dependencies) {
      if (!allowedRuntimeHost.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedRuntimeHost].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }
  }

  const allowedRuntimeComposition = allowedRuntimeCompositionDependencies.get(name);
  if (allowedRuntimeComposition) {
    for (const dependency of dependencies) {
      if (!allowedRuntimeComposition.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedRuntimeComposition].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }
  }

  const packageLayer = layerFor(name);
  for (const dependency of dependencies) {
    const dependencyLayer = layerFor(dependency);
    if (layerRank[dependencyLayer] > layerRank[packageLayer]) {
      throw new Error(`${name} (${packageLayer}) must not depend on ${dependency} (${dependencyLayer}); dependency direction must remain downward only.`);
    }
  }

  if (packageLayer === 'provider') {
    for (const dependency of dependencies) {
      if (!allowedProviderDependencies.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedProviderDependencies].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }

    if (!dependencies.includes(executionPackages.persistence)) {
      throw new Error(`${name} must depend on ${executionPackages.persistence} as the canonical execution-layer entry point.`);
    }
    if (dependencies.some((dependency) => layerFor(dependency) === 'application')) {
      throw new Error(`${name} must not depend on application packages.`);
    }
  }

  if (packageLayer === 'integrationFoundation') {
    for (const dependency of dependencies) {
      if (!allowedIntegrationFoundationDependencies.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedIntegrationFoundationDependencies].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }

    if (!dependencies.includes('@host/runtime-composition')) {
      throw new Error(`${name} must depend on @host/runtime-composition as the canonical runtime bootstrap entry point.`);
    }
  }

  if (packageLayer === 'integrationImplementation') {
    for (const dependency of dependencies) {
      if (!allowedIntegrationImplementationDependencies.has(dependency)) {
        throw new Error(`${name} may only depend on ${[...allowedIntegrationImplementationDependencies].sort().join(', ')} but also depends on ${dependency}.`);
      }
    }

    if (!dependencies.includes('@host/integration-contracts')) {
      throw new Error(`${name} must depend on @host/integration-contracts as the canonical Integration Layer foundation package.`);
    }
  }
}

for (const [name, dependencies] of edges.entries()) {
  if (name !== executionPackages.runtime && dependencies.includes(executionPackages.runtime)) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'executionStore' && dependentLayer !== 'executionPersistence' && dependentLayer !== 'provider') {
      throw new Error(`${name} must not depend on ${executionPackages.runtime}; dependency direction must remain within the frozen execution and provider stack.`);
    }
  }

  if (name !== executionPackages.store && dependencies.includes(executionPackages.store)) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'executionPersistence' && dependentLayer !== 'provider') {
      throw new Error(`${name} must not depend on ${executionPackages.store}; only ${executionPackages.persistence} or approved providers may sit above the store boundary.`);
    }
  }

  if (name !== executionPackages.persistence && dependencies.includes(executionPackages.persistence)) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'provider' && dependentLayer !== 'application' && dependentLayer !== 'runtimeComposition') {
      throw new Error(`${name} must not depend on ${executionPackages.persistence}; only providers or applications may sit above the persistence boundary.`);
    }
  }

  if (name !== '@host/api-host' && dependencies.includes('@host/api-host')) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'transport' && dependentLayer !== 'runtimeHost' && dependentLayer !== 'runtimeComposition') {
      throw new Error(`${name} must not depend on @host/api-host; only transport or runtime-host packages may sit above the API Host boundary.`);
    }
  }

  if (name !== '@host/transport-rest' && dependencies.includes('@host/transport-rest')) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'runtimeHost' && dependentLayer !== 'runtimeComposition') {
      throw new Error(`${name} must not depend on @host/transport-rest; only runtime-host packages may sit above the REST transport boundary.`);
    }
  }

  if (name !== '@host/rest-runtime-host' && dependencies.includes('@host/rest-runtime-host')) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'runtimeComposition') {
      throw new Error(`${name} must not depend on @host/rest-runtime-host; only runtime-composition packages may sit above the REST runtime host boundary.`);
    }
  }

  if (name !== '@host/runtime-composition' && dependencies.includes('@host/runtime-composition')) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'integrationFoundation') {
      throw new Error(`${name} must not depend on @host/runtime-composition; only @host/integration-contracts may sit directly above the runtime composition boundary inside the workspace graph.`);
    }
  }

  if (name !== '@host/integration-contracts' && dependencies.includes('@host/integration-contracts')) {
    const dependentLayer = layerFor(name);
    if (dependentLayer !== 'integrationImplementation') {
      throw new Error(`${name} must not depend on @host/integration-contracts; only concrete integration packages may sit above the integration foundation boundary.`);
    }
  }
}

const visiting = new Set();
const visited = new Set();
const stack = [];

const visit = (name) => {
  if (visiting.has(name)) {
    stack.push(name);
    throw new Error(`Circular package dependency detected: ${stack.join(' -> ')}`);
  }
  if (visited.has(name)) {
    return;
  }

  visiting.add(name);
  stack.push(name);
  for (const dependency of edges.get(name) ?? []) {
    visit(dependency);
  }
  stack.pop();
  visiting.delete(name);
  visited.add(name);
};

for (const name of packageByName.keys()) {
  visit(name);
}

console.log(`Verified ${packageByName.size} workspace packages with no dependency cycles and a valid layered package graph.`);
