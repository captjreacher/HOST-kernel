import type { ApiHost } from '@host/api-host';
import type {
  ContextPersistenceConnectResult,
  ContextPersistenceDisconnectResult,
  ContextPersistenceProvider,
  ContextPersistenceResult,
} from '@host/context-persistence';
import type { ContextService } from '@host/context-service';
import type {
  RestRuntimeHost,
  RestRuntimeRequest,
  RestRuntimeResponse,
} from '../../rest-runtime-host/src/index.js';
import type { RuntimeObservability } from '../../runtime-contracts/src/index.js';
import type { RestTransportAdapter } from '../../transport-rest/src/index.js';

export const RUNTIME_COMPOSITION_VERSION = '1.0.0' as const;

export const RUNTIME_BOOTSTRAP_SEQUENCE = [
  'provider.connect',
  'context-service.create',
  'api-host.create',
  'transport-rest.resolve',
  'rest-runtime-host.create',
] as const;

export interface RuntimeCompositionOptions {
  readonly provider: ContextPersistenceProvider;
  readonly observability?: RuntimeObservability | undefined;
  readonly contextService?: ContextService | undefined;
  readonly apiHost?: ApiHost | undefined;
  readonly transport?: RestTransportAdapter | undefined;
  readonly restRuntimeHost?: RestRuntimeHost | undefined;
}

export interface RuntimeComposition {
  readonly version: typeof RUNTIME_COMPOSITION_VERSION;
  readonly bootstrap: typeof RUNTIME_BOOTSTRAP_SEQUENCE;
  readonly provider: ContextPersistenceProvider;
  readonly contextService: ContextService;
  readonly apiHost: ApiHost;
  readonly transport?: RestTransportAdapter | undefined;
  readonly restRuntimeHost: RestRuntimeHost;
  readonly observability: RuntimeObservability;
  start(): Promise<ContextPersistenceResult<ContextPersistenceConnectResult>>;
  stop(): Promise<ContextPersistenceResult<ContextPersistenceDisconnectResult>>;
  handleRestRequest(request: RestRuntimeRequest): Promise<RestRuntimeResponse>;
}
