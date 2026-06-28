import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const isProviderPackage = (packageDir: string) => packageDir === 'context-persistence-filesystem' || packageDir === 'context-persistence-sqlite';

test('HOST-2.1 keeps dependency direction one-way away from HOST-1', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.equal(workspacePackages.includes('context-runtime'), true);

  const contextRuntimePackageJsonPath = path.join(packagesDir, 'context-runtime', 'package.json');
  const contextRuntimePackageJson = JSON.parse(fs.readFileSync(contextRuntimePackageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const contextRuntimeDependencies = Object.keys(contextRuntimePackageJson.dependencies ?? {}).sort();

  assert.deepEqual(contextRuntimeDependencies, ['@host/kernel-core', '@host/kernel-types']);

  for (const packageDir of workspacePackages) {
    if (
      packageDir === 'context-runtime' ||
      packageDir === 'context-store' ||
      packageDir === 'context-persistence' ||
      isProviderPackage(packageDir)
    ) {
      continue;
    }

    const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      name: string;
    };

    const dependencies = Object.keys(packageJson.dependencies ?? {});
    assert.equal(
      dependencies.includes('@host/context-runtime'),
      false,
      `${packageJson.name} must not depend on @host/context-runtime.`,
    );
  }
});
