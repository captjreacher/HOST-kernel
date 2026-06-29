# HOST Package Dependency Graph

```mermaid
graph TD
  subgraph Knowledge["Knowledge Plane / HOST-1"]
  KTypes["@host/kernel-types"]
  KEvents["@host/kernel-events"]
  KIdentifiers["@host/kernel-identifiers"]
  KTaxonomy["@host/kernel-taxonomy"]
  KValidation["@host/kernel-validation"]
  KObjectives["@host/kernel-objectives"]
  KDocuments["@host/kernel-documents"]
  KRepositories["@host/kernel-repositories"]
  KRegistry["@host/kernel-registry"]
  RuntimeContracts["@host/runtime-contracts"]
  KCore["@host/kernel-core"]
  KApi["@host/kernel-api"]
  end

  subgraph Execution["Execution Plane / HOST-2"]
  CtxRuntime["@host/context-runtime"]
  CtxStore["@host/context-store"]
  CtxPersistence["@host/context-persistence"]
  end

  ProviderLayer["Future Provider Layer"]
  CtxFsProvider["@host/context-provider-filesystem"]
  CtxSqliteProvider["@host/context-provider-sqlite"]

  subgraph Application["Application Layer / HOST-3"]
  ContextService["@host/context-service"]
  ApiHost["@host/api-host"]
  end

  subgraph Transport["Transport Layer / HOST-3.x"]
  Adapter["@host/transport-adapter"]
  Rest["@host/transport-rest"]
  end

  RuntimeHost["@host/rest-runtime-host"]
  RuntimeComposition["@host/runtime-composition"]

  subgraph Integration["Integration Layer / HOST-4"]
  IntegrationContracts["@host/integration-contracts"]
  IntegrationEvents["@host/integration-events"]
  IntegrationWorkflow["@host/integration-workflow"]
  IntegrationExecution["@host/integration-execution"]
  IntegrationExecutionPersistence["@host/integration-execution-persistence"]
  IntegrationMcp["@host/integration-mcp"]
  end

  Products["Products"]

  KEvents --> KTypes
  KIdentifiers --> KTypes
  KIdentifiers --> KTaxonomy
  KTaxonomy --> KTypes
  KValidation --> KTypes
  KValidation --> KIdentifiers
  KValidation --> KTaxonomy
  KObjectives --> KTypes
  KObjectives --> KIdentifiers
  KObjectives --> KRegistry
  KObjectives --> KValidation
  KDocuments --> KTypes
  KDocuments --> KRegistry
  KRepositories --> KTypes
  KRegistry --> KTypes
  KRegistry --> KValidation
  KCore --> RuntimeContracts
  KCore --> KTypes
  KCore --> KEvents
  KCore --> KIdentifiers
  KCore --> KTaxonomy
  KCore --> KValidation
  KCore --> KObjectives
  KCore --> KDocuments
  KCore --> KRepositories
  KCore --> KRegistry
  KApi --> KTypes
  KApi --> KValidation
  KApi --> KObjectives
  KApi --> KRegistry
  KApi --> KCore
  CtxRuntime --> KTypes
  CtxRuntime --> KCore
  CtxStore --> KTypes
  CtxStore --> KCore
  CtxStore --> CtxRuntime
  CtxPersistence --> KTypes
  CtxPersistence --> KCore
  CtxPersistence --> CtxRuntime
  CtxPersistence --> CtxStore
  CtxFsProvider --> CtxPersistence
  CtxSqliteProvider --> CtxPersistence
  ProviderLayer --> CtxFsProvider
  ProviderLayer --> CtxSqliteProvider
  ContextService --> RuntimeContracts
  ContextService --> CtxPersistence
  ApiHost --> RuntimeContracts
  ApiHost --> ContextService
  Adapter --> RuntimeContracts
  Adapter --> ApiHost
  Rest --> Adapter
  Rest --> ApiHost
  RuntimeHost --> Rest
  RuntimeHost --> ApiHost
  RuntimeComposition --> RuntimeContracts
  RuntimeComposition --> CtxPersistence
  RuntimeComposition --> ContextService
  RuntimeComposition --> ApiHost
  RuntimeComposition --> Rest
  RuntimeComposition --> RuntimeHost
  IntegrationContracts --> RuntimeComposition
  IntegrationEvents --> IntegrationContracts
  IntegrationWorkflow --> IntegrationEvents
  IntegrationExecution --> IntegrationWorkflow
  IntegrationExecutionPersistence --> IntegrationExecution
  IntegrationExecutionPersistence --> IntegrationWorkflow
  IntegrationExecutionPersistence --> IntegrationEvents
  IntegrationExecutionPersistence --> CtxPersistence
  IntegrationMcp --> IntegrationContracts
  Products --> IntegrationMcp
```

## Canonical Layering

```text
Knowledge Plane

kernel-types
runtime-contracts
kernel-core
kernel-taxonomy
kernel-validation
kernel-api

↓

Execution Plane

context-runtime
context-store
context-persistence

↓

Future Provider Layer

filesystem
sqlite
postgres
supabase
graph

↓

Application Layer

@host/context-service
@host/api-host

↓

Transport Layer

@host/transport-adapter
@host/transport-rest

↓

Runtime Edge

@host/rest-runtime-host
@host/runtime-composition

↓

Integration Layer

@host/integration-contracts
@host/integration-events
@host/integration-workflow
@host/integration-execution
@host/integration-execution-persistence
@host/integration-mcp

↓

Products
```

## Frozen Rules

