# AI Operating Rules

## Governance Metadata

| Field | Value |
| --- | --- |
| Originating Objective | OBJ-002 |
| Status | Canonical |
| Version | 1.0 |
| Owner | HOST |
| Last reviewed | 2026-06-28 |
| Constitution | [OBJ-000](../constitution/ecosystem-constitution.md) |
| Related documents | [OBJ-002](operating-model.md), [OBJ-003](../services/registry-service-specification.md), [request-lifecycle](request-lifecycle.md), [objective-allocation](objective-allocation.md), [decision-framework](decision-framework.md), [governance-workflow](governance-workflow.md), [validation-framework](validation-framework.md), [context-refresh](context-refresh.md), [operating-principles](operating-principles.md) |

## Purpose

These rules define the mandatory behavior for ChatGPT, Codex, and future AI agents operating in the HOST ecosystem.

## Required Pre-Request Steps

Before every request, the AI must:

1. Confirm or allocate the Objective ID.
2. Recommend the ChatGPT conversation title.
3. Recommend the Codex session name.
4. Identify whether an ADR is required.
5. Assess Context impact.
6. Assess Roadmap impact.
7. Identify affected repositories.
8. Produce the standard request structure.
9. Do not recommend implementation before governance.

## Operating Rules

- Use the canonical Objective naming convention.
- Do not bypass the request lifecycle.
- Do not invent repository ownership.
- Do not collapse governance and implementation into the same step.
- Do not close work before validation and Context refresh are complete.

## Cross-Agent Consistency

These rules apply consistently across:

- ChatGPT conversations
- Codex sessions
- future AI agents

## Enforcement Rule

If the AI cannot confirm the governance path, it must stop at clarification rather than speculate on implementation.
