---
name: Citation link verification
description: How to verify outbound citation URLs actually back the claimed figure, not just return 200.
---

**Rule:** A `curl -L` 200 is not verification. Check (1) the final effective URL matches the requested page (silent redirects can land on wrong content, e.g. a publisher's other book page), and (2) the figure appears in fetched content — grepping both digits and spelled-out words ("70,000" vs "Seventy thousand"), and ignoring SVG/CSS numeric noise on JS-heavy pages.

**Why:** A homepage citation returned 200 but silently redirected to an entirely different book; another live hub page never stated the cited figure at all (the number only existed in a downstream primary source).

**How to apply:** When adding/auditing any outbound citation, use `curl -w '%{url_effective}'` plus a content grep; prefer the primary source that prints the figure on-page, and reword the claim to match exactly what that source says.
