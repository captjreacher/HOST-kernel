# Identifier Service

## Purpose

The HOST Identifier Service provides canonical generation, parsing, validation, and resolution for the object families defined in OBJ-001.

The Taxonomy Resolver is the source of truth for supported object types, prefixes, lifecycle states, event types, and relationship types.

## Supported Canonical Types

| Type | Prefix | Canonical Format |
| --- | --- | --- |
| Objective | `OBJ` | `OBJ-001` |
| ADR | `ADR` | `ADR-001` |
| Capability | `CAP` | `CAP-001` |
| Entity | `ENT` | `ENT-001` |
| Workflow | `WF` | `WF-001` |
| Event | `EVT` | `EVT-001` |
| Artifact | `ART` | `ART-001` |
| Task | `TASK` | `TASK-001` |

## Rules

- Identifiers are prefix plus a zero-padded numeric sequence.
- Sequence width is fixed at three digits for the supported families.
- Prefixes come from the canonical taxonomy registry.
- Parsing returns structured metadata: type, prefix, sequence, and canonical value.
- Validation returns a structured result with issues when the identifier is malformed, unsupported, non-canonical, or duplicate.
- Generation is deterministic and begins at the lowest available sequence in the configured registry scope.
- Uniqueness is enforced through the shared registry abstraction when provided.

## Registry Interaction

The service can reserve identifiers in the registry abstraction before returning them.

This allows HOST-1.2 to prevent duplicate allocation without introducing persistence or a new ADR.

## Boundary Notes

- No product-specific identifier semantics are allowed.
- No context-plane extensions beyond OBJ-001 are allowed.
- No persistence layer is required for the kernel foundation.
