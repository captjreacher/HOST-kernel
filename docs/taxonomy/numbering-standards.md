# Numbering Standards

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy-registry.md), [object-definitions](object-definitions.md), [repository-ownership](repository-ownership.md), [traceability-model](traceability-model.md), [naming-conventions](naming-conventions.md), [glossary](glossary.md) |

## Purpose

These standards define how canonical identifiers are formed across the HOST ecosystem.

The objective is deterministic traceability, not human preference.

## General Rules

- Every identifier must be unique within its object family.
- Every identifier must be stable over time.
- Every identifier must be prefixed by the object family code.
- Every identifier must be easy to sort, cite, and search.
- Every identifier must support lineage back to the originating Objective ID.

## Canonical Identifier Patterns

| Object | Prefix | Pattern | Example |
| --- | --- | --- | --- |
| Objective | `OBJ` | `OBJ-001` | `OBJ-001` |
| Decision | `DEC` | `DEC-001` | `DEC-001` |
| ADR | `ADR` | `ADR-001` | `ADR-001` |
| Policy | `POL` | `POL-001` | `POL-001` |
| Standard | `STD` | `STD-001` | `STD-001` |
| Roadmap | `RDM` | `RDM-001` | `RDM-001` |
| Epic | `EPC` | `EPC-001` | `EPC-001` |
| Initiative | `INI` | `INI-001` | `INI-001` |
| Sprint | `SPT` | `SPT-001` | `SPT-001` |
| Milestone | `MST` | `MST-001` | `MST-001` |
| Release | `RLS` | `RLS-001` | `RLS-001` |
| Entity | `ENT` | `ENT-001` | `ENT-001` |
| Relationship | `RLT` | `RLT-001` | `RLT-001` |
| Capability | `CAP` | `CAP-001` | `CAP-001` |
| Workflow | `WF` | `WF-001` | `WF-001` |
| Signal | `SIG` | `SIG-001` | `SIG-001` |
| Observation | `OBS` | `OBS-001` | `OBS-001` |
| Evidence | `EVD` | `EVD-001` | `EVD-001` |
| Event | `EVT` | `EVT-001` | `EVT-001` |
| Artifact | `ART` | `ART-001` | `ART-001` |
| Task | `TASK` | `TASK-001` | `TASK-001` |
| Issue | `ISS` | `ISS-001` | `ISS-001` |
| Branch | `BR` | `BR-001` | `BR-001` |
| Commit | `COM` | `COM-001` | `COM-001` |
| Pull Request | `PR` | `PR-001` | `PR-001` |
| Merge | `MRG` | `MRG-001` | `MRG-001` |
| Deployment | `DPL` | `DPL-001` | `DPL-001` |
| Session | `SES` | `SES-001` | `SES-001` |
| Conversation | `CVS` | `CVS-001` | `CVS-001` |
| Agent | `AGT` | `AGT-001` | `AGT-001` |
| Job | `JOB` | `JOB-001` | `JOB-001` |
| Queue | `QUE` | `QUE-001` | `QUE-001` |
| Notification | `NOT` | `NOT-001` | `NOT-001` |
| Execution | `EXE` | `EXE-001` | `EXE-001` |
| Product | canonical domain code | `HOST`, `CONTEXT`, `Roadmap`, `MGRNZ`, `FYV`, `FMF` | `HOST` |

## Product Identifier Model

Products use short deterministic domain codes rather than a numeric-only sequence.

Recommended product codes:

- `HOST`
- `CTX`
- `RDM`
- `MGRNZ`
- `FYV`
- `FMF`
- future product codes approved by governance

When a product requires a hierarchical suffix, the suffix must be dot-delimited and deterministic.

Examples:

- `HOST-1`
- `HOST-1.1`
- `CTX-3`
- `FYV-2.4`
- `FMF-5`

## Purpose, Owner, Lifecycle, Examples

| Identifier Family | Purpose | Owner | Lifecycle | Example |
| --- | --- | --- | --- | --- |
| `OBJ` | Governs objectives | HOST governance | Proposed -> active -> closed | `OBJ-001` |
| `DEC` | Records decisions | HOST governance | Proposed -> accepted -> superseded | `DEC-001` |
| `ADR` | Captures architecture decisions | HOST governance | Draft -> accepted -> archived | `ADR-001` |
| `POL` | Defines policy requirements | HOST governance | Draft -> approved -> retired | `POL-001` |
| `STD` | Defines standard behaviour | HOST governance | Draft -> approved -> revised | `STD-001` |
| `RDM` | Organizes roadmap sequencing | Roadmap repository | Draft -> active -> closed | `RDM-001` |
| `EPC` | Groups work by outcome | Roadmap repository | Draft -> planned -> complete | `EPC-001` |
| `INI` | Breaks epics into deliverable tracks | Roadmap repository | Draft -> active -> done | `INI-001` |
| `SPT` | Timeboxes delivery | Roadmap repository | Planned -> active -> complete | `SPT-001` |
| `MST` | Marks coordination checkpoints | Roadmap repository | Proposed -> reached -> archived | `MST-001` |
| `RLS` | Marks release versions | Roadmap repository | Planned -> released -> retired | `RLS-001` |
| `ENT` | Names a knowledge entity | CONTEXT | Proposed -> registered -> deprecated | `ENT-001` |
| `RLT` | Links two knowledge objects | CONTEXT | Proposed -> active -> retired | `RLT-001` |
| `CAP` | Names a capability | CONTEXT or product owner | Proposed -> registered -> retired | `CAP-001` |
| `WF` | Names a workflow | CONTEXT or product owner | Draft -> active -> retired | `WF-001` |
| `SIG` | Names a signal | CONTEXT | Draft -> active -> archived | `SIG-001` |
| `OBS` | Names an observation | CONTEXT | Captured -> verified -> archived | `OBS-001` |
| `EVD` | Names evidence | CONTEXT | Collected -> verified -> archived | `EVD-001` |
| `EVT` | Names an event | Runtime or product owner | Emitted -> consumed -> archived | `EVT-001` |
| `ART` | Names an artifact | Owning repository | Draft -> current -> archived | `ART-001` |
| `TASK` | Names a task | Delivery repository or team | Open -> in progress -> done | `TASK-001` |
| `ISS` | Names an issue | Delivery repository or team | Open -> triaged -> closed | `ISS-001` |
| `BR` | Names a branch | Repository owner | Open -> merged -> deleted | `BR-001` |
| `COM` | Names a commit | Repository owner | Created -> referenced -> immutable | `COM-001` |
| `PR` | Names a pull request | Repository owner | Open -> reviewed -> merged | `PR-001` |
| `MRG` | Names a merge event | Repository owner | Created -> merged -> archived | `MRG-001` |
| `DPL` | Names a deployment | Product owner | Planned -> deployed -> rolled back | `DPL-001` |
| `SES` | Names a session | Runtime owner | Open -> active -> closed | `SES-001` |
| `CVS` | Names a conversation | Runtime owner | Open -> active -> archived | `CVS-001` |
| `AGT` | Names an agent | Runtime owner | Provisioned -> active -> retired | `AGT-001` |
| `JOB` | Names a job | Runtime owner | Queued -> running -> complete | `JOB-001` |
| `QUE` | Names a queue | Runtime owner | Provisioned -> active -> retired | `QUE-001` |
| `NOT` | Names a notification | Runtime owner | Created -> delivered -> archived | `NOT-001` |
| `EXE` | Names an execution | Runtime owner | Created -> running -> complete | `EXE-001` |
