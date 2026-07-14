# ADR-BILLING-01 - Commercial Architecture Decomposition

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-007 |
| Status | Proposed |
| Version | 1.0 (draft) |
| Owner | HOST |
| Last reviewed | 2026-07-14 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](../kernel/operating-model.md), [OBJ-004](../context/context-domain-model.md), [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md), [billing-kernel-adoption-review research](./billing-kernel-adoption-review.md) |

## Status

Proposed - 2026-07-14

## Context

A monolithic **Billing Kernel** was initially proposed as a HOST capability alongside Runtime, Registry, Context, Execution, Governance, and Integration. Adoption Review analysis found this framing to be a category error: it conflates concerns that belong to three different constitutional planes.

Commercial concerns span three planes:

- **Knowledge Plane** — canonical commercial vocabulary (Brand, Customer, Order, Subscription, Invoice, Payment, Entitlement, Ledger Entry).
- **Control Plane** — commercial governance invariants (commercial history immutability, revenue-attribution invariants, entitlement grant semantics, adapter neutrality).
- **Execution Plane** — the runtime that publishes commercial catalogues, executes commercial transactions, and integrates external providers.

Collapsing these into one repository would violate the OBJ-000 governance principle *"one repository owns one responsibility boundary."*

The Kernel Test (from the Adoption Review) confirmed that Billing is genuinely a platform-level concern (multi-product, application-independent, defines canonical concepts, reusable, cross-cutting) — but passing the Kernel Test only answers *"is this a platform concern?"*, not *"which plane does it belong to?"*.

## Decision

The HOST Commercial capability is decomposed into **three components across three planes and three repositories**:

- **Billing Domain Model → CONTEXT (Knowledge Plane).**
  Extends [OBJ-004 Context Domain Model](../context/context-domain-model.md) with the canonical commercial vocabulary (Brand, Customer, Product, Service, Plan, Offer, Price Version, Promotion, Entitlement Template, Order, Subscription, Invoice, Payment, Refund, Credit, Ledger Entry). Owned by CONTEXT.

- **Commercial Governance Contracts → HOST-kernel (Control Plane).**
  New HOST-5.x objective series. Publishes constitutional invariants: commercial history immutability, revenue-attribution requirements, entitlement grant semantics, adapter neutrality. Owned by HOST.

- **Commercial Registry, Commercial Engine, Commercial Adapters → new BILLING repository (Execution Plane).**
  Follows ADR-REA-01. See ADR-COMMREG-01 (Registry), ADR-COMMRUN-01 (Engine), and a future ADR-COMMADP-01 (Adapters).

A monolithic Billing Kernel inside HOST-kernel is **rejected** on constitutional grounds.

## Revenue Ownership vs Commercial Attribution

The following invariant is affirmed by this decision and governed by the Control Plane (HOST-5.x):

- **Revenue ownership** — always MGRNZ. Revenue ultimately belongs to MGRNZ across every brand and every transaction.
- **Commercial attribution** — every transaction preserves originating brand, product, customer journey, campaign, and customer.

Revenue ownership and commercial attribution are distinct concepts and must not be conflated.

## Consequences

Positive:

- Each component sits on the plane appropriate to its nature.
- Constitutional invariants are enforced by the Control Plane, not by runtime code.
- The commercial vocabulary extends OBJ-004 rather than forking it, preserving canonical vocabulary integrity.
- The BILLING repository can evolve at its own pace within the OBJ-002 governance workflow.
- The pattern generalizes: future capabilities with multi-plane concerns can follow the same three-plane decomposition when appropriate.

Constraints:

- Requires coordinated authoring across three planes:
  - CONTEXT-BILLING-1 (new objective under OBJ-004)
  - HOST-5.0 Billing Foundation (new HOST objective)
  - OBJ-008 Commercial Registry, OBJ-009 Commercial Engine (new BILLING objectives, governed by ADR-REA-01)
  - Commercial Adapters remain a future unallocated capability
- No product-specific commercial launch may proceed until the HOST-5.9 Billing Platform Release Baseline v1.0 is complete.
- Products may not implement commercial logic in the interim.

## Blocking Prerequisites

Per the OBJ-002 rule *"no implementation begins before governance is complete"*, the following must be in place before any Commercial implementation may begin:

- ADR-BILLING-01 (this ADR) approval.
- ADR-REA-01 approval (governs the BILLING repo's internal shape).
- OBJ-007 allocation in the Objective Registry (governed by OBJ-001).
- CONTEXT-BILLING-1 Commercial Domain Model authored and accepted.
- HOST-5.0 Billing Foundation authored and accepted.
- Maximised AI Price Book delivered (external input, referenced by the Commercial Catalogue).
- Identity capability delivered or documented interim compatibility scheme.

## References

- Supporting research: [billing-kernel-adoption-review.md](./billing-kernel-adoption-review.md)
- Governing pattern: [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md)
- Companion Registry decision: [ADR-COMMREG-01](./ADR-COMMREG-01-commercial-registry.md)
- Companion Engine decision: [ADR-COMMRUN-01](./ADR-COMMRUN-01-commercial-engine.md)
- Constitution: [OBJ-000 Ecosystem Constitution](../constitution/ecosystem-constitution.md)
- Operating model: [OBJ-002 HOST Kernel Operating Model](../kernel/operating-model.md)
- Context domain: [OBJ-004 Context Domain Model](../context/context-domain-model.md)
