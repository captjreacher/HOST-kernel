# HOST-kernel

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-006 |
| Status | Governance Baseline v1.0 |
| Version | 1.10 |
| Owner | HOST |
| Last reviewed | 2026-06-29 |
| Constitution | [OBJ-000](docs/constitution/ecosystem-constitution.md) |
| Related documents | [docs/index.md](docs/index.md), [docs/constitution/ecosystem-constitution.md](docs/constitution/ecosystem-constitution.md), [docs/taxonomy/taxonomy-registry.md](docs/taxonomy/taxonomy-registry.md), [docs/kernel/operating-model.md](docs/kernel/operating-model.md), [docs/architecture/package-dependency-graph.md](docs/architecture/package-dependency-graph.md) |

HOST-kernel is the Platform Kernel runtime for the MGRNZ ecosystem platform.

Current release: Kernel 1.10 with the HOST-2 execution layer frozen, HOST-3 functionally complete through runtime composition, and HOST-4.0 defined as the architecture baseline for the future Integration Layer.

Execution Plane runtime status: `context-runtime`, `context-store`, and `context-persistence` are implemented and architecture-frozen pending concrete provider adapters.

Application Layer status: `@host/context-service` and `@host/api-host` are implemented as the canonical service and transport-neutral host boundaries for persisted context operations.

Transport Layer status: `@host/transport-adapter` defines the frozen Transport Adapter Contract v`1.0.0`, `@host/transport-rest` provides the first concrete REST translation package, and `@host/rest-runtime-host` provides the first runtime-neutral REST handler boundary. No web server or listener is present in this repository.

Runtime Foundation status: `@host/runtime-contracts` defines the shared authentication, correlation, and observability contracts, and `@host/runtime-composition` provides the canonical dependency-injected bootstrap chain from persistence provider to REST runtime host.

Integration Layer status: HOST-4.0 establishes the architectural boundary for reusable integrations above `@host/runtime-composition` and below products. No integration packages or external runtime implementations are introduced in this repository.

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
- `packages/runtime-contracts` for transport-neutral runtime auth, correlation, and observability contracts
- `packages/kernel-core` for the composed kernel surface
- `packages/kernel-api` for the Control Plane runtime API facade
- `packages/context-runtime` for the executable Context Runtime model
- `packages/context-store` for the canonical Context storage boundary
- `packages/context-persistence` for the persistence provider framework
- `packages/context-service` for the application-layer persisted context service boundary
- `packages/api-host` for the transport-neutral API host boundary over application services
- `packages/transport-adapter` for the canonical Transport Layer contract package
- `packages/transport-rest` for the framework-neutral REST translation adapter
- `packages/rest-runtime-host` for the injected REST runtime host boundary
- `packages/runtime-composition` for canonical provider-to-runtime-host bootstrap composition
- `packages/context-persistence-filesystem` for the first concrete filesystem provider-layer adapter
- `packages/context-persistence-sqlite` for the concrete SQLite provider-layer adapter

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
- [docs/architecture/transport-layer.md](docs/architecture/transport-layer.md)
- [docs/architecture/runtime-architecture.md](docs/architecture/runtime-architecture.md)
- [docs/architecture/integration-layer.md](docs/architecture/integration-layer.md)
- [docs/architecture/ADR-007-transport-adapter-architecture-baseline.md](docs/architecture/ADR-007-transport-adapter-architecture-baseline.md)
- [docs/architecture/ADR-008-integration-layer-architecture-baseline.md](docs/architecture/ADR-008-integration-layer-architecture-baseline.md)
- [docs/architecture/ADR-004-execution-layer-architecture-baseline.md](docs/architecture/ADR-004-execution-layer-architecture-baseline.md)
- [docs/architecture/ADR-006-application-layer-architecture-baseline.md](docs/architecture/ADR-006-application-layer-architecture-baseline.md)
- [docs/changelog/README.md](docs/changelog/README.md)

## Scope Notes

- The existing registry service remains available through the new `kernel-registry` package.
- Root `src/` files now act as compatibility shims over the workspace packages.
- The kernel foundation now includes a composed bootstrap runtime in `kernel-core`.
- The Kernel API now exposes the Control Plane through the runtime facade in `kernel-api`.
- The execution layer is frozen as `context-runtime` -> `context-store` -> `context-persistence`, with future adapters required to sit above that boundary.
- The Application Layer is architecture-defined above the execution/provider stack and below products, with `@host/context-service` and `@host/api-host` providing the first implemented service and host boundaries for persistence-backed context operations.
- The runtime edge now includes `@host/rest-runtime-host`, which composes an injected `ApiHost` with `@host/transport-rest` through a reusable `handleRestRequest(...)` boundary without becoming a framework app.
- HOST-3E completes the canonical runtime foundation with shared auth and observability contracts in `@host/runtime-contracts` and a DI-first bootstrap package in `@host/runtime-composition`.
- HOST-4.0 defines the Integration Layer as the next architectural boundary above `@host/runtime-composition`, reserving reusable external integration concerns for future work without creating integration packages in this sprint.
