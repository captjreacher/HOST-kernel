# Traceability Model

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy-registry.md), [numbering-standards](numbering-standards.md), [object-definitions](object-definitions.md), [repository-ownership](repository-ownership.md), [naming-conventions](naming-conventions.md), [glossary](glossary.md) |

## Purpose

This model defines the lineage from intent through implementation and back into the knowledge base.

## Canonical Lineage

```text
Objective
  ->
Decision
  ->
ADR
  ->
Roadmap
  ->
Epic
  ->
Initiative
  ->
Sprint
  ->
Task
  ->
GitHub Issue
  ->
Branch
  ->
Pull Request
  ->
Merge
  ->
Deployment
  ->
Context Update
  ->
Knowledge Graph
```

## Information Flow

| Stage | Information Carried Forward |
| --- | --- |
| Objective | intent, scope, constraints, success criteria |
| Decision | chosen direction, tradeoffs, rejected alternatives |
| ADR | durable architectural reasoning and consequences |
| Roadmap | sequence, priority, dependency, target window |
| Epic | outcome grouping and scope decomposition |
| Initiative | execution slice and ownership assignment |
| Sprint | timebox, capacity, commitment |
| Task | actionable work item and completion criteria |
| GitHub Issue | implementation detail, discussion, blockers, evidence links |
| Branch | code or content change set tied to a task or issue |
| Pull Request | review context, diff, verification, approval evidence |
| Merge | confirmed integration into the target branch |
| Deployment | runtime release metadata and environment state |
| Context Update | captured operational learning or outcome summary |
| Knowledge Graph | durable cross-linked ecosystem knowledge |

## Traceability Rules

- Every stage must carry the originating Objective ID.
- Every downstream artefact must preserve the reference to the prior stage.
- Every implementation record must be back-linkable to both the governing decision and the originating objective.
- Every context update must include the implementation outcome that generated it.

## Minimum Traceability Set

For practical governance, the minimum chain is:

- Objective ID
- Decision or ADR ID
- Roadmap or Epic ID
- Task or Issue ID
- Branch name
- Pull Request number
- Merge commit reference
- Deployment reference
- Context update reference
