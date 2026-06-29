# @host/integration-mcp

Reference MCP integration runtime for HOST.

This package:

- registers through `@host/integration-contracts`
- composes only through `@host/runtime-composition`
- exposes canonical HOST context tools and read-only MCP resources
- translates MCP tool invocations into the frozen runtime path

It does not implement a network listener, provider SDK, model provider, prompt system, or product-specific capability.
