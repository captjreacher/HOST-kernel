# @host/api-host

Canonical transport-neutral API hosting boundary for HOST application services.

This package exposes a stable request and response contract for:

- routing
- request dispatch
- deterministic API error translation
- service dependency injection
- transaction handle management across application requests

It does not implement HTTP listeners, REST frameworks, GraphQL servers, CLI adapters, MCP handlers, gRPC transports, or provider-specific behavior.

HOST-3.2 package responsibilities:

- ownership: HOST application architecture
- public API: `ApiHost.handle(request)` request/response boundary over application services
- permitted dependencies: `@host/context-service`
- prohibited dependencies: transport frameworks, provider adapters, HOST-1 internals, product logic
- extension points: future REST, GraphQL, CLI, MCP, and message-bus adapters
- stability: canonical composition point between transports and application services

Dependency direction remains one-way:

`@host/api-host` -> `@host/context-service` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages
