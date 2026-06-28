# ADR-005 - Context Persistence API Boundary

## Status

Accepted - 2026-06-29

## Context

HOST-2.8 attempted to expose provider-backed Context Store composition through the existing `kernel-api` context endpoints.

The implementation audit stopped correctly.

The blocker is architectural:

- `KernelContextRuntimeAdapter` in HOST-1 is intentionally synchronous
- the HOST-1 `kernel-api` context endpoints are built on that synchronous runtime adapter contract
- the HOST-2 persistence stack is intentionally asynchronous because provider lifecycle, sessions, transactions, and store access are asynchronous by contract

Directly exposing persistence through the existing HOST-1 context adapter would require HOST-1 to absorb execution-layer concerns or to change its frozen runtime contract.

That would violate the HOST-1 freeze and weaken the separation established by ADR-004.

## Decision

HOST draws a hard boundary between runtime context operations and persisted context operations.

### Knowledge Plane / HOST-1

HOST-1 remains responsible for:

- immutable Context Runtime contracts
- deterministic runtime creation
- deterministic runtime validation
- synchronous runtime adapter composition inside `kernel-api`

`kernel-api` context endpoints are therefore runtime-only.

They may create and validate Context Runtime values, but they must not become persistence-backed endpoints through the existing HOST-1 adapter contract.

### Execution Layer / HOST-2

The execution layer remains responsible for:

- provider-backed Context Store composition
- persistence provider lifecycle
- sessions
- transactions
- store snapshots and optimistic versioning

This composition remains entirely below the HOST-1 boundary and continues to follow ADR-004.

### Application Layer

Persistence-backed APIs, long-running workflows, and external transports belong above the execution layer in an application boundary.

Future persistence-backed context endpoints must be introduced through that execution/application boundary rather than by extending `kernel-api`.

## Consequences

Positive consequences:

- HOST-1 remains frozen
- `kernel-api` remains provider-agnostic
- ADR-004 stays intact
- providers remain leaf implementations beneath the execution layer

Constraints introduced by this decision:

- persistence-backed context APIs are deferred
- no async persistence methods may be added to `KernelContextRuntimeAdapter`
- no provider awareness may be introduced into `kernel-api`
- future API work must define an execution/application transport boundary before implementation begins

## Deferred Capability

Persistence-backed context endpoints are explicitly deferred.

They are not part of HOST-1 and must not be introduced as an incremental extension to the existing runtime-only `kernel-api` context surface.

They require a future Objective and architecture record that defines:

- the owning application boundary
- the transport surface
- lifecycle and transaction semantics at the API boundary
- composition rules between the execution layer and external callers

## Relationship To ADR-004

ADR-004 remains the governing execution-layer baseline.

This ADR does not weaken ADR-004.
It clarifies where persistence-backed API capabilities may appear without reversing dependencies or mixing HOST-1 runtime concerns with HOST-2 persistence concerns.
