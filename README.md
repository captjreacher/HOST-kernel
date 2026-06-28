# HOST-kernel

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-006 |
| Status | Governance Baseline v1.0 |
| Version | 1.9 |
| Owner | HOST |
| Last reviewed | 2026-06-29 |
| Constitution | [OBJ-000](docs/constitution/ecosystem-constitution.md) |
| Related documents | [docs/index.md](docs/index.md), [docs/constitution/ecosystem-constitution.md](docs/constitution/ecosystem-constitution.md), [docs/taxonomy/taxonomy-registry.md](docs/taxonomy/taxonomy-registry.md), [docs/kernel/operating-model.md](docs/kernel/operating-model.md), [docs/architecture/package-dependency-graph.md](docs/architecture/package-dependency-graph.md) |

HOST-kernel is the Platform Kernel runtime for the MGRNZ ecosystem platform.

Current release: Kernel 1.10 with the HOST-2 execution layer frozen and the HOST-3 application layer approved as architecture baselines.

Execution Plane runtime status: `context-runtime`, `context-store`, and `context-persistence` are implemented and architecture-frozen pending concrete provider adapters.

Application Layer status: `@host/context-service` is implemented as the canonical application-layer boundary for persisted context operations.

The canonical governance entry point for the ecosystem is [docs/constitution/ecosystem-constitution.md](docs/constitution/ecosystem-constitution.md).

The canonical governance source for the ecosystem is [docs/taxonomy/taxonomy-registry.md](docs/taxonomy/taxonomy-registry.md), supported by [ADR-001](docs/architecture/ADR-001-ecosystem-taxonomy-and-numbering.md).

The canonical operating model for governance is [docs/kernel/operating-model.md](docs/kernel/operating-model.md), supported by [ADR-002](docs/architecture/ADR-002-host-kernel-operating-model.md).

It is not a product.

It is not HOST the public interface.

It is not Cockpit the operator interface.

## Workspace Layout

The repository now uses a package-oriented monorepo structure:

- `packages/kernel-types` for shared interfaces
- `packages/kernel-identifiers` for canonical ID contracts
- `packages/kernel-taxonomy` for taxonomy resolution contracts
- `packages/kernel-validation` for validation contracts
- `packages/kernel-registry` for the runtime registry service
- `packages/kernel-objectives` for objective lifecycle contracts
- `packages/kernel-documents` for document registry contracts
- `packages/kernel-repositories` for repository registry contracts
- `packages/kernel-events` for canonical runtime events
- `packages/kernel-core` for the composed kernel surface
- `packages/kernel-api` for the Control Plane runtime API facade
- `packages/context-runtime` for the executable Context Runtime model
- `packages/context-store` for the canonical Context storage boundary
- `packages/context-persistence` for the persistence provider framework
- `packages/context-service` for the application-layer persisted context service boundary
- `packages/context-persistence-filesystem` for the first concrete filesystem provider-layer adapter

The canonical identifier model is documented in [docs/architecture/identifier-service.md](docs/architecture/identifier-service.md).

## Running Checks

```bash
npm install
npm run build
npm test
npm run verify:graph
```

## Documentation

- [docs/objectives/HOST-1.1-kernel-foundation.md](docs/objectives/HOST-1.1-kernel-foundation.md)
- [docs/objectives/HOST-1.4-validation-engine.md](docs/objectives/HOST-1.4-validation-engine.md)
- [docs/objectives/HOST-1.5-registry-service.md](docs/objectives/HOST-1.5-registry-service.md)
- [docs/objectives/HOST-1.9-kernel-bootstrap.md](docs/objectives/HOST-1.9-kernel-bootstrap.md)
- [docs/objectives/HOST-1.10-kernel-api.md](docs/objectives/HOST-1.10-kernel-api.md)
- [docs/templates/implementation-task-template.md](docs/templates/implementation-task-template.md)
- [docs/architecture/package-dependency-graph.md](docs/architecture/package-dependency-graph.md)
- [docs/architecture/kernel-api.md](docs/architecture/kernel-api.md)
- [docs/architecture/context-runtime.md](docs/architecture/context-runtime.md)
- [docs/architecture/execution-layer.md](docs/architecture/execution-layer.md)
- [docs/architecture/application-layer.md](docs/architecture/application-layer.md)
- [docs/architecture/ADR-004-execution-layer-architecture-baseline.md](docs/architecture/ADR-004-execution-layer-architecture-baseline.md)
- [docs/architecture/ADR-006-application-layer-architecture-baseline.md](docs/architecture/ADR-006-application-layer-architecture-baseline.md)
- [docs/changelog/README.md](docs/changelog/README.md)

## Scope Notes

- The existing registry service remains available through the new `kernel-registry` package.
- Root `src/` files now act as compatibility shims over the workspace packages.
- The kernel foundation now includes a composed bootstrap runtime in `kernel-core`.
- The Kernel API now exposes the Control Plane through the runtime facade in `kernel-api`.
- The execution layer is frozen as `context-runtime` -> `context-store` -> `context-persistence`, with future adapters required to sit above that boundary.
- The Application Layer is architecture-defined above the execution/provider stack and below products, with `@host/context-service` as the first implemented boundary for persistence-backed context operations.
