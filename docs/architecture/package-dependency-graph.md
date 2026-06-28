# Kernel Package Dependency Graph

```mermaid
graph TD
  KTypes["@host/kernel-types"]
  KEvents["@host/kernel-events"]
  KIdentifiers["@host/kernel-identifiers"]
  KTaxonomy["@host/kernel-taxonomy"]
  KValidation["@host/kernel-validation"]
  KObjectives["@host/kernel-objectives"]
  KDocuments["@host/kernel-documents"]
  KRepositories["@host/kernel-repositories"]
  KRegistry["@host/kernel-registry"]
  KTestUtils["@host/kernel-test-utils"]
  KCore["@host/kernel-core"]

  KEvents --> KTypes
  KIdentifiers --> KTypes
  KIdentifiers --> KTaxonomy
  KTaxonomy --> KTypes
  KValidation --> KTypes
  KValidation --> KIdentifiers
  KValidation --> KTaxonomy
  KObjectives --> KTypes
  KObjectives --> KIdentifiers
  KObjectives --> KRegistry
  KObjectives --> KValidation
  KDocuments --> KTypes
  KDocuments --> KRegistry
  KRepositories --> KTypes
  KRegistry --> KTypes
  KRegistry --> KValidation
  KTestUtils --> KTypes
  KTestUtils --> KRegistry
  KCore --> KTypes
  KCore --> KEvents
  KCore --> KIdentifiers
  KCore --> KTaxonomy
  KCore --> KValidation
  KCore --> KObjectives
  KCore --> KDocuments
  KCore --> KRepositories
  KCore --> KRegistry
  KCore --> KTestUtils
```

The graph is intentionally acyclic. Shared types sit at the bottom, and the core package composes upward without feeding back into lower layers.
