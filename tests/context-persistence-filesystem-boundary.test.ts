import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

test('HOST-2.5 keeps filesystem persistence in the provider layer with no reverse dependencies', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  assert.equal(workspacePackages.includes('context-persistence-filesystem'), true);

  const packageJsonPath = path.join(packagesDir, 'context-persistence-filesystem', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
    name: string;
  };

  assert.equal(packageJson.name, '@host/context-provider-filesystem');
  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}).sort(), ['@host/context-persistence']);

  for (const packageDir of workspacePackages) {
    if (packageDir === 'context-persistence-filesystem') {
      continue;
    }

    const otherPackageJsonPath = path.join(packagesDir, packageDir, 'package.json');
    const otherPackageJson = JSON.parse(fs.readFileSync(otherPackageJsonPath, 'utf8')) as {
      dependencies?: Record<string, string>;
      name: string;
    };

    const dependencies = Object.keys(otherPackageJson.dependencies ?? {});
    assert.equal(
      dependencies.includes('@host/context-provider-filesystem'),
      false,
      `${otherPackageJson.name} must not depend on @host/context-provider-filesystem.`,
    );
  }
});
