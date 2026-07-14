# HOST Architecture

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-07-14 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002 Operating Model](../kernel/operating-model.md), [OBJ-001 Taxonomy Registry](../taxonomy/taxonomy-registry.md) |

## Purpose

This directory contains the architectural documentation for the HOST platform. It exists to answer three kinds of question:

1. **What has been decided?** — Architecture Decision Records (ADRs).
2. **What research supports those decisions?** — Supporting research documents.
3. **How do we decide?** — the OBJ-002 governance workflow.

The ADRs are the constitutional source of truth for architectural decisions. Research documents are supporting evidence. Implementation follows ADRs.

## Layout

```
docs/architecture/
├── README.md                                         (this file)
│
├── ADR-001-ecosystem-taxonomy-and-numbering.md       normative decision
├── ADR-002-host-kernel-operating-model.md            normative decision
├── ADR-003-context-runtime-governance-alignment.md   normative decision
├── ADR-004-execution-layer-architecture-baseline.md  normative decision
├── ADR-005-context-persistence-api-boundary.md       normative decision
├── ADR-006-application-layer-architecture-baseline.md normative decision
├── ADR-007-transport-adapter-architecture-baseline.md normative decision
├── ADR-008-integration-layer-architecture-baseline.md normative decision
├── ADR-009-integration-platform-baseline.md          normative decision
├── ADR-REA-01-registry-engine-adapter-pattern.md     normative decision (constitutional pattern)
├── ADR-BILLING-01-commercial-architecture-decomposition.md   normative decision
├── ADR-COMMREG-01-commercial-registry.md             normative decision
├── ADR-COMMRUN-01-commercial-engine.md               normative decision
│
├── application-layer.md                              baseline specification
├── context-runtime.md                                baseline specification
├── event-architecture.md                             baseline specification
├── execution-architecture.md                         baseline specification
├── execution-layer.md                                baseline specification
├── identifier-service.md                             baseline specification
├── integration-layer.md                              baseline specification
├── integration-platform.md                           baseline specification
├── kernel-api.md                                     baseline specification
├── mcp-integration.md                                baseline specification
├── package-dependency-graph.md                       baseline specification
├── registry-service.md                               baseline specification
├── runtime-architecture.md                           baseline specification
├── system-architecture.md                            baseline specification
├── taxonomy-resolver.md                              baseline specification
├── transport-layer.md                                baseline specification
├── validation-engine.md                              baseline specification
├── workflow-architecture.md                          baseline specification
├── document-registry.md                              baseline specification
├── objective-registry.md                             baseline specification
│
├── billing-kernel-adoption-review.md                 research (supports ADR-BILLING-01)
├── commercial-registry-design.md                     research (supports ADR-COMMREG-01)
├── commercial-runtime-design.md                      research (supports ADR-COMMRUN-01)
└── rea-pattern-constitutional.md                     research (supports ADR-REA-01)
```

## Normative vs Research

**Normative documents** are the source of truth. Implementation must conform to them.

- All `ADR-*.md` files in this directory.
- Constitutional documents in `../constitution/`.
- Operating model in `../kernel/`.
- Taxonomy registry in `../taxonomy/`.
- Baseline architecture specifications in this directory (`{topic}.md` files that document current frozen baselines).

**Research documents** are supporting evidence. Not normative on their own.

- Design analyses (`{topic}-design.md`).
- Adoption reviews (`{topic}-adoption-review.md`).
- Pattern analyses (`{topic}-pattern-*.md`).

Research informs ADRs. If a research document and an ADR appear to conflict, **the ADR governs**.

## Where things live

| What | Where |
| --- | --- |
| Constitutional principles | `../constitution/` |
| Operating model | `../kernel/` |
| Taxonomy registry | `../taxonomy/` |
| Objective definitions | `../objectives/` |
| Context domain model | `../context/` |
| Service specifications | `../services/` |
| Lifecycle definitions | `../lifecycle/` |
| ADRs | `./ADR-*.md` |
| Baseline architecture specifications | `./{topic}.md` |
| Research and design analysis | `./{topic}-{kind}.md` |
| Changelog | `../changelog/` |
| Document templates | `../templates/` |

## From Research to Implementation

The HOST governance workflow (OBJ-002) proceeds:

```text
Request
  -> Objective allocation (OBJ-nnn or capability-specific ID)
  -> Research (design docs, adoption reviews, pattern analyses)
  -> Decision (ADR)
  -> Roadmap sequencing
  -> Delivery Objective (HOST-x.x)
  -> Implementation
  -> Validation
  -> Context Refresh
  -> Completion
```

Concretely:

- **Research explores.** Design docs and reviews analyze options, propose decompositions, and identify anti-patterns.
- **ADRs decide.** ADRs record the outcome of research as constitutional decisions.
- **Implementation follows ADRs.** Code, tests, and package deliverables are authored against approved ADRs.

Once an ADR is Accepted, its decisions bind implementation. Research documents remain for context but do not override ADRs.

