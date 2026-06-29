import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

test('HOST-4.10 freezes the integration platform package catalogue and documentation baseline', () => {
  const root = process.cwd();
  const packagesDir = path.join(root, 'packages');
  const workspacePackages = fs
    .readdirSync(packagesDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  assert.equal(workspacePackages.length, 30);

  const integrationPackages = workspacePackages.filter((entry) => entry.startsWith('integration-')).sort();
  assert.deepEqual(integrationPackages, [
    'integration-contracts',
    'integration-events',
    'integration-execution',
    'integration-execution-persistence',
    'integration-mcp',
    'integration-workflow',
  ]);

  const docs = [
    path.join(root, 'docs', 'architecture', 'integration-platform.md'),
    path.join(root, 'docs', 'architecture', 'ADR-009-integration-platform-baseline.md'),
    path.join(root, 'docs', 'changelog', 'HOST-4.10.md'),
  ];

  for (const file of docs) {
    assert.equal(fs.existsSync(file), true, `${path.basename(file)} must exist for the HOST-4.10 baseline.`);
  }

  const platformDoc = fs.readFileSync(docs[0], 'utf8');
  assert.equal(platformDoc.includes('HOST-4 Baseline v1.0 is now frozen'), true);
  assert.equal(platformDoc.includes('Hermes Readiness Review'), true);
  assert.equal(platformDoc.includes('@host/integration-execution-persistence'), true);

  const adr = fs.readFileSync(docs[1], 'utf8');
  assert.equal(adr.includes('HOST freezes the HOST-4 Integration Platform as Baseline v1.0.'), true);
  assert.equal(adr.includes('Semantic Versioning Expectations'), true);
});
