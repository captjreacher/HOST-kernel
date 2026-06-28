import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import type { KernelHealthCheckResult, KernelRuntime, KernelRuntimeConfig } from '@host/kernel-core';
import type { ValidationIssue, ValidationResult } from '@host/kernel-types';

export interface KernelApiBootstrapStatus {
  status: 'ready';
  bootstrapped_at: string;
  healthy: boolean;
  issues: string[];
}

export interface KernelApiErrorBody {
  error: {
    code: string;
    message: string;
    issues?: ValidationIssue[];
  };
}

export interface KernelApiSuccessBody<T> {
  data: T;
}

export interface KernelApiResponse<T = unknown> {
  status: number;
  body: KernelApiSuccessBody<T> | KernelApiErrorBody;
}

export interface KernelApiConfig {
  kernelConfig?: KernelRuntimeConfig;
}

export interface KernelApiApplication {
  readonly runtime: KernelRuntime;
  readonly bootstrap: KernelApiBootstrapStatus;
  readonly bootstrapHealth: KernelHealthCheckResult;
  dispatch(method: string, url: string, body?: string): Promise<KernelApiResponse>;
  handleNodeRequest(request: IncomingMessage, response: ServerResponse): Promise<void>;
  createHttpServer(): Server;
}

export class KernelApiBootstrapError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'KernelApiBootstrapError';
  }
}

export interface KernelHealthResponse {
  runtime: KernelHealthCheckResult;
  bootstrap: KernelApiBootstrapStatus;
  constitutional_seed: {
    status: 'seeded' | 'unhealthy';
    expected: string[];
    discovered: string[];
    issues: string[];
  };
  dependency_wiring: {
    status: 'healthy' | 'unhealthy';
    checks: KernelHealthCheckResult['checks'];
    issues: string[];
  };
}

export interface KernelTaxonomyResponse {
  object_types: unknown[];
  identifier_prefixes: unknown[];
  lifecycle: unknown[];
  events: unknown[];
  relationships: unknown[];
}

export interface KernelValidationEnvelope extends ValidationResult {
  subject: 'repository' | 'document' | 'registry-record';
}
