# Roadmap Handover — Shared Infrastructure Activation

## Status

Prepared by HOST on 16 November 2026 for acceptance into the canonical
Roadmap repository. This file is a planning handover, not a replacement for
Roadmap-owned sequencing records.

## Governing decision

[ADR-010 — Shared Infrastructure Governance and Execution Ownership](../architecture/ADR-010-shared-infrastructure-ownership.md)

## Proposed roadmap outcomes

| Sequence | Outcome | Delivery owner | Exit evidence |
| --- | --- | --- | --- |
| 1 | Reconcile the 30-routine security inventory and assign owners | MGRNZ with product owners | Content-addressed inventory and remediation register |
| 2 | Adopt the provider-neutral infrastructure contracts | HOST / MGRNZ | Contract conformance review |
| 3 | Integrate the BILLING Gate A wrapper as the Supabase/PostgreSQL adapter | MGRNZ | Adapter validation and approved execution runbook |
| 4 | Consolidate migration provenance, backup and restore evidence | MGRNZ | Common evidence records across MGRNZ, BILLING and Opps Engine |
| 5 | Add governed Cockpit controls and evidence views | MGRNZ | No-credential, no-arbitrary-execution review |
| 6 | Reassess repository boundary after multi-provider evidence | HOST / Roadmap | Boundary decision or explicit continuation in MGRNZ |

## Continuity constraint

Existing BILLING, MGRNZ and Opps Engine gates remain eligible to proceed under
their current approved controls. The permanent capability roadmap must not be a
prerequisite for those operations.
