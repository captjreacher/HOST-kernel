# Capability Registry

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-010 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Related documents | [Taxonomy Registry](taxonomy-registry.md), [Repository Ownership](repository-ownership.md), [ADR-010](../architecture/ADR-010-shared-infrastructure-ownership.md) |

This registry uses the existing K3 Capability object. It does not create a new
taxonomy family or repository role.

| Capability | Code | Governance owner | Operational owner | Consumers |
| --- | --- | --- | --- | --- |
| Shared Database Inventory | `CAP-INFRA-001` | HOST | MGRNZ | MGRNZ, BILLING, Opps Engine, products |
| Migration Provenance and Release Gate | `CAP-INFRA-002` | HOST | MGRNZ | All migration-owning repositories |
| Database Backup and Recovery | `CAP-INFRA-003` | HOST | MGRNZ | BILLING, MGRNZ, Opps Engine, products |
| Database Security and ACL Evidence | `CAP-INFRA-004` | HOST | MGRNZ | Product owners and security programme |
| Credential Lifecycle Control | `CAP-INFRA-005` | HOST | Accountable owner with MGRNZ delegation | Approved operators |
| Recovery and Release Evidence | `CAP-INFRA-006` | HOST | Producing repository; MGRNZ for shared infrastructure | HOST, Roadmap, products |
| Governed Infrastructure Operations | `CAP-INFRA-007` | HOST | MGRNZ | Approved operators and Cockpit |
| Cockpit Infrastructure Controls | `CAP-INFRA-008` | HOST | MGRNZ | Operators and approvers |

## Boundary rules

- Product repositories own product semantics and validation.
- MGRNZ owns shared implementation and execution, not canonical governance.
- Cockpit cannot bypass the operational owner or accept arbitrary execution.
- Provider adapters are subordinate implementations of these capabilities.
- Capability status does not imply production authorization.
