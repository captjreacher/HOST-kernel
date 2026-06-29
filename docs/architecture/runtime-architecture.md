# Runtime Architecture

## Purpose

This document records the canonical HOST runtime stack after HOST-3E and the HOST-4.0 Integration Layer baseline.

It clarifies how runtime composition, transport translation, application orchestration, and future integrations relate without introducing any new runtime implementation.

## Canonical Runtime Stack

```text
Products

-> 

Future Integration Layer

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

The current implemented runtime boundary ends at `@host/runtime-composition`.
The Integration Layer is now the next architectural boundary above it.

## Runtime Responsibilities

The runtime stack currently owns:

- dependency-injected bootstrap through `@host/runtime-composition`
- reusable REST request handling through `@host/rest-runtime-host`
- protocol translation through `@host/transport-rest`
- transport-neutral application dispatch through `@host/api-host`
- persistence-backed context orchestration through `@host/context-service`

The future Integration Layer will own:

- reusable attachment of external systems and operator surfaces
- integration-specific lifecycle control
- integration capability discovery
- product-facing integration assemblies above the runtime edge

## Runtime Boundary Rules

The runtime edge remains frozen around these rules:

- `@host/runtime-composition` is the only approved bootstrap entry point for future integration packages
- transport packages remain below runtime composition
- application packages remain below transport packages
- execution and provider packages remain below application packages
- integration packages must not bypass runtime composition to reach transport, application, execution, providers, or kernel packages directly

## Request Direction

Future runtime direction:

```text
product
  ->
integration
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

This preserves the HOST-3 freezes while making reusable integrations the next architectural boundary for HOST-4.x work.
