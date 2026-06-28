# HOST-1.2 Identifier Service

## Objective

Implement the canonical Identifier Service for the HOST Core Kernel, conforming to OBJ-001 Taxonomy Registry, OBJ-003 Registry Service Specification, and HOST-0 Control Plane boundaries.

## Decision Record

None. OBJ-001 defines sufficient identifier semantics for the supported canonical object families.

## Scope

Included:

- Canonical identifier generation
- Parsing into structured metadata
- Validation with structured results
- Taxonomy-driven type resolution
- Registry-backed uniqueness support
- Package export tightening to package-name imports

Excluded:

- Product-specific identifiers
- Context-plane identifiers beyond OBJ-001
- Persistence-backed allocation
- GitHub, Supabase, or app-specific behavior

## Dependencies

- HOST-1.1 workspace foundation
- `kernel-types`
- `kernel-identifiers`
- `kernel-taxonomy`
- `kernel-validation`
- `kernel-registry` for uniqueness checks
- OBJ-001 Taxonomy Registry
- OBJ-003 Registry Service Specification

## Deliverables

- Identifier type definitions in `kernel-types`
- Identifier service implementation in `kernel-identifiers`
- Canonical format rules for supported identifier types
- Parse function returning structured identifier metadata
- Validate function returning structured validation results
- Generate function producing deterministic canonical identifiers
- Registry abstraction for uniqueness support
- Package exports tightened across kernel packages
- Unit tests for valid, invalid, malformed, duplicate, and unsupported cases
- Documentation updates

## Risks

- Hard-coding taxonomy outside the Taxonomy Resolver
- Circular dependencies across identifiers, validation, taxonomy, and registry
- Treating uniqueness as formatting instead of registry-backed allocation
- Introducing persistence earlier than the kernel requires

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- All supported canonical object types can generate identifiers.
- All supported identifier formats can be parsed and validated.
- Invalid identifiers fail with useful validation errors.
- Duplicate allocation is prevented or explicitly surfaced through the Registry Service abstraction.
- No product-specific logic exists.
- Package consumers import from package names, not direct source paths.
- HOST-1.2 documentation and changelog are complete.

## Context Updates

Record HOST-1.2 as the active implementation milestone and update the package dependency graph if new dependencies are introduced.

## Roadmap Updates

Mark HOST-1.1 complete and HOST-1.2 in progress.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
