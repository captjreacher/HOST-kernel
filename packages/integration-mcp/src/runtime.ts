import type {
  IntegrationCapability,
  IntegrationHealthReport,
  IntegrationInitializationContext,
} from '../../integration-contracts/src/index.js';
import {
  API_HOST_PROTOCOL_VERSION,
  createIntegrationMetadata,
  createIntegrationOperationCatalogue,
  createIntegrationServerCapabilities,
  createIntegrationToolDefinitions,
  mapApiErrorToMcpError,
  MCP_ERROR_CODE_BY_API_CODE,
  toJsonText,
} from './support.js';
import type {
  McpIntegration,
  McpIntegrationConfiguration,
  McpIntegrationFactoryOptions,
  McpRequestMetadata,
  McpResourceDefinition,
  McpResourceReadResult,
  McpToolCallRequest,
  McpToolCallResult,
  McpToolDefinition,
} from './contracts.js';
import {
  MCP_INTEGRATION_CATEGORY,
  MCP_INTEGRATION_ID,
  MCP_INTEGRATION_VERSION,
  MCP_PROTOCOL_VERSION,
  MCP_RESOURCE_BASE_URI,
  MCP_RESOURCE_CATALOGUE,
  MCP_SERVER_NAME,
} from './contracts.js';

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

const isObject = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const isString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isInteger = (value: unknown): value is number => typeof value === 'number' && Number.isInteger(value);

type RuntimeComposition = IntegrationInitializationContext<McpIntegrationConfiguration>['runtime'];
type RuntimeRestRequest = Parameters<RuntimeComposition['handleRestRequest']>[0];
type RuntimeRestResponse = Awaited<ReturnType<RuntimeComposition['handleRestRequest']>>;

const queryFromObject = (query: Record<string, unknown> | undefined): Readonly<Record<string, string | readonly string[]>> | undefined => {
  if (!query) {
    return undefined;
  }

  const mapped: Record<string, string | readonly string[]> = {};

  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value) && value.every((entry) => typeof entry === 'string')) {
      mapped[key] = freeze([...value]);
      continue;
    }

    if (key === 'order_by' && Array.isArray(value)) {
      const encoded = value
        .filter((entry): entry is Record<string, unknown> => isObject(entry) && isString(entry.field))
        .map((entry) => `${entry.field}${isString(entry.direction) ? `:${entry.direction}` : ''}`);
      if (encoded.length > 0) {
        mapped[key] = encoded.join(',');
      }
      continue;
    }

    if (typeof value === 'string') {
      mapped[key] = value;
      continue;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      mapped[key] = String(value);
    }
  }

  return Object.keys(mapped).length > 0 ? freeze(mapped) : undefined;
};

class DefaultMcpIntegration implements McpIntegration {
  readonly id = MCP_INTEGRATION_ID;
  readonly category = MCP_INTEGRATION_CATEGORY;
  readonly version = MCP_INTEGRATION_VERSION;
  readonly startup;
  readonly server;
  #runtime: RuntimeComposition | undefined;
  #configuration: Readonly<McpIntegrationConfiguration>;
  #requestCounter = 0;
  #state: 'created' | 'initialized' | 'shutdown' = 'created';
  readonly #now: () => string;

  constructor(options: McpIntegrationFactoryOptions) {
    this.startup = freeze(
      options.startup_order !== undefined
        ? {
            order: options.startup_order,
          }
        : {},
    );
    this.#configuration = freeze({});
    this.#now = options.now ?? (() => new Date().toISOString());
    this.server = freeze({
      name: MCP_SERVER_NAME,
      version: MCP_INTEGRATION_VERSION,
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: createIntegrationServerCapabilities(),
    });
  }

  get state(): 'created' | 'initialized' | 'shutdown' {
    return this.#state;
  }

  async describeCapabilities(): Promise<readonly IntegrationCapability[]> {
    return freeze([
      {
        key: 'mcp.tools',
        name: 'MCP Tools',
        description: 'Expose HOST context operations as MCP tools.',
        attributes: {
          tools: createIntegrationOperationCatalogue(),
        },
      },
      {
        key: 'mcp.resources',
        name: 'MCP Resources',
        description: 'Expose HOST integration health and catalogue resources.',
        attributes: {
          resources: this.#resourceUris(),
        },
      },
    ]);
  }

