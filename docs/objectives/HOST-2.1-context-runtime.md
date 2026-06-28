# HOST-2.1 Context Runtime

## Objective

Implement the executable Context Domain Runtime as the first Knowledge Plane service.

## Decision Record

Unblocked by [HOST-2.0](HOST-2.0-context-runtime-governance-alignment.md) and [ADR-003 - Context Runtime Governance Alignment](../architecture/ADR-003-context-runtime-governance-alignment.md).

## Scope

Included:

- Assess whether OBJ-004, OBJ-001, HOST-0, and HOST-1 are sufficient to support an executable Context Runtime
- Confirm whether the requested runtime contracts can consume HOST-1 Kernel services without extending the domain model
- Stop implementation immediately if the canonical model is incomplete
- Raise the required Objective and ADR when deficiencies are found

Excluded:

- `packages/context-runtime`
- Runtime object implementations
- Kernel taxonomy extensions
- Identifier service changes
- Validation engine changes
- Persistence
- AI reasoning
- Refresh logic
- Search
- Product integrations

## Dependencies

- HOST-1 Core Kernel
- OBJ-001
- OBJ-004
- HOST-0

## Deliverables

- Governance assessment of HOST-2.1 runtime feasibility
- Blocked implementation record for HOST-2.1
- New prerequisite Objective for Context Runtime alignment
- New ADR documenting the governance gaps

## Risks

- Implementing runtime contracts for object families that HOST-1 cannot allocate identifiers for
- Introducing non-canonical runtime semantics for Context objects not defined in OBJ-004
- Extending the domain model through code instead of governance
- Allowing Knowledge Plane dependencies to backflow into the Control Plane

## Acceptance Criteria

- HOST-2.1 implementation remains stopped until the identified governance gaps are resolved
- The missing canonical contracts are recorded without extending OBJ-004 in code
- A prerequisite Objective exists to align Context Runtime governance inputs
- An ADR exists documenting the identifier and object-model deficiencies

## Context Updates

- HOST-2 commenced.
- Knowledge Plane implementation assessment completed.
- Context Runtime governance prerequisites resolved.

## Roadmap Updates

- HOST-2.1 active.
- Knowledge Plane runtime work may proceed against the aligned canonical Context contract.

## Validation

- HOST-2.0 and ADR-003 aligned OBJ-001, OBJ-004, and HOST-1 for the minimum HOST-2.1 runtime object set.
- HOST-1 now allocates canonical identifiers for `relationship`, `signal`, `observation`, and `evidence`.
- `ContextRecord`, `ContextSnapshot`, `ContextReference`, `Confidence`, `Freshness`, and `Provenance` are now canonically defined as subordinate runtime contracts rather than first-class taxonomy objects.
