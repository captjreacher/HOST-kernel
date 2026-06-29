# Integration Layer Architecture

## Purpose

This document establishes HOST-4.0 as the architecture baseline for reusable integrations above runtime composition and below products.

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

These categories are architectural catalogue entries only.
HOST-4.0 does not create packages or runtime implementations for them.

## Transport-Neutral Integration Contract

Future integration packages must implement a transport-neutral contract shape above `@host/runtime-composition`.

Canonical contract:

```ts
interface IntegrationBinding<TCapability = unknown, TConfig = unknown> {
  readonly id: string;
  readonly category: string;
  readonly version: string;
  readonly config: TConfig;

  describeCapabilities(): Promise<readonly TCapability[]>;
  initialize(): Promise<void>;
  health(): Promise<{ status: 'healthy' | 'degraded' | 'unhealthy'; details?: Record<string, unknown> }>;
  shutdown(): Promise<void>;
}
```

Required contract concerns:

- capability discovery
- lifecycle
- initialization
- health
- shutdown
- dependency injection
- configuration

The contract is architectural only.
HOST-4.0 does not freeze runtime signatures, factories, SDK choices, or implementation packages.

## Composition Rule

The Integration Layer composes the runtime edge instead of replacing it.

Canonical direction:

```text
product surface
  ->
integration binding
  ->
@host/runtime-composition
  ->
@host/rest-runtime-host
  ->
@host/transport-rest
  ->
@host/api-host
```

Equivalent future transports may sit inside the runtime composition chain, but integration packages must still enter through the approved runtime edge rather than binding directly to transport, application, execution, provider, or kernel packages.

## Dependency Rules

Allowed:

```text
integration
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

HOST-4.0 is architecture only.

This baseline does not approve:

- integration packages
- MCP implementations
- REST or GraphQL clients
- queue or event bus runtimes
- webhook listeners
- schedulers
- workflow engines
- AI provider implementations
