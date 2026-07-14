# Objective Registry

## Purpose

The Objective Registry is the canonical runtime authority for governed Objective records in the HOST control plane.

It provides deterministic creation, retrieval, metadata updates, lifecycle transitions, identifier allocation, duplicate prevention, and traceability validation without becoming a planning system or a persistence layer.

The Objective Registry is the canonical authority for allocation and lifecycle state of all `OBJ-###` records. Objective documents remain normative descriptions, but an identifier is allocated only when its Objective Registry record exists.

## Constitutional Baseline

The Registry seeds `OBJ-000` through `OBJ-006` as approved records. The migration preserves their identifiers, HOST ownership, titles, version, and constitutional standing. Existing documents continue to resolve through the Document Registry as views of the same constitutional records, preventing a second competing allocation source.

## Design Goals

- Deterministic Objective creation and mutation
- Validation-backed updates and transitions
- Identifier allocation through the shared Identifier Service
- Registry-backed uniqueness checks
- Traceability links validated against live records when available
- No product-specific Objective semantics

## Service Surface

The Objective Registry exposes:

- `createObjective()`
- `retrieveObjective()`
- `updateObjective()`
- `transitionObjective()`
- `lookup()`
- `list()`

Compatibility aliases remain available for `create()`, `get()`, `transition()`, and `listObjectives()`.

## Lifecycle Rules

Objective lifecycle management follows the frozen governance baseline:

- `draft -> proposed -> approved -> planned -> active -> implemented -> validated -> closed -> archived`
- Only deterministic forward transitions are allowed
- Invalid transitions fail explicitly
- Lifecycle state changes are separate from metadata updates

## Validation Flow

1. Allocate a canonical Objective identifier through the Identifier Service.
2. Normalize the Objective record for registry mutation.
3. Validate the record through the Registry Service and Validation Engine.
4. Validate traceability links against live lookup data when references are present.
5. Reject duplicate identifiers and duplicate Objective keys deterministically.
6. Commit the record only after validation succeeds.

Allocation and approval remain separate: `createObjective()` reserves and records a Draft objective; only HOST governance may authorise transitions to Proposed and Approved.

## Traceability

Objective records may link to:

- Documents
- ADRs
- Repositories
- Capabilities
- Tasks
- Artifacts
- Workflows
- Events

The Registry Service validates each link when the referenced record exists in the live registry.

ADR registration fails when its governing Objective is missing or archived. Roadmap and subordinate planning records fail when their governing Objective has not reached Approved state. Roadmap retains ownership of sequencing; the Objective Registry supplies governance eligibility only.

## Persistence Boundary

The baseline uses the shared Registry Service as the authority and reservation boundary. Production allocation requires that service to be backed by one durable, transactional store. In-memory registries remain suitable for isolated tests, but are not an ecosystem allocation authority.

Concurrent allocation must be compare-and-reserve: only one reservation for a candidate identifier may succeed, and losing allocators retry against refreshed registry state.

## Migration and Compatibility

1. Seed the existing constitutional identifiers as approved Objective Registry records before accepting new allocations.
2. Preserve the existing canonical documents as normative views of those records; do not mint replacement identifiers.
3. Validate all existing ADR and planning references against the seeded records.
4. Reject new orphaned references at registration time while retaining readable historical documents for migration review.
5. Move the shared Registry Service to a durable transactional provider before enabling multi-process allocation.

Existing callers of the Document Registry remain compatible: constitutional objective documents still resolve by their historical `OBJ-###` identifiers even though allocation authority now resides in the Objective Registry.

## Future Automation

Future governance work may add:

- authenticated allocation requests and approval evidence;
- semantic duplicate and scope-overlap detection;
- durable compare-and-reserve allocation transactions;
- ADR metadata conformance checks in CI;
- Roadmap lineage validation;
- lifecycle transition audit events;
- governance health and orphan reports.

These automate existing constitutional rules; they do not transfer approval authority away from HOST governance.

## Implementation Notes

- The Objective Registry is implemented as a domain wrapper over the shared Registry Service.
- Canonical Objective identifiers are generated by the Identifier Service using the `OBJ` prefix.
- Objective lifecycle semantics stay governed by OBJ-005 and the frozen HOST baseline.
- The service remains intentionally narrow and does not absorb roadmap or execution-plane behavior.
