# ADR-REA-01 - Registry–Engine–Adapter Constitutional Pattern

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-REA (proposed) |
| Status | Proposed |
| Version | 1.0 (draft) |
| Owner | HOST |
| Last reviewed | 2026-07-14 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](../kernel/operating-model.md), [ADR-002](./ADR-002-host-kernel-operating-model.md), [ADR-009](./ADR-009-integration-platform-baseline.md), [rea-pattern-constitutional research](./rea-pattern-constitutional.md) |

## Status

Proposed - 2026-07-14

## Context

HOST capabilities that execute dynamically against external systems have been implicitly converging on a three-part decomposition:

- A **Registry** that publishes canonical definitions.
- An **Engine** that executes state transitions against those definitions.
- **Adapters** that translate between the canonical model and external providers.

This shape is already latent in three frozen Kernel baselines:

- HOST-4.6 Event Contract Foundation — event definitions (Registry), event bus (Engine), webhook receivers (Adapter).
- HOST-4.7 Workflow Runtime — workflow definitions (Registry), workflow runtime (Engine), external triggers (Adapter).
- HOST-4.10 Integration Platform Baseline v1.0 — `@host/integration-contracts` (Registry), `@host/integration-execution` family (Engine), `@host/integration-mcp` (Adapter).

The Commercial architecture research (Adoption Review, Registry Design, Runtime Design) reached the same decomposition independently, and forward analysis showed the pattern fits every dynamic-execution capability HOST is likely to introduce (Identity, Communications, AI Providers, Storage, Search, Documents, Scheduling, Notifications, Commercial).

Without adopting a canonical execution pattern, HOST risks each new capability inventing its own shape, producing inconsistent boundaries, Adapters accumulating business logic, applications reaching around the platform to speak to providers, provider concepts leaking into HOST code, and governance concerns implemented in inconsistent places.

## Decision

Adopt **Registry → Engine → Adapter** as the constitutional execution pattern of HOST v1.0.

Under this pattern:

- **Registries publish** canonical definitions. Immutably versioned. Read-only for applications.
- **Engines execute** state transitions against those definitions. Event-sourced. Own per-transaction state.
- **Adapters translate** between the canonical model and specific external providers. Provider-neutral above the boundary.

Pure governance, pure vocabulary, and pure contract packages are exempt.

## Allowed Relationships

Three legal edges:

- **Application → Engine.** Applications express intent. The only edge on which applications initiate change.
- **Engine → Registry.** Engines consult Registries. Read-only.
- **Engine → Adapter → Provider.** Engines orchestrate through Adapter contracts. Engines never speak directly to providers.

One read-edge exception:

- **Application → Registry (read only).** Applications may read Registry entries for presentation. Safe because Registries are read-only externally.

Cross-capability composition uses the same edges: Capability A's Engine may read Capability B's Registry and subscribe to Capability B's events, but never call Capability B's Adapters directly.

## Forbidden Relationships

- **Application → Adapter (direct).**
- **Application → Registry (write).**
- **Engine → Provider (direct, bypassing Adapter).**
- **Adapter → Adapter (cross-adapter coordination).** Cross-adapter coordination is an Engine responsibility.

## Constitutional Rules

The full sixteen-rule set lives in the supporting research document. The load-bearing rules are:

1. Registries publish; they do not execute.
2. Engines execute; they do not define.
3. Adapters translate; they do not decide.
4. Applications express intent; they do not own platform state.
5. Registry publications are immutably versioned; publication is append-only.
6. Engine state transitions emit events. Every transition, without exception.
7. Engine state is event-sourced. Current state is a projection over the event log.
8. Provider-specific concepts do not leak past the Adapter boundary.
9. Executions snapshot Registry versions at intent time.
10. Compensating actions, not rollback. Corrections proceed via new events; history is never mutated.

## Consequences

Positive:

- Every new execution-plane capability inherits a validated architecture.
- Cross-capability composition is possible through canonical edges (Engine → Registry, event subscription).
- Provider neutrality is enforced by pattern, not by discipline alone.
- HOST-4.6, HOST-4.7, and HOST-4.10 are retroactively labelled as REA-conforming without code change.
- The anti-pattern catalogue in the supporting research provides an architecture-review checklist.

Constraints:

- Future capabilities that require dynamic execution against external systems adopt REA by default. Exceptions require a dedicated ADR (see Migration Guidance).
- Applications cannot embed provider logic; they must express intent through the Engine.
- Rebuilding what HOST-4.10 provides (event bus, execution, persistence) is prohibited; new capabilities compose over the existing platform.
- Adapter contracts must be authored in commercial or capability terms, not provider terms.

## Migration Guidance

**Already-conforming capabilities** (HOST-4.6, HOST-4.7, HOST-4.10) require documentation additions only:

- Changelog entry noting REA conformance.
- Governance Metadata reference to ADR-REA-01.
- Package README refresh in REA terms.

No code retrofit is required.

**In-flight capabilities** (Commercial, per ADR-BILLING-01) inherit REA by construction from their design documents.

**Future capabilities** follow the standard OBJ-002 governance workflow with REA as the default execution shape:

1. Determine whether dynamic execution against external systems is required.
2. If yes → REA applies. Decompose into Registry, Engine, and Adapters.
3. If no (pure governance, pure vocabulary, pure contract) → invoke the exceptions process.

**Exceptions process.** File an ADR titled `ADR-<CAP>-EXCEPTION-REA-01` documenting why REA does not apply, with a specific rebuttal of the standard REA case. Route through the OBJ-002 governance workflow. Convenience, time pressure, and provider-shaped thinking are not valid reasons.

## References

- Supporting research: [rea-pattern-constitutional.md](./rea-pattern-constitutional.md)
- Constitution: [OBJ-000 Ecosystem Constitution](../constitution/ecosystem-constitution.md)
- Operating model: [OBJ-002 HOST Kernel Operating Model](../kernel/operating-model.md)
- Prior operating-model decision: [ADR-002](./ADR-002-host-kernel-operating-model.md)
- Integration platform baseline: [ADR-009](./ADR-009-integration-platform-baseline.md)
