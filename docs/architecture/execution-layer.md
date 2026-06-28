# Execution Layer Architecture

## Purpose

This document freezes the HOST-2 execution layer as the v1 architecture baseline.

It defines package responsibilities, dependency rules, extension points, and provider expectations for:

- `@host/context-runtime`
- `@host/context-store`
- `@host/context-persistence`

## Canonical Stack

```text
Knowledge Plane

kernel-types
kernel-core
kernel-taxonomy
kernel-validation
kernel-api

↓

Execution Plane

context-runtime
context-store
context-persistence

↓

Future Provider Layer

filesystem
sqlite
postgres
supabase
graph

↓

Application Layer

HOST products
```

## Package Responsibilities

### `@host/context-runtime`

Ownership: HOST execution architecture

Public API responsibility:

- construct immutable runtime values for context references, confidence, freshness, provenance, records, and snapshots
- validate runtime values against canonical kernel rules
- serialize, deserialize, clone, and compare runtime payloads deterministically

Permitted dependencies:

- `@host/kernel-core`
- `@host/kernel-types`

Prohibited dependencies:

- `@host/context-store`
- `@host/context-persistence`
- concrete persistence technologies
- application packages

Extension points:

- adapter factory options such as time and version injection
- deterministic runtime validation hooks exposed through the public adapter surface

Stability expectations:

- stable v1 execution baseline
- no new runtime kinds without governance approval
- no persistence or infrastructure concerns added here

### `@host/context-store`

Ownership: HOST execution architecture

Public API responsibility:

- define canonical storage contracts for Context Runtime values
- define versioned create, update, delete, retrieve, exists, query, snapshot, and transaction semantics
- provide a reference in-memory implementation for contract validation only

Permitted dependencies:

- `@host/context-runtime`
- `@host/kernel-core`
- `@host/kernel-types`

Prohibited dependencies:

- `@host/context-persistence`
- concrete persistence technologies
- application packages
- search, indexing, or workflow logic

Extension points:

- alternate store implementations
- query execution strategies
- transaction semantics behind the same contract

Stability expectations:

- stable v1 storage boundary
- additive evolution only unless a new Objective and ADR approve a break
- reference implementation is for validation, not production strategy

### `@host/context-persistence`

Ownership: HOST execution architecture

Public API responsibility:

- register providers
- coordinate connect and disconnect lifecycle
- expose session and transaction boundaries
- report capabilities and health
- hand back store surfaces through a provider contract

Permitted dependencies:

- `@host/context-store`
- `@host/context-runtime`
- `@host/kernel-core`
- `@host/kernel-types`

Prohibited dependencies:

- concrete production persistence engines in-core
- application packages
- product-specific behaviour

Extension points:

- provider factory implementations
- provider metadata and compatibility records
- capability negotiation and lifecycle adaptation

Stability expectations:

- stable v1 provider framework
- concrete adapter growth must happen in separate provider packages
- provider contracts must remain deterministic and technology-agnostic at the boundary

## Adapter Strategy

### Provider Registration

Every provider must expose a registration contract with:

- `provider_id`
- `provider_name`
- `provider_version`
- `provider_kind`

Registration metadata must be stable, machine-readable, and suitable for diagnostics.

### Adapter Naming

Provider packages use the canonical package form:

- `@host/context-provider-filesystem`
- `@host/context-provider-sqlite`
- `@host/context-provider-postgres`
- `@host/context-provider-supabase`
- `@host/context-provider-graph`

Technology-specific helpers may exist behind those packages, but the provider package is the governance boundary.

### Lifecycle Expectations

Providers must implement explicit lifecycle semantics for:

- connect
- disconnect
- begin session
- close session
- begin transaction
- commit
- rollback
- health

Lifecycle transitions must be deterministic and auditable.

### Capability Negotiation

Providers must advertise optional capabilities instead of assuming them.

Examples:

- transactions
- optimistic locking
- snapshots
- version history
- bulk operations
- streaming support

Unsupported capabilities must be reported clearly rather than simulated silently.

### Error Handling Expectations

Providers must:

- return deterministic boundary errors
- preserve provider, session, and transaction identity in failures where relevant
- avoid leaking raw driver or transport implementation details through public types

### Version Compatibility Expectations

Provider packages are compatible only when they implement the frozen execution-layer contracts.

If a provider requires a breaking change to those contracts, that is a governance event requiring a new Objective and ADR before implementation proceeds.

## Current Provider Implementations

HOST-2.5 and HOST-2.6 introduce concrete provider-layer packages:

- folder: `packages/context-persistence-filesystem`
- package: `@host/context-provider-filesystem`
- folder: `packages/context-persistence-sqlite`
- package: `@host/context-provider-sqlite`

They implement local persistence while keeping provider wiring behind the persistence abstraction:

`@host/context-provider-filesystem` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages

`@host/context-provider-sqlite` -> `@host/context-persistence` -> `@host/context-store` -> `@host/context-runtime` -> HOST-1 kernel packages

## Dependency Rules

- no circular dependencies
- no reverse dependencies from HOST-1 into execution packages
- no execution package bypasses around the canonical stack
- no provider package dependency on applications
- no application code inside execution packages

The verifier script is the executable enforcement point for the repository package graph.

## Baseline Declaration

The HOST execution layer is frozen as the v1 architecture baseline.

HOST-2.5 may add concrete adapters without changing the structure defined here.
