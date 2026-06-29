# MCP Integration Runtime

## Purpose

This document records `@host/integration-mcp` as the first concrete Integration Layer runtime for HOST.

It validates that a real integration can sit above `@host/integration-contracts`, compose through `@host/runtime-composition`, and reach the frozen API Host only through the approved runtime path.

## Canonical Dependency Path

```text
@host/integration-mcp
  ->
@host/integration-contracts
  ->
@host/runtime-composition
  ->
@host/rest-runtime-host
  ->
@host/transport-rest
  ->
@host/api-host
```

Forbidden dependencies remain unchanged:

- no direct dependency on `@host/context-service`
- no direct dependency on `@host/context-persistence`
- no provider package dependency
- no transport framework dependency

## Responsibilities

`@host/integration-mcp` now provides:

- integration registration through `@host/integration-contracts`
- deterministic lifecycle and health
- MCP capability discovery
- HOST context tools exposed through MCP
- read-only MCP resources for health, capabilities, operation catalogue, and protocol version
- deterministic error translation between API Host errors and MCP errors

It does not provide:

- a network listener
- provider SDKs
- agent orchestration
- prompt management
- conversation memory
- model providers
- product-specific tools

## Tool Catalogue

The reference MCP runtime currently exposes:

- `context.create`
- `context.retrieve`
- `context.update`
- `context.delete`
- `context.query`

These tools map onto the frozen HOST context API operations through the runtime composition path.

## Resource Catalogue

The reference MCP runtime currently exposes:

- `host://integration-mcp/health`
- `host://integration-mcp/capabilities`
- `host://integration-mcp/operation-catalogue`
- `host://integration-mcp/protocol-version`

All resources are read-only and product-neutral.

## Error Translation

`@host/integration-mcp` translates stable API Host errors into deterministic MCP errors without exposing provider or runtime implementation details.

Examples:

- `api.invalid_request` -> MCP invalid params error
- `api.validation_failed` -> MCP invalid params error
- `api.not_found` -> MCP not found error
- `api.conflict` -> MCP conflict-style runtime error
- `api.unavailable` -> MCP unavailable runtime error
- `api.internal` -> MCP internal error

## Reference Status

`@host/integration-mcp` is the reference implementation of the Integration Layer.

It proves the layer can host a real reusable integration while preserving the HOST-3 freezes and the HOST-4 dependency rules.
