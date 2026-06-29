import type { IntegrationBinding, IntegrationRegistration } from '../../integration-contracts/src/index.js';

export const MCP_INTEGRATION_VERSION = '1.0.0' as const;
export const MCP_PROTOCOL_VERSION = '2025-11-25' as const;
export const MCP_INTEGRATION_ID = 'integration-mcp' as const;
export const MCP_INTEGRATION_CATEGORY = 'ai' as const;
export const MCP_SERVER_NAME = 'HOST MCP Integration' as const;
export const MCP_RESOURCE_BASE_URI = 'host://integration-mcp' as const;

export const MCP_TOOL_CATALOGUE = [
  'context.create',
  'context.retrieve',
  'context.update',
  'context.delete',
  'context.query',
] as const;

export const MCP_RESOURCE_CATALOGUE = [
  `${MCP_RESOURCE_BASE_URI}/health`,
  `${MCP_RESOURCE_BASE_URI}/capabilities`,
  `${MCP_RESOURCE_BASE_URI}/operation-catalogue`,
  `${MCP_RESOURCE_BASE_URI}/protocol-version`,
] as const;

export type McpToolName = (typeof MCP_TOOL_CATALOGUE)[number];
export type McpResourceUri = (typeof MCP_RESOURCE_CATALOGUE)[number];

export interface McpIntegrationConfiguration extends Record<string, unknown> {
  readonly server_name?: string | undefined;
  readonly server_version?: string | undefined;
  readonly resource_base_uri?: string | undefined;
}

export interface McpServerCapabilities {
  readonly tools: {
    readonly listChanged: false;
  };
  readonly resources: {
    readonly subscribe: false;
    readonly listChanged: false;
  };
}

export interface McpToolDefinition {
  readonly name: McpToolName;
  readonly title: string;
  readonly description: string;
  readonly inputSchema: Readonly<Record<string, unknown>>;
}

export interface McpResourceDefinition {
  readonly uri: string;
  readonly name: string;
  readonly title: string;
  readonly description: string;
  readonly mimeType: 'application/json';
}

export interface McpTextContent {
  readonly type: 'text';
  readonly text: string;
}

export interface McpToolError {
  readonly code: number;
  readonly message: string;
  readonly data?: Readonly<Record<string, unknown>> | undefined;
}

export interface McpToolCallResult {
  readonly content: readonly McpTextContent[];
  readonly structuredContent?: unknown;
  readonly isError: boolean;
  readonly error?: McpToolError | undefined;
}

export interface McpResourceContent {
  readonly uri: string;
  readonly mimeType: 'application/json';
  readonly text: string;
}

export interface McpResourceReadResult {
  readonly contents: readonly McpResourceContent[];
}

export interface McpToolCallRequest {
  readonly name: McpToolName;
  readonly arguments?: Readonly<Record<string, unknown>> | undefined;
}

export interface McpRequestMetadata {
  readonly correlation_id: string;
  readonly request_id: string;
  readonly timestamp: string;
}

export class McpIntegrationError extends Error {
  readonly code: number;
  readonly data?: Readonly<Record<string, unknown>> | undefined;

  constructor(code: number, message: string, data?: Readonly<Record<string, unknown>> | undefined) {
    super(message);
    this.name = 'McpIntegrationError';
    this.code = code;
    this.data = data;
  }
}

export interface McpIntegration extends IntegrationBinding<McpIntegrationConfiguration> {
  readonly server: {
    readonly name: string;
    readonly version: string;
    readonly protocolVersion: typeof MCP_PROTOCOL_VERSION;
    readonly capabilities: McpServerCapabilities;
  };
  readonly state: 'created' | 'initialized' | 'shutdown';
  listTools(): Promise<readonly McpToolDefinition[]>;
  callTool(request: McpToolCallRequest): Promise<McpToolCallResult>;
  listResources(): Promise<readonly McpResourceDefinition[]>;
  readResource(uri: string): Promise<McpResourceReadResult>;
}

export interface McpIntegrationFactoryOptions {
  readonly now?: (() => string) | undefined;
  readonly startup_order?: number | undefined;
}

export type McpIntegrationRegistration = IntegrationRegistration<McpIntegrationConfiguration>;
