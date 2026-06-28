# HOST-1.7 Document Registry

## Objective

Implement the Document Registry as the governed domain service for constitutional and architectural artefact discovery, versioning, ownership, status, lineage, and related-document traceability.

## Decision Record

No new ADR unless OBJ-000, OBJ-003, OBJ-006, or HOST-0 are insufficient to define document registry semantics.

## Scope

Included:

- Register document
- Retrieve document
- Update document metadata
- Document status management
- Version tracking
- Owner tracking
- Lineage links
- Related document links
- Registry-backed uniqueness validation
- Validation-backed mutation
- Discovery of constitutional artefacts at runtime

Excluded:

- Editing frozen constitutional documents
- File parsing
- Markdown rendering
- GitHub/filesystem integration
- Product-specific documents
- Context, Planning, or Execution Plane document models
- UI/API layer

## Dependencies

- HOST-1.1 through HOST-1.6
- `kernel-types`
- `kernel-registry`
- `kernel-validation`
- `kernel-documents`
- OBJ-000
- OBJ-003
- OBJ-006
- HOST-0

## Deliverables

- Document domain types and contracts
- Document Registry implementation in `kernel-documents`
- Document status rules aligned to the governance baseline
- Version, owner, lineage, and related-document support
- Registration and update through validation-backed Registry Service mutation
- Seed metadata for constitutional artefacts:
  - OBJ-000
  - OBJ-001
  - OBJ-002
  - OBJ-003
  - OBJ-004
  - OBJ-005
  - OBJ-006
  - HOST-0
- Unit tests covering register, duplicate rejection, retrieve, update, missing document, invalid status, missing version, valid lineage, broken lineage, valid related-document link, broken related-document link, and discovery
- Documentation and changelog updates

## Risks

- Accidentally allowing frozen constitutional artefacts to be mutated as content
- Turning document registry into a file indexer too early
- Duplicating Registry Service behavior inside Document Registry
- Treating document metadata status as lifecycle state without governance backing

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- Constitutional artefacts are discoverable at runtime.
- Document metadata can be registered, retrieved, updated, and related.
- Invalid status, missing version, duplicate document, and broken references are rejected.
- No document content mutation is introduced.
- No product-specific logic exists.
- Documentation and changelog are complete.

## Context Updates

Record HOST-1.7 as the active implementation milestone.

## Roadmap Updates

Mark HOST-1.6 complete and HOST-1.7 in progress.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
