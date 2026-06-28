# Taxonomy Resolver

## Purpose

The HOST Taxonomy Resolver is the read-only runtime surface for canonical taxonomy lookup, validation, and discovery.

## Supported Lookup Surfaces

- Canonical object types
- Identifier prefixes
- Lifecycle states
- Relationship types
- Event types

## Behaviour

- Resolution is read-only.
- Validation is explicit and structured.
- Unknown values fail with machine-readable issues.
- Discovery returns the canonical in-code seed only.
- The resolver never mutates taxonomy state.

## Canonical Seed

The in-code taxonomy seed is derived from OBJ-001 and grouped by value kind:

- object types
- identifier prefixes
- lifecycle states
- relationship types
- event types

## Boundary Notes

- No persistence layer is involved.
- No product-specific taxonomy is included.
- No UI or external integration belongs in the resolver.
