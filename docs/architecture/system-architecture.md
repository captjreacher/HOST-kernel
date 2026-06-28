# HOST-0 - Ecosystem System Architecture

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | HOST-0 |
| Status | Architecture Baseline Approved |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-001](../taxonomy/taxonomy-registry.md), [OBJ-002](../kernel/operating-model.md), [OBJ-003](../services/registry-service-specification.md), [OBJ-004](../context/context-domain-model.md), [OBJ-005](../lifecycle/ecosystem-state-machine.md), [docs/changelog.md](../changelog.md), [ADR-001](ADR-001-ecosystem-taxonomy-and-numbering.md), [ADR-002](ADR-002-host-kernel-operating-model.md) |

## Executive Overview

HOST is the constitutional control layer for the ecosystem.

It exists to ensure that governance, planning, knowledge, and execution all share the same canonical vocabulary, ownership boundaries, and traceability rules before implementation begins.

The system architecture does not introduce new governance rules. It explains how the approved governance baseline fits together as a complete ecosystem.

At a high level:

- HOST governs the ecosystem and defines the control layer.
- CONTEXT stores canonical knowledge, evidence, and relationships.
- Roadmap sequences approved work into planning objects.
- Product repositories implement approved changes.
- External services provide runtime and integration capabilities around the ecosystem.

## Ecosystem Architecture

```mermaid
flowchart TB
    HOST["HOST\nControl Plane"]
    CTX["CONTEXT\nKnowledge Plane"]
    RDM["Roadmap\nPlanning Plane"]
    OP["Operator\nUser Experience"]

    HOST --> CTX
    HOST --> RDM
    HOST --> OP

    CTX --> RDM
    RDM --> OP

    CTX --> PROD["Product Connectors"]
    RDM --> PROD

    PROD --> MGRNZ["MGRNZ"]
    PROD --> FYV["FindYourVertical"]
    PROD --> FMF["FunkMyFans"]
    PROD --> FUT["Future Products"]

    MGRNZ --> EXT["External Services"]
    FYV --> EXT
    FMF --> EXT
    FUT --> EXT

    EXT --> GH["GitHub"]
    EXT --> SF["Supabase"]
    EXT --> CF["Cloudflare"]
    EXT --> GM["Gmail"]
    EXT --> GCal["Google Calendar"]
    EXT --> LI["LinkedIn"]
    EXT --> BF["BetterFans"]
    EXT --> FI["Future Integrations"]
```

The diagram shows the ecosystem as a controlled architecture, not as a deployment diagram.

HOST is the control plane.
CONTEXT is the canonical knowledge plane.
Roadmap is the planning plane.
Product repositories are the execution plane.

## Architectural Planes

### Control Plane

Owned by HOST.

Responsibilities:

- governance
- orchestration
- lifecycle control
- workflow direction
- kernel rules

### Knowledge Plane

Owned by CONTEXT.

Responsibilities:

- entities
- capabilities
- signals
- evidence
- observations
- relationships
- knowledge graph

### Planning Plane

Owned by Roadmap.

Responsibilities:

- objectives
- epics
- initiatives
- sprint planning
- dependencies
- release planning

### Execution Plane

Owned by product repositories.

Responsibilities:

- implementation
- testing
- deployment
- releases

## Repository Interaction Model

```mermaid
flowchart TB
    HOST["HOST"]
    CTX["CONTEXT"]
    RDM["Roadmap"]
    PRD["Products"]
    EXT["External Systems"]

    HOST --> CTX
    CTX --> RDM
    RDM --> PRD
    PRD --> EXT

    EXT --> PRD
    PRD --> RDM
    RDM --> CTX
    CTX --> HOST
```

Information flows downward for execution and upward for validation, context refresh, and governance closure.

Ownership boundaries remain unchanged:

- HOST owns governance and orchestration.
- CONTEXT owns canonical meaning and evidence.
- Roadmap owns sequencing and commitments.
- Product repositories own implementation and delivery artifacts.

## Request Lifecycle

```mermaid
flowchart TB
    REQ["Request"]
    OBJ["Objective"]
    DEC["Decision"]
    ADR["ADR"]
    RDM2["Roadmap"]
    SPT["Sprint"]
    GH["GitHub"]
    IMPL["Implementation"]
    VAL["Validation"]
    CTX2["Context Refresh"]
    KG["Knowledge Graph"]

    REQ --> OBJ --> DEC --> ADR --> RDM2 --> SPT --> GH --> IMPL --> VAL --> CTX2 --> KG
```

| Stage | Owning Repository |
| --- | --- |
| Request | Request originator |
| Objective | HOST |
| Decision | HOST |
| ADR | HOST |
| Roadmap | Roadmap |
| Sprint | Roadmap |
| GitHub | Product repository or delivery repository |
| Implementation | Product repository |
| Validation | HOST with repository owners |
| Context Refresh | CONTEXT |
| Knowledge Graph | CONTEXT |

