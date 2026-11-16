# Technical Debt — HOST Runtime Baseline Gaps

## Metadata

| Field | Value |
| --- | --- |
| Debt ID | `TD-2026-11-16-HOST-RUNTIME-BASELINE` |
| Status | Open |
| Owner | HOST |
| Priority | P2 — separate from shared infrastructure activation |
| Recorded | 2026-11-16 |
| Related activation | [ADR-010](../architecture/ADR-010-shared-infrastructure-ownership.md) |

## Observed baseline failures

The HOST repository baseline currently has independent runtime/package gaps:

- `verify:graph` expects 30 workspace packages but finds 25.
- `build` references the missing `packages/rest-runtime-host/tsconfig.json`.
- The test suite reports 182 passing and 5 failing tests because referenced
  `rest-runtime-host`, `integration-events` and `integration-contracts` runtime
  sources/packages are absent from the checkout.

These failures were observed against the pre-activation `HEAD` source state.
The shared infrastructure activation changes only governance documentation and
contracts; they do not modify packages, source, tests, scripts or runtime
configuration.

## Scope boundary

This debt item is deliberately separate from shared infrastructure activation.
It is not a release blocker for the governance artifacts and must not be
resolved by adding runtime packages, changing the frozen package graph, or
expanding the current activation scope.

## Required future work

Create a separate HOST Objective and implementation plan to reconcile the
frozen package catalogue, restore the missing runtime package boundaries, and
bring build and test expectations back into alignment. That work requires its
own architectural and delivery review.
