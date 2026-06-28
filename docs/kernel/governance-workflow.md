# Governance Workflow

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](operating-model.md), [OBJ-003](../services/registry-service-specification.md), [request-lifecycle](request-lifecycle.md), [objective-allocation](objective-allocation.md), [decision-framework](decision-framework.md), [validation-framework](validation-framework.md), [context-refresh](context-refresh.md), [operating-principles](operating-principles.md), [ai-operating-rules](ai-operating-rules.md) |

## Purpose

The governance workflow describes how the Kernel admits, reviews, approves, and closes work.

## Workflow

1. Receive the request.
2. Confirm the Objective ID.
3. Classify the request.
4. Decide whether clarification is required.
5. Determine the decision path.
6. Assess repository impact.
7. Confirm ownership boundaries.
8. Confirm validation requirements.
9. Approve or defer implementation.
10. Validate the outcome.
11. Refresh CONTEXT and Roadmap as required.
12. Close the Objective.

## Governance Outputs

- canonical Objective record
- decision record
- ADR when required
- roadmap impact record
- validation plan
- context refresh plan
- completion record

## Governance Rule

No repository may self-authorize a boundary it does not own.

The Kernel remains the authority for governance orchestration, even when other repositories perform the work.
