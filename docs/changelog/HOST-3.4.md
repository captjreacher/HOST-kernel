# HOST-3.4 - Transport Adapter Architecture Baseline

## Summary

HOST-3.4 defines the conceptual Transport Layer above the frozen `@host/api-host` protocol and below products or external callers.

## Recorded Changes

- the Transport Layer is now documented as the protocol-translation boundary for future external adapters
- the canonical adapter contract is now defined in architectural form as request translation into `ApiRequest` and response translation from `ApiResponse`
- the authentication boundary is now split as transport authenticates, API Host authorizes, application services execute, and execution packages stay identity-agnostic
- dependency rules now reserve the future direction `transport-adapter` -> `@host/api-host` and forbid reverse coupling into the transport boundary
- the initial transport catalogue is now documented without introducing any runtime implementation

## Baseline Status

- baseline type: architecture and governance only
- protocol status: `@host/api-host` remains frozen at `1.0.0`
- implementation status: no transport package or runtime created