This lifecycle is governed by OBJ-002 and operationalized through OBJ-005.

## Knowledge Flow

```mermaid
flowchart TB
    EV["External Event"]
    SIG["Signal"]
    EVD["Evidence"]
    OBS["Observation"]
    CTX3["Context"]
    CAP["Capability"]
    DEC2["Decision"]
    RDM3["Roadmap"]
    IMPL2["Implementation"]
    FB["Feedback"]
    UCTX["Updated Context"]

    EV --> SIG --> EVD --> OBS --> CTX3 --> CAP --> DEC2 --> RDM3 --> IMPL2 --> FB --> UCTX
```

Knowledge enters the ecosystem as signals and evidence, is interpreted through CONTEXT, influences decision-making and planning, and returns as updated context after implementation and feedback.

## Runtime Architecture

```mermaid
flowchart TB
    OPERATOR["Operator"]
    AGENT["AI Agent"]
    KERNEL["Kernel"]
    REG["Registry"]
    CTX4["Context"]
    RDM4["Roadmap"]
    PRD2["Products"]
    INT["Integrations"]
    QUE["Queues"]
    EVT["Events"]
    NOT["Notifications"]

    OPERATOR --> KERNEL
    AGENT --> KERNEL
    KERNEL --> REG
    KERNEL --> CTX4
    KERNEL --> RDM4
    KERNEL --> PRD2
    PRD2 --> INT
    INT --> QUE
    QUE --> EVT
    EVT --> NOT
    NOT --> OPERATOR
    NOT --> AGENT
```

This is a conceptual runtime view only.

It shows how operator interactions, AI sessions, registry access, context updates, planning activity, product execution, and integrations relate to each other.

No implementation detail is implied by the diagram.

## Traceability Architecture

```mermaid
flowchart TB
    OBJ["Objective"]
    DEC["Decision"]
    ADR["ADR"]
    RDM["Roadmap"]
    SPT["Sprint"]
    ISS["Issue"]
    BR["Branch"]
    PR["PR"]
    MRG["Merge"]
    DPL["Deployment"]
    CTX["Context"]
    KG["Knowledge"]

    OBJ --> DEC --> ADR --> RDM --> SPT --> ISS --> BR --> PR --> MRG --> DPL --> CTX --> KG
```

Traceability is preserved by carrying the originating Objective ID through every downstream artefact.

OBJ-001 defines the canonical numbering model.
OBJ-002 defines the lifecycle path.
OBJ-004 defines the context objects.
OBJ-005 defines the state machine behavior.

## Implementation Roadmap

The system architecture establishes the sequence for implementation, but it does not define implementation internals.

Recommended sequence:

1. HOST-1 Registry Service
2. HOST-2 Objective Engine
3. HOST-3 Context Engine
4. HOST-4 Roadmap Engine
5. HOST-5 Orchestration Engine
6. HOST-6 Operator Console

Dependencies:

- HOST-1 depends on the canonical taxonomy, kernel operating model, and registry specification.
- HOST-2 depends on registry records and objective allocation rules.
- HOST-3 depends on the context domain model and state machine.
- HOST-4 depends on planning objects and governance input.
- HOST-5 depends on the control, knowledge, and planning planes being stable.
- HOST-6 depends on the previous services being available as a coherent operator surface.

These are architectural sequencing labels only. They do not define delivery scope.

## Reading Order

Read the ecosystem in this order:

1. [OBJ-000 - Ecosystem Constitution](../constitution/ecosystem-constitution.md)
2. [OBJ-001 - Ecosystem Taxonomy Registry](../taxonomy/taxonomy-registry.md)
3. [OBJ-002 - HOST Kernel Operating Model](../kernel/operating-model.md)
4. [HOST-0 - Ecosystem System Architecture](system-architecture.md)
5. [OBJ-003 - Registry Service Specification](../services/registry-service-specification.md)
6. [OBJ-004 - Context Domain Model Specification](../context/context-domain-model.md)
7. [OBJ-005 - Ecosystem State Machine](../lifecycle/ecosystem-state-machine.md)
8. Implementation artifacts

## Validation

This document introduces no new governance concept.

It aligns with Governance Baseline v1.0 because:

- terminology follows OBJ-001
- operating boundaries follow OBJ-002
- context concepts follow OBJ-004
- lifecycle sequencing follows OBJ-005
- repository ownership is unchanged
- traceability remains anchored to the originating Objective

## Baseline Declaration

Governance Baseline v1.0 - Frozen

Architecture Baseline v1.0 - Approved
