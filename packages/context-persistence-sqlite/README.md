# @host/context-provider-sqlite

Concrete SQLite-backed persistence provider for the HOST execution layer.

This package implements `ContextPersistenceProvider` using one deterministic local SQLite database file.

It provides:

- automatic schema initialization
- connect and disconnect lifecycle
- session and transaction lifecycle
- canonical CRUD, query, and snapshot behavior through the frozen store contract
- optimistic version handling
- schema version verification
- deterministic provider capabilities and health reporting
- deterministic SQLite error mapping

Public API:

- `createSQLitePersistenceProvider(options)`
- `createSQLitePersistenceProviderFromPath(filePath, options)`
- `sqlitePersistenceCapabilities()`

Storage schema:

- `context_records`
- `metadata`

Dependency direction remains one-way:

`@host/context-provider-sqlite` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages

Out of scope:

- remote databases
- ORMs
- SQL abstraction layers
- caching
- indexing
- replication
- synchronization
- workflow logic
