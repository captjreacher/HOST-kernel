# Integration Layer Architecture

## Purpose

This document records the HOST-4.0 architecture baseline and the HOST-4E implementation foundation for reusable integrations above runtime composition and below products.

The Integration Layer exists to connect external systems, tools, protocols, services, and operator surfaces to the kernel without coupling those concerns into the Application Layer, Execution Layer, provider layer, or HOST-1 kernel packages.

It composes the runtime edge through `@host/runtime-composition`.
It never bypasses the runtime edge or the Transport Layer beneath it.

## Canonical Stack

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

Providers remain beside the Execution Layer as frozen by ADR-004.

## Responsibilities

The Integration Layer owns:

- external system adapters
- AI tool adapters
- MCP server composition
- event consumers
- event publishers
- message broker attachment
- third-party API attachment
- webhook entry points
- schedulers
- workflow triggers
- reusable product-facing integration assembly

It does not own:

- execution contracts
- provider lifecycle contracts
- transport translation contracts
- application orchestration
- kernel concepts
- product feature logic

## Canonical Integration Categories

### API Integrations

- REST clients
- GraphQL clients
- gRPC clients

### AI Integrations

- MCP
- tool adapters
- agent bridges
- model providers

### Messaging

- queue adapters
- event bus adapters
- pub/sub adapters

### Automation

- schedulers
- workflow triggers
- webhooks

### Human Interfaces

- CLI
- desktop
- browser
- mobile

These categories remain architectural catalogue entries only.
HOST-4.5 now validates the AI Integrations category with the first concrete runtime, `@host/integration-mcp`, without expanding into any product-specific integration.

## Canonical Foundation Package

HOST-4E implements the first Integration Layer package:

- `@host/integration-contracts`

It is the canonical base for future integrations and currently defines:

- lifecycle contracts
- initialization and shutdown contracts
- health contracts
- capability discovery contracts
- configuration contracts
- dependency injection contracts
- an integration registry
- deterministic integration bootstrap

It depends only on:

- `@host/runtime-composition`

HOST-4.5 now implements the first concrete integration package:

- `@host/integration-mcp`

It depends only on:

- `@host/integration-contracts`

## Transport-Neutral Integration Contract

The Integration Layer now freezes a reusable contract shape above `@host/runtime-composition`.

Canonical direction:

```text
product surface
  ->
integration binding
  ->
integration registry / bootstrap
  ->
@host/runtime-composition
  ->
@host/rest-runtime-host
  ->
@host/transport-rest
  ->
@host/api-host
```

Required contract concerns:

- capability discovery
- lifecycle
- initialization
- health
- shutdown
- dependency injection
- configuration

The contract is now implementation-ready through `@host/integration-contracts`.
HOST-4.5 proves the contract with `@host/integration-mcp` while still avoiding any third-party SDK or listener runtime.

## Integration Registry

HOST-4.2 now defines a reusable registry capable of:

- registering integrations
- discovering integrations
- querying capabilities
- validating duplicate registrations
- reporting health

The registry remains transport-neutral and runtime-neutral.

## Integration Bootstrap

HOST-4.3 now defines the canonical bootstrap process for integrations.

Its responsibilities are:

- runtime composition
- integration initialization
- deterministic startup ordering
- deterministic shutdown ordering
- lifecycle orchestration

It does not assume a framework, server, worker runtime, or scheduler implementation.

## Configuration Contracts

HOST-4.4 now defines reusable configuration contracts for integrations, including:

- configuration schema
- validation
- defaults
- secret references
- environment overlays

No configuration provider is implemented in HOST-4E.

## Reference Implementation

HOST-4.5 adds `@host/integration-mcp` as the reference implementation of the Integration Layer.

It demonstrates:

- concrete integration registration through the foundation package
- lifecycle and health composition above runtime composition
- tool and resource exposure without transport or provider bypass
- deterministic error translation over the frozen API Host path

## Dependency Rules

Allowed:

```text
integration
  ->
integration-contracts
  ->
runtime-composition
```

Forbidden:

- integration -> execution
- integration -> providers
- integration -> kernel
- execution -> integration
- application -> integration

Additional constraints:

- integration packages must not depend directly on `@host/api-host`
- integration packages must not depend directly on transport packages
- integration packages must not import provider SDKs through application or execution package contracts
- products should prefer reusable integration packages over binding directly to runtime composition once the integration catalogue begins

## Relationship To Runtime Composition

`@host/runtime-composition` remains the canonical bootstrap boundary.

The Integration Layer sits above it and may:

- request runtime bootstrap
- provide integration-specific configuration
- attach edge-specific lifecycle control
- expose reusable integration-facing entry points to products

The Integration Layer may not:

- redefine runtime bootstrap sequencing
- bypass `@host/rest-runtime-host`
- bypass transport translation
- inject provider concerns into product-facing integration contracts

## Relationship To Products

Products remain above the Integration Layer.

Products may eventually consume:

- reusable integration bindings
- product-specific integration assemblies
- product-specific configuration values for approved integration packages

Products must not become the shared architectural home for reusable integration logic that belongs in HOST-4.

## Implementation Status

HOST-4E makes the Integration Layer implementation-ready through the shared foundation package.
HOST-4.5 proves that implementation model with `@host/integration-mcp` as the first concrete reusable integration runtime.

This baseline still does not approve:

- REST or GraphQL clients
- queue or event bus runtimes
- webhook listeners
- schedulers
- workflow engines
- AI provider implementations
