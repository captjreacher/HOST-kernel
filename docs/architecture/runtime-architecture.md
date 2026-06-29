# Runtime Architecture

## Purpose

This document records the canonical HOST runtime stack after HOST-3E, the HOST-4E Integration Foundation, the HOST-4.6 event model foundation, the HOST-4.7 workflow runtime foundation, the HOST-4.8 execution runtime foundation, the HOST-4.9 durable execution state foundation, and the HOST-4.5 MCP Integration Runtime.

It clarifies how runtime composition, transport translation, application orchestration, and the implemented Integration Layer foundation relate without introducing any concrete third-party integration runtime.

## Canonical Runtime Stack

```text
Products

-> 

Integration Layer

-> 

@host/integration-mcp
@host/integration-execution-persistence
@host/integration-execution
@host/integration-workflow
@host/integration-events
@host/integration-contracts

-> 

@host/runtime-composition

-> 

@host/rest-runtime-host

-> 

@host/transport-rest

-> 

@host/transport-adapter

-> 

@host/api-host

-> 

@host/context-service

-> 

@host/context-persistence

-> 

provider packages

-> 

execution contracts
```

The current implemented runtime boundary now includes `@host/runtime-composition`, the Integration Layer foundation package `@host/integration-contracts`, the event foundation package `@host/integration-events`, the workflow runtime package `@host/integration-workflow`, the execution runtime package `@host/integration-execution`, the durable execution persistence package `@host/integration-execution-persistence`, and the first concrete integration runtime `@host/integration-mcp`.

## Runtime Responsibilities

The runtime stack currently owns:

- dependency-injected bootstrap through `@host/runtime-composition`
- reusable REST request handling through `@host/rest-runtime-host`
- protocol translation through `@host/transport-rest`
- transport-neutral application dispatch through `@host/api-host`
- persistence-backed context orchestration through `@host/context-service`

The Integration Layer foundation now owns:

- reusable integration lifecycle contracts
- integration capability discovery contracts
- integration configuration validation
- deterministic integration bootstrap
- reusable integration registration and health reporting

The event foundation now owns:

- immutable published event envelopes
- event registry contracts
- publication and subscription contracts
- workflow trigger primitives
- deterministic event metadata defaults

The workflow runtime now owns:

- immutable workflow definitions
- workflow registry contracts
- execution context and state contracts
- deterministic workflow lifecycle transitions
- retry, idempotency, and compensation metadata handling

The execution runtime now owns:

- immutable execution instances
- execution registry contracts
- execution coordinator and dispatch contracts
- context propagation and observability metadata
- deterministic execution lifecycle transitions
- cancellation and failure modeling

The durable execution persistence runtime now owns:

- provider-neutral repository contracts for workflow, execution, dispatch, and event history state
- deterministic workflow and execution recovery after provider reconnect or process restart
- optimistic concurrency across persisted execution state
- immutable dispatch and event history retention

The first concrete Integration Layer runtime now owns:

- MCP tool registration
- MCP resource exposure
- MCP request translation into the runtime composition path
- deterministic MCP error translation

## Runtime Boundary Rules

The runtime edge remains frozen around these rules:

- `@host/runtime-composition` is the only approved bootstrap entry point for integration packages
- `@host/integration-contracts` may depend only on `@host/runtime-composition`
- `@host/integration-events` may depend only on `@host/integration-contracts`
- `@host/integration-workflow` may depend only on `@host/integration-events`
- `@host/integration-execution` may depend only on `@host/integration-workflow`
- `@host/integration-execution-persistence` may depend only on `@host/integration-execution`, `@host/integration-workflow`, `@host/integration-events`, and `@host/context-persistence`
- `@host/integration-mcp` may depend only on `@host/integration-contracts`
- transport packages remain below runtime composition
- application packages remain below transport packages
- execution and provider packages remain below application packages
- integration packages must not bypass runtime composition to reach transport, application, execution, providers, or kernel packages directly

## Request Direction

Current integration-ready runtime direction:

```text
product
  ->
integration binding
  ->
integration registry / bootstrap
  ->
integration-mcp
  ->
integration execution runtime (when applicable)
  ->
integration durable execution state (when applicable)
  ->
integration workflow runtime (when applicable)
  ->
integration event model (when applicable)
  ->
runtime-composition
  ->
runtime host
  ->
transport translator
  ->
api host
  ->
application service
  ->
execution and providers
```

This preserves the HOST-3 freezes while proving the Integration Layer with a concrete MCP runtime and a reusable event foundation that still avoid any network listener or product-specific integration.