  async initialize(context: IntegrationInitializationContext<McpIntegrationConfiguration>): Promise<void> {
    this.#runtime = context.runtime;
    this.#configuration = freeze({
      server_name: isString(context.configuration.server_name) ? context.configuration.server_name : MCP_SERVER_NAME,
      server_version: isString(context.configuration.server_version)
        ? context.configuration.server_version
        : MCP_INTEGRATION_VERSION,
      resource_base_uri: isString(context.configuration.resource_base_uri)
        ? context.configuration.resource_base_uri
        : MCP_RESOURCE_BASE_URI,
    });
    this.#state = 'initialized';
  }

  async health(): Promise<IntegrationHealthReport> {
    const runtimeState = this.#runtime?.provider.state ?? 'disconnected';
    const status =
      this.#state === 'shutdown'
        ? 'unhealthy'
        : this.#state === 'initialized' && runtimeState === 'connected'
          ? 'healthy'
          : 'degraded';

    return freeze({
      status,
      checked_at: this.#now(),
      details: {
        integration: MCP_INTEGRATION_ID,
        state: this.#state,
        runtime_state: runtimeState,
        protocol_version: MCP_PROTOCOL_VERSION,
      },
    });
  }

  async shutdown(): Promise<void> {
    this.#runtime = undefined;
    this.#state = 'shutdown';
  }

  async listTools(): Promise<readonly McpToolDefinition[]> {
    return createIntegrationToolDefinitions();
  }

  async callTool(request: McpToolCallRequest): Promise<McpToolCallResult> {
    if (this.#state !== 'initialized' || !this.#runtime) {
      return freeze({
        content: [
          {
            type: 'text',
            text: 'MCP integration is not initialized.',
          },
        ],
        isError: true,
        error: {
          code: -32003,
          message: 'MCP integration is not initialized.',
          data: {
            state: this.#state,
          },
        },
      });
    }

    try {
      const response = await this.#runtime.handleRestRequest(this.#requestForTool(request));
      return this.#toolResultFromResponse(response);
    } catch (error) {
      return freeze({
        content: [
          {
            type: 'text',
            text: error instanceof Error ? error.message : 'Unexpected MCP integration failure.',
          },
        ],
        isError: true,
        error: {
          code: -32603,
          message: error instanceof Error ? error.message : 'Unexpected MCP integration failure.',
        },
      });
    }
  }

  async listResources(): Promise<readonly McpResourceDefinition[]> {
    return freeze(
      this.#resourceUris().map(
        (uri): McpResourceDefinition => ({
          uri,
          name: uri.slice(uri.lastIndexOf('/') + 1),
          title: uri.slice(uri.lastIndexOf('/') + 1).replace(/-/g, ' '),
          description: `HOST MCP resource for ${uri.slice(uri.lastIndexOf('/') + 1)}.`,
          mimeType: 'application/json',
        }),
      ),
    );
  }

  async readResource(uri: string): Promise<McpResourceReadResult> {
    if (this.#state !== 'initialized' || !this.#runtime) {
      throw new Error('MCP integration is not initialized.');
    }

    const resource = await this.#resourcePayloadFor(uri);
    if (!resource) {
      throw new Error(`Unknown MCP resource: ${uri}`);
    }

    return freeze({
      contents: [
        {
          uri,
          mimeType: 'application/json',
          text: toJsonText(resource),
        },
      ],
    });
  }

  #requestForTool(request: McpToolCallRequest): RuntimeRestRequest {
    const metadata = this.#nextMetadata(request.name);
    const args = isObject(request.arguments) ? request.arguments : {};

    switch (request.name) {
      case 'context.create':
        return freeze({
          method: 'POST',
          path: '/context',
          body: args,
          metadata: createIntegrationMetadata(metadata),
        });
      case 'context.retrieve': {
        if (!isString(args.key)) {
          throw new Error('context.retrieve requires argument "key".');
        }
        return freeze({
          method: 'GET',
          path: `/context/${encodeURIComponent(args.key)}`,
          metadata: createIntegrationMetadata(metadata),
        });
      }
      case 'context.update': {
        if (!isString(args.key)) {
          throw new Error('context.update requires argument "key".');
        }
        const body = freeze({
          value: args.value,
          ...(isObject(args.options) ? { options: args.options } : {}),
        });
        return freeze({
          method: 'PUT',
          path: `/context/${encodeURIComponent(args.key)}`,
          body,
          metadata: createIntegrationMetadata(metadata),
        });
      }
      case 'context.delete': {
        if (!isString(args.key)) {
          throw new Error('context.delete requires argument "key".');
        }
        const expectedVersion =
          isObject(args.options) && isInteger(args.options.expected_version) ? args.options.expected_version : undefined;
        return freeze({
          method: 'DELETE',
          path: `/context/${encodeURIComponent(args.key)}`,
          ...(expectedVersion !== undefined
            ? {
                query: {
                  expected_version: String(expectedVersion),
                },
              }
            : {}),
          metadata: createIntegrationMetadata(metadata),
        });
      }
      case 'context.query': {
        const query = isObject(args.query) ? args.query : {};
        const translatedQuery = queryFromObject(query);
        return freeze({
          method: 'GET',
          path: '/context',
          ...(translatedQuery ? { query: translatedQuery } : {}),
          metadata: createIntegrationMetadata(metadata),
        });
      }
    }
  }

  #toolResultFromResponse(response: RuntimeRestResponse): McpToolCallResult {
    if (response.success) {
      const payload = response.payload as Extract<RuntimeRestResponse['payload'], { readonly result: unknown }>;
      return freeze({
        content: [
          {
            type: 'text',
            text: toJsonText(payload.result),
          },
        ],
        structuredContent: payload.result,
        isError: false,
      });
    }

    const payload = response.payload as Extract<RuntimeRestResponse['payload'], { readonly error: unknown }>;
    const mapped = mapApiErrorToMcpError(payload.error.code, payload.error.message, response.status.code);

    return freeze({
      content: [
        {
          type: 'text',
          text: payload.error.message,
        },
      ],
      structuredContent: {
        error: payload.error,
        metadata: payload.metadata,
        diagnostics: payload.diagnostics,
        warnings: payload.warnings,
        api_protocol_version: API_HOST_PROTOCOL_VERSION,
      },
      isError: true,
      error: mapped,
    });
  }

  #resourceUris(): readonly string[] {
    const baseUri = this.#configuration.resource_base_uri ?? MCP_RESOURCE_BASE_URI;
    return freeze(MCP_RESOURCE_CATALOGUE.map((uri) => uri.replace(MCP_RESOURCE_BASE_URI, baseUri)));
  }

  async #resourcePayloadFor(uri: string): Promise<Readonly<Record<string, unknown>> | undefined> {
    const [healthUri, capabilitiesUri, catalogueUri, protocolUri] = this.#resourceUris();

    if (uri === healthUri) {
      return {
        integration: MCP_INTEGRATION_ID,
        health: await this.health(),
      };
    }

    if (uri === capabilitiesUri) {
      return {
        server: this.server,
        capabilities: this.server.capabilities,
      };
    }

    if (uri === catalogueUri) {
      return {
        operations: createIntegrationOperationCatalogue(),
        tools: await this.listTools(),
      };
    }

    if (uri === protocolUri) {
      return {
        mcp_protocol_version: MCP_PROTOCOL_VERSION,
        api_protocol_version: API_HOST_PROTOCOL_VERSION,
        error_translation: MCP_ERROR_CODE_BY_API_CODE,
      };
    }

    return undefined;
  }

  #nextMetadata(toolName: string): McpRequestMetadata {
    this.#requestCounter += 1;
    const requestId = String(this.#requestCounter).padStart(4, '0');

    return freeze({
      correlation_id: `mcp-correlation-${requestId}`,
      request_id: `mcp-request-${requestId}`,
      timestamp: this.#now(),
    });
  }
}

export const createMcpIntegration = (options: McpIntegrationFactoryOptions = {}): McpIntegration =>
  new DefaultMcpIntegration(options);

export const createMcpIntegrationRegistration = (
  binding: McpIntegration,
  configuration: Partial<McpIntegrationConfiguration> = {},
): {
  readonly binding: McpIntegration;
  readonly configuration: Partial<McpIntegrationConfiguration>;
} =>
  freeze({
    binding,
    configuration,
  });
