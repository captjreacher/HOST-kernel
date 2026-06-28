# ADR-003 - Context Runtime Governance Alignment

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | HOST-2.0 |
| Status | Accepted |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-004](../context/context-domain-model.md), [HOST-0](system-architecture.md), [HOST-2.1](../objectives/HOST-2.1-context-runtime.md) |

## Context

HOST-2.1 requested the executable Context Runtime as the first Knowledge Plane service.

That runtime must consume HOST-1 services for identifier allocation, taxonomy resolution, and validation.

The HOST-2.1 assessment found two governance gaps that had to be resolved before runtime code could begin.

First, OBJ-001 and OBJ-004 already documented first-class Context objects with canonical prefixes such as `RLT`, `SIG`, `OBS`, and `EVD`, but the executable HOST-1 taxonomy and identifier runtime did not classify those object families as allocatable canonical identifier types.

Second, HOST-2.1 requested runtime contracts for `ContextRecord`, `ContextSnapshot`, `ContextReference`, `Confidence`, `Freshness`, `Provenance`, and a governed document reference path, but those concepts were not canonically classified as first-class taxonomy objects or subordinate value objects.

## Decision

HOST-2.0 resolves the governance gaps as follows:

- `relationship`, `signal`, `observation`, and `evidence` are first-class canonical Context identifier families and must be allocatable through HOST-1.
- `ContextRecord`, `ContextSnapshot`, and `ContextReference` are subordinate runtime contracts for the future Context Runtime and are not new taxonomy object families.
- `Confidence`, `Freshness`, and `Provenance` are subordinate deterministic value objects attached to Context runtime contracts and do not receive standalone identifier families.
- `ContextReference` may target existing canonical identifiers and existing `document` validation references, but this does not create a new first-class Context `Document` object. The canonical durable Context record type remains `Artifact`.
- HOST-2.0 remains governance-only. No `packages/context-runtime` implementation is introduced by this alignment work.

## Consequences

- HOST-1 taxonomy, identifier allocation, and validation surfaces now support the approved first-class Context families needed by HOST-2.1.
- The HOST-2.1 runtime can be implemented without inventing new taxonomy object families in code.
- The dependency direction remains preserved because no Knowledge Plane runtime package was introduced during alignment.
- HOST-2.1 may now commence implementation against the approved canonical type surface.

## Governance Resolution

The following gaps are resolved by this ADR:

1. `relationship`, `signal`, `observation`, and `evidence` are executable canonical identifier types in HOST-1.
2. `ContextRecord` is canonically classified as a subordinate derived record contract anchored to canonical source objects.
3. `ContextSnapshot` is canonically classified as a subordinate immutable snapshot contract over Context records.
4. `ContextReference` is canonically classified as a subordinate reference contract that reuses existing validation reference kinds.
5. `Confidence`, `Freshness`, and `Provenance` are canonically classified as subordinate deterministic value objects rather than new taxonomy object families.
6. Context references may target existing `document` records through the Control Plane validation surface without redefining `Document` as a Context object.

## Implementation Notes

This ADR introduces no runtime functionality.

It records the approved governance alignment required to let HOST-2.1 proceed without extending the Knowledge Plane model through runtime code.
