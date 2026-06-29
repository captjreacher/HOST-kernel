# HOST-4.0 - Integration Layer Architecture Baseline

## Summary

HOST-4.0 defines the Integration Layer as the next architectural boundary above `@host/runtime-composition` and below products.

This sprint is architecture only.
No integration package or runtime implementation is introduced.

## Recorded Outcomes

- added the canonical Integration Layer boundary to the system, runtime, application, transport, and package graph architecture documents
- documented the first integration catalogue categories: API integrations, AI integrations, messaging, automation, and human interfaces
- documented a transport-neutral integration contract shape covering capability discovery, lifecycle, initialization, health, shutdown, dependency injection, and configuration
- recorded dependency rules that allow only `integration -> @host/runtime-composition`
- added ADR-008 to freeze the architectural baseline
- updated graph verification to reserve future `@host/integration-*` packages and prevent them from bypassing runtime composition

## Out Of Scope

- integration packages
- MCP implementations
- REST clients
- GraphQL clients
- queue adapters
- event buses
- webhooks
- schedulers
- AI providers
