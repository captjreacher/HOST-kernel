# OBJ-010 — Shared Infrastructure Governance Activation

## Governance Metadata

| Field | Value |
| --- | --- |
| Objective | `OBJ-010` |
| Status | Approved |
| Version | 1.0 |
| Owner | HOST |
| Approved | 2026-11-16 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-002](../kernel/operating-model.md), [ADR-010](../architecture/ADR-010-shared-infrastructure-ownership.md), [Capability Registry](../taxonomy/capability-registry.md), [Roadmap Handover](../roadmap/shared-infrastructure-activation.md), [MGRNZ Handover](../handover/mgrnz-shared-infrastructure.md) |

## Objective

Establish the governed, provider-neutral ownership and evidence contracts for
shared database inventory, migration governance, backup, recovery, database
security, credential lifecycle and infrastructure operations without adding a
new infrastructure repository or an infrastructure runtime to HOST-kernel.

## Approved outcomes

- HOST owns governance, contracts, standards, taxonomy and validation gates.
- MGRNZ owns shared infrastructure implementation and operational execution.
- Product repositories retain domain migrations and release validation.
- Cockpit provides governed controls without privileged credentials or
  arbitrary execution.
- BILLING's validated Gate A wrapper is the initial provider adapter, subject
  to its existing execution approval.
- The 30 PUBLIC-executable `SECURITY DEFINER` routines are managed as one
  ecosystem security remediation programme.
- Common recovery-evidence contracts are canonical.
- Existing BILLING, MGRNZ and Opps Engine operations remain continuous.

## Traceability chain

```text
OBJ-010
  -> ADR-010
  -> CAP-001..CAP-008
  -> Roadmap Handover
  -> MGRNZ Implementation Handover
  -> PR #3
```

This objective governs documentation and contract definition only. It does not
authorize production access, credential changes, database changes, migrations,
deployments or provider execution.
