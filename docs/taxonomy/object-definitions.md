# Object Definitions

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-001 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](taxonomy-registry.md), [OBJ-004](../context/context-domain-model.md), [OBJ-005](../lifecycle/ecosystem-state-machine.md), [ADR-001](../architecture/ADR-001-ecosystem-taxonomy-and-numbering.md) |

## Governance Objects

| Object | Definition | Owner |
| --- | --- | --- |
| Objective | The smallest governed unit of intended work. | HOST |
| Decision | A recorded choice made in response to an objective or design need. | HOST |
| ADR | A formal architecture decision record that documents one durable system choice. | HOST |
| Policy | A mandatory rule that constrains behaviour across the ecosystem. | HOST |
| Standard | A prescribed way of naming, structuring, or implementing an ecosystem object. | HOST |

## Planning Objects

| Object | Definition | Owner |
| --- | --- | --- |
| Roadmap | A time-ordered planning view that sequences outcomes. | Roadmap repository |
| Epic | A strategic work container that groups related implementation efforts. | Roadmap repository |
| Initiative | A coordinated body of work inside an epic. | Roadmap repository |
| Sprint | A timeboxed delivery interval. | Roadmap repository |
| Milestone | A checkpoint used to confirm progress or readiness. | Roadmap repository |
| Release | A declared delivery version or outcome package. | Roadmap repository |

## Knowledge Objects

| Object | Definition | Owner |
| --- | --- | --- |
| Entity | A named thing that exists in the ecosystem knowledge model. | CONTEXT |
| Relationship | A directed or undirected link between two knowledge objects. | CONTEXT |
| Capability | A stable ability that a product, platform, or team can provide. | CONTEXT |
| Workflow | An ordered set of steps that transforms state. | CONTEXT or product owner |
| Signal | A measurable indication that something changed or may change. | CONTEXT |
| Observation | A human or machine note about what was seen. | CONTEXT |
| Evidence | A verifiable record supporting a claim or observation. | CONTEXT |
| Event | A fact that something happened at a specific point in time. | Runtime or product owner |
| State | The current condition of an object at a moment in time. | CONTEXT |
| Artifact | A durable document or record produced by the ecosystem. | Owning repository |

## Delivery Objects

| Object | Definition | Owner |
| --- | --- | --- |
| Task | A discrete unit of delivery work. | Product or delivery owner |
| Issue | A tracked problem, request, or defect. | Product or delivery owner |
| Branch | A version-control line of development. | Repository owner |
| Commit | A version-control change set. | Repository owner |
| Pull Request | A reviewable change proposal. | Repository owner |
| Merge | The act of integrating a branch or pull request. | Repository owner |
| Deployment | The act of releasing a change into a target environment. | Product owner |

## Runtime Objects

| Object | Definition | Owner |
| --- | --- | --- |
| Session | A bounded runtime interaction period. | Runtime owner |
| Conversation | A bounded exchange between participants or agents. | Runtime owner |
| Agent | An autonomous or semi-autonomous actor. | Runtime owner |
| Job | A scheduled or ad hoc unit of execution. | Runtime owner |
| Queue | A holding structure for waiting work. | Runtime owner |
| Notification | A runtime message delivered to a person or system. | Runtime owner |
| Execution | A concrete run of a job, workflow, or task. | Runtime owner |

## Product Objects

| Object | Definition | Owner |
| --- | --- | --- |
| HOST | The governance and orchestration repository for the ecosystem kernel. | HOST |
| CONTEXT | The canonical knowledge repository for entities, relationships, evidence, and observations. | CONTEXT |
| Roadmap | The canonical planning repository for sequencing work and releases. | Roadmap |
| MGRNZ | The platform product repository that owns shared platform implementation and delivery records. | MGRNZ |
| FindYourVertical | A product domain repository. | FindYourVertical |
| FunkMyFans | A product domain repository. | FunkMyFans |
| Future Products | Reserved product-domain capacity for additional product repositories. | HOST governance |

## Object Boundary Rule

No object may be redefined in another repository.

Repositories may reference these definitions, but the canonical meaning stays in this registry.
