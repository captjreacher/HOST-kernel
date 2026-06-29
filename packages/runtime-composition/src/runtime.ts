import { createApiHost, type ApiHost } from '@host/api-host';
import type {
  ContextPersistenceConnectResult,
  ContextPersistenceDisconnectResult,
  ContextPersistenceProvider,
  ContextPersistenceResult,
} from '@host/context-persistence';
import { createContextService, type ContextService } from '@host/context-service';
import {
  createRestRuntimeHost,
  type RestRuntimeHost,
  type RestRuntimeRequest,
  type RestRuntimeResponse,
} from '../../rest-runtime-host/src/index.js';
import { createRuntimeObservability } from '../../runtime-contracts/src/index.js';
import type { RestTransportAdapter } from '../../transport-rest/src/index.js';
import type { RuntimeComposition, RuntimeCompositionOptions } from './contracts.js';
import { RUNTIME_BOOTSTRAP_SEQUENCE, RUNTIME_COMPOSITION_VERSION } from './contracts.js';

const freeze = <TValue>(value: TValue): TValue => {
  if (!value || typeof value !== 'object') {
    return value;
  }

  Object.freeze(value);
  for (const nested of Object.values(value as Record<string, unknown>)) {
    if (nested && typeof nested === 'object' && !Object.isFrozen(nested)) {
      freeze(nested);
    }
  }

  return value;
};

const connectedResultFor = (provider: ContextPersistenceProvider): ContextPersistenceResult<ContextPersistenceConnectResult> =>
  freeze({
    ok: true,
    operation: 'connect',
    value: freeze({
      provider: provider.registration,
      state: 'connected',
    }),
  });

const disconnectedResultFor = (
  provider: ContextPersistenceProvider,
): ContextPersistenceResult<ContextPersistenceDisconnectResult> =>
  freeze({
    ok: true,
    operation: 'disconnect',
    value: freeze({
      provider: provider.registration,
      state: 'disconnected',
    }),
  });

class DefaultRuntimeComposition implements RuntimeComposition {
  readonly version = RUNTIME_COMPOSITION_VERSION;
  readonly bootstrap = RUNTIME_BOOTSTRAP_SEQUENCE;
  readonly provider: ContextPersistenceProvider;
  readonly contextService: ContextService;
  readonly apiHost: ApiHost;
  readonly transport?: RestTransportAdapter | undefined;
  readonly restRuntimeHost: RestRuntimeHost;
  readonly observability;

  constructor(options: RuntimeCompositionOptions) {
    this.provider = options.provider;
    this.observability = createRuntimeObservability(options.observability ?? {});
    this.contextService = options.contextService ?? createContextService({ provider: this.provider, observability: this.observability });
    this.apiHost =
      options.apiHost ??
      createApiHost({
        services: {
          context: this.contextService,
        },
        observability: this.observability,
      });
    this.transport = options.transport;
    this.restRuntimeHost =
      options.restRuntimeHost ??
      createRestRuntimeHost({
        apiHost: this.apiHost,
        ...(this.transport ? { transport: this.transport } : {}),
      });
  }

  async start(): Promise<ContextPersistenceResult<ContextPersistenceConnectResult>> {
    if (this.provider.state === 'connected') {
      return connectedResultFor(this.provider);
    }

    return this.provider.connect();
  }

  async stop(): Promise<ContextPersistenceResult<ContextPersistenceDisconnectResult>> {
    if (this.provider.state === 'disconnected') {
      return disconnectedResultFor(this.provider);
    }

    return this.provider.disconnect();
  }

  handleRestRequest(request: RestRuntimeRequest): Promise<RestRuntimeResponse> {
    return this.restRuntimeHost.handleRestRequest(request);
  }
}

export const createRuntimeComposition = (options: RuntimeCompositionOptions): RuntimeComposition =>
  new DefaultRuntimeComposition(options);
