# Objective Allocation

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](operating-model.md), [OBJ-003](../services/registry-service-specification.md), [request-lifecycle](request-lifecycle.md), [decision-framework](decision-framework.md), [governance-workflow](governance-workflow.md), [validation-framework](validation-framework.md), [context-refresh](context-refresh.md), [operating-principles](operating-principles.md), [ai-operating-rules](ai-operating-rules.md) |

## Purpose

Objective allocation ensures every request has a unique, traceable governing Objective before work begins.

## Rules

- Determine whether an Objective already exists before creating a new one.
- Allocate the next available Objective only when required.
- Maintain uniqueness across the ecosystem.
- Prevent duplicate Objectives.
- Establish traceability before work begins.

## Naming Convention

Use the canonical format:

`OBJ-### - Short Objective Name`

Examples:

- `OBJ-001 - Ecosystem Taxonomy Registry`
- `OBJ-002 - HOST Kernel Operating Model`

## Conversation Naming

ChatGPT conversations should be titled:

`OBJ-### - Short Objective Name`

Codex sessions should use the same identifier.

## Allocation Workflow

1. Check the existing Objective register.
2. Confirm whether the request fits an existing Objective.
3. If not, allocate the next available Objective number.
4. Record the Objective title and scope.
5. Link the request, decision, and later implementation artefacts back to that Objective.

## Allocation Criteria

An Objective may be allocated only when:

- the request is distinct
- the request has an agreed scope boundary
- the request can be traced through validation and context refresh
- the request does not duplicate an existing Objective
