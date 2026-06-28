# Validation Engine

## Purpose

The Validation Engine provides the deterministic runtime validation surface for HOST kernel objects.

It centralizes validation for identifiers, taxonomy compliance, lifecycle state, repository ownership metadata, document references, traceability links, and generic registry records.

## Design Goals

- Deterministic results
- Structured issue reporting
- No state mutation
- Registry-backed checks through abstractions only
- Taxonomy-backed validation where applicable
- No product-specific logic

## Core Types

The shared validation model lives in `kernel-types`:

- `ValidationSeverity`
- `ValidationIssue`
- `ValidationResult`
- `ValidationContext`
- `ValidationReference`
- `ValidationLookup`
- `ValidationIssueCode`

## Engine Surface

The runtime engine exposes these validation operations:

- `validateIdentifier()`
- `validateTaxonomy()`
- `validateLifecycleState()`
- `validateRepository()`
- `validateDocument()`
- `validateDocumentReference()`
- `validateTraceability()`
- `validateRegistryRecord()`

## Validation Boundaries

### Identifiers

Identifier validation is delegated to the canonical identifier service so formatting and uniqueness stay aligned with the identifier subsystem.

### Taxonomy

Taxonomy validation is delegated to the taxonomy resolver so the validation engine does not duplicate taxonomy seed data or classification rules.

### Lifecycle State

Lifecycle validation uses taxonomy-backed lifecycle values to keep runtime checks aligned with the governing lifecycle vocabulary.

### Repository Ownership

Repository validation checks ownership metadata and lifecycle status without reaching into external repository systems.

### Documents

Document validation checks required metadata and validates document ownership or reference metadata when present.

### Traceability

Traceability validation uses a lookup abstraction to confirm that linked records resolve without mutating the underlying registry.

## Lookup Abstraction

Runtime validation does not depend on a concrete registry implementation.

Instead, callers supply a `ValidationLookup` when they want integrity checks against live records.

This keeps the engine portable and avoids package cycles with registry implementations.

## Issue Strategy

Validation issues are deterministic and code-driven.

Blocking failures use `error` severity.
Warnings and informational findings stay distinct in the result model so callers can decide how strict to be.

## Notes

The engine intentionally validates only core kernel concerns.

Product-specific and context-plane semantics remain outside the validation boundary.