**No implementation begins before governance is complete** (OBJ-002 rule).

## Proposing Architectural Changes

1. Identify the Objective that governs the change (see [OBJ-001 Taxonomy Registry](../taxonomy/taxonomy-registry.md)). Allocate a new Objective ID if needed.
2. Author supporting research if the decision is substantial — design analysis, options review, pattern validation.
3. Draft an ADR summarising the proposed decision (see ADR Format below).
4. Route through the OBJ-002 governance workflow for approval. See [operating-model.md](../kernel/operating-model.md).
5. Once Accepted, sequence implementation in the roadmap.
6. On completion, refresh CONTEXT and update the changelog.

## ADR Format

Each ADR contains, at minimum:

- **Governance Metadata block** — Originating Objective, Status, Version, Owner, Last reviewed, Constitution reference, Related documents.
- **Status** — one of `Proposed`, `Accepted`, `Superseded`, or `Deprecated`, with a date.
- **Context** — the situation prompting the decision. Not the full research; the salient framing.
- **Decision** — the specific decision made. Load-bearing choices called out plainly.
- **Consequences** — positive effects, constraints introduced, and any migration implications.
- **References** — links to supporting research, related ADRs, and constitutional documents.

ADRs do not duplicate research; they cite it. Supporting research remains as an appendix in the same directory.

Longer sections (Package Catalogue, Layering Rules, Allowed Relationships, Blocking Prerequisites, Migration Guidance, etc.) may be added when the decision warrants. Keep them focused on decision outcomes, not on the analysis that produced them.

## ADR Naming Conventions

The current ADR corpus uses two conventions that coexist:

- **Sequential** — `ADR-{NNN}-{kebab-title}.md` (e.g. `ADR-001-ecosystem-taxonomy-and-numbering.md`). Three-digit sequential numbering. Used for platform-wide baselines: taxonomy, operating model, layer baselines, integration platform baseline.

- **Slug-based** — `ADR-{TOPIC}-{NN}-{kebab-title}.md` (e.g. `ADR-REA-01-registry-engine-adapter-pattern.md`). Two-digit numbering scoped to a topic slug. Used for capability-specific decision series where a topic may accumulate multiple related ADRs over time (REA, BILLING, COMMREG, COMMRUN).

Both conventions are in force. Sequential ADRs govern platform-wide baselines. Slug-based ADRs govern capability-specific decision series. Cross-references keep the graph legible regardless of naming.

If normalisation to a single convention becomes desirable, it should be proposed as a dedicated ADR that also plans the migration.

An alternate directory layout (`docs/adr/` separate from `docs/architecture/`) was considered during the Commercial architecture work and deferred. If adopted later, it should also be an ADR that plans the migration of existing files.

## The REA Constitutional Pattern

New execution-plane capabilities adopt the Registry–Engine–Adapter pattern by default. Registries publish canonical definitions; Engines execute state transitions; Adapters translate between the canonical model and external providers.

See [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md) for the rules, the allowed and forbidden relationships, and the exceptions process. See [rea-pattern-constitutional.md](./rea-pattern-constitutional.md) for the full analysis, anti-pattern catalogue, and capability mapping.

## Index of Governing Decisions

| ADR | Topic | Status |
| --- | --- | --- |
| [ADR-001](./ADR-001-ecosystem-taxonomy-and-numbering.md) | Ecosystem Taxonomy and Numbering | Accepted |
| [ADR-002](./ADR-002-host-kernel-operating-model.md) | HOST Kernel Operating Model | Accepted |
| [ADR-003](./ADR-003-context-runtime-governance-alignment.md) | Context Runtime Governance Alignment | Accepted |
| [ADR-004](./ADR-004-execution-layer-architecture-baseline.md) | Execution Layer Baseline | Accepted |
| [ADR-005](./ADR-005-context-persistence-api-boundary.md) | Context Persistence API Boundary | Accepted |
| [ADR-006](./ADR-006-application-layer-architecture-baseline.md) | Application Layer Baseline | Accepted |
| [ADR-007](./ADR-007-transport-adapter-architecture-baseline.md) | Transport Adapter Baseline | Accepted |
| [ADR-008](./ADR-008-integration-layer-architecture-baseline.md) | Integration Layer Baseline | Accepted |
| [ADR-009](./ADR-009-integration-platform-baseline.md) | Integration Platform Baseline v1.0 | Accepted |
| [ADR-REA-01](./ADR-REA-01-registry-engine-adapter-pattern.md) | Registry–Engine–Adapter Pattern | Proposed |
| [ADR-BILLING-01](./ADR-BILLING-01-commercial-architecture-decomposition.md) | Commercial Architecture Decomposition | Proposed |
| [ADR-COMMREG-01](./ADR-COMMREG-01-commercial-registry.md) | Commercial Registry | Proposed |
| [ADR-COMMRUN-01](./ADR-COMMRUN-01-commercial-engine.md) | Commercial Engine | Proposed |
