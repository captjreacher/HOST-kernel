# HOST Governance Index

This index is the onboarding map for the HOST governance framework.

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-006 |
| Status | Governance Baseline Approved |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-29 |
| Constitution | [OBJ-000](constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy/taxonomy-registry.md), [OBJ-002](kernel/operating-model.md), [HOST-0](architecture/system-architecture.md), [OBJ-003](services/registry-service-specification.md), [OBJ-004](context/context-domain-model.md), [OBJ-005](lifecycle/ecosystem-state-machine.md), [ADR-005](architecture/ADR-005-context-persistence-api-boundary.md), [ADR-006](architecture/ADR-006-application-layer-architecture-baseline.md), [ADR-007](architecture/ADR-007-transport-adapter-architecture-baseline.md) |

## Start Here

1. [OBJ-000 - Ecosystem Constitution](constitution/ecosystem-constitution.md)
2. [OBJ-001 - Ecosystem Taxonomy Registry](taxonomy/taxonomy-registry.md)
3. [OBJ-002 - HOST Kernel Operating Model](kernel/operating-model.md)
4. [HOST-0 - Ecosystem System Architecture](architecture/system-architecture.md)
5. [ADR-001](architecture/ADR-001-ecosystem-taxonomy-and-numbering.md)
6. [ADR-002](architecture/ADR-002-host-kernel-operating-model.md)

## Foundation Documents

| Document | Purpose |
| --- | --- |
| [OBJ-000](constitution/ecosystem-constitution.md) | Entry point for the ecosystem constitution |
| [OBJ-001](taxonomy/taxonomy-registry.md) | Canonical taxonomy, numbering, ownership, and traceability model |
| [OBJ-002](kernel/operating-model.md) | Canonical governance operating model |
| [HOST-0](architecture/system-architecture.md) | Canonical system architecture bridge between governance and implementation |
| [OBJ-003](services/registry-service-specification.md) | Registry service behaviour specification |
| [OBJ-004](context/context-domain-model.md) | Canonical CONTEXT conceptual model |
| [OBJ-005](lifecycle/ecosystem-state-machine.md) | Canonical lifecycle state machine |

## Supporting Canonical Documents

| Document | Purpose |
| --- | --- |
| [taxonomy hierarchy](taxonomy/taxonomy-hierarchy.md) | Full ecosystem hierarchy |
| [numbering standards](taxonomy/numbering-standards.md) | Identifier model |
| [object definitions](taxonomy/object-definitions.md) | Canonical object meanings |
| [repository ownership](taxonomy/repository-ownership.md) | Responsibility boundaries |
| [traceability model](taxonomy/traceability-model.md) | Lineage through the ecosystem |
| [naming conventions](taxonomy/naming-conventions.md) | Canonical naming rules |
| [kernel request lifecycle](kernel/request-lifecycle.md) | Request progression through governance |
| [kernel objective allocation](kernel/objective-allocation.md) | Objective assignment rules |
| [kernel decision framework](kernel/decision-framework.md) | Decision governance rules |
| [kernel governance workflow](kernel/governance-workflow.md) | Governance operating workflow |
| [kernel validation framework](kernel/validation-framework.md) | Validation rules and expectations |
| [kernel context refresh](kernel/context-refresh.md) | Context update rules |
| [kernel operating principles](kernel/operating-principles.md) | Constitutional operating principles |
| [kernel AI operating rules](kernel/ai-operating-rules.md) | Rules for human and AI sessions |
| [kernel API architecture](architecture/kernel-api.md) | Runtime facade and endpoint constraints |
| [application layer architecture](architecture/application-layer.md) | HOST-3 boundary for orchestration, persistence-backed APIs, the frozen API Host, and the transport adapter boundary |
| [ADR-005](architecture/ADR-005-context-persistence-api-boundary.md) | Boundary between HOST-1 runtime context APIs and future persistence-backed application APIs |
| [ADR-006](architecture/ADR-006-application-layer-architecture-baseline.md) | Application Layer baseline and dependency rules for HOST-3 |
| [ADR-007](architecture/ADR-007-transport-adapter-architecture-baseline.md) | Transport Adapter Layer baseline and dependency rules above the frozen API Host protocol |

## Recommended Reading Order

Read these in order for the least ambiguity:

1. OBJ-000
2. OBJ-001
3. OBJ-002
4. HOST-0
5. ADR-001
6. ADR-002
7. OBJ-003
8. OBJ-004
9. OBJ-005

## Repository Map

- `HOST` owns governance and constitutional documents.
- `CONTEXT` owns canonical knowledge representation.
- `Roadmap` owns planning and sequencing.
- Product repositories own implementation and delivery artefacts.

## Notes

If a new document conflicts with one of the canonical documents listed here, the canonical document wins.