- The graph is intentionally acyclic.
- `kernel-types`, `runtime-contracts`, and HOST-1 packages remain independent of execution packages.
- `context-runtime` depends downward on HOST-1 only.
- `context-store` may depend on `context-runtime` but must not be bypassed by future provider packages.
- `context-persistence` remains the top of the execution plane and the canonical entry point for future provider packages.
- `@host/context-provider-filesystem` and `@host/context-provider-sqlite` are concrete provider-layer implementations and depend downward only.
- Future provider packages must depend on `@host/context-persistence` and must not depend on applications.
- Application packages must remain above the provider layer and below the Transport Layer.
- Transport adapter packages must remain above the Application Layer and below the runtime edge.
- Runtime edge packages must remain above the Transport Layer and below the Integration Layer.
- Integration packages must remain above the runtime edge and below products.
- Application packages may compose execution abstractions and bind approved provider packages only at application composition roots.
- Persistence-backed APIs begin in the Application Layer and must not be introduced into `kernel-api`.
- `@host/context-service` may depend only on `@host/context-persistence` and `@host/runtime-contracts`.
- `@host/api-host` may depend only on `@host/context-service` and `@host/runtime-contracts`.
- `@host/api-host` owns the frozen HOST-3.3 operation registry, request envelope, response envelope, error taxonomy, and transaction contract.
- `@host/transport-adapter` is the sole canonical Transport Layer contract package and may depend only on `@host/api-host` and `@host/runtime-contracts`.
- `@host/transport-rest` is the first concrete transport translation package and may depend only on `@host/transport-adapter` and `@host/api-host`.
- `@host/rest-runtime-host` is the first runtime host package and may depend only on `@host/transport-rest` and `@host/api-host`.
- `@host/runtime-composition` is the canonical bootstrap package and may depend only on `@host/context-persistence`, `@host/context-service`, `@host/api-host`, `@host/transport-rest`, `@host/rest-runtime-host`, and `@host/runtime-contracts`.
- `@host/integration-contracts` may depend only on `@host/runtime-composition`.
- `@host/integration-events` may depend only on `@host/integration-contracts`.
- `@host/integration-workflow` may depend only on `@host/integration-events`.
- `@host/integration-execution` may depend only on `@host/integration-workflow`.
- `@host/integration-execution-persistence` may depend only on `@host/integration-execution`, `@host/integration-workflow`, `@host/integration-events`, and `@host/context-persistence`.
- `@host/integration-mcp` may depend only on `@host/integration-contracts`.
- transport adapters must not depend on execution packages, provider packages, or HOST-1 kernel internals.
- runtime edge packages must not introduce framework listeners, service locators, or vendor integrations.
- integration packages must not bypass `@host/runtime-composition` to depend directly on transport, application, execution, provider, or HOST-1 packages.
- application, execution, and provider packages must not depend upward on transport, runtime-edge, or integration packages.

## HOST Responsibilities

The Application Layer baseline currently contains two implemented packages plus one shared runtime contract package responsibility:

- `@host/context-service` for persistence-backed orchestration, transactions, and application-layer error translation
- `@host/api-host` for canonical API contract handling, operation dispatch, and stable API error translation
- `@host/runtime-contracts` for shared authentication, correlation, request context, logger, metrics, and tracer contracts

The Transport Layer baseline currently contains one implemented contract package and one implemented translation package responsibility:

- `@host/transport-adapter` for canonical adapter contracts, authentication context contracts, correlation and tracing metadata, and deterministic metadata defaults
- `@host/transport-rest` for stateless REST request and response translation, route registry mapping, query parameter mapping, and deterministic HTTP status translation

The runtime edge currently contains two implemented package responsibilities:

- `@host/rest-runtime-host` for injected `ApiHost` composition, reusable request handling, response shaping through `@host/transport-rest`, and deterministic runtime-level fallback errors
- `@host/runtime-composition` for provider-to-runtime-host bootstrap assembly and lifecycle-oriented runtime composition

The Integration Layer currently contains four implemented foundation package responsibilities and one implemented reference runtime:

- `@host/integration-contracts` for canonical lifecycle contracts, configuration contracts, integration registration, health reporting, and deterministic integration bootstrap above runtime composition
- `@host/integration-events` for immutable event envelopes, event registry contracts, publication and subscription contracts, workflow trigger primitives, and deterministic metadata defaults
- `@host/integration-workflow` for immutable workflow definitions, workflow registration, deterministic lifecycle transitions, execution context/state modeling, and retry/idempotency/compensation metadata handling
- `@host/integration-execution` for immutable execution instances, execution registry, execution coordinator and dispatch contracts, context propagation, observability metadata, and deterministic execution lifecycle transitions
- `@host/integration-execution-persistence` for provider-neutral durable workflow, execution, dispatch, and event-history repositories plus deterministic recovery after restart
- `@host/integration-mcp` for the reference MCP runtime, tool and resource exposure, runtime-path request translation, and deterministic MCP error mapping

The repository verifier in [scripts/verify-package-graph.mjs](../../scripts/verify-package-graph.mjs) now enforces the implemented `@host/context-service`, `@host/api-host`, `@host/transport-adapter`, `@host/transport-rest`, `@host/rest-runtime-host`, `@host/runtime-composition`, `@host/integration-contracts`, `@host/integration-events`, `@host/integration-workflow`, `@host/integration-execution`, `@host/integration-execution-persistence`, and `@host/integration-mcp` dependency rules while still reserving `@host/app-` and `@host/product-` prefixes for future architecture enforcement.
