# Registry Service

Current release: Kernel 0.1 Registry Foundation.

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

- Register products
- Update product metadata
- Look up products by key
- List products
- Register repositories linked to products when applicable
- Register platform-owned repositories without an owning product reference
- Register capabilities linked to products when applicable
- Register platform-owned capabilities without an owning product reference
- Register event contracts
- Validate duplicate keys
- Validate dependency references for capabilities

## Non-responsibilities

- No UI
- No HTTP API
- No workflow orchestration
- No context, decision, or intelligence processing
- No identity or CRM services
- No product business logic
- No interface-specific behavior for HOST or Cockpit

## Data Model Summary

The registry supports four record types:

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

- `registerProduct`
- `updateProduct`
- `getProductByKey`
- `listProducts`
- `registerRepository`
- `registerCapability`
- `registerEventContract`
- `validateDuplicateKey`
- `validateDependencyReferences`

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

See [docs/changelog.md](changelog.md) for the Kernel 0.1 Registry Foundation baseline note.

See the canonical governance registry in [docs/taxonomy/taxonomy-registry.md](taxonomy/taxonomy-registry.md) for the ecosystem naming and ownership model that the service layer must respect.

## Extension Path

Future kernel services should follow the same pattern:

- keep contracts explicit
- keep validation deterministic
- keep persistence shape aligned with TypeScript types
- add only the minimum behavior needed for the next implementation epic
