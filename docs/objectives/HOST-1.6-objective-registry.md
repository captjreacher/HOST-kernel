# HOST-1.6 Objective Registry

## Objective

Implement the Objective Registry as the governed domain service for Objective creation, retrieval, metadata update, lifecycle state management, uniqueness validation, and traceability.

## Decision Record

No new ADR unless OBJ-000, OBJ-002, or OBJ-003 are insufficient to define Objective lifecycle semantics.

## Scope

Included:

- Create objective
- Retrieve objective
- Update objective metadata
- Lifecycle state transition
- Objective identifier allocation through the Identifier Service
- Registry-backed uniqueness validation
- Validation-backed mutation
- Traceability links to documents, ADRs, repositories, capabilities, tasks, artifacts, workflows, and events where applicable

Excluded:

- Roadmap planning
- Product-specific objectives
- Execution-plane task orchestration
- Persistence
- UI/API layer
- GitHub issue creation

## Dependencies

- HOST-1.1 through HOST-1.5
- `kernel-types`
- `kernel-identifiers`
- `kernel-validation`
- `kernel-registry`
- `kernel-objectives`
- OBJ-000
- OBJ-001
- OBJ-002
- OBJ-003
- HOST-0

## Deliverables

- Objective domain types in `kernel-types` and `kernel-objectives`
- Objective Registry implementation in `kernel-objectives`
- Lifecycle transition rules aligned to the frozen governance baseline
- Objective creation with canonical identifier allocation
- Registry-backed duplicate prevention
- Validation-backed create, update, and transition operations
- Unit tests covering create, duplicate rejection, retrieve, update, missing update, valid transition, invalid transition, valid traceability links, and broken traceability links
- Documentation and changelog updates

## Risks

- Turning Objectives into roadmap planning too early
- Duplicating Registry Service behavior inside Objective Registry
- Hard-coding lifecycle rules outside governance
- Adding product-specific objective categories

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- Objectives can be created, retrieved, updated, and transitioned.
- Invalid lifecycle transitions are rejected deterministically.
- Objective identifiers are generated through the Identifier Service.
- Objective mutation is validation-backed through the Registry Service and Validation Engine.
- Traceability links are validated where records exist.
- No product-specific logic exists.
- Documentation and changelog are complete.

## Context Updates

Record HOST-1.6 as the active implementation milestone.

## Roadmap Updates

Mark HOST-1.5 complete and HOST-1.6 in progress.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
