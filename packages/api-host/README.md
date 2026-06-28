# @host/api-host

Canonical API contract host for HOST application services.

This package freezes the HOST-3.3 protocol boundary that sits above `@host/context-service` and below any future adapter implementation.

## Responsibilities

- expose the canonical versioned request envelope
- expose the canonical versioned response envelope
- own the authoritative operation registry
- translate application-service failures into stable API error categories
- manage transaction handles as opaque host-owned protocol values

## Non-Responsibilities

- no listener, framework, or adapter implementation
- no provider lifecycle or provider-specific types
- no product-specific operations
- no HOST-1 or HOST-2 contract changes

## Frozen Contract

Protocol version:

- `1.0.0`

Canonical request fields:

- `version`
- `operation`
- `resource`
- `payload`
- `query`
- `transaction`
- `metadata`
- `correlation_id`
- `request_id`
- `timestamp`

Canonical response fields:

- `success`
- `result`
- `error`
- `metadata`
- `diagnostics`
- `warnings`
- `version`

Stable error taxonomy:

- `api.invalid_request`
- `api.validation_failed`
- `api.not_found`
- `api.conflict`
- `api.transaction_closed`
- `api.unavailable`
- `api.internal`

Authoritative operation registry:

- `context.create`
- `context.retrieve`
- `context.update`
- `context.delete`
- `context.query`
- `context.transaction.begin`
- `context.transaction.create`
- `context.transaction.retrieve`
- `context.transaction.update`
- `context.transaction.delete`
- `context.transaction.query`
- `context.transaction.commit`
- `context.transaction.rollback`

## Transaction Semantics

- transaction identifiers are opaque non-empty strings issued by the underlying application service
- ownership is host-local: only the `@host/api-host` instance that issued a handle may resolve it later
- handles remain valid until commit, rollback, or host disposal
- successful commit and rollback finalize the handle and evict it from the host registry
- unknown or expired handles resolve to `api.not_found`
- closed transactional work from the application service resolves to `api.transaction_closed`

## Versioning Strategy

- the protocol version is explicit and returned on every response
- additive fields and additive operations are backward-compatible within the same major version
- field removal, field meaning changes, or operation renames require a new major version
- deprecated fields or operations must remain functional for at least one documented transition release before removal

## Dependency Direction

`@host/api-host` -> `@host/context-service` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages
