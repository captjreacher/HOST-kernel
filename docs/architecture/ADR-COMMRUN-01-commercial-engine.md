# ADR-COMMRUN-01 - Commercial Engine

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-007 |
| Status | Proposed |
| Version | 1.0 (draft) |
| Owner | HOST (governance) / BILLING (implementation) |
| Last reviewed | 2026-07-14 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Parent decisions | [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md), [ADR-BILLING-01](./ADR-BILLING-01-commercial-architecture-decomposition.md) |
| Related documents | [ADR-009](./ADR-009-integration-platform-baseline.md), [ADR-COMMREG-01](./ADR-COMMREG-01-commercial-registry.md), [commercial-runtime-design research](./commercial-runtime-design.md) |

## Status

Proposed - 2026-07-14

## Context

The Commercial capability, per ADR-BILLING-01, requires an execution-plane component that consumes Commercial Registry definitions (ADR-COMMREG-01) and executes commercial transactions — the lifecycle from customer intent to settled purchase, subscription cycle, refund, and entitlement grant.

Under ADR-REA-01, this is the Engine role. This ADR fixes the Engine's responsibilities, lifecycle, event vocabulary, failure model, audit model, and interaction contracts with the Registry, applications, and adapters.

The Engine answers one question: *a customer has decided to accept an Offer — what happens next?*

## Decision

Adopt the **Commercial Engine** as the canonical execution engine for commercial transactions across the HOST ecosystem.

### Engine responsibilities

The Engine owns intent processing, eligibility validation, quote generation, order creation, checkout coordination, payment orchestration via adapters, subscription lifecycle, invoice generation and dispatch, entitlement granting and revocation, refund and credit management, dunning, fulfilment coordination (tracking, not delivery), commercial event publication, and immutable transaction history.

The Engine does not own commercial definitions (Registry), pricing decisions (Registry), provider-specific communication (Adapters), external accounting ledger operations (Accounting Adapter), customer identity (future Identity capability), product access enforcement (products query Entitlement service), or consent capture (future Consent capability).

### Runtime lifecycle

Four lifecycle archetypes are supported, sharing common primitives:

- **One-off purchase.** Intent → Eligibility → (optional Quote) → Order → Checkout → Payment Authorised → Payment Settled → Entitlement Granted → (optional Fulfilment) → Completed.
- **Subscription.** Initial one-off lifecycle → Subscription Active → recurring Billing Cycle (Invoice → Payment Attempt → Renewed | Dunning) → optional Upgrade/Downgrade/Pause/Resume → Cancelling → Cancelled → Ended.
- **Consulting / project.** Engaged → InProgress → MilestoneReached → InvoiceIssued → MilestonePaid (repeats) → Delivered.
- **Retainer.** Subscription-shaped with an Allowance dimension; overage handled per Plan policy.

Common terminal states: Completed, Cancelled, Ineligible, Abandoned, Ended.

### Event model

Approximately fifty canonical events in the `commercial.*` namespace on the HOST-4.6 event bus:

- Intent and Quote (`offer.accepted`, `quote.created`, ...)
- Order (`order.created`, `order.confirmed`, ...)
- Checkout (`checkout.started`, `checkout.completed`, ...)
- Payment (`payment.authorised`, `payment.settled`, `payment.failed`, ...)
- Invoice (`invoice.issued`, `invoice.paid`, `invoice.overdue`, ...)
- Subscription (`subscription.started`, `subscription.renewed`, `subscription.past-due`, `subscription.cancelled`, ...)
- Refund and Credit (`refund.completed`, `credit.applied`, ...)
- Entitlement (`entitlement.granted`, `entitlement.revoked`, ...)
- Fulfilment (`fulfilment.scheduled`, `fulfilment.completed`, ...)
- Dispute (`dispute.opened`, `dispute.resolved`, ...)
- Reconciliation (`reconciliation.drift-detected`, ...)

**Every event carries the constitutional attribution set** (revenue owner, brand, product, journey, campaign, customer). Attribution is enforced at write time — the event bus rejects events without a complete attribution set. This enforces the ADR-BILLING-01 invariant that commercial attribution is preserved on every transaction.

Per-Order and per-Subscription events are strictly ordered. Intent operations accept idempotency keys; duplicate submissions return the original outcome. Adapter callbacks are deduplicated using provider IDs plus internal correlation.

### Registry interaction

**Read-only.** The Engine consults the Registry (ADR-COMMREG-01) at three moments:

- At **intent time**, the Engine resolves the customer's Offer canonical ID to the currently Published version and snapshots the Version ID onto the Order.
- At **renewal time** (Subscriptions), the Engine re-resolves the canonical ID per the Plan's renewal policy.
- At **entitlement grant time**, the Engine resolves the Entitlement Template from the Order snapshot.

Subsequent Registry changes do not affect committed transactions unless a documented renewal policy dictates otherwise. The Engine never writes to the Registry, never bypasses the Registry to compute values, and never leaks Version IDs into application-facing surfaces (canonical IDs are stable; Version IDs are internal).

