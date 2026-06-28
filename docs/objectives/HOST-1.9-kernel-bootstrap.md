# HOST-1.9 Kernel Bootstrap

## Objective

Implement the executable Kernel Bootstrap composition layer so HOST-1 services are instantiated, wired, health-checked, and exposed as a single Control Plane runtime.

## Decision Record

No new ADR is required unless the frozen HOST-0 architecture is insufficient to describe runtime composition boundaries.

## Scope

Included:

- Kernel runtime contracts
- `createKernel()` factory in `kernel-core`
- Runtime config support
- Health check support
- Startup validation
- Constitutional artefact seed loading through the Document Registry
- Accessors for identifiers, taxonomy, validation, registry, objectives, documents, and repositories
- Runtime composition tests and documentation updates

Excluded:

- Roadmap repository changes
- HTTP/API layer
- Persistence
- GitHub integration
- Filesystem scanning
- Product-specific consumers
- Context, Planning, or Execution Plane services

## Dependencies

- HOST-1.1 through HOST-1.7
- `kernel-types`
- `kernel-identifiers`
- `kernel-taxonomy`
- `kernel-validation`
- `kernel-registry`
- `kernel-objectives`
- `kernel-documents`
- `kernel-repositories`
- `kernel-core`
- OBJ-000
- OBJ-001
- OBJ-002
- OBJ-003
- OBJ-005
- OBJ-006
- HOST-0

## Deliverables

- Kernel runtime interfaces in `kernel-core`
- `createKernel()` runtime factory
- Configuration validation and dependency wiring
- Deterministic health check result reporting
- Constitutional artefact discovery at bootstrap
- Unit tests for bootstrap success, service availability, seed discovery, health success, invalid config, and product-surface exclusion
- Documentation and changelog updates

## Risks

- Letting kernel-core drift into product-specific runtime concerns
- Splitting the shared registry state across independently created services
- Treating health checks as a deployment probe instead of a composition check
- Forgetting to seed constitutional artefacts at bootstrap

## Acceptance Criteria

- `npm run build` passes.
- `npm test` passes.
- `npm run verify:graph` passes.
- `createKernel()` returns a composed Kernel runtime.
- All HOST-1 services are accessible from the runtime.
- Constitutional artefacts are discoverable after bootstrap.
- Health check reports deterministic Control Plane composition health.
- No `mgrnz-roadmap` files are changed.
- No product-specific logic exists.

## Context Updates

Record HOST-1.9 as the active implementation milestone.

## Roadmap Updates

Mark HOST-1.7 complete and HOST-1.9 in progress.

## Validation

- `git status`
- `npm run build`
- `npm test`
- `npm run verify:graph`
