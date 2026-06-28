# HOST-1.10 - Kernel API

This entry records the HOST-1.10 Kernel API implementation.

- Added the new `@host/kernel-api` package as the official runtime facade over the composed Kernel
- Bootstrapped exactly one shared runtime through `createKernel()` for all API handlers
- Exposed health, registry, taxonomy, documents, objectives, repositories, and validation endpoints
- Added deterministic JSON error handling for unknown routes, malformed requests, validation failures, and bootstrap failures
- Added route-level coverage for bootstrap, health, registry, taxonomy, objectives, documents, repositories, validation, malformed requests, and unknown endpoints
- Updated the dependency graph, architecture notes, README, and objective records to mark HOST-1 and the Control Plane Kernel MVP complete
