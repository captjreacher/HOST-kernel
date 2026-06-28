# @host/transport-rest

Canonical REST-style transport adapter for HOST.

This package implements the HOST-3.6 REST translation baseline above `@host/transport-adapter` and `@host/api-host`.
It is a reusable translation layer, not a server.

## Responsibilities

- translate REST-style requests into canonical `ApiRequest` values
- translate canonical `ApiResponse` values into REST-style responses
- map stable API errors into deterministic HTTP status codes
- preserve correlation and tracing metadata
- remain stateless and framework-neutral

## Non-Responsibilities

- no listener or port binding
- no framework runtime
- no authentication implementation
- no authorization policy
- no provider access
- no business logic

## Dependency Direction

`@host/transport-rest` -> `@host/transport-adapter` -> `@host/api-host`

## Supported Baseline Routes

- `POST /context` -> `context.create`
- `GET /context/{key}` -> `context.retrieve`
- `PUT /context/{key}` -> `context.update`
- `PATCH /context/{key}` -> `context.update`
- `DELETE /context/{key}` -> `context.delete`
- `GET /context` -> `context.query`

## Error Mapping

- `api.invalid_request` -> `400`
- `api.validation_failed` -> `422`
- `api.not_found` -> `404`
- `api.conflict` -> `409`
- `api.transaction_closed` -> `409`
- `api.unavailable` -> `503`
- `api.internal` -> `500`
