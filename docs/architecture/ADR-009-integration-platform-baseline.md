# ADR-009 - Integration Platform Baseline

## Status

Accepted - 2026-06-29

## Context

HOST-4 has now implemented:

- HOST-4.0 Integration Layer Architecture Baseline
- HOST-4E Integration Foundation
- HOST-4.5 MCP Integration Runtime
- HOST-4.6 Integration Event Foundation
- HOST-4.7 Workflow Runtime
- HOST-4.8 Execution Runtime
- HOST-4.9 Durable Execution

At this point the repository contains a complete Integration Platform above `@host/runtime-composition` and below products.

What remained before HOST-5 was not additional runtime capability.
What remained was a release-quality architectural freeze so that future work could extend the platform without re-opening HOST-4 layering decisions.

## Decision

HOST freezes the HOST-4 Integration Platform as Baseline v1.0.

The following are declared stable:

- Integration Contracts
- Integration Registry
- MCP Runtime
- Event Model
- Workflow Runtime
- Execution Runtime
- Execution Persistence
- Recovery Model

This freeze is architectural and governance-oriented.
It does not add new runtime capability.

## Package Catalogue

The frozen HOST-4 package catalogue is:

- `@host/integration-contracts`
- `@host/integration-events`
- `@host/integration-workflow`
- `@host/integration-execution`
- `@host/integration-execution-persistence`
- `@host/integration-mcp`

## Layering Rules

Allowed dependency direction:

```text
products
  ->
integration implementations
  ->
integration-mcp or future approved integration runtimes
  ->
integration-contracts
  ->
runtime-composition
```

Execution-oriented integration direction:

```text
integration-execution-persistence
  ->
integration-execution
  ->
integration-workflow
  ->
integration-events
  ->
integration-contracts
  ->
runtime-composition
  ->
context-persistence
```

Forbidden:

- integration -> provider packages
- integration -> application packages
- integration -> transport packages
- integration -> HOST-1 kernel packages
- reverse dependencies from lower layers into integration packages
- product coupling inside shared integration packages

## Future Extension Model

Future HOST-5 work may extend the platform by:

- adding new integration implementations above `@host/integration-contracts`
- adding new event, workflow, or execution consumers above the frozen boundaries
- composing the existing durable execution and recovery model into higher-level orchestration

Future HOST-5 work must not:

- bypass `@host/runtime-composition`
- bypass `@host/context-persistence`
- weaken provider neutrality
- weaken transport neutrality
- weaken product neutrality
- modify frozen HOST-3 protocol contracts as part of HOST-4 follow-on work

## Compatibility Expectations

Compatibility expectations for HOST-4 Baseline v1.0 are:

- existing package responsibilities remain stable
- dependency direction remains stable
- deterministic event, workflow, execution, persistence, and recovery semantics remain stable
- recovery continues to restore state only and not automatically replay or resume

If future work requires contract breaks, that is a new governance event requiring a new Objective and ADR.

## Semantic Versioning Expectations

The HOST-4 Integration Platform now follows these expectations:

- patch-level changes may clarify documentation, fix internal defects, and improve validation without changing frozen architectural contracts
- minor changes may add strictly additive, backward-compatible integration capabilities within approved package boundaries
- major changes are required for contract breaks, dependency-direction changes, or boundary relaxations

Semantic versioning expectations apply to the package contracts as a governance promise, even while the repository continues using workspace-local package versions during implementation.

## Consequences

Positive consequences:

- HOST-5 can rely on a stable Integration Platform baseline
- graph verification has a clearer policy target
- future integrations have a canonical package catalogue and layering model
- Hermes readiness can be assessed against a stable platform surface instead of shifting milestones

Constraints introduced:

- HOST-4 is frozen and should not accumulate new runtime categories
- new orchestration capabilities such as queues, schedulers, timers, or automatic replay must be treated as new platform work, not as HOST-4 amendments
- release governance must preserve the existing neutrality guarantees

## Baseline Declaration

HOST-4 Baseline v1.0 is approved and frozen.

Future work must extend this Integration Platform without weakening its layering, neutrality, recovery semantics, or persistence boundaries.
