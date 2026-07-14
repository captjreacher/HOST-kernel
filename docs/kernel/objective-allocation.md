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

## Canonical Authority

The HOST Objective Registry is the single authoritative source for every `OBJ-###` identifier.

- Canonical objective documents describe approved governance state but do not allocate identifiers independently.
- The Identifier Service performs mechanical reservation against the shared Registry Service.
- HOST governance authorises allocation and lifecycle transitions.
- A newly allocated objective enters the Registry as `Draft`; allocation is not approval.
- Registry reservations are permanent. Closed or archived identifiers are never released or reassigned.
- A single allocated objective may govern a related ADR family when the request envelope is one governance decision with multiple traceability artefacts.

The constitutional objectives `OBJ-000` through `OBJ-006` are seeded as approved Objective Registry records with their existing identifiers, ownership, and titles. Their documentation remains the normative content linked to those records.

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

1. Receive the request and describe its candidate scope.
2. Query the canonical Objective Registry for an existing or overlapping objective.
3. Confirm ownership, scope, dependencies, and required traceability.
4. HOST governance authorises a new allocation only when the request is distinct.
5. The Identifier Service atomically reserves the next available `OBJ-###` against the shared Registry Service.
6. Create the canonical Objective Registry record in `Draft` state.
7. Route the objective through `Proposed` and `Approved` governance transitions.
8. Link decisions and ADRs to the allocated objective.
9. Hand approved objectives to Roadmap for delivery sequencing when implementation is required.
10. When several ADRs are one governance envelope, keep the objective shared rather than fragmenting it into artificial sub-objectives.

Governance approval and mechanical allocation are separate actions. Tools may perform reservation, but they may not authorise the scope or approve the resulting objective.

## Allocation Criteria

An Objective may be allocated only when:

- the request is distinct
- the request has an agreed scope boundary
- the request can be traced through validation and context refresh
- the request does not duplicate an existing Objective

## Allocation Concurrency

Allocation must use one shared, durable Registry Service transaction boundary. The identifier is reserved before the Objective record is committed. A concurrent allocator that loses the reservation race must retry from the canonical registry state; it must never reuse or overwrite the winning identifier.

## Lifecycle

The canonical lifecycle is:

`Draft -> Proposed -> Approved -> Planned -> Active -> Implemented -> Validated -> Closed -> Archived`

Objectives are closed and archived, not retired or superseded. Replacement work receives a new Objective and records a traceability relationship to the prior archived Objective.

## Downstream Validation

- ADR records must reference an allocated, non-archived Objective Registry record.
- Planning records must reference an Objective that has reached `Approved` or a later non-archived state.
- Malformed, duplicate, missing, or orphaned objective references are rejected.
- ADR filenames may use an approved topic slug, but their originating objective metadata must use `OBJ-###`.
