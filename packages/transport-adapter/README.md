# @host/transport-adapter

Canonical Transport Layer contract package for HOST.

This package freezes the HOST-3.5 Transport Adapter Contract v`1.0.0`.
It defines the transport-neutral interfaces and metadata shapes that every future adapter must implement while depending only on `@host/api-host`.

## Responsibilities

- define the canonical `TransportAdapter` interface
- define transport request and response envelopes
- define authentication context contracts
- define correlation and tracing metadata contracts
- provide deterministic metadata default helpers
- freeze the Transport Layer contract version

## Non-Responsibilities

- no listener, protocol runtime, or adapter implementation
- no networking
- no authentication implementation
- no authorization policy
- no execution, provider, or kernel-internal dependencies

## Frozen Contract

- contract version: `1.0.0`
- target API Host protocol: `1.0.0`
- dependency direction: `@host/transport-adapter` -> `@host/api-host`

## Compatibility

- additive fields and additive helper exports are backward-compatible within the current major version
- field removal, semantic changes, or interface signature changes require a new major version
- future transport packages must implement this contract rather than redefining their own boundary
