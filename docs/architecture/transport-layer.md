# Transport Layer Architecture

## Purpose

This document records the HOST-3.5 Transport Layer contract package baseline.

The Transport Layer sits above the frozen `@host/api-host` protocol and below products or external clients.
It exists to translate protocol-specific requests and responses without embedding business logic or execution concerns.

## Canonical Package

The sole canonical package for the Transport Layer is:

- `@host/transport-adapter`

This package defines:

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

## Responsibilities

The Transport Layer owns:

- protocol translation
- authentication hand-off
- serialization
- deserialization
- protocol-specific status mapping
- request correlation
- tracing propagation

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

## Request Flow

```text
Products / External Clients
  ->
future transport runtime
  ->
@host/transport-adapter (contracts)
  ->
@host/api-host
  ->
@host/context-service
```

HOST-3.5 introduces contracts only.
It does not approve or implement any transport runtime.
