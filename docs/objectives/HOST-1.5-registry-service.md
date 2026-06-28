# HOST-1.5 Registry Service

## Objective

Implement the runtime Registry Service defined by OBJ-003 as the Core Kernel authority for registration, lookup, update, discovery, validation-backed mutation, and reference integrity.

## Decision Record

No new ADR unless OBJ-003 is insufficient to define the runtime registry contract or conflicts with HOST-0 Control Plane boundaries.

## Scope

Included:

- Central registry authority for governed records
- Register, update, lookup, exists, find, and list operations
- Identifier reservation and lookup helpers
- Validation-backed mutation
- Duplicate detection
- Lifecycle and status validation
- Traceability and reference validation when records are available
- ValidationLookup adapter behavior backed by live registry lookup methods

Excluded:

- Persistence-backed storage
- External GitHub, Supabase, or filesystem integration
- Product-specific registry records
- Context, roadmap, or execution-plane registries
- UI or API layers

## Dependencies

- HOST-1.1 workspace foundation
- HOST-1.2 Identifier Service
- HOST-1.3 Taxonomy Resolver
- HOST-1.4 Validation Engine
- `kernel-types`
- `kernel-identifiers`
- `kernel-taxonomy`
- `kernel-validation`
- `kernel-registry`
- OBJ-003 Registry Service Specification
- OBJ-001 Taxonomy Registry
- OBJ-000 Ecosystem Constitution
- HOST-0 System Architecture

## Deliverables

- Finalised Registry Service interfaces in `kernel-types` and/or `kernel-registry` contracts
- Registry Service implementation in `kernel-registry`
- ValidationLookup adapter behavior backed by Registry Service lookup methods
- Validation-backed register and update operations
- Deterministic duplicate handling for records and identifiers
- Lifecycle and status validation during mutation
- Traceability and reference validation during mutation where referenced records are available
- Registry query and discovery support through `find()` and `list()`
- Unit tests and documentation updates

## Risks

- Creating a circular dependency between registry and validation
- Allowing registry mutation without validation
- Treating registry as persistence before persistence is required
- Introducing product-specific record types
- Letting Registry Service absorb Objective, Document, or Repository logic that belongs in later packages

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- Registry Service can register, update, lookup, list, and find governed records.
- Invalid records are rejected through the Validation Engine.
- Duplicate records and duplicate identifiers are rejected deterministically.
- Registry Service can act as the lookup source for validation reference checks.
- No product-specific logic exists.
- Documentation and changelog are complete.

## Context Updates

Record HOST-1.5 as the active implementation milestone.

## Roadmap Updates

Mark HOST-1.4 complete and HOST-1.5 in progress.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
