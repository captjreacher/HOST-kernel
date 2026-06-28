# Registry Service

Current release: Kernel 1.5 Registry Service.

Canonical specification: [docs/services/registry-service-specification.md](services/registry-service-specification.md).

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-003 |
| Status | Overview |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy/taxonomy-registry.md), [OBJ-002](kernel/operating-model.md), [OBJ-003](services/registry-service-specification.md), [OBJ-004](context/context-domain-model.md), [OBJ-005](lifecycle/ecosystem-state-machine.md), [ADR-001](architecture/ADR-001-ecosystem-taxonomy-and-numbering.md), [ADR-002](architecture/ADR-002-host-kernel-operating-model.md) |

The service layer is downstream from the canonical ecosystem taxonomy in [docs/taxonomy/taxonomy-registry.md](taxonomy/taxonomy-registry.md).

Canonical governance references:

- [OBJ-000](constitution/ecosystem-constitution.md)
- [OBJ-001](taxonomy/taxonomy-registry.md)
- [OBJ-002](kernel/operating-model.md)
- [ADR-001](architecture/ADR-001-ecosystem-taxonomy-and-numbering.md)
- [ADR-002](architecture/ADR-002-host-kernel-operating-model.md)

## Purpose

This page is a compact overview of the service layer.

See the canonical specification for the full interface and behaviour contract.

## Responsibilities

- Register governed records
- Update governed records
- Look up records by id or family
- List and find records
- Reserve identifiers
- Look up reserved identifiers
- Validate duplicate keys and identifiers
- Validate lifecycle and status fields
- Validate traceability references where available

## Non-responsibilities

- No UI
- No HTTP API
- No workflow orchestration
- No context, decision, or intelligence processing
- No identity or CRM services
- No product business logic
- No interface-specific behavior for HOST or Cockpit

## Data Model Summary

The registry supports governed records and the legacy product-oriented fixtures that still ship with the workspace:

- Governed records
- Products
- Repositories
- Capabilities
- Event contracts

Each record includes the shared registry fields:

- id
- key
- display_name
- description
- status
- version
- owner
- created_at
- updated_at

Product records also include:

- lifecycle_state
- integration_status
- registered_capabilities

Repository records also include:

- git_url
- default_branch
- owning_product
- owning_objective when the canonical registry profile is used

Capability records also include:

- owning_product
- maturity
- dependencies

Event contract records also include:

- event_name
- producer
- consumers
- schema_version
- payload_schema

In this baseline, `owning_product` may be `null` for kernel-owned repositories and capabilities. That is the smallest compatibility adjustment used to support platform seed data without inventing a new ownership model.

## Service Contract Summary

The service layer is implemented as a deterministic in-memory boundary that can be backed by Postgres persistence later.

Available operations:

- `register`
- `update`
- `lookup`
- `exists`
- `find`
- `list`
- `reserveIdentifier`
- `lookupIdentifier`
- `listIdentifiers`
- Legacy compatibility helpers for products, repositories, capabilities, and event contracts

Derived capability state is intentional: when a capability is registered against a product-owned capability record, the service also appends that capability key to the owning product's `registered_capabilities` list. Duplicate capability registration is rejected before that list can change, so the product state stays deduplicated.

## Seed Fixture Purpose

The deterministic seed fixture under `tests/fixtures/registry-seed.ts` exists for development and test validation only.

It provides a small, repeatable set of platform records for:

- `findyourvertical`
- `funkmyfans`
- platform repositories
- registry capabilities
- event contracts

It is not production seed data and does not imply production readiness.

See [docs/changelog.md](changelog.md) for the HOST-1.5 Registry Service baseline note.

See the canonical governance registry in [docs/taxonomy/taxonomy-registry.md](taxonomy/taxonomy-registry.md) for the ecosystem naming and ownership model that the service layer must respect.

## Extension Path

Future kernel services should follow the same pattern:

- keep contracts explicit
- keep validation deterministic
- keep persistence shape aligned with TypeScript types
- add only the minimum behavior needed for the next implementation epic
