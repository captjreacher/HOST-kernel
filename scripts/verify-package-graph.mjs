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

console.log(`Verified ${packageByName.size} workspace packages with no dependency cycles.`);
