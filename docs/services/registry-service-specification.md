# OBJ-003 - Registry Service Specification

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-003 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-002](../kernel/operating-model.md), [OBJ-004](../context/context-domain-model.md), [OBJ-005](../lifecycle/ecosystem-state-machine.md), [ADR-001](../architecture/ADR-001-ecosystem-taxonomy-and-numbering.md), [ADR-002](../architecture/ADR-002-host-kernel-operating-model.md) |

Canonical technical specification for the HOST Registry Service.

## Purpose

The Registry Service is the deterministic registry boundary for the HOST ecosystem.

It stores, validates, resolves, and traces canonical registry records for governance, planning, knowledge, delivery, and repository metadata.

This document specifies behaviour only. It does not define a database schema or implementation detail.

## Canonical References

| Document | Role |
| --- | --- |
| [OBJ-000](../constitution/ecosystem-constitution.md) | Entry point for the governance framework |
| [OBJ-001](../taxonomy/taxonomy-registry.md) | Canonical taxonomy, numbering, and ownership model |
| [OBJ-002](../kernel/operating-model.md) | Canonical request and governance operating model |
| [ADR-001](../architecture/ADR-001-ecosystem-taxonomy-and-numbering.md) | Taxonomy and numbering decision record |
| [ADR-002](../architecture/ADR-002-host-kernel-operating-model.md) | Kernel operating model decision record |
| [OBJ-004](../context/context-domain-model.md) | Canonical CONTEXT object model |
| [OBJ-005](../lifecycle/ecosystem-state-machine.md) | Canonical lifecycle rules |

## Scope

The Registry Service governs these registry families:

- Objective Registry
- Decision Registry
- ADR Registry
- Repository Registry
- Taxonomy Registry
- Capability Registry
- Document Registry
- Naming Registry
- Relationship Registry

It also provides shared service behaviour for:

- Identifier Generation
- Validation
- Lookup
- Resolution
- Lifecycle Integration
- Traceability Enforcement
- Repository Discovery

## Non-Scope

- No UI
- No workflow engine
- No planning engine
- No knowledge graph storage implementation
- No product business logic
- No authorization policy engine
- No hidden mutation of downstream repositories

## Service Principles

- Identifiers must be deterministic.
- Validation must be explicit and repeatable.
- Lookup must not mutate state.
- Resolution must prefer canonical sources over derived copies.
- Traceability must preserve the originating Objective ID.
- Ownership must remain with the canonical repository for the record type.
- Duplicate canonical records must be rejected or resolved through governance.

## Service Interfaces

| Interface | Inputs | Outputs | Owner | Interacts With |
| --- | --- | --- | --- | --- |
| Objective Registry | Objective draft, title, scope, originating request, owning repository | Canonical Objective record, Objective ID, validation status | HOST | OBJ-002, Roadmap, CONTEXT |
| Decision Registry | Objective reference, decision statement, alternatives, rationale, approver | Decision record, decision ID, traceability links | HOST | OBJ-002, ADR workflow, GitHub |
| ADR Registry | Decision reference, architectural context, consequences, status | ADR record, ADR ID, canonical link set | HOST | OBJ-001, OBJ-002, GitHub |
| Repository Registry | Repository name, owner, purpose, boundary description | Repository record, repository key, ownership status | HOST | GitHub, Roadmap, product repositories |
| Taxonomy Registry | Object family, canonical term, ownership rule, identifier pattern | Registry entry, canonical code, validation result | HOST | OBJ-001, ADR-001 |
| Capability Registry | Capability name, owning repository, dependencies, lifecycle state | Capability record, capability ID, dependency graph | CONTEXT with HOST governance | OBJ-004, Roadmap, product repositories |
| Document Registry | Document type, title, objective reference, repository owner | Document record, document ID, link set | Owning repository | OBJ-000, OBJ-001, OBJ-002 |
| Naming Registry | Proposed name, object family, objective reference | Naming decision, approved naming pattern, rejection reason | HOST | OBJ-001, ADR-001 |
| Relationship Registry | Source object, target object, relationship type, evidence | Relationship record, resolved lineage, validation status | CONTEXT | OBJ-004, OBJ-005 |
| Identifier Generation | Object family, repository code, sequence scope | Canonical identifier, allocation metadata | HOST | OBJ-001, OBJ-005 |
| Validation | Candidate record, canonical rule set, ownership boundary | Pass/fail result, validation notes, remediation hints | HOST | OBJ-001, OBJ-002, OBJ-005 |
| Lookup | Object family, identifier, key, filters | Matching canonical records | Read-only service consumer | All canonical registries |
| Resolution | Ambiguous reference, candidate set, precedence rule | Resolved canonical record, confidence notes | HOST | OBJ-001, OBJ-004 |
| Lifecycle Integration | Record type, requested transition, actor, trigger | Transition result, new state, audit trail | Owning repository with HOST governance | OBJ-005 |
| Traceability Enforcement | Originating Objective, downstream artefact, lineage chain | Traceability verdict, missing-link report | HOST | OBJ-001, OBJ-002, OBJ-004, OBJ-005 |
| Repository Discovery | Repository key, capability, boundary filter | Canonical repository list, ownership details | HOST | GitHub, repository registry |

## Behavioural Rules

### Identifier Generation

- Each object family uses the canonical identifier pattern from OBJ-001.
- Allocation is monotonic within the approved family scope.
- Identifiers are never reassigned.

### Validation

- Unknown object families fail validation.
- Duplicate canonical keys fail validation.
- Ownership conflicts fail validation.
- Cross-repository references must be back-linkable to a canonical source.

### Lookup and Resolution

- Lookup returns records without side effects.
- Resolution selects the canonical record with the highest precedence.
- If no canonical record exists, the request must fail clearly rather than inventing a record.

### Lifecycle Integration

- Every state transition must satisfy OBJ-005.
- Only the owning repository may propose or execute a transition unless HOST governance explicitly overrides.

### Traceability Enforcement

- Every record must preserve the originating Objective ID.
- Every downstream record must preserve the immediate parent reference.
- Every derived record must be explainable from the canonical lineage chain.

## Repository Ownership

| Repository | Registry Responsibility |
| --- | --- |
| HOST | Owns governance registries, canonical naming, identifier policy, and validation rules |
| CONTEXT | Owns knowledge registries, relationship records, and capability semantics |
| Roadmap | Owns planning registries and sequencing references |
| Product repositories | Own implementation-facing records and release-linked artefacts |

## External Interactions

| System | Interaction |
| --- | --- |
| HOST | Provides canonical policy, approval, and registry governance |
| CONTEXT | Supplies knowledge records, relationships, evidence, and context refresh links |
| Roadmap | Supplies planning objects, milestones, releases, and sequencing intent |
| GitHub | Supplies issues, pull requests, commits, branches, and repository metadata |
| Future services | Consume canonical registry records through deterministic interfaces |

## Validation Outcome

An operation is valid only when:

- the input conforms to the canonical object family
- the owning repository is unambiguous
- the identifier pattern is correct
- the traceability chain is complete enough for the requested operation
- the lifecycle transition is allowed by OBJ-005

If any requirement fails, the service must return a deterministic rejection with a machine-readable reason.
