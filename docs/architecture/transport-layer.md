# Transport Layer Architecture

## Purpose

This document records the HOST-3.6 Transport Layer package baseline.

The Transport Layer sits above the frozen `@host/api-host` protocol and below products or external clients.
It exists to translate protocol-specific requests and responses without embedding business logic or execution concerns.

## Canonical Package

The Transport Layer now contains:

- `@host/transport-adapter`
- `@host/transport-rest`

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

## Request Flow

```text
Products / External Clients
  ->
future transport runtime
  ->
@host/transport-adapter (contracts)
  ->
@host/transport-rest (REST translation)
  ->
@host/api-host
  ->
@host/context-service
```

HOST-3.6 introduces a translation package only.
It does not approve or implement a server runtime.
