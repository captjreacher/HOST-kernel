# Changelog

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-006 |
| Status | Governance Baseline Recorded |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-29 |
| Constitution | [OBJ-000](constitution/ecosystem-constitution.md) |
| Related documents | [README](../README.md), [docs/index.md](index.md), [docs/constitution/ecosystem-constitution.md](constitution/ecosystem-constitution.md), [docs/architecture/system-architecture.md](architecture/system-architecture.md) |

## HOST-3.0 - Application Layer Architecture Baseline

This entry records the HOST-3.0 architecture baseline.

- the Application Layer is now defined as the boundary above the execution/provider stack and below products
- HOST-3 is responsible for orchestration, asynchronous workflows, persistence-backed APIs, external transports, and application-specific policies
- synchronous runtime APIs remain in HOST-1 through `kernel-api`
- persistence composition remains in HOST-2 through `context-runtime` -> `context-store` -> `context-persistence`
- persistence-backed APIs now have a defined architectural home in HOST-3 rather than being deferred abstractly above HOST-2
- conceptual HOST-3 package responsibilities are documented as `context-service`, `application-runtime`, and `api-host`
- ADR-006 records the baseline without creating application packages or implementing business logic

## HOST-3.1 - Context Service Boundary

This entry records the first Application Layer implementation.

- `@host/context-service` is now implemented as the canonical HOST-3 boundary for persisted context operations
- the service composes provider-backed stores through `@host/context-persistence` without depending on concrete provider packages
- the service exposes asynchronous create, retrieve, update, delete, query, and transaction entry points
- session and transaction lifecycle are managed through the existing execution-layer abstractions
- provider, filesystem, and SQLite failures are translated into deterministic application-layer service errors
- integration coverage now runs the same service contract against in-memory, filesystem, and SQLite providers

## HOST-3.2 - Context API Host Boundary

This entry records the transport-neutral API host boundary.

- `@host/api-host` is now implemented as the canonical HOST-3 composition point between future transports and application services
- the host exposes a stable request and response contract without starting adapter runtimes or importing adapter frameworks
- context CRUD, query, and transaction routes now dispatch through injected `@host/context-service` instances
- service failures are translated into stable API responses without exposing provider, filesystem, or SQLite details
- transaction handles are managed inside the API host boundary so future adapters can remain protocol-specific only
- dependency rules now enforce `@host/api-host` -> `@host/context-service` only

## HOST-3.3 - API Host Contract Hardening

This entry records the HOST-3.3 protocol freeze for `@host/api-host`.

- the canonical request envelope is now frozen around `version`, `operation`, `resource`, `payload`, `query`, `transaction`, `metadata`, `correlation_id`, `request_id`, and `timestamp`
- the canonical response envelope is now frozen around `success`, `result`, `error`, `metadata`, `diagnostics`, `warnings`, and `version`
- the authoritative operation registry now uses canonical names beginning with `context.create` and `context.transaction.begin`
- API host errors now translate into the stable taxonomy `api.invalid_request`, `api.validation_failed`, `api.not_found`, `api.conflict`, `api.transaction_closed`, `api.unavailable`, and `api.internal`
- transaction handles are now documented and enforced as host-local opaque identifiers that remain valid until finalization or host disposal
- protocol version `1.0.0` is now the frozen application-layer contract baseline for future adapter work

## HOST-2.8A - Context Persistence Boundary Decision

This entry records the HOST-2.8A architectural decision.

- HOST-2.8 stopped because the existing HOST-1 Context Runtime adapter contract is synchronous while provider-backed persistence composition is asynchronous by design
- `kernel-api` context endpoints are now documented explicitly as runtime-only create and validate surfaces
- persistence composition remains entirely inside the execution layer through `context-runtime` -> `context-store` -> `context-persistence` -> provider packages
- persistence-backed context APIs are deferred to a future execution/application boundary rather than being introduced through `kernel-api`
- ADR-005 records the boundary decision without changing HOST-1 contracts or weakening ADR-004

## HOST-1.9 - Kernel Bootstrap

This entry records the HOST-1.9 composed kernel bootstrap implementation.

- Kernel runtime contracts now expose the composed control-plane surface
- `createKernel()` now wires the identifier, taxonomy, validation, registry, objective, document, and repository accessors through a shared bootstrap runtime
- Constitutional artefacts are seeded and discoverable through the Document Registry during startup
- Deterministic health checks now report composition and constitutional seed status
- Bootstrap startup validation rejects invalid configuration before runtime exposure
- Kernel bootstrap documentation and changelog scaffolding were added for HOST-1.x implementation work

## HOST-1.3 - Taxonomy Resolver

This entry records the HOST-1.3 canonical taxonomy resolver implementation.

- Canonical object type, prefix, lifecycle, event, and relationship resolution added for the HOST control plane
- Validation and discovery now flow through a shared taxonomy resolver surface
- Identifier Service now consumes resolver lookups instead of carrying its own taxonomy rules
- Package-name-based imports remain in place across the kernel workspace
- Taxonomy resolver documentation and changelog scaffolding were added for HOST-1.x work

## HOST-1.4 - Validation Engine

This entry records the HOST-1.4 canonical validation engine implementation.

- Runtime validation now centralizes identifier, taxonomy, lifecycle, ownership, document reference, registry record, and traceability checks
- Validation results now carry structured counts, deterministic issue codes, and validation context
- Registry-backed integrity checks use lookup abstractions rather than concrete persistence or external services
- Validation engine documentation and changelog scaffolding were added for HOST-1.x implementation work

