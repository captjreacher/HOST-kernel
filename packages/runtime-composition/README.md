# @host/runtime-composition

Canonical runtime bootstrap and composition package for HOST.

This package assembles the provider-to-runtime-host chain through dependency injection:

- persistence provider
- context service
- api host
- REST transport adapter
- REST runtime host

It does not introduce frameworks, global state, service locators, authentication implementations, or vendor observability integrations.
