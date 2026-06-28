# Changelog

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-006 |
| Status | Governance Baseline Recorded |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](constitution/ecosystem-constitution.md) |
| Related documents | [README](../README.md), [docs/index.md](index.md), [docs/constitution/ecosystem-constitution.md](constitution/ecosystem-constitution.md), [docs/architecture/system-architecture.md](architecture/system-architecture.md) |

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
