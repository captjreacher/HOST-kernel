# Request Lifecycle

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](operating-model.md), [OBJ-003](../services/registry-service-specification.md), [OBJ-005](../lifecycle/ecosystem-state-machine.md), [objective-allocation](objective-allocation.md), [decision-framework](decision-framework.md), [governance-workflow](governance-workflow.md), [validation-framework](validation-framework.md), [context-refresh](context-refresh.md), [operating-principles](operating-principles.md), [ai-operating-rules](ai-operating-rules.md) |

## Purpose

This document defines the canonical lifecycle for every request entering the HOST ecosystem.

## Lifecycle

Request

-> Objective Allocation

-> Decision Review

-> Architecture Review

-> Context Impact

-> Roadmap Impact

-> Sprint Planning

-> Implementation Approval

-> Implementation

-> Validation

-> Context Refresh

-> Completion

## Stage Requirements

| Stage | Purpose | Inputs | Outputs | Owner | Completion Criteria |
| --- | --- | --- | --- | --- | --- |
| Request | Capture the initial need | Request text, source, desired outcome | Candidate work item | Request originator | Request is expressed clearly enough to classify |
| Objective Allocation | Assign or confirm the governing Objective | Request, taxonomy, existing Objective register | Objective ID, canonical title | HOST | The request has a unique Objective or a confirmed existing one |
| Decision Review | Determine decision needs | Objective, scope, risks, dependencies | Decision type, approval path, ADR need | HOST | The decision path is identified and recorded |
| Architecture Review | Check structural impact | Objective, affected repositories, design implications | Architecture guidance, compliance constraints | HOST | Architecture constraints are known and accepted |
| Context Impact | Determine CONTEXT changes | Objective, evidence, entities, relationships | Context update plan | CONTEXT with HOST governance | Required knowledge updates are identified |
| Roadmap Impact | Determine planning changes | Objective, priorities, dependencies, milestones | Roadmap update plan | Roadmap | Planning impact is identified and sequenced |
| Sprint Planning | Place approved work into delivery | Objective, roadmap, capacity, dependencies | Sprint allocation or delivery slot | Roadmap or delivery owner | Work is scheduled or explicitly deferred |
| Implementation Approval | Authorize execution | Approved governance chain, ready scope | Authorization to implement | HOST | All required approvals exist |
| Implementation | Build the approved change | Approved scope, implementation plan | Implementation artifact, code, or delivery output | Product repository | Work is built according to approved scope |
| Validation | Confirm the change satisfies governance | Implementation output, acceptance criteria, traceability chain | Validation result | HOST with repository owners | Acceptance criteria are met and traceability is complete |
| Context Refresh | Record the accepted state | Validation result, evidence, decisions, outcomes | Updated CONTEXT records | CONTEXT | Knowledge graph reflects the accepted state |
| Completion | Close the Objective | Validation result, documentation, traceability | Closed Objective record | HOST | Objective is complete and no open governance gaps remain |

## Completion Rule

No stage may be skipped if it applies to the request.

If a stage is not applicable, the skip must be explicitly justified in the governance record.
