# Document Registry

## Purpose

The Document Registry is the canonical runtime authority for governed constitutional and architectural artefact metadata in the HOST control plane.

It provides deterministic registration, retrieval, metadata updates, version tracking, ownership tracking, lineage traceability, related-document traceability, and constitutional artefact discovery without mutating document content or turning into a file indexer.

## Design Goals

- Deterministic document metadata mutation
- Validation-backed registration and update
- Registry-backed uniqueness checks
- Lineage and related-document links validated against live registry lookups
- Runtime discovery of constitutional artefacts
- No content mutation or file parsing

## Service Surface

The Document Registry exposes:

- `registerDocument()`
- `retrieveDocument()`
- `updateDocument()`
- `discoverConstitutionalArtifacts()`
- `lookup()`
- `list()`

Compatibility aliases remain available for `register()`, `update()`, and `listDocuments()`.

## Validation Flow

1. Normalize the document metadata into registry form.
2. Convert lineage and related-document links into traceability references.
3. Validate the record through the shared Registry Service and Validation Engine.
4. Reject invalid status, missing version, duplicate records, and broken links deterministically.
5. Commit the mutation only after validation succeeds.

## Traceability Model

The registry treats lineage and related documents as metadata-only links:

- `lineage` captures document ancestry and constitutional provenance
- `relationships` captures related document references

Both link sets are validated through live registry lookup when the referenced records exist.

## Constitutional Discovery

The registry seeds canonical metadata for these artefacts at runtime:

- `OBJ-000`
- `OBJ-001`
- `OBJ-002`
- `OBJ-003`
- `OBJ-004`
- `OBJ-005`
- `OBJ-006`
- `HOST-0`

`discoverConstitutionalArtifacts()` returns the seeded artefacts so runtime consumers can locate the canonical governance set without parsing files.

## Implementation Notes

- The Document Registry is implemented as a domain wrapper over the shared Registry Service.
- Document metadata remains separate from document content.
- Seed documents are inserted as canonical metadata records and can be extended with additional document records at runtime.
- The service is intentionally narrow and does not model product documents, planning artefacts, or execution-plane content.
