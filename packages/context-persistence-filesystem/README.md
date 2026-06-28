# @host/context-provider-filesystem

Concrete filesystem-backed persistence provider for the HOST execution layer.

This package implements `ContextPersistenceProvider` using deterministic local JSON storage.

It provides:

- safe directory initialization
- connect and disconnect lifecycle
- session and transaction lifecycle
- atomic file flush using temporary and recovery files
- corruption detection during load
- optimistic version handling through the existing store contract

Public API:

- `createFilesystemPersistenceProvider(options)`
- `createFilesystemPersistenceProviderFromPath(directory, options)`
- `filesystemPersistenceCapabilities()`

Storage format:

- one JSON file per provider directory
- canonical file name default: `context-store.json`
- deterministic top-level envelope with format marker, revision, and sorted records
- runtime values serialized through the frozen `@host/context-runtime` serializer

Dependency direction remains one-way:

`@host/context-provider-filesystem` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages

Out of scope:

- databases
- remote storage
- search
- indexing
- caching
- replication
- synchronization
- workflow logic
