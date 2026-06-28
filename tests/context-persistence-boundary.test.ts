import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const isProviderPackage = (packageDir: string) => packageDir === 'context-persistence-filesystem' || packageDir === 'context-persistence-sqlite';
const isApplicationConsumer = (packageDir: string) => packageDir === 'context-service';

test('HOST-2.4 keeps dependency direction one-way away from HOST-1', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.equal(workspacePackages.includes('context-persistence'), true);

  const contextPersistencePackageJsonPath = path.join(packagesDir, 'context-persistence', 'package.json');
  const contextPersistencePackageJson = JSON.parse(fs.readFileSync(contextPersistencePackageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };
  const contextPersistenceDependencies = Object.keys(contextPersistencePackageJson.dependencies ?? {}).sort();

  assert.deepEqual(contextPersistenceDependencies, ['@host/context-runtime', '@host/context-store', '@host/kernel-core', '@host/kernel-types']);

  for (const packageDir of workspacePackages) {
    if (packageDir === 'context-persistence' || isProviderPackage(packageDir) || isApplicationConsumer(packageDir)) {
      continue;
    }

    const packageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      name: string;
    };

    const dependencies = Object.keys(packageJson.dependencies ?? {});
    assert.equal(
      dependencies.includes('@host/context-persistence'),
      false,
      `${packageJson.name} must not depend on @host/context-persistence.`,
    );
  }
});
