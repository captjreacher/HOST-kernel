# Repository Ownership

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy-registry.md), [object-definitions](object-definitions.md), [taxonomy-hierarchy](taxonomy-hierarchy.md), [traceability-model](traceability-model.md), [naming-conventions](naming-conventions.md) |

## Purpose

This document defines who owns which responsibility boundary in the HOST ecosystem.

## Ownership Boundaries

| Repository | Owns | Does Not Own |
| --- | --- | --- |
| HOST | governance, orchestration, taxonomy, lifecycle, standards | product implementation, knowledge records, roadmap planning detail |
| CONTEXT | knowledge, entities, observations, evidence, relationships | governance policy, roadmap sequencing, product implementation detail |
| Roadmap | planning, priorities, dependencies, releases | governance policy, knowledge graph semantics, product implementation detail |
| MGRNZ | platform implementation, testing, and deployment for the shared platform scope | governance taxonomy, canonical knowledge definitions, roadmap authority |
| FindYourVertical | product implementation and testing for its domain | ecosystem governance, canonical knowledge definitions for the whole platform |
| FunkMyFans | product implementation and testing for its domain | ecosystem governance, canonical knowledge definitions for the whole platform |
| Future Products | product implementation and testing for future domains | ecosystem governance, canonical knowledge definitions for the whole platform |

## Boundary Rules

- HOST sets the rules.
- CONTEXT records the meaning.
- Roadmap orders the work.
- Products implement and validate.
- No repository may claim canonical ownership of another repository's core responsibility.

## Ownership Examples

- A governance decision belongs in HOST.
- A knowledge entity belongs in CONTEXT.
- A release plan belongs in Roadmap.
- A feature implementation belongs in a product repository.
- A deployment record belongs to the product or owning delivery repository, but not to HOST as a canonical business record.

## Conflict Rule

If two repositories could claim the same responsibility, the responsibility is not yet unambiguous and must be resolved before implementation begins.
