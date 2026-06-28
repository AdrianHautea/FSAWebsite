---
name: read-first-report
description: Use before any code change in the UTD FSA project — diagnose and report findings first, do not implement until findings are reviewed and a fix is explicitly authorized.
---

# Read-first, report-then-act

Before making any code change:
1. Read all relevant files first. Do not write or edit anything yet.
2. Report findings: what you found, root cause, and proposed fix options.
3. Wait for explicit authorization before implementing — do not assume the
   most obvious fix is wanted.

## Project conventions
- Comment blocks use DATA/UI headers, lowercase text.
- Frontend copy is sentence-case.
- No orange. No purple glow/ring effects.
- CSV exports stay wired to status-filter arrays, never search-filtered arrays.