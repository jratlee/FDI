---
name: presentArtifact artifactId
description: Correct artifactId value when calling presentArtifact for canvas mockups.
---

`presentArtifact({ artifactId, shapeIds, message })` requires `artifactId` to be the
full artifact identifier (the path), not the directory slug.

**Why:** Passing `"mockup-sandbox"` fails with "Artifact not found"; the registered id is
`artifacts/mockup-sandbox`. The error message lists available artifacts with their ids.

**How to apply:** Use `artifacts/<slug>` (e.g. `artifacts/mockup-sandbox`). If unsure, trigger
the error once and read the "Available artifacts" list it returns.
