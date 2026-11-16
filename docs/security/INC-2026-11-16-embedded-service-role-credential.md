# Security Incident Record — Apparent Embedded Service-Role Credential

## Incident metadata

| Field | Value |
| --- | --- |
| Incident ID | `INC-2026-11-16-MGRNZ-CREDENTIAL-EXPOSURE` |
| Priority | P1 — security owner review required |
| Status | Open — separate governed resolution required |
| Detected by | HOST read-only architectural assessment |
| Affected boundary | MGRNZ checkout; exact secret value intentionally omitted |
| Accountable owner | MGRNZ security/credential owner to assign |

## Observation

Read-only repository inspection found a script containing what appears to be an
embedded Supabase service-role credential. HOST did not use, transmit, validate
against, or reproduce the credential.

## Required governed actions

- Confirm whether the value is live, synthetic or historical.
- If live or uncertain, rotate/revoke it through the accountable credential
  owner and provider-approved process.
- Remove the secret from source and reachable history using the owning
  repository's approved remediation procedure.
- Audit access and downstream exposure according to the security policy.
- Record validation evidence without including the secret value.

This record does not authorize credential rotation or any provider operation.
