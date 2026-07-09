---
name: Route guards must match decoded paths
description: Auth gates on specific routes are bypassable via percent-encoding if the static resolver decodes but the guard matches the raw path.
---

Rule: any route-level auth guard in a server whose static file resolver calls
`decodeURIComponent` must match against the DECODED path, not the raw URL.

**Why:** a gate that checks `rawPath === "/private-page"` is bypassed with
`/%70rivate-page` or `/private-page%2ehtml`, because the static resolver
decodes and happily serves the file. Found (by architect review) and fixed on
the FDI site's password-gated demo page.

**How to apply:** decode once at the top of the dispatcher (reject malformed
encodings with 400), route gated paths on the decoded value, and gate any
public asset directories belonging to the private page too (served with
`no-store, private` so shared caches never replay them to anon users). Also:
cookie parsing that decodes values must try/catch, or a malformed cookie
header becomes a crash vector on public routes; and a path-scoped auth cookie
won't be sent for assets outside that path (use Path=/ or co-locate assets).
