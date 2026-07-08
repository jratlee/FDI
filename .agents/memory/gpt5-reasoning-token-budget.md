---
name: gpt-5 reasoning tokens eat the completion budget
description: Why chat-completions calls to gpt-5 via the Replit AI gateway return empty content unless max_completion_tokens is generous
---

The rule: when calling gpt-5 (Replit AI integration, chat.completions with
`response_format: json_object`), set `max_completion_tokens` high (10k+ for a
report-sized JSON output). The model spends hidden reasoning tokens from the
same budget BEFORE emitting any content; a 4000-token cap on a big prompt came
back with empty `message.content` and the JSON parse failed, looking like a
model/output bug.

**Why:** finish_reason hits "length" during reasoning, so content is empty
rather than truncated, which is confusing to debug.

**How to apply:** any LLM feature in this repo using gpt-5 family models,
budget generously and check `finish_reason` + `usage.completion_tokens_details.
reasoning_tokens` when output is empty.
