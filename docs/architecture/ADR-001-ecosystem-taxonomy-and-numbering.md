# ADR-001 - Ecosystem Taxonomy and Numbering Model

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Accepted |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-002](../kernel/operating-model.md), [OBJ-003](../services/registry-service-specification.md), [OBJ-004](../context/context-domain-model.md), [OBJ-005](../lifecycle/ecosystem-state-machine.md) |

## Context

The HOST ecosystem is moving from isolated repositories toward a coordinated operating platform. That shift requires a shared ontology for governance, planning, knowledge, delivery, runtime, and product domains.

Without a canonical taxonomy:

- terminology drifts between repositories
- identifiers are not deterministic
- ownership boundaries overlap
- lineage from objective to implementation becomes ambiguous
- AI-generated artefacts cannot be traced reliably

## Decision

Adopt the Ecosystem Taxonomy Registry as the constitutional source of truth for the HOST ecosystem.

The registry is defined in:

- [docs/taxonomy/taxonomy-registry.md](../taxonomy/taxonomy-registry.md)
- [docs/taxonomy/taxonomy-hierarchy.md](../taxonomy/taxonomy-hierarchy.md)
- [docs/taxonomy/numbering-standards.md](../taxonomy/numbering-standards.md)
- [docs/taxonomy/object-definitions.md](../taxonomy/object-definitions.md)
- [docs/taxonomy/repository-ownership.md](../taxonomy/repository-ownership.md)
- [docs/taxonomy/traceability-model.md](../taxonomy/traceability-model.md)
- [docs/taxonomy/naming-conventions.md](../taxonomy/naming-conventions.md)
- [docs/taxonomy/glossary.md](../taxonomy/glossary.md)

## Consequences

- Every future artefact must use an Objective ID before work begins.
- Every generated artefact must carry a deterministic identifier.
- Every repository must respect its ownership boundary.
- Every planning item must remain traceable back to the originating Objective.
- Every runtime or delivery artefact must be back-linked to the governing knowledge and planning chain.

## Governance Rule

Before any work begins:

1. Allocate or confirm the Objective ID.
2. Recommend the ChatGPT conversation title using the Objective ID.
3. Recommend the Codex session name using the same Objective ID.
4. Use the Objective ID in every generated artefact.
5. Do not proceed until traceability has been established.

## Implementation Notes

This ADR does not define application behavior. It establishes documentation and governance rules only.

Future implementation work must refer to the taxonomy registry before creating:

- objectives
- decisions
- roadmaps
- epics
- initiatives
- sprints
- tasks
- issues
- branches
- pull requests
- merges
- deployments
- context records
- knowledge graph entries
- runtime records
