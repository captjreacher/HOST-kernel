# @host/context-persistence

Canonical persistence provider framework for HOST Context storage.

This package defines deterministic provider contracts for:

- connect
- disconnect
- session lifecycle
- transaction lifecycle
- health checks
- capability discovery

It includes a single in-memory reference provider that wraps the in-memory Context Store for contract validation only.

It does not implement production persistence, databases, filesystem storage, indexing, search, replication, synchronization, AI behaviour, or workflow execution.

Frozen package responsibilities:

- ownership: HOST execution architecture
- public API: provider registration, lifecycle, capability discovery, health reporting, session boundaries, and transaction handoff
- permitted dependencies: `@host/context-store`, `@host/context-runtime`, `@host/kernel-core`, `@host/kernel-types`
- prohibited dependencies: concrete production adapters in-core, applications
- extension points: provider factories and compatibility-aware capability negotiation
- stability: stable v1 provider framework

Dependency direction remains one-way:

`@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages
