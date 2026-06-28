# Decision Framework

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](operating-model.md), [OBJ-003](../services/registry-service-specification.md), [request-lifecycle](request-lifecycle.md), [objective-allocation](objective-allocation.md), [governance-workflow](governance-workflow.md), [validation-framework](validation-framework.md), [context-refresh](context-refresh.md), [operating-principles](operating-principles.md), [ai-operating-rules](ai-operating-rules.md) |

## Purpose

The decision framework defines what kind of governance action a request needs before implementation can be approved.

## Decision Types

- Clarification
- Existing Decision
- New Decision
- ADR
- Roadmap Update
- Sprint Allocation

## When To Use Each Path

- Clarification: the request is not yet specific enough to allocate safely.
- Existing Decision: an accepted decision already covers the request.
- New Decision: the request introduces a governance choice not yet recorded.
- ADR: the decision affects architecture, boundaries, or enduring operating rules.
- Roadmap Update: the request changes sequencing, priority, milestone, or release planning.
- Sprint Allocation: the request is ready for delivery scheduling.

## Approval Gates

Before implementation, the request must clear the required gates in order:

1. Objective confirmed or allocated
2. Decision path identified
3. ADR required or not required
4. Context impact assessed
5. Roadmap impact assessed
6. Repository ownership confirmed
7. Validation criteria defined

## Decision Rule

If the request changes a lasting operating rule, boundary, or governance principle, the change belongs in an ADR.

If the request only changes sequencing or timing, the change belongs in Roadmap governance.
