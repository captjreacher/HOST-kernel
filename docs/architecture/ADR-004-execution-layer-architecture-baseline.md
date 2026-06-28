# ADR-004 - Execution Layer Architecture Baseline

## Status

Accepted - 2026-06-29

## Context

HOST-2.4 completed the minimum execution-layer framework required to support Context Runtime execution, storage boundaries, and persistence-provider coordination without selecting a concrete persistence technology.

The repository now contains three execution-layer packages:

- `@host/context-runtime`
- `@host/context-store`
- `@host/context-persistence`

These packages pass validation and already express the intended dependency direction in code. What remained unresolved before HOST-2.5 was the architectural freeze: a canonical statement of package boundaries, layering rules, provider strategy, and extension expectations that future adapters must follow.

This ADR freezes that baseline before any filesystem, SQLite, PostgreSQL, Supabase, graph, indexing, search, queueing, or intelligence work is introduced.

## Decision

HOST adopts the following canonical layered execution architecture.

```text
Knowledge Plane

kernel-types
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

HOST products
```

## Package Boundaries

### `@host/context-runtime`

- Ownership: HOST execution architecture
- Public API responsibility: immutable runtime creation, validation, serialization, cloning, and equality for Context Runtime value objects
- Permitted dependencies: `@host/kernel-core`, `@host/kernel-types`
- Prohibited dependencies: `@host/context-store`, `@host/context-persistence`, provider adapters, applications, product code
- Extension points: runtime adapter factory options, deterministic validation surface, serialization boundary
- Stability expectation: stable v1 execution baseline; changes must be additive or governance-approved

### `@host/context-store`

- Ownership: HOST execution architecture
- Public API responsibility: canonical storage contracts, query shape, snapshots, optimistic versioning, and transaction semantics for Context Runtime values
- Permitted dependencies: `@host/context-runtime`, `@host/kernel-core`, `@host/kernel-types`
- Prohibited dependencies: `@host/context-persistence`, provider adapters, applications, product code
- Extension points: store implementation swap, query execution strategy, transaction implementation
- Stability expectation: stable v1 storage boundary; no capability expansion without a new Objective and ADR

### `@host/context-persistence`

- Ownership: HOST execution architecture
- Public API responsibility: provider registration, connection lifecycle, session lifecycle, transaction handoff, health reporting, and capability discovery
- Permitted dependencies: `@host/context-store`, `@host/context-runtime`, `@host/kernel-core`, `@host/kernel-types`
- Prohibited dependencies: concrete persistence technologies in-core, applications, product code
- Extension points: provider factories, capability negotiation, provider metadata, compatibility checks
- Stability expectation: stable v1 provider framework; adapter additions must occur in separate provider packages

## Dependency Direction

The dependency model is frozen as one-way and downward:

- HOST-1 kernel packages do not depend on execution packages.
- `context-runtime` depends on HOST-1 only.
- `context-store` may depend on `context-runtime` but must not bypass it.
- `context-persistence` may depend on `context-store` and `context-runtime` but remains the top of the execution plane.
- Future provider packages must depend on `context-persistence` as the canonical execution entry point and must not bypass it to couple directly to `context-store` or `context-runtime`.
- Applications may consume the provider layer or the execution plane only through approved package boundaries.

## Provider Strategy

Future persistence adapters are treated as provider-layer packages, not as extensions embedded into `@host/context-persistence`.

They must follow these rules:

- Registration: each provider exposes a stable provider registration record with unique `provider_id`, human-readable `provider_name`, semantic `provider_version`, and provider kind
- Naming: provider packages use the canonical form `@host/context-provider-<adapter>` such as `@host/context-provider-filesystem`
- Lifecycle: providers must implement explicit connect, disconnect, session, transaction, and health lifecycle semantics
- Capability negotiation: providers report supported capabilities without assuming optional features exist
- Error handling: providers surface deterministic errors at the package boundary and must not leak technology-specific driver objects across the public API
- Compatibility: providers declare compatibility with the frozen execution-layer contracts and treat breaking contract drift as a governance event

## Consequences

Positive consequences:

- HOST-2.5 and later adapters now have a stable boundary to build against
- dependency rules can be verified mechanically
- execution-layer responsibilities are clear without selecting infrastructure early
- HOST-1 remains independent and reusable

Constraints introduced by this decision:

- new persistence technologies must ship as separate provider packages
- execution-layer packages must not absorb application concerns
- non-additive API changes require a new Objective and ADR

## Out Of Scope

This ADR does not approve:

- filesystem persistence implementation
- SQLite
- PostgreSQL
- Supabase
- graph databases
- indexing
- search
- refresh queues
- intelligence or inference
- workflow execution
- application API expansion

## Baseline Declaration

The HOST execution layer is frozen as the v1 architecture baseline.

HOST-2.5 may begin after validation passes without requiring further structural changes to the execution plane.
