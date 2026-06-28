# HOST-kernel

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-006 |
| Status | Governance Baseline v1.0 |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](docs/constitution/ecosystem-constitution.md) |
| Related documents | [docs/index.md](docs/index.md), [docs/constitution/ecosystem-constitution.md](docs/constitution/ecosystem-constitution.md), [docs/taxonomy/taxonomy-registry.md](docs/taxonomy/taxonomy-registry.md), [docs/kernel/operating-model.md](docs/kernel/operating-model.md) |

HOST-kernel is the Platform Kernel runtime for the MGRNZ ecosystem platform.

Current release: Kernel 0.1 Registry Foundation.

The canonical governance entry point for the ecosystem is [docs/constitution/ecosystem-constitution.md](docs/constitution/ecosystem-constitution.md).

The canonical governance source for the ecosystem is [docs/taxonomy/taxonomy-registry.md](docs/taxonomy/taxonomy-registry.md), supported by [ADR-001](docs/architecture/ADR-001-ecosystem-taxonomy-and-numbering.md).

The canonical operating model for governance is [docs/kernel/operating-model.md](docs/kernel/operating-model.md), supported by [ADR-002](docs/architecture/ADR-002-host-kernel-operating-model.md).

It is not a product.

It is not HOST the public interface.

It is not Cockpit the operator interface.

Governance Baseline v1.0 is approved and ready for implementation.

Governance foundation documents now include:

- [docs/index.md](docs/index.md)
- [docs/constitution/ecosystem-constitution.md](docs/constitution/ecosystem-constitution.md)
- [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md)
- [docs/services/registry-service-specification.md](docs/services/registry-service-specification.md)
- [docs/context/context-domain-model.md](docs/context/context-domain-model.md)
- [docs/lifecycle/ecosystem-state-machine.md](docs/lifecycle/ecosystem-state-machine.md)

Release 0.1 implements the Registry Foundation only:

- Products
- Repositories
- Capabilities
- Event Contracts

Future kernel services will be added through implementation epics as the platform evolves.

Kernel governance documentation includes:

- [kernel-0.1](docs/kernel/kernel-0.1.md)
- [request lifecycle](docs/kernel/request-lifecycle.md)
- [objective allocation](docs/kernel/objective-allocation.md)
- [decision framework](docs/kernel/decision-framework.md)
- [governance workflow](docs/kernel/governance-workflow.md)
- [validation framework](docs/kernel/validation-framework.md)
- [context refresh](docs/kernel/context-refresh.md)
- [operating principles](docs/kernel/operating-principles.md)
- [AI operating rules](docs/kernel/ai-operating-rules.md)

Start with [docs/index.md](docs/index.md) when onboarding a new developer or AI agent.

The architectural bridge between governance and implementation is [docs/architecture/system-architecture.md](docs/architecture/system-architecture.md).

All future work must use the Objective ID, naming conventions, and traceability rules defined in the taxonomy registry before implementation begins.

## What this repository contains

- TypeScript contracts for the registry domain
- A deterministic registry service layer
- Supabase/Postgres migrations for registry persistence
- Tests for the registry foundation behavior
- Deterministic seed fixtures for development and validation

## What this repository does not contain

- UI
- HTTP APIs
- Context, workflow, decision, or intelligence engines
- Identity or CRM services
- Product-specific behavior
- HOST, Cockpit, or partner-product implementations
- Governance implementation code for the Kernel operating model

## Running Tests

```bash
npm test
npm run build
```

## Seed Fixture Purpose

The seed fixture under `tests/fixtures/registry-seed.ts` is for development and test validation only.

It exists to prove the registry baseline can accept a small, deterministic set of current platform entities without violating the Kernel 0.1 constraints.

See the baseline note in [docs/changelog.md](docs/changelog.md) and the canonical registry in [docs/taxonomy/taxonomy-registry.md](docs/taxonomy/taxonomy-registry.md).

## Known Assumptions

- `owning_product` may be `null` for kernel-owned repositories and capabilities in this baseline.
- Derived capability state on the owning product is intentional and deduplicated.
- Event producers remain product keys, so seed event contracts use registered products as producers.

## Quick start

```bash
npm install
npm test
npm run build
```
