# @host/context-store

Canonical storage boundary for HOST Context Runtime objects.

This package defines deterministic storage contracts for:

- create
- update
- delete
- retrieve
- exists
- query
- snapshot
- transactions

It includes a minimal in-memory reference implementation for tests and contract verification only.

It does not implement persistence technology, indexing, search, graph traversal, refresh logic, AI behaviour, or workflow execution.

Frozen package responsibilities:

- ownership: HOST execution architecture
- public API: canonical storage contracts, queries, snapshots, optimistic versioning, and transactions for Context Runtime values
- permitted dependencies: `@host/context-runtime`, `@host/kernel-core`, `@host/kernel-types`
- prohibited dependencies: `@host/context-persistence`, provider adapters, applications
- extension points: alternate store implementations behind the same contract
- stability: stable v1 storage boundary

Dependency direction remains one-way:

`@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages
