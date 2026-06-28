# Ecosystem Taxonomy Registry

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [ADR-001](../architecture/ADR-001-ecosystem-taxonomy-and-numbering.md), [taxonomy-hierarchy](taxonomy-hierarchy.md), [numbering-standards](numbering-standards.md), [object-definitions](object-definitions.md), [repository-ownership](repository-ownership.md), [traceability-model](traceability-model.md), [naming-conventions](naming-conventions.md), [glossary](glossary.md) |

## Purpose

This registry is the canonical source of truth for the HOST ecosystem ontology, identifier model, ownership boundaries, and traceability rules.

It governs how all future artefacts are named, linked, and classified across the ecosystem.

## Scope

The registry covers six top-level domains:

- Governance
- Planning
- Knowledge
- Delivery
- Runtime
- Products

It also covers the canonical repository roles:

- HOST
- CONTEXT
- Roadmap
- Product repositories

## Registry Principles

- One concept has one canonical name.
- One object type has one identifier pattern.
- One repository owns one responsibility boundary.
- Every artefact must be traceable to an originating Objective.
- No repository may own another repository's responsibility.

## Canonical Documents

| Document | Purpose |
| --- | --- |
| [ADR-001](../architecture/ADR-001-ecosystem-taxonomy-and-numbering.md) | Records the decision to adopt this registry |
| [taxonomy-hierarchy](taxonomy-hierarchy.md) | Shows the full hierarchy |
| [numbering-standards](numbering-standards.md) | Defines the identifier model |
| [object-definitions](object-definitions.md) | Defines each ecosystem object |
| [repository-ownership](repository-ownership.md) | Defines ownership boundaries |
| [traceability-model](traceability-model.md) | Defines lineage across work stages |
| [naming-conventions](naming-conventions.md) | Defines naming rules for generated artefacts |
| [glossary](glossary.md) | Defines canonical terminology |

## Canonical Lookup Table

| Code | Object |
| --- | --- |
| G1 | Objectives |
| G2 | Decisions |
| G3 | ADRs |
| G4 | Policies |
| G5 | Standards |
| P1 | Roadmaps |
| P2 | Epics |
| P3 | Initiatives |
| P4 | Sprints |
| P5 | Milestones |
| P6 | Releases |
| K1 | Entities |
| K2 | Relationships |
| K3 | Capabilities |
| K4 | Workflows |
| K5 | Signals |
| K6 | Observations |
| K7 | Evidence |
| K8 | Events |
| K9 | States |
| K10 | Artifacts |
| D1 | Tasks |
| D2 | Issues |
| D3 | Branches |
| D4 | Commits |
| D5 | Pull Requests |
| D6 | Merges |
| D7 | Deployments |
| R1 | Sessions |
| R2 | Conversations |
| R3 | Agents |
| R4 | Jobs |
| R5 | Queues |
| R6 | Notifications |
| R7 | Executions |
| X1 | HOST |
| X2 | CONTEXT |
| X3 | Roadmap |
| X4 | MGRNZ |
| X5 | FindYourVertical |
| X6 | FunkMyFans |
| X7 | Future Products |

## Governance Responsibility

The registry is governed by HOST.

HOST owns:

- governance
- orchestration
- taxonomy
- lifecycle
- standards

## Adoption Rule

Any future repository or document may adopt this registry without modification.

That means the repository may reference the registry, but it may not redefine its terms, codes, or boundaries.

Subordinate runtime contracts may be defined by governance without becoming new canonical lookup-table object families.

Those contracts must reuse the existing canonical object families and identifier model unless a future Objective and ADR explicitly extend the registry.
