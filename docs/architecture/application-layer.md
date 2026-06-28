# Application Layer Architecture

## Purpose

This document establishes the HOST-3 application layer as the boundary above the frozen execution stack and below product implementations.

The Application Layer exists to own composition and transport concerns that must not be introduced into HOST-1 or HOST-2.

It is responsible for:

- orchestration of execution-layer capabilities
- asynchronous workflows
- persistence-backed APIs
- external transports
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

context-service
application-runtime
api-host

-> 

Products
```

The package names shown for the Application Layer are architectural concepts only.

No HOST-3 package is created by this baseline.

## Responsibility Boundaries

### `context-service` (conceptual)

Purpose:

- expose application-facing orchestration over execution-layer persistence capabilities
- compose runtime validation, storage access, and persistence sessions into product-facing operations
- centralize application-level policies for persisted context flows

Must not:

- redefine Context Runtime contracts
- expose provider-specific types
- bypass `@host/context-persistence`

### `application-runtime` (conceptual)

Purpose:

- act as the application composition root
- wire approved execution abstractions and provider packages into application services
- host asynchronous workflow coordination and background processing entry points

Must not:

- change execution-layer contracts
- push provider semantics upward into application contracts
- absorb product-specific feature logic

### `api-host` (conceptual)

Purpose:

- expose external transports for HOST-3 capabilities
- host persistence-backed API endpoints
- translate transport concerns into application-service calls

Must not:

- duplicate kernel validation or execution-layer persistence logic
- expose provider lifecycle, session, or transaction implementation details directly
- replace `kernel-api` as the HOST-1 synchronous runtime facade

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
- Product code may depend on application packages and transport surfaces.

Forbidden:

- no HOST-1 package may depend on HOST-2, HOST-3, providers, or products
- no execution package may depend on applications or products
- no provider package may depend on applications or products
- no application package may redefine kernel concepts, taxonomy, runtime contracts, or provider contracts
- no application package may introduce provider awareness into public API contracts
- no product package may become the architectural home of persistence-backed shared APIs that belong in HOST-3

## API Boundary

The API split is now explicit:

- synchronous runtime APIs remain in HOST-1 through `kernel-api`
- persistence composition remains in HOST-2 through `context-runtime` -> `context-store` -> `context-persistence`
- persistence-backed APIs originate in HOST-3 transports and application services

### Example Request Flow

```text
Caller
  ->
api-host (HOST-3 transport)
  ->
context-service (HOST-3 orchestration and policy)
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

This baseline defines boundaries only.
It does not approve package creation, business logic, provider selection, or product functionality.
