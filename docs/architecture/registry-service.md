# Registry Service

## Purpose

The Registry Service is the canonical runtime authority for governed records in the HOST control plane.

It provides deterministic registration, lookup, update, discovery, identifier reservation, and reference validation without acting as persistence or a product-specific registry.

## Design Goals

- Deterministic record mutation
- Validation-backed registration and update
- Duplicate detection by record family and key
- Identifier reservation and lookup
- Read-only discovery through `find()` and `list()`
- ValidationLookup adapter behavior for live reference checks
- No mutation during lookup or validation

## Service Surface

The service exposes:

- `register()`
- `update()`
- `lookup()`
- `exists()`
- `find()`
- `list()`
- `reserveIdentifier()`
- `lookupIdentifier()`
- `listIdentifiers()`

Legacy compatibility helpers remain available for the existing registry seed data and workspace tests.

## Validation Flow

1. Normalize the record input into a registry entry.
2. Validate the base record through the shared Validation Engine.
3. Validate lifecycle state and family-specific canonical fields when present.
4. Validate traceability references against the live registry lookup adapter.
5. Reject duplicates deterministically before mutation.
6. Commit the mutation only after validation succeeds.

## Lookup Behavior

The service doubles as a `ValidationLookup` implementation.

That means validation can resolve live references through the same authority that stores the records, without reaching into persistence or external systems.

## Duplicate Strategy

Record IDs remain unique.

Record keys are unique within the same record family.

Identifier values remain unique within the identifier registry scope.

## Compatibility Notes

The current repository still contains legacy product-oriented registry fixtures.

Those paths remain supported, but the canonical registry authority is now the generic service surface described here.
