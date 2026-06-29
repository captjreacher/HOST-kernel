# Transport Layer Architecture

## Purpose

This document records the HOST-3.7 Transport Layer and runtime-edge package baseline.

The Transport Layer sits above the frozen `@host/api-host` protocol and below products or external clients.
It exists to translate protocol-specific requests and responses without embedding business logic or execution concerns.

## Canonical Package

The Transport Layer now contains:

- `@host/transport-adapter`
- `@host/transport-rest`

The shared runtime contract foundation beneath transport and application composition now contains:

- `@host/runtime-contracts`

The runtime edge above the Transport Layer now contains:

- `@host/rest-runtime-host`
- `@host/runtime-composition`

`@host/transport-adapter` defines:

- `TransportAdapter`
- `TransportRequest`
- `TransportResponse`
- authentication context contracts
- transport metadata
- correlation and tracing metadata
- optional lifecycle hooks
- contract version constants

It depends only on:

- `@host/api-host`

It must not depend on:

- `@host/context-service`
- `@host/context-persistence`
- provider packages
- HOST-1 kernel internals
- transport frameworks

`@host/runtime-contracts` defines:

- principal, subject, tenant, roles, claims, and authentication metadata contracts
- request correlation and tracing contracts
- request context propagation contracts
- logger, metrics, and tracer interfaces

It depends on:

- no other workspace package

It must not depend on:

- authentication providers
- observability vendors
- transport frameworks
- HOST-1 kernel internals

`@host/transport-rest` implements the first concrete transport translator.

It defines:

- REST-style request and response contracts
- a static resource registry for CRUD and query routes
- deterministic API error to HTTP status mapping
- stateless request and response translation over the frozen API Host protocol

It depends only on:

- `@host/transport-adapter`
- `@host/api-host`

It must not depend on:

- `@host/context-service`
- `@host/context-persistence`
- provider packages
- HOST-1 kernel internals
- web frameworks
- listeners or socket runtimes

`@host/rest-runtime-host` implements the first runtime boundary above transport translation.

It defines:

- a runtime-neutral request and response contract
- an injected `ApiHost` composition boundary
- a `handleRestRequest(request)` style handler
- deterministic fallback error responses for unsupported routes and unexpected host failures

It depends only on:

- `@host/transport-rest`
- `@host/api-host`

It must not depend on:

- `@host/context-service`
- `@host/context-persistence`
- provider packages
- HOST-1 kernel internals
- web frameworks
- listeners or socket runtimes

`@host/runtime-composition` implements the canonical bootstrap boundary above the runtime host.

It defines:

- the recommended provider-to-runtime-host bootstrap sequence
- dependency-injected assembly of provider, context service, API host, transport translation, and runtime host handling
- runtime lifecycle helpers for connect and disconnect

It depends only on:

- `@host/context-persistence`
- `@host/context-service`
- `@host/api-host`
- `@host/transport-rest`
- `@host/rest-runtime-host`
- `@host/runtime-contracts`

It must not depend on:

- product packages
- framework listeners
- authentication vendors
- observability vendors

## Responsibilities

The Transport Layer owns:

- protocol translation
- authentication hand-off
- serialization
- deserialization
- protocol-specific status mapping
- request correlation
- tracing propagation
- reusable transport-specific protocol mapping

The runtime edge above the Transport Layer owns:

- composition of a concrete transport translator with an injected `ApiHost`
- reusable handler exposure for future HTTP-capable environments
- runtime-level fallback error shaping outside transport translation
- canonical runtime bootstrap assembly through dependency injection

It does not own:

- orchestration
- persistence
- business rules
- provider access
- kernel concepts

## Versioning

The Transport Adapter Contract is frozen at:

- `1.0.0`

Compatibility rule:

- additive fields and additive exports are backward-compatible within the current major version
- removals or semantic changes require a new major version

The REST translation baseline is frozen at:

- `1.0.0`

The runtime contracts and composition baselines are frozen at:

- `1.0.0`

## Request Flow

```text
Products / External Clients
  ->
@host/runtime-composition (bootstrap)
  ->
@host/rest-runtime-host (runtime host)
  ->
@host/transport-rest (REST translation)
  ->
@host/transport-adapter (contracts)
  ->
@host/runtime-contracts (auth, correlation, observability)
  ->
@host/api-host
  ->
@host/context-service
```

HOST-3.7 introduces a runtime handler only.
It does not approve or implement a server runtime.
HOST-3E adds the canonical bootstrap package and shared runtime contracts without introducing a framework, listener, or vendor integration.
