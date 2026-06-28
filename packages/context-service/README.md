# @host/context-service

Canonical application-layer boundary for persisted HOST Context operations.

This package composes the execution-layer persistence abstractions into a stable asynchronous service contract for:

- create
- retrieve
- update
- delete
- query
- transactions

It does not implement transports, provider-specific APIs, business logic, taxonomy, validation rules, or persistence technology.

HOST-3.1 package responsibilities:

- ownership: HOST application architecture
- public API: asynchronous persisted context service boundary and deterministic application-layer errors
- permitted dependencies: `@host/context-persistence`
- prohibited dependencies: provider adapters, HOST-1 internals, transports, product logic
- extension points: future application transports and orchestrators built on the same service contract
- stability: first implemented HOST-3 application boundary

Dependency direction remains one-way:

`@host/context-service` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages
