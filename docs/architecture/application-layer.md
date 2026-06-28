# Application Layer Architecture

## Purpose

This document establishes the HOST-3 application layer as the boundary above the frozen execution stack and below product implementations.

The Application Layer exists to own composition and transport concerns that must not be introduced into HOST-1 or HOST-2.

It is responsible for:

- orchestration of execution-layer capabilities
- asynchronous workflows
- persistence-backed APIs
- external adapter boundaries
- application-specific policies
- composition roots that bind approved execution and provider packages into product-facing services

It is not responsible for:

- kernel concepts
- taxonomy
- immutable runtime contracts
- provider implementations
- persistence provider lifecycle contracts
- product-specific feature logic

## Canonical Stack

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

@host/context-service
@host/api-host
application-runtime

-> 

Products
```

The Application Layer now contains two implemented package boundaries, `@host/context-service` and `@host/api-host`.

`application-runtime` remains conceptual.

## Responsibility Boundaries

### `@host/context-service`

Purpose:

- expose application-facing orchestration over execution-layer persistence capabilities
- compose runtime validation, storage access, and persistence sessions into product-facing operations
- centralize application-level policies for persisted context flows
- provide the canonical asynchronous service contract for persisted context CRUD and transactions

Must not:

- redefine Context Runtime contracts
- expose provider-specific types
- bypass `@host/context-persistence`

Implementation status:

- implemented in HOST-3.1 as `packages/context-service`
- depends only on `@host/context-persistence`
- translates execution-layer failures into deterministic application-layer service errors

### `application-runtime` (conceptual)

Purpose:

- act as the application composition root
- wire approved execution abstractions and provider packages into application services
- host asynchronous workflow coordination and background processing entry points

Must not:

- change execution-layer contracts
- push provider semantics upward into application contracts
- absorb product-specific feature logic

### `@host/api-host`

Purpose:

- expose a transport-neutral request and response boundary for HOST-3 capabilities
- dispatch canonical protocol requests into application services
- translate application-service failures into stable API responses
- act as the canonical composition point for future adapter implementations without embedding adapter semantics

Must not:

- implement listeners or adapter runtimes
- import adapter frameworks or SDKs
- expose provider lifecycle or provider-specific details
- replace `kernel-api` as the HOST-1 synchronous runtime facade

Implementation status:

- implemented in HOST-3.2 and hardened in HOST-3.3 as `packages/api-host`
- depends only on `@host/context-service`
- owns the frozen operation registry, canonical request and response envelopes, stable API error taxonomy, and transaction handle management for persisted context operations

## Dependency Rules

Allowed dependency direction:

```text
Governance
  ->
Knowledge Plane
  ->
Execution Layer
  ->
Future Provider Layer
  ->
Application Layer
  ->
Products
```

Allowed:

- Knowledge Plane packages may depend only within the HOST-1 baseline.
- Execution Layer packages may depend downward on HOST-1 only, as frozen by ADR-004.
- Provider packages may depend downward on `@host/context-persistence` only, as frozen by ADR-004.
- Application packages may depend downward on execution abstractions and may bind approved provider packages at application composition roots.
- `@host/context-service` is the canonical entry point for persisted context operations and depends only on `@host/context-persistence`.
- `@host/api-host` is the canonical composition point between adapters and application services and depends only on `@host/context-service`.
- Product code may depend on application packages and transport surfaces.

Forbidden:

- no HOST-1 package may depend on HOST-2, HOST-3, providers, or products
- no execution package may depend on applications or products
- no provider package may depend on applications or products
- no application package may redefine kernel concepts, taxonomy, runtime contracts, or provider contracts
- no application package may introduce provider awareness into public API contracts
- no application package may introduce adapter semantics into `@host/api-host` contracts
- no product package may become the architectural home of persistence-backed shared APIs that belong in HOST-3

## API Boundary

The API split is now explicit:

- synchronous runtime APIs remain in HOST-1 through `kernel-api`
- persistence composition remains in HOST-2 through `context-runtime` -> `context-store` -> `context-persistence`
- persistence-backed APIs originate in HOST-3 adapters and application services
- persisted context orchestration begins in `@host/context-service`
- transport-neutral API dispatch begins in `@host/api-host`

### Example Request Flow

```text
Caller
  ->
future adapter
  ->
@host/api-host (HOST-3 operation dispatch and API translation)
  ->
@host/context-service (HOST-3 orchestration and policy)
  ->
@host/context-persistence (HOST-2 execution boundary)
  ->
@host/context-provider-<adapter> (provider layer)
  ->
underlying persistence technology
```

For comparison, runtime-only synchronous flows remain separate:

```text
Caller
  ->
kernel-api (HOST-1 runtime facade)
  ->
KernelContextRuntimeAdapter
  ->
runtime create and validate only
```

This preserves the ADR-005 rule that persistence-backed APIs do not extend the HOST-1 runtime adapter contract.

## Baseline Declaration

The HOST-3 application layer is approved as an architecture baseline.

The `@host/api-host` contract is frozen at protocol version `1.0.0`.
Future work may add adapters, but adapter work must implement the HOST-3.3 contract rather than redefining it.

This baseline defines boundaries only.
It does not approve package creation, business logic, provider selection, or product functionality.
