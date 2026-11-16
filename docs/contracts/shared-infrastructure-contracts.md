# Shared Infrastructure and Recovery-Evidence Contracts

## Governance Metadata

| Field | Value |
| --- | --- |
| Contract family | `HOST-INFRA-RECOVERY` |
| Version | `1.0.0` |
| Governance owner | HOST |
| Operational owner | MGRNZ |
| Status | Active contract definition |
| Governing ADR | [ADR-010](../architecture/ADR-010-shared-infrastructure-ownership.md) |

These contracts are provider-neutral. They define evidence and control
boundaries, not an execution implementation. A provider adapter must supply
the provider-specific mechanism and report unsupported capabilities explicitly.

## Common identity contract

Every inventory, migration, backup, restore or release-evidence record must
bind:

| Field | Requirement |
| --- | --- |
| `contractVersion` | Contract version used to produce the record |
| `evidenceId` | Stable unique evidence identifier |
| `projectId` | Provider-neutral project identifier |
| `provider` | Provider name and adapter version |
| `environment` | `local`, `staging`, `production` or equivalent |
| `observedAt` | UTC observation timestamp |
| `sourceCommit` | Immutable source/evidence commit where applicable |
| `scopeDigest` | Digest of the frozen scope manifest |
| `artifactDigest` | Digest of any referenced artifact |
| `actor` | Accountable operator or workflow identity, never a secret |
| `approvalRefs` | References to required approvals and decisions |

Records must be content-addressable, redacted, reproducible where possible,
and must not contain credentials, customer data or plaintext backup payloads.

## Inventory contract

An inventory adapter must report, at minimum:

- project and database identity;
- connection security posture and effective role identity;
- migration history and source/provenance bindings;
- schemas, relations, routines, triggers, policies, ACLs and ownership;
- managed/provider-owned dependencies;
- external dependencies required for recovery;
- unsupported or unobserved categories;
- read-only and failure-closed verification results.

Inventory collection must be read-only unless a separately approved contract
explicitly says otherwise. Inventory evidence is not migration authorization.

## Migration-governance contract

A migration release record must bind:

- one immutable source commit;
- one approved project/environment;
- the complete migration manifest;
- applied, pending and excluded migration sets;
- dependency and ordering checks;
- exact SQL or source digests, without requiring SQL bodies in HOST;
- remote dry-run evidence where supported;
- owner and database-risk approvals;
- a separate production execution authorization.

The validator must fail closed on identity mismatch, missing evidence,
unapproved versions, digest mismatch or ambiguous migration state.

## Backup contract

A backup record must include:

- frozen recovery scope and exclusions;
- source identity and adapter image/version;
- TLS and access-control verification;
- read-only or equivalent session controls;
- artifact encryption and custody references;
- artifact digest and transfer verification;
- provider-managed and external recovery dependencies;
- retention and disposal evidence;
- explicit production authorization reference.

The backup contract does not require one dump format. It does require that
unsupported recovery categories are named rather than silently omitted.

## Restore/recovery contract

A recovery rehearsal must identify:

- source artifact and scope digest;
- isolated target and network boundary;
- disabled or quarantined external operations;
- restore method and adapter version;
- schema, object, migration and sequence checks;
- application/product validation results;
- unresolved gaps and recovery decision;
- cleanup and artifact-custody evidence.

A successful logical restore is evidence for the tested scope only. It is not
evidence that provider-managed Auth, Storage bytes, project settings, secrets,
Edge Functions, DNS or external services are recoverable.

## Security and credential contract

- Credential material is held by an approved secret-management process.
- Repository files, logs, evidence, artifacts and HOST documents contain only
  references and metadata.
- Privileged operations require named accountable ownership and bounded,
  supervised delegation.
- ACL and routine exposure findings are inventoried before remediation.
- Remediation must identify owner, affected object, intended privilege,
  rollback/recovery path and validation evidence.

## Release-evidence contract

Release evidence must distinguish:

1. technical preflight;
2. governance approval;
3. production execution authorization;
4. execution result;
5. post-execution validation;
6. recovery/rollback readiness.

No evidence record by itself grants production authorization.
