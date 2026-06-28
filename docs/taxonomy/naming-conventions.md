# Naming Conventions

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy-registry.md), [numbering-standards](numbering-standards.md), [object-definitions](object-definitions.md), [repository-ownership](repository-ownership.md), [traceability-model](traceability-model.md), [glossary](glossary.md) |

## Purpose

These naming conventions ensure deterministic traceability across documents, planning, delivery, runtime, and product artefacts.

## General Rules

- Use the official object identifier in the title or metadata where possible.
- Keep names short, stable, and searchable.
- Never reuse a title for a different object.
- Include the Objective ID in every generated artefact when the artefact is work-derived.
- Use canonical repository and product names exactly as defined in the registry.

## Object Naming Rules

| Object | Naming Rule | Example |
| --- | --- | --- |
| Objectives | `OBJ-### - Short Title` | `OBJ-001 - Establish the Ecosystem Taxonomy Registry` |
| ADRs | `ADR-### - Short Title` | `ADR-001 - Ecosystem Taxonomy and Numbering Model` |
| Roadmaps | `RDM-### - Domain or Quarter` | `RDM-001 - Platform Planning` |
| Epics | `EPC-### - Outcome Name` | `EPC-001 - Registry Foundation` |
| Sprints | `SPT-### - Date or Theme` | `SPT-001 - June Delivery` |
| GitHub Issues | `ISS-### - Short Problem Statement` | `ISS-001 - Define taxonomy registry` |
| Branches | `type/OBJ-###-short-slug` | `docs/OBJ-001-taxonomy-registry` |
| Pull Requests | `OBJ-### short action phrase` | `OBJ-001 add taxonomy registry docs` |
| Commits | `OBJ-### short imperative summary` | `OBJ-001 add canonical taxonomy docs` |
| Context records | `OBJ-### / object / status` | `OBJ-001 / context-update / accepted` |
| Capabilities | noun phrase in title case | `Registry Read` |
| Workflows | verb-led noun phrase | `Decision Review Workflow` |
| Entities | singular canonical noun | `Product` |
| Products | canonical product name | `FindYourVertical` |
| Repositories | canonical repository name | `HOST-kernel` |
| Documents | `ID - Title` or canonical registry file name | `taxonomy-registry.md` |
| ChatGPT conversations | `OBJ-### | Short Title` | `OBJ-001 | Ecosystem Taxonomy Registry` |
| Codex sessions | `OBJ-### | Short Title` | `OBJ-001 | Ecosystem Taxonomy Registry` |

## Branch Naming

Branch names should be deterministic, lowercase, and slash-delimited.

Recommended pattern:

```text
<type>/<objective-id>-<short-slug>
```

Examples:

- `docs/OBJ-001-taxonomy-registry`
- `feat/OBJ-014-context-links`
- `fix/ADR-001-ownership-boundary`

## Product and Repository Naming

- Products use their official canonical name.
- Repositories use their official canonical repository name.
- Avoid abbreviations unless the abbreviation is itself canonical.

## Conversation and Session Naming

The governing objective should appear in the title before any other work begins.

Recommended examples:

- `OBJ-001 | Ecosystem Taxonomy Registry`
- `OBJ-001 | ADR-001 Draft`
- `OBJ-001 | Registry Validation`

## Traceability Requirement

If a name cannot be traced back to an Objective ID, it is not ready for ecosystem use.
