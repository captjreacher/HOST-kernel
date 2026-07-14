# ADR-COMMREG-01 - Commercial Registry

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-COMMREG (proposed) |
| Status | Proposed |
| Version | 1.0 (draft) |
| Owner | HOST (governance) / BILLING (implementation) |
| Last reviewed | 2026-07-14 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Parent decisions | [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md), [ADR-BILLING-01](./ADR-BILLING-01-commercial-architecture-decomposition.md) |
| Related documents | [OBJ-004](../context/context-domain-model.md), [ADR-009](./ADR-009-integration-platform-baseline.md), [commercial-registry-design research](./commercial-registry-design.md) |

## Status

Proposed - 2026-07-14

## Context

The Commercial capability, per ADR-BILLING-01, requires an execution-plane component that publishes canonical commercial definitions for consumption by every HOST product and by the Commercial Engine (ADR-COMMRUN-01).

Under ADR-REA-01, this is the Registry role. This ADR fixes the Registry's object model, publication contract, versioning contract, and application interaction contract.

Applications must never own commercial values. They must express commercial intent by referencing canonical identifiers, which the Registry resolves into currently published commercial definitions.

## Decision

Adopt the **Commercial Registry** as the canonical publisher of commercial truth for the HOST ecosystem.

### Offer as the primary commercial object

**Offer is the primary purchasable object.** Products are capability space (owned by CONTEXT). Plans are commercial rhythm. Prices are commercial amounts. Offers are what customers purchase — the package that ties Brand, Product/Service, Plan, Price Version, Entitlement Template, Availability, and Segment into a purchasable arrangement.

The same underlying Product may be sold under multiple Offers (Individual, Agency, Enterprise, Partner) at different prices with different entitlements.

### Publication model

**Publish-only for applications.** Products read; they never write. All writes proceed through the Registry's governed publishing workflow:

```
Draft → InReview → Approved → Published
                              → Retired (removed from discovery, still resolvable)
                              → Superseded (replaced by newer version)
                              → Rescinded (cancelled between Approved and Published)
```

Publication emits canonical events on the HOST-4.6 event bus under the `commercial.*` namespace. Downstream systems (Commercial Engine, Stripe Adapter, Xero Adapter, applications) subscribe to reconcile.

### Versioning model

**Immutable versioning.** Every publication creates a new immutable version. Nothing is ever mutated in place. Rollback is achieved by publishing a new version that restores prior content; the mistaken version remains in history as Superseded.

- Canonical IDs are stable across versions (`offer:mgrnz.signal-audit.standard`).
- Version IDs identify specific immutable versions (`offer:mgrnz.signal-audit.standard@v7`).
- Registry supports resolution to current version, specific version, `as-of` date, or canonical alias.
- Historical versions remain resolvable indefinitely.
- Effective-dating supports scheduled publications.
- Existing subscriptions grandfather to their original Price Version until natural end-of-term or renewal per Plan policy.

### Object model boundaries

**Registry owns:** Brand, Plan, Offer, Bundle (Offer subtype), Price Version, Currency, Tax Class, Promotion, Availability, Term (Plan sub-object), Segment, Region, Entitlement Template, Fulfilment Profile, Publication Record.

**Registry references (does not own):** Product, Service (both owned by CONTEXT-BILLING-1).

**Deprecated:** SKU (Offer ID is the SKU); Discount (Registry publishes Promotion rules; Runtime records Discount applications on transactions).

### Application interaction

Applications may:

- Read Offer definitions by canonical ID.
- Discover Offers filtered by brand, segment, region, availability.
- Retrieve entitlement previews and pricing previews.
- Subscribe to publication events for cache invalidation.

Applications may not:

- Store prices locally except as short-lived version-pinned caches (TTL ≤ 15 minutes for pricing-sensitive views).
- Compute prices, discounts, taxes, or entitlements independently.
- Reference Offer versions directly except for display of historical purchases.
- Bypass the Registry to reach adapters (Stripe, Xero) directly.
- Author Registry entries.

At checkout time, applications re-resolve canonical IDs against the Registry rather than trusting caches.

### Commercial Engine interaction

The Commercial Engine consumes the Registry at three moments: at customer intent time (Offer resolution and snapshot), at subscription renewal time (per Plan renewal policy), and at entitlement grant time (Entitlement Template resolution).

At intent time, the Engine snapshots the Offer version onto the Order record. Subsequent Registry changes do not affect committed Orders. See ADR-COMMRUN-01.

### Governance

Author, Reviewer, Publisher, Auditor, and Commercial Steward roles are defined. Approval matrix scales with change scope:

- Routine publications (new Offers, new Prices within brand policy) use the internal approval matrix without a full ADR.
- Structural changes (new object types, new relationships, new state transitions, new policy) require an ADR.

Rollback is via new version publication, never in-place edit.

## Consequences

Positive:

- Products cannot invent prices or entitlements; the Registry is the single source of truth.
- Commercial history is preserved indefinitely; audit is unambiguous.
- Cross-brand offers are natural (Offer references any Brand); marketplace and multi-vendor extensions do not require structural change.
- Price Book integration is a straightforward loader into the Commercial Catalogue schema.
- Registry immutability satisfies the Control Plane invariant that commercial history is never mutated.

Constraints:

- Registry writes are strictly governed; every publication creates a new version and an immutable audit record.
- No in-place edits; corrections require new versions.
- Applications must be updated to consume Offers by canonical ID and never to compute pricing locally.
- Registry storage is indefinite; there is no purge policy.

## References

- Supporting research: [commercial-registry-design.md](./commercial-registry-design.md)
- Governing pattern: [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md)
- Parent decomposition: [ADR-BILLING-01](./ADR-BILLING-01-commercial-architecture-decomposition.md)
- Sibling execution decision: [ADR-COMMRUN-01](./ADR-COMMRUN-01-commercial-engine.md)
- Event contract foundation: [ADR-009](./ADR-009-integration-platform-baseline.md)
- Constitution: [OBJ-000 Ecosystem Constitution](../constitution/ecosystem-constitution.md)
- Operating model: [OBJ-002 HOST Kernel Operating Model](../kernel/operating-model.md)
