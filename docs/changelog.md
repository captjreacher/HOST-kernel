# Changelog

## Kernel 0.1 - Registry Foundation

This entry records the first runtime baseline for HOST-kernel.

- Registry Foundation implemented
- Supported registry domains: products, repositories, capabilities, and event contracts
- Platform-owned repositories and capabilities are represented by `owning_product: null`
- Product-owned capabilities update the product `registered_capabilities` derived state
- Seed fixtures are development and test only
- No HOST, Cockpit, Context, Workflow, Decision, Intelligence, or product runtime is implemented

This note documents the baseline only and does not change runtime behavior.
