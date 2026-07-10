---
name: Concurrent build workflow race
description: Multiple workflows all run the site build at startup; shared delete/recreate dirs must be race-tolerant.
---

Several workflows (main app, link checkers, gate checks) each run the full site build when they start, so two builds can run at the same moment and race on any shared directory that is deleted and recreated (e.g. export/zip staging dirs). `fs.rmSync` then dies with ENOTEMPTY because the other process re-creates files mid-delete, crashing the main workflow.

**Why:** the crash took down the Start application workflow even though nothing was actually wrong; the race is inherent to the multi-workflow startup pattern.

**How to apply:** any delete/recreate of a shared path in the build must retry and tolerate race-class errors only (ENOTEMPTY/EBUSY/EPERM), warning and continuing on final failure, while rethrowing all other error codes so genuine filesystem problems still fail the build.
