import type {
  McpRequestMetadata,
  McpServerCapabilities,
  McpToolDefinition,
  McpToolError,
  McpToolName,
} from './contracts.js';
import {
  MCP_INTEGRATION_VERSION,
  MCP_PROTOCOL_VERSION,
  MCP_TOOL_CATALOGUE,
} from './contracts.js';

export const MCP_RUNTIME_PROTOCOL = 'mcp' as const;
export const API_HOST_PROTOCOL_VERSION = '1.0.0' as const;

const freeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object') {
      freeze(nested);
    }
  }

  return value;
};

const toolSchemaFor = (tool: McpToolName): Readonly<Record<string, unknown>> => {
  switch (tool) {
    case 'context.create':
      return freeze({
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Context record key.' },
          value: { type: 'object', description: 'Context runtime value.' },
          options: {
            type: 'object',
            properties: {
              expected_version: { type: 'integer' },
            },
          },
        },
        required: ['key', 'value'],
      });
    case 'context.retrieve':
      return freeze({
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Context record key.' },
        },
        required: ['key'],
      });
    case 'context.update':
      return freeze({
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Context record key.' },
          value: { type: 'object', description: 'Updated context runtime value.' },
          options: {
            type: 'object',
            properties: {
              expected_version: { type: 'integer' },
            },
          },
        },
        required: ['key', 'value'],
      });
    case 'context.delete':
      return freeze({
        type: 'object',
        properties: {
          key: { type: 'string', description: 'Context record key.' },
          options: {
            type: 'object',
            properties: {
              expected_version: { type: 'integer' },
            },
          },
        },
        required: ['key'],
      });
    case 'context.query':
      return freeze({
        type: 'object',
        properties: {
          query: {
            type: 'object',
            properties: {
              key: { type: 'string' },
              keys: { type: 'array', items: { type: 'string' } },
              key_prefix: { type: 'string' },
              runtime_kind: {
                anyOf: [
                  { type: 'string' },
                  { type: 'array', items: { type: 'string' } },
                ],
              },
              min_version: { type: 'integer' },
              max_version: { type: 'integer' },
              created_from: { type: 'string' },
              created_to: { type: 'string' },
              updated_from: { type: 'string' },
              updated_to: { type: 'string' },
              limit: { type: 'integer' },
              offset: { type: 'integer' },
              order_by: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    direction: { type: 'string', enum: ['asc', 'desc'] },
                  },
                  required: ['field'],
                },
              },
            },
          },
        },
      });
  }
};

export const createIntegrationToolDefinitions = (): readonly McpToolDefinition[] =>
  freeze(
    MCP_TOOL_CATALOGUE.map(
      (tool): McpToolDefinition => ({
        name: tool,
        title: tool,
        description: `Expose HOST API operation ${tool} through MCP.`,
        inputSchema: toolSchemaFor(tool),
      }),
    ),
  );

export const createIntegrationOperationCatalogue = (): readonly McpToolName[] => freeze([...MCP_TOOL_CATALOGUE]);

export const createIntegrationServerCapabilities = (): McpServerCapabilities =>
  freeze({
    tools: {
      listChanged: false,
    },
    resources: {
      subscribe: false,
      listChanged: false,
    },
  });

export const createIntegrationMetadata = (request: McpRequestMetadata) =>
  freeze({
    protocol: MCP_RUNTIME_PROTOCOL,
    direction: 'inbound' as const,
    version: MCP_INTEGRATION_VERSION,
    authentication: {
      authenticated: false,
      principal: { id: 'anonymous' },
      subject: { id: 'anonymous' },
      roles: [],
      claims: {},
      method: 'anonymous' as const,
      metadata: {
        attributes: {},
      },
    },
    tracing: {
      correlation_id: request.correlation_id,
      request_id: request.request_id,
      timestamp: request.timestamp,
    },
    attributes: {
      protocol_version: MCP_PROTOCOL_VERSION,
    },
  });

export const MCP_ERROR_CODE_BY_API_CODE = freeze({
  'api.invalid_request': -32602,
  'api.validation_failed': -32602,
  'api.not_found': -32004,
  'api.conflict': -32009,
  'api.transaction_closed': -32009,
  'api.unavailable': -32003,
  'api.internal': -32603,
});

export const mapApiErrorToMcpError = (
  code: keyof typeof MCP_ERROR_CODE_BY_API_CODE,
  message: string,
  status: number,
): McpToolError =>
  freeze({
    code: MCP_ERROR_CODE_BY_API_CODE[code],
    message,
    data: {
      api_error_code: code,
      api_protocol_version: API_HOST_PROTOCOL_VERSION,
      status,
    },
  });

export const toJsonText = (value: unknown): string => JSON.stringify(value, null, 2);
