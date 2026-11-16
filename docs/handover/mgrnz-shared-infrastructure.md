# MGRNZ Implementation Handover — Shared Infrastructure

## Handover status

Bounded handover from HOST to MGRNZ. This document authorizes planning and
contract adoption only; it does not authorize production operations.

## MGRNZ owns

- provider adapters and operational workflows;
- trusted inventory and migration evidence collection;
- backup, restore and recovery rehearsal orchestration;
- ACL/security inventory and remediation execution after approval;
- secret-manager integration through accountable owner authority;
- operational runbooks, evidence custody and validation;
- Cockpit backend enforcement and operator-facing controls.

## MGRNZ does not own

- HOST taxonomy or canonical governance meanings;
- Roadmap sequencing authority;
- product migration semantics;
- unrestricted credentials or arbitrary SQL execution;
- production authorization without the required approval chain.

## Initial adapter

Reuse the validated BILLING Gate A fixed wrapper as the initial
Supabase/PostgreSQL recovery adapter. Reuse means conformance and controlled
integration, not copying credentials, production data, or provider execution
into HOST.

## Required MGRNZ intake

1. Accept [HOST-INFRA-RECOVERY v1.0](../contracts/shared-infrastructure-contracts.md).
2. Bind the adapter to the common identity, scope, custody and evidence fields.
3. Preserve separate technical preflight, governance approval and production
   execution authorization states.
4. Register the 30-routine security programme and the apparent embedded
   service-role credential as governed security work.
5. Return an implementation plan and owner map to Roadmap.
