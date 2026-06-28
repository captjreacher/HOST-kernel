# HOST-3.3 - API Host Contract Hardening

## Summary

HOST-3.3 freezes `@host/api-host` as the canonical versioned API contract boundary for HOST application services.

## Recorded Changes

- request handling now uses the canonical `operation` and `resource` envelope instead of host-specific routing terminology
- responses now use transport-independent success and error envelopes with explicit protocol versioning
- the operation registry is now authoritative and deterministic for persisted context operations
- application-service and provider-originated failures now collapse into a stable API taxonomy
- transaction handles are documented as opaque host-owned identifiers with explicit lifecycle and invalid-handle behavior

## Frozen Protocol Baseline

- protocol version: `1.0.0`
- contract status: frozen
- compatibility rule: additive changes only within the current major version
