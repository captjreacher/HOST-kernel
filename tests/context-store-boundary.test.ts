import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const isProviderPackage = (packageDir: string) => packageDir === 'context-persistence-filesystem' || packageDir === 'context-persistence-sqlite';

test('HOST-2.3 keeps dependency direction one-way away from HOST-1', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.equal(workspacePackages.includes('context-store'), true);

  const contextStorePackageJsonPath = path.join(packagesDir, 'context-store', 'package.json');
  const contextStorePackageJson = JSON.parse(fs.readFileSync(contextStorePackageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const contextStoreDependencies = Object.keys(contextStorePackageJson.dependencies ?? {}).sort();

  assert.deepEqual(contextStoreDependencies, ['@host/context-runtime', '@host/kernel-core', '@host/kernel-types']);

  for (const packageDir of workspacePackages) {
    if (packageDir === 'context-store' || packageDir === 'context-persistence' || isProviderPackage(packageDir)) {
      continue;
    }

    const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      name: string;
    };

    const dependencies = Object.keys(packageJson.dependencies ?? {});
    assert.equal(
      dependencies.includes('@host/context-store'),
      false,
      `${packageJson.name} must not depend on @host/context-store.`,
    );
  }
});
