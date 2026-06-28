# HOST-1.4 Validation Engine

## Objective

Implement the Core Kernel Validation Engine that centralizes runtime validation for identifiers, taxonomy compliance, repository ownership, document references, lifecycle state, and traceability integrity.

## Decision Record

No new ADR unless validation requirements in OBJ-000 through OBJ-006 conflict or are insufficient to implement deterministic runtime validation.

## Scope

Included:

- Identifier format validation
- Identifier uniqueness checks where registry-backed lookup is available
- Taxonomy compliance validation
- Lifecycle state validation
- Repository ownership metadata validation
- Document reference integrity validation
- Traceability validation across governed runtime and knowledge objects
- Structured validation results and issue codes

Excluded:

- Product-specific validation
- Context-plane validation
- Planning-plane roadmap validation
- Persistence implementation
- External repository or GitHub validation
- UI validation

## Dependencies

- HOST-1.1 workspace foundation
- HOST-1.2 Identifier Service
- HOST-1.3 Taxonomy Resolver
- `kernel-types`
- `kernel-identifiers`
- `kernel-taxonomy`
- `kernel-validation`
- kernel-registry contracts where lookup is required
- OBJ-000 through OBJ-006
- HOST-0

## Deliverables

- Expanded validation interfaces in `kernel-types`
- Validation Engine implementation in `kernel-validation`
- Structured `ValidationResult`, `ValidationIssue`, `ValidationSeverity`, and `ValidationContext` models
- Validation methods for identifiers, taxonomy, lifecycle state, repositories, documents, document references, traceability, and registry records
- Deterministic validation issue codes
- Unit tests for valid and invalid runtime validation scenarios
- Documentation updates

## Risks

- Introducing circular dependencies between validation, identifiers, taxonomy, and registry abstractions
- Mixing validation with mutation
- Silently expanding governance semantics
- Making validation product-aware
- Treating warnings and blocking errors the same

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- Validation Engine returns structured, deterministic results.
- Validation Engine does not mutate state.
- Validation rules are taxonomy-backed where applicable.
- Registry-backed checks use abstractions only.
- No product-specific logic exists.
- Documentation and changelog are complete.

## Context Updates

Record HOST-1.4 as the active implementation milestone.

## Roadmap Updates

Mark HOST-1.3 complete and HOST-1.4 in progress.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
