# HOST Governance & Architecture Baseline v1.0

This release establishes the constitutional foundation of the HOST ecosystem.

## Included

- OBJ-000 Ecosystem Constitution
- OBJ-001 Taxonomy Registry
- OBJ-002 Kernel Operating Model
- OBJ-003 Registry Service Specification
- OBJ-004 Context Domain Model
- OBJ-005 Ecosystem State Machine
- OBJ-006 Governance Consolidation
- HOST-0 System Architecture

## Status

- Governance Baseline v1.0 — Frozen
- Architecture Baseline v1.0 — Approved

## Next Phase

- HOST-1 — Core Kernel

## HOST-4 Release Baseline

The Integration Platform is now frozen as HOST-4 Baseline v1.0.

Completed HOST-4 milestones:

- HOST-4.0 Integration Layer Architecture Baseline
- HOST-4E Integration Foundation
- HOST-4.5 MCP Integration Runtime
- HOST-4.6 Integration Event Foundation
- HOST-4.7 Workflow Runtime
- HOST-4.8 Execution Runtime
- HOST-4.9 Durable Execution
- HOST-4.10 Integration Platform Release Baseline

Frozen package catalogue:

- `@host/integration-contracts`
- `@host/integration-events`
- `@host/integration-workflow`
- `@host/integration-execution`
- `@host/integration-execution-persistence`
- `@host/integration-mcp`

Validation summary:

- `npm run build` passes
- `npm test` passes
- `npm run verify:graph` passes
- workspace package count is 30
- package graph remains acyclic

Canonical architecture references:

- [Integration Platform](../architecture/integration-platform.md)
- [Integration Layer Architecture](../architecture/integration-layer.md)
- [Runtime Architecture](../architecture/runtime-architecture.md)
- [Package Dependency Graph](../architecture/package-dependency-graph.md)
- [ADR-009](../architecture/ADR-009-integration-platform-baseline.md)
