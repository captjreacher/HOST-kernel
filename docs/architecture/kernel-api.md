# Kernel API

## Purpose

The Kernel API is the official runtime facade over the composed HOST Core Kernel.

It exposes stable Control Plane service endpoints without introducing business logic, duplicate validation, or direct service construction outside `createKernel()`.

## Runtime Composition

- `packages/kernel-api` bootstraps exactly one runtime by calling `createKernel()`
- The runtime remains the single authority for identifiers, taxonomy, validation, registry access, objectives, documents, repositories, and health
- Route handlers delegate to runtime services and never compose replacement services inline

## Endpoint Surface

The Kernel API exposes:

- `GET /kernel/health`
- `GET /kernel/registry`
- `GET /kernel/registry/:id`
- `GET /kernel/taxonomy`
- `GET /kernel/taxonomy/object-types`
- `GET /kernel/taxonomy/lifecycle`
- `GET /kernel/taxonomy/events`
- `GET /kernel/taxonomy/relationships`
- `GET /kernel/documents`
- `GET /kernel/documents/:id`
- `GET /kernel/objectives`
- `GET /kernel/objectives/:id`
- `POST /kernel/objectives`
- `PATCH /kernel/objectives/:id`
- `GET /kernel/repositories`
- `GET /kernel/repositories/:id`
- `POST /kernel/validation`

## Design Constraints

- The API is Control Plane only.
- All requests flow through the composed runtime created by `createKernel()`.
- The API does not bypass the Kernel.
- The API does not duplicate validation logic.
- The API exposes document and repository metadata only.
- The API does not add persistence, authentication, product concerns, or execution-plane behavior.

## Error Handling

The API returns deterministic JSON errors.

- Unknown routes return stable `404` error codes.
- Malformed JSON returns stable `400` request errors.
- Validation-backed registry and objective failures return stable `400` validation errors with structured issues.
- Stack traces are never exposed.

## Health Semantics

`GET /kernel/health` reports:

- runtime health
- bootstrap readiness
- constitutional seed status
- dependency wiring status

This endpoint reflects runtime composition health, not deployment infrastructure health.

## Architectural Invariants

The Kernel API preserves these invariants:

- Runtime services are instantiated only by `createKernel()`
- Objective mutation flows through the shared registry-backed objective service
- Validation uses the shared Validation Engine
- Registry, taxonomy, document, and repository discovery remain governed Control Plane capabilities
- No product-specific code exists in the Kernel API surface
