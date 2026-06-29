# ADR-008 - Integration Layer Architecture Baseline

## Status

Accepted - 2026-06-29

## Context

ADR-006 established the Application Layer above the execution/provider stack.
ADR-007 established the Transport Layer above the frozen `@host/api-host` protocol.
HOST-3.7 and HOST-3E then implemented the first runtime host and canonical runtime bootstrap packages:

- `@host/rest-runtime-host`
- `@host/runtime-composition`

What remained undefined was the architectural home for reusable external integrations such as:

- external system adapters
- AI tool adapters
- MCP servers
- event consumers and publishers
- message brokers
- third-party APIs
- webhooks
- schedulers
- workflow triggers
- human-facing runtime surfaces

Without a dedicated boundary, those concerns could collapse into products, runtime hosts, transport packages, application services, or even execution packages.
That would weaken the HOST-3 layering rules and make reusable integrations difficult to govern.

## Decision

HOST adopts an Integration Layer above `@host/runtime-composition` and below products.

Its role is to own:

- reusable integration bindings
- external attachment points
- integration capability discovery
- integration lifecycle control
- product-facing composition of approved runtime bootstrap surfaces

It must not own:

- transport translation contracts
- application orchestration
- execution contracts
- provider lifecycle contracts
- kernel concepts

## Layered Stack

```text
Products

-> 

Integration Layer

-> 

Runtime Composition

-> 

Transport Layer

-> 

Application Layer

-> 

Execution Layer

-> 

Knowledge Plane
```

Providers remain beside the Execution Layer exactly as frozen previously.

## Integration Responsibilities

The Integration Layer is the architectural home for reusable categories such as:

- API integrations
- AI integrations
- messaging integrations
- automation integrations
- human interface integrations

These are catalogue categories only in HOST-4.0.
This ADR does not create packages or implementations for any category.

## Integration Contract Baseline

Future integration packages must expose a transport-neutral contract that supports:

- capability discovery
- lifecycle management
- initialization
- health reporting
- shutdown
- dependency injection
- configuration

The contract is intentionally architectural rather than implementation-specific.
HOST-4.0 does not freeze SDK signatures, listener models, or package names beyond the layer boundary.

## Dependency Rules

Allowed direction:

- products -> integration -> `@host/runtime-composition`

Forbidden:

- integration -> execution
- integration -> providers
- integration -> kernel
- execution -> integration
- application -> integration

Additional rule:

- integration packages must not bypass `@host/runtime-composition` to depend directly on `@host/rest-runtime-host`, transport packages, `@host/api-host`, application packages, execution packages, provider packages, or HOST-1 packages

## Relationship With Runtime Composition

`@host/runtime-composition` remains the canonical bootstrap boundary.

The Integration Layer composes it by:

- supplying integration configuration
- controlling integration lifecycle above runtime bootstrap
- exposing reusable integration entry points to products

The Integration Layer does not replace runtime composition and may not redefine its dependency rules.

## Relationship With Products

Products remain the consumer-facing layer above integrations.

They may eventually consume approved integration packages, but they must not become the shared architectural home for reusable integration logic that belongs in HOST-4.

## Consequences

Positive consequences:

- HOST gains a clear architectural home for external integrations before runtime work begins
- HOST-3 runtime, transport, application, and execution freezes remain intact
- future integration work can be catalogued and governed consistently
- products gain a reusable integration boundary instead of composing external systems ad hoc

Constraints introduced by this decision:

- HOST-4.0 remains architecture only
- no integration runtime implementation is approved
- future integration packages must enter through `@host/runtime-composition`
- future runtime work must preserve transport and application boundaries beneath integrations

## Out Of Scope

This ADR does not approve:

- integration packages
- MCP implementations
- REST, GraphQL, or gRPC client implementations
- queue or event-bus runtimes
- webhooks
- schedulers
- workflow engines
- AI provider implementations

## Baseline Declaration

The HOST-4.0 Integration Layer Architecture Baseline is approved.

Future integration work must implement this boundary rather than coupling external systems directly into products, transport packages, application services, or execution packages.
