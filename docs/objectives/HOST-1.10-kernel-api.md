# HOST-1.10 Kernel API

## Objective

Implement the Kernel API as the official runtime facade over the HOST Core Kernel so the Control Plane is externally accessible through stable service endpoints.

## Decision Record

No new ADR is required unless HOST-0 is insufficient to define Control Plane service exposure boundaries.

## Scope

Included:

- Runtime API bootstrap in `packages/kernel-api`
- Exactly one composed Kernel runtime created via `createKernel()`
- Health, registry, taxonomy, document, objective, repository, and validation endpoints
- Read-only Control Plane discovery endpoints
- Objective create and patch delegation through `ObjectiveRegistryService`
- Deterministic API error handling with structured validation failures
- Bootstrap, routing, malformed request, and bootstrap failure tests
- Documentation, changelog, dependency graph, README, and roadmap updates

Excluded:

- Authentication
- Persistence
- Database integration
- GitHub integration
- Filesystem integration
- Context, Planning, or Execution Plane services
- OpenAPI generation
- GraphQL
- WebSockets
- Product-specific business logic

## Dependencies

- HOST-1.1 through HOST-1.9
- `kernel-core`
- `kernel-types`
- `kernel-api`
- OBJ-000
- OBJ-001
- OBJ-003
- HOST-0

## Deliverables

- New `packages/kernel-api` workspace package
- Lightweight HTTP adapter over the composed Kernel runtime
- Endpoints for:
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
- Tests covering bootstrap, health, registry lookup, taxonomy endpoints, objective CRUD, document lookup, repository lookup, validation, unknown routes, malformed requests, and bootstrap failure
- Documentation and changelog updates

## Risks

- Instantiating more than one Kernel runtime
- Recreating service composition outside `createKernel()`
- Duplicating validation or governance rules in the API layer
- Letting the API surface drift into product logic or persistence concerns

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- All requests flow through the composed runtime returned by `createKernel()`.
- The API exposes only Control Plane capabilities.
- The API contains no business logic.
- Objective mutation delegates to `ObjectiveRegistryService`.
- Validation uses the shared Validation Engine and returns deterministic results.
- Constitutional artefacts, registries, taxonomy, objectives, repositories, and document metadata are externally accessible.
- Documentation and changelog are complete.

## Context Updates

- HOST-1.10 complete.
- Kernel API operational.
- Control Plane externally accessible.

## Roadmap Updates

- HOST-1 complete.
- Control Plane complete.
- Kernel MVP complete.
- HOST-2 recommended to commence next.

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
