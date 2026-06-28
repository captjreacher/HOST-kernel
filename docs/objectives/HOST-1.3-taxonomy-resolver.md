# HOST-1.3 Taxonomy Resolver

## Objective

Implement the runtime Taxonomy Resolver for the HOST Core Kernel, conforming to OBJ-001 Taxonomy Registry and HOST-0 Control Plane boundaries.

## Decision Record

None. OBJ-001 provides sufficient taxonomy structure for runtime resolution, validation, and discovery.

## Scope

Included:

- Canonical object type lookup
- Identifier prefix lookup
- Lifecycle state lookup
- Relationship type lookup where defined
- Event type lookup where defined
- Validation of supported taxonomy values
- Discovery and listing of taxonomy entries
- Structured errors for unknown or unsupported values

Excluded:

- Product-specific taxonomy
- Context, roadmap, or execution-plane semantics
- Persistence
- Runtime mutation of taxonomy
- UI
- External integrations

## Dependencies

- HOST-1.1 workspace foundation
- HOST-1.2 Identifier Service
- `kernel-types`
- `kernel-taxonomy`
- `kernel-validation` where appropriate
- OBJ-001 Taxonomy Registry
- OBJ-003 Registry Service Specification where lookup contracts are relevant

## Deliverables

- Expanded taxonomy interfaces in `kernel-types`
- Taxonomy resolver implementation in `kernel-taxonomy`
- Canonical in-code taxonomy seed derived from OBJ-001
- Resolver methods for object types, prefixes, lifecycle states, event types, and relationship types
- Structured taxonomy resolution and validation results
- Unit tests
- Documentation updates

## Risks

- Duplicating taxonomy rules across packages
- Treating taxonomy as mutable runtime configuration before governance allows it
- Introducing product-specific classifications
- Turning the resolver into a registry or persistence layer

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- Identifier Service uses the Taxonomy Resolver as the source of truth.
- Taxonomy Resolver can resolve and validate canonical values required by HOST-1.
- Unsupported taxonomy values fail with clear structured errors.
- No product-specific logic exists.
- Documentation and changelog are complete.

## Context Updates

Record HOST-1.3 as the active implementation milestone.

## Roadmap Updates

Mark HOST-1.2 complete and HOST-1.3 in progress.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
