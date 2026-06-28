# @host/context-runtime

Executable runtime implementation for the canonical HOST Context model.

This package provides immutable runtime contracts for:

- `ContextReference`
- `Confidence`
- `Freshness`
- `Provenance`
- `ContextRecord`
- `ContextSnapshot`

It depends downward on HOST-1 Kernel services through `createContextRuntime(kernel)`.

It does not implement persistence, search, graph traversal, AI behaviour, refresh logic, or product-specific semantics.

Frozen package responsibilities:

- ownership: HOST execution architecture
- public API: immutable runtime value creation, validation, serialization, cloning, and equality
- permitted dependencies: `@host/kernel-core`, `@host/kernel-types`
- prohibited dependencies: `@host/context-store`, `@host/context-persistence`, provider adapters, applications
- extension points: runtime adapter options and deterministic value construction
- stability: stable v1 execution baseline
