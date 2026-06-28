import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

test('HOST-3.3 keeps api-host in the application layer with no transport or reverse coupling', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.equal(workspacePackages.includes('api-host'), true);

  const packageJsonPath = path.join(packagesDir, 'api-host', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    name: string;
  };

  assert.equal(packageJson.name, '@host/api-host');
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/context-service']);

  for (const packageDir of workspacePackages) {
    if (packageDir === 'api-host' || packageDir === 'transport-adapter') {
      continue;
    }

    const otherPackageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    const otherPackageJson = JSON.parse(fs.readFileSync(otherPackageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      name: string;
    };

    const dependencies = Object.keys(otherPackageJson.dependencies ?? {});
    assert.equal(
      dependencies.includes('@host/api-host'),
      false,
      `${otherPackageJson.name} must not depend on @host/api-host unless it is the canonical transport-adapter package.`,
    );
  }
});

test('HOST-3.5 places transport-adapter in the transport layer with api-host as its only dependency', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const packageJsonPath = path.join(packagesDir, 'transport-adapter', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    name: string;
  };

  assert.equal(packageJson.name, '@host/transport-adapter');
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/api-host']);
});

test('HOST-3.3 keeps the api-host package free of transport-specific language', () => {
  const root = process.cwd();
  const files = [
    path.join(root, 'packages', 'api-host', 'src', 'contracts.ts'),
    path.join(root, 'packages', 'api-host', 'src', 'host.ts'),
    path.join(root, 'packages', 'api-host', 'README.md'),
  ];

  const bannedTerms = ['http', 'rest', 'hono', 'express', 'fastify', 'graphql', 'websocket', 'broker'];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8').toLowerCase();

    for (const term of bannedTerms) {
      assert.equal(contents.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
