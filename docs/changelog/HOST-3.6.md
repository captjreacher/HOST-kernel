# HOST-3.6 - REST Transport Adapter Baseline

## Summary

HOST-3.6 implements `@host/transport-rest` as the first concrete transport translation package.

## Recorded Changes

- the Transport Layer now includes a reusable REST adapter package with no server runtime
- CRUD and query routes now translate into the frozen API Host protocol
- deterministic HTTP status mapping now translates the stable API Host error taxonomy into REST semantics
- request correlation and tracing metadata now propagate through the REST adapter
- dependency rules now enforce `@host/transport-rest` -> `@host/transport-adapter` and `@host/api-host`

## Baseline Status

- translation package version: `1.0.0`
- runtime type: stateless translation only
- listeners implemented: none
