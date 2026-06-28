# HOST-1.7 Document Registry

## Summary

Implements the governed Document Registry for constitutional and architectural artefact metadata, discovery, versioning, ownership, lineage, and related-document traceability.

## Included

- Document domain contracts in the workspace type layer
- Document Registry implementation in `kernel-documents`
- Validation-backed registration and update through the shared Registry Service
- Registry-backed duplicate prevention
- Status, version, ownership, lineage, and related-document support
- Seed metadata for constitutional artefacts
- Runtime discovery of canonical governance documents
- Unit tests and documentation updates

## Not Included

- Content editing
- File parsing
- Markdown rendering
- Persistence
- Product-specific document models
- UI/API layers

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
