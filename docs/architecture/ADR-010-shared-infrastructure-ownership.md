# ADR-010 - Shared Infrastructure Governance and Execution Ownership

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-010 |
| Status | Accepted — architecture activation |
| Version | 1.0 |
| Owner | HOST |
| Accepted | 2026-11-16 |
| Related documents | [OBJ-000](../constitution/ecosystem-constitution.md), [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-002](../kernel/operating-model.md), [Capability Registry](../taxonomy/capability-registry.md), [Shared Infrastructure Contracts](../contracts/shared-infrastructure-contracts.md) |

## Context

MGRNZ, BILLING and Opps Engine independently developed migration, backup,
recovery and release-evidence controls against shared Supabase infrastructure.
They also identified a common security concern involving PUBLIC-executable
`SECURITY DEFINER` routines. The duplication demonstrates a missing shared
capability, but HOST's constitutional boundary excludes infrastructure
execution runtimes.

## Decision

1. HOST owns provider-neutral governance, contracts, standards, taxonomy and
   validation gates.
2. MGRNZ owns shared infrastructure implementation and operational execution.
3. Product repositories retain domain-specific migrations, product recovery
   scope and release validation.
4. Cockpit provides governed operator controls and evidence views. It must not
   hold direct privileged credentials, accept arbitrary SQL, or become the
   execution runtime.
5. No new infrastructure repository is authorised. MGRNZ is the initial
   operational boundary. A separate repository requires a future ADR based on
   demonstrated separation, scale or provider-diversity needs.
6. BILLING's validated Gate A wrapper is the initial provider-specific
   Supabase/PostgreSQL recovery adapter, subject to its existing execution
   approval. HOST does not execute or modify that adapter.
7. The 30 PUBLIC-executable `SECURITY DEFINER` routines are one ecosystem
   security remediation programme. The authoritative inventory, ownership and
   remediation status must be reconciled before changes are made.
8. Credential lifecycle remains under accountable owner authority with
   controlled operational delegation. Credentials and credential payloads are
   never HOST artefacts.

## Contract boundary

The provider-neutral contracts are defined in
[Shared Infrastructure Contracts](../contracts/shared-infrastructure-contracts.md).
Provider adapters may implement them only in the operational owner boundary.
The contracts do not authorize production access, migrations, deployments,
credential operations or provider changes.

## Consequences

- Shared infrastructure evidence can be consumed by multiple products without
  copying provider-specific execution logic.
- MGRNZ becomes accountable for operational controls without becoming the
  owner of product migration semantics.
- HOST remains a governance and contract repository, not an infrastructure
  runtime.
- Existing BILLING, MGRNZ and Opps Engine recovery gates may continue through
  their approved transitional paths.
- Roadmap sequencing remains owned by Roadmap; the HOST handover package is
  not a substitute for canonical Roadmap records.

## Explicit non-decisions

This ADR does not authorize:

- production database access;
- role, ACL or `SECURITY DEFINER` changes;
- credential creation, rotation or revocation;
- migrations, deployments or provider execution;
- a new infrastructure repository;
- replacement of product-specific release validation;
- treating a logical database backup as complete Supabase project recovery.

## Approval gate

This ADR records the approved architecture. Implementation remains subject to
the contract and operational approval gates, including scope, identity, access,
credential custody, artifact custody, restore validation and release evidence.
