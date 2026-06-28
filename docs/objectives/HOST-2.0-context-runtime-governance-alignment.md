# HOST-2.0 Context Runtime Governance Alignment

## Objective

Align the canonical Context domain specification and HOST-1 executable taxonomy so the Context Runtime can be implemented without introducing non-governed model extensions.

## Decision Record

Governed by [ADR-003 - Context Runtime Governance Alignment](../architecture/ADR-003-context-runtime-governance-alignment.md).

## Scope

Included:

- Reconcile OBJ-001 numbering and object taxonomy with OBJ-004 Context object definitions
- Define canonical executable contracts for the minimum HOST-2.1 runtime object set
- Decide whether `ContextRecord`, `ContextSnapshot`, `ContextReference`, `Confidence`, `Freshness`, and `Provenance` are first-class taxonomy objects, value objects, or subordinate record components
- Define the canonical identifier allocation model required by HOST-1 services for executable Context objects
- Confirm lifecycle and relationship rules for the approved HOST-2.1 object set

Excluded:

- Runtime package implementation
- Persistence design
- Search or query design
- Graph traversal
- AI semantics
- Product-specific context contracts

## Dependencies

- OBJ-001
- OBJ-004
- HOST-0
- HOST-1

## Deliverables

- Updated governance decision for executable Context Runtime boundaries
- Approved canonical classification for the HOST-2.1 object set
- Approved identifier allocation model for executable Context objects
- Approved relationship and validation rules needed by HOST-2.1

## Risks

- Treating requested runtime helper concepts as first-class taxonomy objects without governance approval
- Divergence between documented prefixes and executable kernel taxonomy behavior
- Requiring HOST-1 changes that reverse the intended dependency direction

## Acceptance Criteria

- The executable taxonomy unambiguously supports every first-class Context object required by HOST-2.1
- The minimum runtime object set is canonically defined before code is written
- Identifier allocation, taxonomy resolution, and validation responsibilities remain delegated to HOST-1
- Knowledge Plane dependencies remain one-way toward the Control Plane

## Context Updates

- HOST-2 governance alignment objective completed.
- Context Runtime canonical model aligned with HOST-1 executable taxonomy.
- HOST-2.1 may now begin runtime implementation.

## Roadmap Updates

- HOST-2.0 complete.
- HOST-2.1 unblocked and ready to commence.

## Validation

- ADR-003 accepted.
- OBJ-001 and OBJ-004 alignment completed for the HOST-2.1 object set.
- HOST-1 executable taxonomy supports `relationship`, `signal`, `observation`, and `evidence` as canonical identifier families.
- `ContextRecord`, `ContextSnapshot`, `ContextReference`, `Confidence`, `Freshness`, and `Provenance` are canonically classified as subordinate runtime contracts.
- HOST-1 dependency direction remains one-way because no Knowledge Plane runtime package was introduced.
