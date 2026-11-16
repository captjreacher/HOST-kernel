# Capability Registry

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-010 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Related documents | [OBJ-010](../objectives/OBJ-010-shared-infrastructure-activation.md), [Taxonomy Registry](taxonomy-registry.md), [Repository Ownership](repository-ownership.md), [ADR-010](../architecture/ADR-010-shared-infrastructure-ownership.md) |

This registry uses the existing K3 Capability object. It does not create a new
taxonomy family or repository role.

| Capability | Code | Governance owner | Operational owner | Consumers |
| --- | --- | --- | --- | --- |
| Shared Database Inventory | `CAP-001` | HOST | MGRNZ | MGRNZ, BILLING, Opps Engine, products |
| Migration Provenance and Release Gate | `CAP-002` | HOST | MGRNZ | All migration-owning repositories |
| Database Backup and Recovery | `CAP-003` | HOST | MGRNZ | BILLING, MGRNZ, Opps Engine, products |
| Database Security and ACL Evidence | `CAP-004` | HOST | MGRNZ | Product owners and security programme |
| Credential Lifecycle Control | `CAP-005` | HOST | Accountable owner with MGRNZ delegation | Approved operators |
| Recovery and Release Evidence | `CAP-006` | HOST | Producing repository; MGRNZ for shared infrastructure | HOST, Roadmap, products |
| Governed Infrastructure Operations | `CAP-007` | HOST | MGRNZ | Approved operators and Cockpit |
| Cockpit Infrastructure Controls | `CAP-008` | HOST | MGRNZ | Operators and approvers |

The eight allocations above use the canonical `CAP-###` pattern from
[Numbering Standards](numbering-standards.md). A repository-wide search found
no previously allocated capability identifiers; the other `CAP-001` mentions
are numbering examples or tests of the canonical pattern. IDs are unique
within this registry and trace to `OBJ-010`.

## Boundary rules

- Product repositories own product semantics and validation.
- MGRNZ owns shared implementation and execution, not canonical governance.
- Cockpit cannot bypass the operational owner or accept arbitrary execution.
- Provider adapters are subordinate implementations of these capabilities.
- Capability status does not imply production authorization.
