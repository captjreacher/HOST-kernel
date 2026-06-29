# HOST-4.9 - Durable Execution Foundation

## Summary

HOST-4.9 adds `@host/integration-execution-persistence` as the canonical durable execution state package.

## Delivered

- provider-neutral repositories for workflow definitions, workflow instances, execution instances, dispatch records, and event history
- durable execution metadata persistence including correlation, causation, tenant, principal, retry, compensation, and workflow metadata
- deterministic recovery that restores state only and does not resume or replay automatically
- optimistic concurrency and immutable dispatch or event history protections
- restart validation through the existing SQLite provider plus provider-neutral contract validation through the in-memory provider

## Explicitly Not Included

- background workers
- queues
- schedulers
- timers
- distributed execution
- leader election
- Hermes
- automatic replay or automatic resume
