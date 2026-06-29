# @host/integration-execution-persistence

Durable execution state foundation for HOST integration orchestration.

This package:

- persists workflow definitions and workflow instances
- persists execution instances, execution metadata, dispatch records, and event history
- restores deterministic execution state after process restart
- composes only through the canonical `@host/context-persistence` provider framework

It does not implement background workers, timers, schedulers, queues, automatic replay, or product-specific orchestration.
