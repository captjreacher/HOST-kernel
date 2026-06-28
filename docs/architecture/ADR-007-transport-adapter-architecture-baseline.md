# ADR-007 - Transport Adapter Architecture Baseline

## Status

Accepted - 2026-06-29

## Context

ADR-006 established the Application Layer above the execution/provider stack and below products.
HOST-3.2 then implemented `@host/api-host` as the canonical application-facing host boundary.
HOST-3.3 froze that API Host protocol as version `1.0.0`.

What remained undefined was the architectural boundary between:

- external protocols
- protocol-specific authentication entry points
- serialization and deserialization concerns
- protocol-specific status and error representations
- the frozen `@host/api-host` application protocol

If those concerns were allowed to mix directly with application services, future adapters would be free to duplicate translation logic, embed business rules, or couple external protocols directly to execution or provider packages.

HOST-3.4 establishes the Transport Layer so those concerns stay isolated.

## Decision

HOST adopts a conceptual Transport Layer above `@host/api-host` and below products or external callers.

Its role is to own:

- protocol translation into the frozen `@host/api-host` contract
- translation from `@host/api-host` responses into protocol-specific responses
- authentication hand-off
- serialization
- deserialization
- protocol-specific status codes or equivalent protocol outcome shapes
- request correlation
- tracing propagation

It must not own:

- orchestration
- persistence
- business rules
- provider access
- kernel concepts

## Layered Stack

```text
Products

↓

Transport Adapter
(REST | GraphQL | MCP | CLI | gRPC | Queue | WebSocket)

↓

API Host (Protocol v1.0.0)

↓

Application Services

↓

Execution Layer

↓

Providers
```

This ADR defines the Transport Layer boundary only.
It does not create packages or runtime implementations.

## Canonical Adapter Contract

Future transport packages must depend only on the frozen API Host protocol surface.

Canonical contract shape:

```ts
interface TransportAdapter<TExternalRequest, TExternalResponse> {
  translateRequest(request: TExternalRequest): ApiRequest;
  translateResponse(response: ApiResponse): TExternalResponse;
}
```

This contract is intentionally minimal.
It exists to define architectural responsibility, not runtime signatures for any specific protocol.

## Transport Catalogue

The first approved transport categories are:

- REST
- GraphQL
- MCP
- CLI
- gRPC
- Message Queue
- WebSocket

These are categories only.
No adapter implementation is created or approved by this ADR.

## Error Mapping Rule

Error translation is split into two layers:

1. `@host/api-host` translates service failures into the stable HOST-3.3 API taxonomy.
2. The Transport Layer maps those stable API errors into protocol-specific error representations.

Example direction:

```text
api.not_found
  ↓
HTTP 404
CLI exit code
MCP error
GraphQL error
```

The mapping rule is required.
The concrete mapping tables are deferred.

## Authentication Boundary

Authentication and authorization are intentionally split:

- transport authenticates
- API Host authorizes
- application services execute
- execution packages remain identity-agnostic

This keeps external identity mechanics out of the execution and provider layers while preserving application-level authorization policy above the frozen API Host protocol.

## Dependency Rules

Allowed direction:

- products -> transport adapter -> `@host/api-host`

Forbidden:

- transport adapter -> execution packages
- transport adapter -> provider packages
- transport adapter -> HOST-1 kernel internals
- application packages -> transport adapter packages
- execution packages -> transport adapter packages
- provider packages -> transport adapter packages

Consequently, the Transport Layer remains a pure translation boundary.

## Consequences

Positive consequences:

- the API Host protocol remains frozen and reusable across many protocols
- external protocol concerns stay isolated from application services
- application services remain free of serializer, status-code, and edge-protocol concerns
- execution and provider freezes remain intact
- products gain a consistent place to attach future protocol runtimes

Constraints introduced by this decision:

- transport packages must not introduce business logic
- transport packages must not bypass `@host/api-host`
- authorization policy must remain above execution packages
- no transport implementation is approved by HOST-3.4

## Out Of Scope

This ADR does not approve:

- transport packages
- listeners or servers
- queue consumers or publishers
- protocol SDK selection
- authentication implementation
- authorization rules
- API Host protocol changes

## Baseline Declaration

The HOST-3.4 Transport Adapter Architecture Baseline is approved.

Future transport work must implement this boundary rather than collapsing protocol translation into `@host/api-host`, application services, or execution packages.
