# HOST Commercial Delivery Objectives

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-007 |
| Status | Draft |
| Version | 0.1 |
| Owner | HOST |
| Last reviewed | 2026-07-14 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [commercial delivery plan](../lifecycle/commercial-delivery-plan.md), [ADR-BILLING-01](../architecture/ADR-BILLING-01-commercial-architecture-decomposition.md), [ADR-COMMREG-01](../architecture/ADR-COMMREG-01-commercial-registry.md), [ADR-COMMRUN-01](../architecture/ADR-COMMRUN-01-commercial-engine.md) |

## Purpose

This document defines the implementation objectives that follow from the accepted Commercial Architecture.

These are delivery objectives, not governance objectives. They exist to sequence engineering work.

## Delivery Objectives

### Commercial Vocabulary

- Title: Commercial Vocabulary
- Purpose: Provide the canonical commercial domain model used by registry and engine work.
- Scope: Commercial terms, relationships, identifiers, and shared model boundaries.
- Dependencies: OBJ-004 Context Domain Model, accepted commercial ADRs, canonical commercial objective mappings.
- Acceptance criteria: commercial vocabulary is available in the agreed shared model location; no duplicate canonical terms are introduced; downstream work can reference the model unambiguously.
- Completion evidence: model documentation, traceability links, validation notes, and repository references.

### Commercial Registry

- Title: Commercial Registry
- Purpose: Implement governed publication and resolution of commercial definitions.
- Scope: Registry contracts, publication workflow, versioning, lookup, and traceability.
- Dependencies: Commercial Vocabulary, accepted `ADR-COMMREG-01`, host registry conventions, available Price Book inputs.
- Acceptance criteria: registry can publish, resolve, version, and trace commercial definitions according to the accepted ADR.
- Completion evidence: registry specification, tests, and documented traceability from published entries to source vocabulary.

### Commercial Engine

- Title: Commercial Engine
- Purpose: Execute commercial lifecycle transitions using registry-published definitions.
- Scope: commercial runtime lifecycle, event handling, state transitions, and commercial history recording.
- Dependencies: Commercial Registry, accepted `ADR-COMMRUN-01`, integration platform baseline, entitlement contract direction.
- Acceptance criteria: engine consumes registry outputs and executes the agreed commercial lifecycle without redefining registry content.
- Completion evidence: engine specification, lifecycle tests, and integration traces against registry outputs.

### Adapter Contracts

- Title: Adapter Contracts
- Purpose: Define the provider-neutral boundary for commercial integrations.
- Scope: adapter interfaces, contract data shapes, lifecycle expectations, and error surfaces.
- Dependencies: Commercial Engine, accepted `ADR-BILLING-01`, integration baseline, external provider requirements.
- Acceptance criteria: contracts are stable enough for provider-specific adapters to be built without changing commercial governance.
- Completion evidence: contract documentation, interface tests, and dependency review.

### Stripe Adapter

- Title: Stripe Adapter
- Purpose: Validate the adapter contract against Stripe.
- Scope: Stripe-specific integration code and contract conformance only.
- Dependencies: Adapter Contracts, Stripe provider capability, Commercial Engine outputs.
- Acceptance criteria: Stripe flows operate through the contract boundary without architecture changes.
- Completion evidence: adapter implementation, contract tests, and integration validation.

### Xero Adapter

- Title: Xero Adapter
- Purpose: Validate the adapter contract against Xero.
- Scope: Xero-specific integration code and contract conformance only.
- Dependencies: Adapter Contracts, Xero provider capability, Commercial Engine outputs.
- Acceptance criteria: Xero flows operate through the contract boundary without architecture changes.
- Completion evidence: adapter implementation, contract tests, and integration validation.

## Notes

- These delivery objectives do not allocate new governance objectives.
- They are sequenced implementation slices under the accepted commercial governance chain.
- Release numbering remains intentionally unspecified until roadmap conventions assign it.

