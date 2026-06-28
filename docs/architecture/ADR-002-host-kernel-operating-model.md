# ADR-002 - HOST Kernel Operating Model

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Accepted |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-002](../kernel/operating-model.md), [OBJ-003](../services/registry-service-specification.md), [OBJ-004](../context/context-domain-model.md), [OBJ-005](../lifecycle/ecosystem-state-machine.md) |

## Context

OBJ-001 established the Ecosystem Taxonomy Registry as the canonical naming, ownership, and traceability model for the HOST ecosystem.

That registry defines the vocabulary. This ADR defines the operating model that applies the vocabulary consistently across every request, Objective, repository, and AI session.

Without a canonical operating model:

- requests can arrive without a stable lifecycle
- Objective allocation can drift or duplicate
- decisions can be made without a clear approval gate
- repository ownership can overlap
- validation can become inconsistent
- completed work can fail to refresh CONTEXT

## Decision

Adopt the HOST Kernel Operating Model as the constitutional operating layer for the ecosystem.

The Kernel governs:

- ecosystem governance
- Objective allocation
- lifecycle orchestration
- repository coordination
- traceability enforcement
- validation governance
- architecture compliance
- work admission
- work completion

The Kernel does not own implementation.

## Canonical Documents

The operating model is defined by the following documents:

- [kernel-0.1](../kernel/kernel-0.1.md)
- [operating-model](../kernel/operating-model.md)
- [request-lifecycle](../kernel/request-lifecycle.md)
- [objective-allocation](../kernel/objective-allocation.md)
- [decision-framework](../kernel/decision-framework.md)
- [governance-workflow](../kernel/governance-workflow.md)
- [validation-framework](../kernel/validation-framework.md)
- [context-refresh](../kernel/context-refresh.md)
- [operating-principles](../kernel/operating-principles.md)
- [ai-operating-rules](../kernel/ai-operating-rules.md)

## Consequences

- Every request must follow the canonical lifecycle.
- Every Objective must be allocated or confirmed before work begins.
- Every request must be traceable to an originating Objective.
- Every repository must remain within its own ownership boundary.
- Every completed Objective must update CONTEXT and Roadmap where required.
- Every AI session must recommend the Objective ID, conversation title, session name, and governance path before implementation is discussed.

## Governance Rule

Before any request proceeds:

1. Confirm or allocate the Objective ID.
2. Determine whether an ADR is required.
3. Assess Context impact.
4. Assess Roadmap impact.
5. Identify the affected repositories.
6. Produce the standard request structure.
7. Do not recommend implementation before governance is complete.

## Implementation Notes

This ADR establishes documentation and governance only.

No application functionality is introduced by this decision.
