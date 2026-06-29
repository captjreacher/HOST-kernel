import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {
  createRuntimeAuthenticationContext,
  createRuntimeCorrelationContext,
  createRuntimeObservability,
  createRuntimeRequestContext,
  DEFAULT_RUNTIME_CORRELATION_ID,
  DEFAULT_RUNTIME_REQUEST_ID,
  DEFAULT_RUNTIME_TIMESTAMP,
  RUNTIME_CONTRACTS_VERSION,
} from '../packages/runtime-contracts/src/index.ts';

test('runtime-contracts exposes the frozen HOST-3E contract version and deterministic defaults', () => {
  const authentication = createRuntimeAuthenticationContext();
  const correlation = createRuntimeCorrelationContext();
  const context = createRuntimeRequestContext();
  const observability = createRuntimeObservability();

  assert.equal(RUNTIME_CONTRACTS_VERSION, '1.0.0');
  assert.deepEqual(authentication, {
    authenticated: false,
    principal: { id: 'anonymous' },
    subject: { id: 'anonymous' },
    roles: [],
    claims: {},
    method: 'anonymous',
    metadata: {
      attributes: {},
    },
  });
  assert.deepEqual(correlation, {
    correlation_id: DEFAULT_RUNTIME_CORRELATION_ID,
    request_id: DEFAULT_RUNTIME_REQUEST_ID,
    timestamp: DEFAULT_RUNTIME_TIMESTAMP,
  });
  assert.deepEqual(context, {
    authentication,
    correlation,
    attributes: {},
  });
  assert.deepEqual(observability, {});
  assert.equal(Object.isFrozen(context.authentication), true);
  assert.equal(Object.isFrozen(context.correlation), true);
});

test('runtime-contracts captures transport-neutral authentication and observability shapes without vendor coupling', () => {
  const root = process.cwd();
  const packageJsonPath = path.join(root, 'packages', 'runtime-contracts', 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8')) as {
    dependencies?: Record<string, string>;
  };

  assert.deepEqual(Object.keys(packageJson.dependencies ?? {}), []);

  const files = [
    path.join(root, 'packages', 'runtime-contracts', 'src', 'contracts.ts'),
    path.join(root, 'packages', 'runtime-contracts', 'src', 'factories.ts'),
    path.join(root, 'packages', 'runtime-contracts', 'README.md'),
  ];

  const bannedTerms = ['opentelemetry', 'winston', 'pino', 'datadog', 'newrelic', 'oauth', 'openid', 'jwt'];

  for (const file of files) {
    const contents = fs.readFileSync(file, 'utf8').toLowerCase();
    for (const term of bannedTerms) {
      assert.equal(contents.includes(term), false, `${path.basename(file)} must not reference ${term}.`);
    }
  }
});
