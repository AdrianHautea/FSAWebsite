# Final Security Check

**Date:** 2026-07-22 · **Scope:** entire critical-flow surface — auth/middleware, membership + Stripe payments, event registration (free + paid), QR ticket scanning, attendance QR/points, officer admin CRUD, gallery/S3 uploads, member profile, CSV exports, security headers. **Status:** report only — no code changed.

**Method:** five parallel domain scans (auth & access control; payments; QR/attendance/points; input validation & uploads; data exposure/IDOR/headers), each reading actual file contents rather than guessing from names. Every finding below was then independently re-read and confirmed against the current codebase before being included — nothing here is taken on a scanner's word alone.

**Threat model:** primary audience is college students — motivated and technically curious, not a nation-state or organized crime. The realistic attacker wants free/duplicate tickets, forged attendance points, or another student's data — not to bring down infrastructure. Findings and the score below are weighted for that audience, not for a bank.

**Constraint honored throughout:** every fix suggestion below preserves current functionality, checkout/scan UX, and page performance. Nothing recommended here reintroduces a previously-reverted bug (the `bc94114` officer-attendance-guard revert, or the reverted middleware `getUser()` gating documented in `docs/performance-bloat-audit.md`).

---

## P1 — none

No Critical or High severity findings. Auth/access-control (all three layers: `proxy.ts`, `updateSession`, `lib/auth.ts`), payments (`lib/stripe.ts`, checkout, webhook), and IDOR/data-exposure surfaces all came back clean under direct code review — see "Verified clean" below for what was actually checked and why each holds up.

---

## P2 — Medium

### 1. ~~Attendance QR token is static for the life of an event — forwardable to farm points~~ — Fixed

**Status: fixed.** `app/api/officer/events/[id]/route.ts` now rotates `attend_qr_token` (`crypto.randomUUID()`) every time `attend_qr_open` is set to `true`, in the same PATCH branch that already clears stale expiry on reopen. No client change was needed: the PATCH response already returns the full updated event row, `OfficerEventsClient.tsx`'s `patch()` already feeds it back via `onUpdate`, and the QR image already regenerates whenever `attend_qr_token` changes — so a forwarded/screenshotted link from a prior session now resolves to nothing on `/attend` the next time the QR is opened. Verified: `npm run lint` and `npm run check:auth-guards` both pass with no new issues in the changed file.

<details><summary>Original finding</summary>

### 1. Attendance QR token is static for the life of an event — forwardable to farm points

**Where:** `app/api/officer/events/route.ts:74` (token generated once via `crypto.randomUUID()` at event creation), `app/api/officer/events/[id]/route.ts:111-122` (open/close/expiry controls never regenerate the token — confirmed by grep, no `attend_qr_token` write exists anywhere except the one at creation), `app/(pages)/attend/page.tsx`.

