# Integration Execution Architecture

## Purpose

This document records HOST-4.8 as the canonical execution runtime foundation for the Integration Layer and HOST-4.9 as the durable execution state foundation above it.

It defines the reusable execution model that coordinates workflow instances, event dispatch, execution state, and orchestration lifecycle without selecting workers, durability, schedulers, brokers, or product-specific execution logic.

## Canonical Package

HOST-4.8 introduces:

- `@host/integration-execution`

HOST-4.9 introduces:

- `@host/integration-execution-persistence`

They depend on:

- `@host/integration-workflow`
- `@host/integration-execution`
- `@host/context-persistence`

The canonical dependency direction is:

```text
integration implementations
  ->
@host/integration-execution
  ->
@host/integration-workflow
  ->
@host/integration-events
  ->
@host/integration-contracts
  ->
@host/runtime-composition
  ->
@host/context-persistence
```

`@host/integration-execution` establishes execution coordination primitives.

`@host/integration-execution-persistence` adds durable state storage and deterministic recovery only.

## Execution Model

Execution instances support immutable state transitions across these lifecycle states:

- `created`
- `ready`
- `running`
- `waiting`
- `completed`
- `cancelled`
- `failed`

Each transition produces a new immutable execution snapshot.

## Execution Context

Execution context currently carries:

- `workflow_instance_id`
- `workflow_definition_id`
- `workflow_version`
- `event`
- `principal`
- `tenant`
- `correlation_id`
- `causation_id`
- `execution`
- `observability`

This context is deterministic, product-neutral, and flows consistently through the runtime.

## Registry Responsibilities

The execution registry provides runtime-neutral support for:

- registering execution instances
- preventing duplicate execution registration
- updating execution snapshots
- discovering execution instances
- querying execution status

It does not introduce infrastructure storage or coordination infrastructure.

## Coordinator Responsibilities

The execution runtime currently models deterministic contracts for:

- `startExecution(...)`
- `continueExecution(...)`
- `dispatchEvent(...)`
- `cancelExecution(...)`
- `failExecution(...)`
- `completeExecution(...)`

These operations coordinate immutable execution state only.

They do not launch asynchronous jobs, worker threads, delayed tasks, or durable runtime behavior.

## Dispatch Model

The execution runtime now supports deterministic dispatch contracts for:

- `workflow-to-workflow`
- `event-to-workflow`
- `workflow-to-event`

Dispatch behavior is modeled as immutable dispatch records only.

No queue, topic, or broker implementation is present.

## Durable Execution Model

HOST-4.9 persists:

- workflow definitions
- workflow instances
- execution instances
- execution metadata and execution status
- dispatch history
- event history

Recovery restores:

- workflow instance state
- execution instance state
- execution context
- execution status
- dispatch and event history

Recovery does not:

- resume execution automatically
- replay events automatically
- schedule timers
- start workers
- select infrastructure-specific orchestration

## Boundary Rules

Allowed:

```text
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

- providers
- execution layer packages
- transport implementations
- application services
- product packages
- provider SDKs
- scheduler runtimes

## Current Status

HOST-4.8 and HOST-4.9 establish the canonical orchestration engine plus durable state foundation for future integrations.

It does not yet approve:

- background workers
- durable workflows
- queues
- schedulers
- Cron
- webhooks
- message brokers
- automatic replay
- Hermes orchestration
- product-specific execution logic
