# ADR-006 - Application Layer Architecture Baseline

## Status

Accepted - 2026-06-29

## Context

ADR-004 froze the execution layer as:

- `@host/context-runtime`
- `@host/context-store`
- `@host/context-persistence`

ADR-005 then clarified that persistence-backed APIs must not be introduced through HOST-1 `kernel-api` because:

- HOST-1 runtime context contracts are synchronous
- HOST-2 persistence composition is asynchronous by contract
- moving persistence-backed transport concerns into HOST-1 would weaken both the HOST-1 freeze and the ADR-004 execution boundary

What remained undefined at HOST-3.0 was the architectural home for:

- orchestration across execution capabilities
- asynchronous workflows
- persistence-backed APIs
- the application-facing API host boundary
- application-specific policies

HOST-3 establishes that boundary before any application functionality is implemented.

## Decision

HOST adopts an Application Layer above the execution/provider stack and below products.

Its role is to own:

- orchestration
- asynchronous workflows
- persistence-backed APIs
- the application-facing API host boundary
- composition of execution-layer capabilities
- application-specific policies

It must not own:

- kernel concepts
- taxonomy
- immutable runtime contracts
- provider implementations

## Layered Stack

```text
Governance

-> 

Knowledge Plane

kernel-types
kernel-core
kernel-taxonomy
kernel-validation
kernel-api

-> 

Execution Layer

context-runtime
context-store
context-persistence

-> 

Future Provider Layer

filesystem
sqlite
postgres
supabase
graph

-> 

Application Layer

context-service
application-runtime
api-host

-> 

Products
```

The HOST-3 package names listed above are conceptual responsibilities only.

This ADR does not create those packages.

## Application Package Responsibilities

### `context-service` (conceptual)

- application-facing orchestration over persisted context operations
- policy enforcement for persistence-backed context flows
- composition through `@host/context-persistence` rather than around it

### `application-runtime` (conceptual)

- application composition root
- workflow and background execution coordination
- binding of approved provider packages into application services without leaking provider details into contracts

### `api-host` (conceptual)

- persistence-backed API hosting
- the frozen application-facing protocol boundary
- translation between application services and future adapter implementations

## Dependency Rules

Allowed direction is downward only:

- Governance -> Knowledge Plane -> Execution Layer -> Future Provider Layer -> Application Layer -> Products

Therefore:

- HOST-1 remains independent of execution, provider, application, and product concerns
- HOST-2 remains independent of application and product concerns
- provider packages remain leaf implementations below applications
- HOST-3 may compose execution abstractions and bind approved providers at composition roots
- products may consume application capabilities but must not become the shared architectural boundary for them

Forbidden:

- reverse dependencies from HOST-1 or HOST-2 into HOST-3
- persistence-backed API exposure through `kernel-api`
- provider-specific public contracts in HOST-3
- application ownership of kernel concepts or immutable runtime contracts
- product ownership of shared persistence-backed platform APIs that belong in HOST-3

## API Boundary Clarification

The architecture is split into three API responsibilities:

- HOST-1: synchronous runtime APIs through `kernel-api`
- HOST-2: persistence composition and provider coordination through execution contracts
- HOST-3: persistence-backed API endpoints and workflow orchestration

Example separation:

```text
Runtime-only request:
caller -> kernel-api -> KernelContextRuntimeAdapter -> create/validate

Persistence-backed request:
caller -> api-host -> context-service -> context-persistence -> provider -> storage
```

Persistence-backed APIs begin in HOST-3 rather than HOST-1 because transport orchestration over asynchronous provider-backed persistence is an application concern, not a runtime contract concern.

## Consequences

Positive consequences:

- ADR-004 and ADR-005 remain intact
- HOST-1 stays synchronous and provider-agnostic
- HOST-2 stays focused on execution contracts and provider composition
- HOST-3 gains a clear home for APIs and workflows before implementation starts
- products can consume stable application services without redefining shared persistence boundaries

Constraints introduced by this decision:

- HOST-3 must not implement kernel semantics
- HOST-3 must not leak provider-specific concepts through public contracts
- future application packages should be introduced only when a concrete use case requires them
- HOST-3.0 remains architecture only

## Out Of Scope

HOST-3.4 later establishes the Transport Layer above `api-host` as a separate architecture concern through ADR-007.

This ADR does not approve:

- application package implementation
- business logic
- product endpoints
- authentication or authorization strategy
- workflow engine implementation
- background queue selection
- provider selection or infrastructure choice

## Baseline Declaration

The HOST-3 Application Layer Architecture Baseline is approved.

Persistence-backed APIs originate here and not in HOST-1.