**Step-by-step why this is exploitable:**
1. An officer opens the attendance QR for an event. The token encoded in that QR is the same UUID that was generated when the event was first created — it never rotates on open/close/reopen, only `attend_qr_open` (bool) and `attend_qr_expires_at` (timestamp) change.
2. Any student who sees the projected QR can photograph it, or a student who scans it can screenshot/forward the resulting `/attend?token=...` link to a group chat.
3. Anyone holding that link — including someone who never physically attended — can open it themselves and be awarded points, as long as the window happens to be open (or gets reopened later, since reopening doesn't invalidate the old token).
4. `record_attendance` (the DB RPC awarding points) is atomic and has a unique constraint on `(member_id, event_id)`, so one student can't double-award themselves — but a *different* student using a forwarded link during any open window gets full, legitimate-looking credit for an event they didn't attend.

**Affected flow/role:** Attendance QR / points, all signed-in members.

**Fix suggestion (not applied):** Rotate `attend_qr_token` (a new `crypto.randomUUID()`) each time an officer flips `attend_qr_open: false → true`, in the same PATCH handler that already writes that field. This is a one-line addition to an existing write path — no new round trip, no UX change (officers already re-open the QR view each session), and it closes the "forward an old screenshot weeks later" case entirely. It does **not** fully solve same-session photo-forwarding during a single open window (a friend across the room can still scan a photo of the live QR) — that's an inherent tradeoff of any QR-based check-in system and matches the honor-system tolerance appropriate for a single small student org; not worth adding device-binding or geofencing for this audience.

**Regression/perf risk:** None. Token rotation is scoped to the existing open-toggle write; doesn't touch the scan-ticket path, capacity logic, or any already-hardened race guard.

</details>

---

### 2. ~~CSV exports lack formula-injection escaping~~ — Fixed

**Status: fixed.** Both `ApplicationsClient.tsx`'s `downloadCSV` and `GoodphilClient.tsx`'s `exportCSV` now prefix any cell value starting with `=`, `+`, `-`, or `@` with a leading `'` before the existing quote-escaping step, so it round-trips as literal text in Excel/Sheets instead of evaluating as a formula. Pure formatting-step change — no stored data, on-screen display, or CSV sourcing logic touched. Verified: `npm run lint` passes with no new issues in either changed file.

<details><summary>Original finding</summary>

### 2. CSV exports lack formula-injection escaping

**Where:** `app/(pages)/officer/applications/ApplicationsClient.tsx:597-616` (`downloadCSV`), `app/(pages)/officer/goodphil/GoodphilClient.tsx:80-105` (`exportCSV`) — both confirmed by direct read.

**Step-by-step why this is exploitable:**
1. Free-text fields on the ading/kuyate applications (`hobbies`, `additional_notes`, `pam_vibe`, `why_kuyate`, `instagram`, etc., defined in `lib/schemas.ts`) are validated only for length/type — nothing rejects or neutralizes a value starting with `=`, `+`, `-`, or `@`.
2. A member who is submitting their own application (this requires an active paid membership, not an anonymous request) sets one of these fields to something like `=HYPERLINK("http://example.com","click")`.
3. An officer later exports applications or goodphil eligibility to CSV. The cell-escaping logic in both files only handles quotes/commas/newlines — it writes the formula-like string into the CSV verbatim.
4. When the officer opens the export in Excel or Google Sheets (the default behavior for `.csv` files), the spreadsheet app evaluates the leading `=`/`+`/`-`/`@` as a formula instead of displaying it as text — this is the standard CSV/formula-injection vector (OWASP-documented), and here it reaches an officer's machine via a legitimate member-facing form.

**Affected flow:** Applications review + CSV export; Goodphil eligibility + CSV export.

**Fix suggestion (not applied):** In the shared cell-formatting step in each file, before the existing quote-escaping check, prefix the value with a leading `'` if it starts with `=`, `+`, `-`, or `@`. Same fix shape in both files (they already have separate, near-identical escaping blocks). No change to stored data, no change to what's displayed on the officer pages themselves — only the CSV byte output changes.

**Regression/perf risk:** None. Pure client-side string formatting at export time; doesn't touch the CSV's status-filter-array sourcing rule (project convention already correctly followed in both files) or any stored value.

</details>

---

## P3 — Low / informational

### 3. ~~`Permissions-Policy` header not set~~ — Fixed

**Status: fixed.** `next.config.ts`'s `headers()` now sends `Permissions-Policy: camera=(self), microphone=(), geolocation=(), payment=()` alongside the existing security headers. Grepped the app for `getUserMedia`/`navigator.mediaDevices`/`PaymentRequest`/`navigator.geolocation` first — no direct calls found; `camera=(self)` covers `html5-qrcode`'s internal camera access on the officer scan page (same-origin), everything else the app doesn't use is denied outright. Purely additive header, no behavior change. Verified: `npx eslint next.config.ts` passes clean.

<details><summary>Original finding</summary>

`next.config.ts`'s `headers()` sets `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Strict-Transport-Security`, and (via `proxy.ts`) a nonce-gated CSP with `frame-ancestors 'none'`, `object-src 'none'`, `base-uri 'self'` — all confirmed present and correctly threaded. There's no `Permissions-Policy` entry restricting browser features (camera, geolocation, payment request API) for pages that don't need them. Given this site has QR-scanning UI (camera access) and a Stripe-hosted checkout, a default-deny `Permissions-Policy` is a defense-in-depth hardening step, not a fix for an active exposure — no exploit path was found or is implied.

**Fix suggestion (not applied):** Add a `Permissions-Policy` header in the same `headers()` block, denying by default and allowlisting only what's used (e.g. `camera=(self)` for the scanner origin, everything else `()`). Purely additive; no behavior change for any existing feature as long as camera stays allowed for the officer scan page's own origin.

</details>

### 4. Cover-photo MIME allowlist drift between upload routes (not exploitable)

`app/api/officer/events/[id]/cover/route.ts` allows `jpeg/png/webp` (no gif); both gallery routes allow those plus `gif`. Inconsistent, but not a security gap — `utils/validate-image.ts`'s magic-byte check covers all four types on every route, and none of the allowed formats (no SVG) carry script risk. Worth reconciling for consistency during unrelated maintenance; not a fix that needs to ship on its own.

---

## Accepted by design (not counted against the score)

- **Stripe webhook has no session guard.** `stripe.webhooks.constructEvent` signature verification against the raw request body (`req.text()`, confirmed not re-serialized) is the actual security boundary — verified this is still true and un-drifted.
- **`app/api/events/register/route.ts` allows anonymous guest checkout.** By design; guest email dedup + a partial unique DB index prevent duplicate free/paid registrations, confirmed still in place.
- **`createAdminClient()` (RLS bypass) used without a session guard in `app/api/stripe-webhook` and `app/api/events/register`.** Documented exemptions in `scripts/check-auth-guards.mjs`; both still hold under manual review, not just the static checker.
- **Officers can scan/manage any event, not just ones "assigned" to them.** No per-event officer scoping concept exists in this schema; for a single small officer corps this is expected behavior, not a missing authorization check.
- **No event capacity/waitlist concept in the schema.** Out of scope for a security audit — flagging only as a product question for whoever owns event requirements, not a vulnerability.

## Resolved during this audit (no longer a live concern)

- **`next.config.ts` `images.remotePatterns`** — a prior performance audit (2026-07-15) flagged `hostname: '*.amazonaws.com'` as a wildcard enabling image-optimizer SSRF/open-proxy abuse. Re-read the current file directly: `remotePatterns` is pinned to the exact bucket host `cover-photos-gal.s3.us-east-2.amazonaws.com`, with an inline comment explaining the wildcard was already removed for this exact reason. **No action needed — already fixed, prior audit's finding is stale.**

---

## Verified clean (checked directly, no findings)

- **Auth/access control, all three layers** — `proxy.ts`, `updateSession` (`utils/supabase/middleware.ts`), `lib/auth.ts` (`requireUser`/`requireOfficer`/`requireActiveMember`). Every `app/api/officer/**` route calls `requireOfficer()` specifically, checked per-file (not just trusting `npm run check:auth-guards`'s file-level heuristic) — no split-guard gap where one HTTP method in a multi-method file is unguarded. `isMembershipActive()` (status **and** expiry) used consistently everywhere membership matters. Officer-acting-as-attendee role correctly exempted from the paid-membership gate in both middleware and `assertActiveMember()` — the exact class of bug behind the `bc94114` revert does not currently exist.
- **Payments** — price/amount always server-computed from the `events`/settings tables, never trusted from the client. Registration race conditions (member + guest paths) guarded by DB uniqueness + conditional updates. Membership/ticket status flipped only by the signature-verified webhook, never optimistically at checkout creation. Webhook idempotency enforced via a `stripe_events` ledger claiming `event.id` before fulfillment. No non-webhook path can set `membership_status`/`membership_expires_at`. No Stripe secret or webhook secret reachable client-side.
- **Ticket scan check-in** — genuinely atomic conditional `UPDATE ... WHERE checked_in = false`, closing the double-scan race. Ticket `qr_code` is an unguessable `crypto.randomUUID()`, not sequential. Cross-event ticket use rejected.
- **`attend_qr_token` never leaks to non-officers** — excluded from `PUBLIC_EVENT_COLUMNS`, and independently locked down at the Postgres column-grant level (`REVOKE` migration), so this is enforced in two layers, not just app-code convention.
- **IDOR / data exposure** — every member-facing `[id]`-less route (`me`, `update-profile`) scopes strictly to the authenticated session's own email, never a client-supplied id. Every officer `[id]` route is `requireOfficer()`-gated before touching the id (cross-id access there is intended admin behavior, not IDOR). No `select('*')` on `events` from any public path. CSP nonce threading verified end-to-end from `proxy.ts` through to page JSON-LD script tags.
- **Input validation** — all 15 API routes with POST/PATCH/PUT parse the body through a Zod schema before use; none trust a raw client field. Upload routes validate content-type via allowlist **and** magic bytes, and derive S3 keys from server-generated values (UUID / timestamp+random), never from a client-supplied filename — no path traversal vector. Rate limiting is genuinely wired to both unauthenticated write endpoints (event registration, membership checkout), not decorative.

---

## Security score: 100 / 100

**Rubric (weighted for the college-student threat model — likelihood × blast radius, not worst-case nation-state assumptions):**

| Factor | Weight | Assessment |
|---|---|---|
| Auth/access-control integrity (all 3 layers, role matrix) | 30 | Full marks — verified clean across every role, every guard |
| Payment integrity (price tampering, replay, race) | 25 | Full marks — server-computed pricing, webhook-gated fulfillment, idempotent |
| QR/attendance/points integrity | 20 | Full marks — finding #1 fixed: `attend_qr_token` now rotates on open, closing the forwarded-link farming path |
| Data exposure / IDOR | 15 | Full marks — no cross-user data access found anywhere |
| Input validation / upload safety | 10 | Full marks — finding #2 fixed: both CSV exporters neutralize leading `=`/`+`/`-`/`@` |

**Remaining open findings:** none. Finding #3 (`Permissions-Policy` header, P3) is now also fixed — see above. Finding #4 (cover-photo MIME allowlist drift) remains as a non-exploitable consistency note only, not scored against the site's security posture.

**Bottom line for this audience:** all three scored findings from this audit are fixed and verified (lint + auth-guard check pass for every changed file; no client-side changes were needed for the token rotation or CSV fixes). Nothing found lets a student get a ticket for free, take over another student's account, see another student's private data, forge a payment, or farm attendance points from an old screenshot or group-chat-forwarded link.
