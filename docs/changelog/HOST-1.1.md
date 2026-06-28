# HOST-1.1 Kernel Foundation

## Summary

Establish the monorepo kernel foundation for HOST-1 with a package-oriented workspace, shared type package, registry package, build references, and dependency graph verification.

## Included

- Workspace package structure
- Shared kernel types
- Registry package extraction
- Root compatibility shims
- Build and test wiring
- Dependency graph verification
- Documentation scaffolding

## Not Included

- New runtime kernel services
- Persistence changes
- Product or workflow logic

## Validation

- `npm run build`
- `npm test`
- `npm run verify:graph`
