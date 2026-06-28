# Context Runtime

`packages/context-runtime` is the executable runtime model for HOST-2.1.

It provides immutable deterministic implementations for:

- `ContextReference`
- `Confidence`
- `Freshness`
- `Provenance`
- `ContextRecord`
- `ContextSnapshot`

The package consumes HOST-1 Kernel services through `createContextRuntime(kernel)`.

It introduces no persistence, no graph traversal, no AI behaviour, and no product logic.

## Frozen Responsibility

Ownership:

- HOST execution architecture

Public API responsibility:

- immutable runtime value construction
- deterministic validation
- canonical serialization and cloning

Permitted dependencies:

- `@host/kernel-core`
- `@host/kernel-types`

Prohibited dependencies:

- `@host/context-store`
- `@host/context-persistence`
- provider adapters
- applications

Extension points:

- `createContextRuntime(kernel, options)`
- adapter factory creation through `createContextRuntimeAdapter`

Stability expectation:

- stable v1 execution baseline
- additive changes only unless governance approves otherwise

Dependency direction remains one-way:

Knowledge Plane -> `@host/context-runtime` -> higher execution or provider layers

See also:

- [Execution Layer Architecture](execution-layer.md)
- [ADR-004 - Execution Layer Architecture Baseline](ADR-004-execution-layer-architecture-baseline.md)