## HOST-1.5 - Registry Service

This entry records the HOST-1.5 canonical registry service implementation.

- Runtime registry mutation, lookup, discovery, and identifier reservation are now centralized behind the core registry service
- Validation-backed register and update operations now reject malformed records, duplicate identifiers, and broken references deterministically
- Registry lookup now acts as the live validation source for traceability and reference integrity checks
- Registry service documentation and changelog scaffolding were added for HOST-1.x implementation work

## HOST-1.6 - Objective Registry

This entry records the HOST-1.6 canonical objective registry implementation.

- Objective domain contracts now include lifecycle state and traceability links for governed Objective records
- The Objective Registry now allocates canonical `OBJ-###` identifiers through the Identifier Service
- Objective creation, retrieval, metadata update, and lifecycle transitions now run through validation-backed registry mutation
- Duplicate Objective creation is rejected deterministically through registry-backed uniqueness checks
- Live traceability links to documents, ADRs, repositories, capabilities, tasks, artifacts, workflows, and events are validated where records exist
- Objective registry documentation and changelog scaffolding were added for HOST-1.x implementation work

## HOST-1.7 - Document Registry

This entry records the HOST-1.7 canonical document registry implementation.

- Document domain contracts now model metadata-only document records for constitutional and architectural artefacts
- The Document Registry now seeds and discovers the canonical HOST governance artefacts at runtime
- Document registration, retrieval, metadata update, and related-document traceability now run through validation-backed registry mutation
- Duplicate document records, invalid document status, missing version, and broken lineage or related-document links are rejected deterministically
- Document registry documentation and changelog scaffolding were added for HOST-1.x implementation work

## HOST-1.2 - Identifier Service

This entry records the HOST-1.2 canonical identifier service implementation.

- Canonical identifier generation, parsing, and validation added for objectives, ADRs, capabilities, entities, workflows, events, artifacts, and tasks
- Taxonomy-driven type resolution added to the workspace model
- Registry-backed uniqueness reservation is now supported through the shared registry abstraction
- Package consumers now import from package names rather than source paths
- Identifier service documentation and changelog scaffolding were added for HOST-1.x implementation work

## HOST-1.1 - Kernel Foundation Workspace

This entry records the HOST-1.1 monorepo foundation.

- Workspace package structure created
- Shared type system extracted into `kernel-types`
- Registry runtime moved into `kernel-registry`
- Build, test, and dependency graph verification now run at the workspace level
- Documentation templates and changelog structure were added for HOST-1.x implementation tasks

## HOST-0 - Ecosystem System Architecture

This entry establishes the architectural bridge between governance and implementation.

- HOST-0 provides the canonical ecosystem system architecture
- The document consolidates the approved governance baseline into a single architectural view
- README now points to the architecture bridge
- docs/index.md now places System Architecture in the onboarding sequence

This note records architecture only and introduces no new governance concepts.

## Governance Baseline v1.0

The HOST repository governance baseline is approved and ready for implementation.

- Governance Version: 1.0
- Constitutional Baseline: Approved
- Status: Ready for Implementation
- README and docs/index.md now point to the Constitution as the entry point
- Every governance document now carries the constitutional backlink and metadata audit fields

This declaration records the constitutional baseline only and does not introduce application functionality.

## OBJ-000 through OBJ-005 - Governance Foundation Completion

This entry completes the constitutional documentation layer for the HOST ecosystem.

- OBJ-000 defines the ecosystem constitution and onboarding entry point
- OBJ-001 defines the canonical taxonomy and numbering registry
- OBJ-002 defines the canonical kernel operating model
- OBJ-003 defines the Registry Service specification
- OBJ-004 defines the CONTEXT domain model
- OBJ-005 defines the deterministic ecosystem state machine
- ADR-001 and ADR-002 remain the governing decision records behind OBJ-001 and OBJ-002
- docs/index.md provides the canonical reading order
- README now points new readers to the governance entry point

This note records documentation and architecture only.

## OBJ-002 - HOST Kernel Operating Model

This entry establishes the canonical operating model for the HOST ecosystem.

- ADR-002 records the Kernel operating model decision
- The request lifecycle is documented end to end
- Objective allocation, decision workflow, validation, and context refresh are defined
- Repository responsibilities are clarified across HOST, CONTEXT, Roadmap, and products
- AI operating rules are documented for ChatGPT, Codex, and future agents
- README now links to the Kernel governance documentation set

This note records governance only and does not introduce application functionality.

## OBJ-001 - Ecosystem Taxonomy Registry

This entry establishes the constitutional taxonomy for the HOST ecosystem.

- Canonical registry created
- ADR-001 records the taxonomy and numbering decision
- Terminology, hierarchy, ownership, naming, and traceability are now standardized
- Future work must use Objective IDs before implementation begins

See [docs/taxonomy/taxonomy-registry.md](taxonomy/taxonomy-registry.md) for the canonical registry.

## Kernel 0.1 - Registry Foundation

This entry records the first runtime baseline for HOST-kernel.

- Registry Foundation implemented
- Supported registry domains: products, repositories, capabilities, and event contracts
- Platform-owned repositories and capabilities are represented by `owning_product: null`
- Product-owned capabilities update the product `registered_capabilities` derived state
- Seed fixtures are development and test only
- No HOST, Cockpit, Context, Workflow, Decision, Intelligence, or product runtime is implemented

This note documents the baseline only and does not change runtime behavior.
