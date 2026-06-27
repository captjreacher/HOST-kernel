# HOST-kernel

HOST-kernel is the Platform Kernel runtime for the MGRNZ ecosystem platform.

Current release: Kernel 0.1 Registry Foundation.

It is not a product.

It is not HOST the public interface.

It is not Cockpit the operator interface.

Release 0.1 implements the Registry Foundation only:

- Products
- Repositories
- Capabilities
- Event Contracts

Future kernel services will be added through implementation epics as the platform evolves.

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

## Running Tests

```bash
npm test
npm run build
```

## Seed Fixture Purpose

The seed fixture under `tests/fixtures/registry-seed.ts` is for development and test validation only.

It exists to prove the registry baseline can accept a small, deterministic set of current platform entities without violating the Kernel 0.1 constraints.

See the baseline note in [docs/changelog.md](C:/DEV_LOCAL/HOST-kernel/docs/changelog.md) for the Kernel 0.1 Registry Foundation decision record.

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