### Application interaction

Applications express intent (Offer canonical ID + Customer + attribution + idempotency key). The Engine responds with an Order ID and, if a payment ceremony is required, a Checkout Session token. Applications hand off to the Payment Adapter's hosted flow, receive completion callbacks, and render Runtime-authoritative state.

Applications subscribe to commercial events for their customers' Orders and Subscriptions. Applications never mirror commercial state as their own truth, never invent commercial values, and never call adapters directly.

### Adapter interaction

The Engine orchestrates operations through canonical Adapter contracts. Adapter categories:

- **Payment adapters** (inbound money movement) — `authorize`, `capture`, `refund`, `void`, `reconcile`.
- **Invoicing adapters** — `issue`, `dispatch`, `void`, `reconcile`.
- **Accounting adapters** — `post-transaction`, `categorise`, `reconcile-with-bank`.
- **Tax adapters** (optional) — `compute-tax`, `report-return`.
- **Outbound payment adapters** (future) — `authorize-payout`, `settle-payout`, `reconcile-payout`.

Provider-specific communication lives inside each Adapter. Provider-specific concepts do not leak past the Adapter boundary. The Engine contains no provider-specific code or provider-specific terminology. Adding a new provider is: implement the contract, register via HOST-4E Integration Foundation, update configuration. No Engine code change.

Adapters do not coordinate with each other; cross-adapter workflows are the Engine's responsibility.

### Failure model

Six failure categories, each with a defined response:

- **Pre-commit failures** (eligibility, expired Offer, Segment mismatch) — rejection event; no Order created.
- **Payment failures** (declined, timeout) — `payment.failed`; interactive re-prompt for one-off; dunning for subscriptions.
- **Fulfilment failures** (delivery blocked) — `fulfilment.blocked`; operator alert; per-Plan refund policy.
- **Renewal failures** — dunning workflow with configurable retry policy, escalating notifications, grace period.
- **Sync failures** (Adapter unavailable, webhook missed) — Runtime remains authoritative; durable retry via HOST-4.9; escalate to Cockpit.
- **Compliance failures** (KYC required, sanctions) — Compliance-Hold state; no payment; operator notified.

Recovery principles:

- **No silent failure.** Every failure emits an event.
- **Idempotent operations.** Retries are safe.
- **Compensating actions, not rollback.** A mistaken payment is reversed by a Refund event.
- **Configurable retry policy** per Adapter and per failure category.
- **Escalation over silent-loss** when automated recovery is exhausted.

### Audit model

The Engine is **event-sourced**. Current state of any Order, Subscription, Payment, Invoice, or Entitlement Grant is a projection over the immutable commercial event log. Events are:

- **Append-only.** Never mutated after emission.
- **Ordered per aggregate.**
- **Durable** via HOST-4.9 durable execution persistence.
- **Attributed** with the constitutional attribution set.

Reconciliation runs both internally (Engine state derives correctly from its own event log) and externally (Engine state matches Adapter state; drift emits `commercial.reconciliation.drift-detected`).

Retention is indefinite. Immutability is enforced at the persistence layer, not the application layer. Corrections proceed via compensating events.

## Consequences

Positive:

- Uniform execution model across every commercial transaction in the ecosystem.
- Every commercial event is traceable to a brand, product, journey, campaign, and customer by constitutional invariant.
- New payment providers can be added without touching Engine code.
- Audit and reconciliation are structurally guaranteed by event sourcing.
- Dunning, refunds, disputes, and grace periods have deterministic behaviour.
- Cross-brand journeys surface naturally in the Customer Commercial Ledger via attribution filters.

Constraints:

- The Engine depends on the frozen HOST-4 Integration Platform Baseline (HOST-4.6 events, HOST-4.7 workflow, HOST-4.8 execution, HOST-4.9 durable persistence, HOST-4.10 integration foundation) and on the Commercial Registry (ADR-COMMREG-01).
- Applications cannot compute prices, taxes, entitlements, or Order state locally.
- No provider-specific concepts leak into Engine code; strict discipline required at the Adapter boundary.
- Event bus rejects unattributed commercial events, forcing every emitter to carry attribution.

## References

- Supporting research: [commercial-runtime-design.md](./commercial-runtime-design.md)
- Governing pattern: [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md)
- Parent decomposition: [ADR-BILLING-01](./ADR-BILLING-01-commercial-architecture-decomposition.md)
- Sibling Registry decision: [ADR-COMMREG-01](./ADR-COMMREG-01-commercial-registry.md)
- Integration platform baseline: [ADR-009](./ADR-009-integration-platform-baseline.md)
- Constitution: [OBJ-000 Ecosystem Constitution](../constitution/ecosystem-constitution.md)
- Operating model: [OBJ-002 HOST Kernel Operating Model](../kernel/operating-model.md)
