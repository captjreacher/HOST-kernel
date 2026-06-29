import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

test('HOST-3.1 keeps context-service in the application layer with no provider coupling or reverse dependencies', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.equal(workspacePackages.includes('context-service'), true);

  const packageJsonPath = path.join(packagesDir, 'context-service', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    name: string;
  };

  assert.equal(packageJson.name, '@host/context-service');
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/context-persistence', '@host/runtime-contracts']);

  for (const packageDir of workspacePackages) {
    if (packageDir === 'context-service' || packageDir === 'api-host' || packageDir === 'runtime-composition') {
      continue;
    }

    const otherPackageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    const otherPackageJson = JSON.parse(fs.readFileSync(otherPackageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      name: string;
    };

    const dependencies = Object.keys(otherPackageJson.dependencies ?? {});
    assert.equal(
      dependencies.includes('@host/context-service'),
      false,
      `${otherPackageJson.name} must not depend on @host/context-service.`,
    );
  }
});
