# Performance & Code Bloat Audit

**Date:** 2026-07-15 · **Scope:** entire repo (app/, components/, lib/, utils/, scripts/, types/, public/, config) · **Status:** report only — no code changed.

Method: four parallel audit passes (pages, server/API, shared components/CSS, deps/config/assets). Framework claims verified against the bundled Next.js 16 docs in `node_modules/next/dist/docs/` (notably: `preload` replaces the deprecated `priority` on `next/image` — already used correctly; any `.svg` src is served **unoptimized** by `next/image`).

**Constraint honored throughout:** every recommendation preserves intended purpose, visual appearance, animation feel, and functionality. Auth guards, payment flows, and check-then-update race protections are treated as fixed — nothing below weakens them.

Tags: `perf` user-facing performance · `delete` dead code · `stdlib` hand-rolled existing helper · `native` platform already does it · `yagni` unused abstraction/config · `shrink` same logic, fewer lines.

---

## P1 — Highest user impact (do these first)

### 1. Logo "SVGs" are megabyte PNGs shipped raw — every visitor pays
Figma exports: base64 PNGs wrapped in an SVG shell. `next/image` auto-skips optimization for `.svg` src, so full bytes hit the wire.

| File | Size | Displayed at | Where |
|---|---|---|---|
| `public/hero-logo.svg` | 580KB | 200–515px | `components/HeroSection.tsx:61`, login |
| `public/bare-logo.svg` | 229KB | **43px** | `components/Footer.tsx:34` (site-wide) |
| `public/logo-head.svg` | 231KB | login | 11KB twin `public/logo-head.png` already exists (Navbar uses it) |
| `public/cultural-logo.svg` | 121KB | goodphil/cultural | |
| `public/modern-logo.svg` | 65KB | goodphil/modern | |

- [perf] Fix: extract embedded PNG, resize to 2× display width, serve via `next/image` (WebP/PNG). For login, reuse the existing `logo-head.png`. **Est. −500KB homepage first load, −450KB every page (footer + login).** Pixel-identical.

### 2. Multi-MB OpenGraph images — link previews break
Social crawlers fetch metadata URLs raw (`next/image` never touches them); WhatsApp/iMessage/Telegram drop previews above ~300–600KB.

- [perf] `app/layout.tsx:51` — og:image = `/hero-officers.jpg` (1.37MB)
- [perf] `app/(pages)/events/page.tsx:16` — `/event-photo.jpg` (1.1MB)
- [perf] `app/(pages)/pamilyas/page.tsx:16` — `/pam-hero.jpg` (916KB)
- [perf] `app/(pages)/about/page.tsx:15` — `/about-us-hero.jpg` (656KB)
- Fix: dedicated pre-sized 1200×630 files (~150KB each, e.g. `public/og-home.jpg`). No code-path change beyond the metadata string.

### 3. `public/` is 83MB of camera-resolution originals
`carousel-5.jpg` 7.9MB, `spi-1/2/3.jpg` 5.6–6.6MB, `mod-1/2/3.jpg` 4.2–6.6MB, `cult-2.jpg` 3.5MB, ~15 more at 0.8–1.7MB. All rendered via `next/image` at ≤515px (spirit/modern cards display at **220px**, `quality={95}`), so users get resized variants — but every cold optimizer pass fetches + decodes the full source (slow first LCP after each deploy/revalidate), deploys are bloated, and image-optimization spend is inflated.

- [perf] Fix: batch re-encode sources to ≤2000–2560px wide, q80 (sharp/squoosh). **83MB → est. ~10MB.** Zero code changes, identical rendering at display sizes.
- [perf] `next.config.ts:11-23` — `images.formats` unset → Next 16 default is WebP only. Add `formats: ['image/avif', 'image/webp']` — **−20–30% bytes on every photo**, one line (doc-verified).
- [perf] `next.config.ts` — `minimumCacheTTL` unset (default 4h). Assets only change on redeploy; set `minimumCacheTTL: 2678400` (31d, docs' own example) — fewer re-transforms of large sources.

### 4. Middleware fires a network auth round-trip on every request
- [perf] `utils/supabase/middleware.ts` — `supabase.auth.getUser()` = network call to Supabase Auth on **every matched request** for logged-in users, including fully public pages. ~50–150ms fixed latency tax per page view — the single biggest server-side cost in the app.
- **Tried and reverted:** gating `getUser()` to only run on guarded paths (`needsMember || needsOfficer || pathname === '/membership'`) shipped, then broke session refresh — middleware's `setAll` is the *only* place that can persist a refreshed cookie (Server Components can't write cookies), so `RootLayout`'s own `getUser()` call relies on middleware having refreshed the token first. Skipping middleware's call on public pages left `RootLayout` as the first to notice an expiring token, which then failed to persist its own refresh attempt on every request — surfaced as repeating `[server.ts] failed to set cookie` console errors and risked desyncing the rotating refresh token. Reverted to the unconditional call.
- Remaining valid option: `supabase.auth.getClaims()` (local JWT verification, no network round-trip) — but its refresh semantics need to be verified separately before relying on it (does it still trigger + persist a refresh the same way `getUser()` does?), and it requires enabling Supabase JWT signing keys first. Not attempted here given the correctness risk just surfaced.

### 5. Static marketing pages ship ~3,600 lines as client JS
- [perf] `app/(pages)/about/AboutClient.tsx` (581), `goodphil/{about,cultural,modern,spirit,sports}/*Client.tsx` (398–508 each), `pamilyas/PamilyasClient.tsx` (725) — overwhelmingly static markup (rosters, copy, FAQ) marked `'use client'` solely for scroll-reveal. HTML SSRs, then ships again as JS and hydrates on the highest-traffic public routes.
- Fix: render static sections as server JSX in each `page.tsx`; wrap animated blocks in the existing client leaves (`ScrollFadeIn`, `AnimatedTitle`, `BaybayinRule` are already client components; only bespoke stagger observers, e.g. `AboutClient.tsx:256-300`, need a thin client wrapper). No visual change. Start with About + Pamilyas.

---

## P2 — Server latency & bundle wins

### Data-fetch waterfalls (serial awaits that are independent)
- [perf] `app/page.tsx:35-76` — logged-in home: `getCachedVisibleEvents()` → `auth.getUser()` → member query → registrations query, 4 serial awaits. Events ∥ auth chain via `Promise.all`; member + registrations collapse to one query via relation embed (`.select('id, ..., event_registrations(event_id)')`). Saves 1–2 round trips per member home load.
- [perf] `app/(pages)/events/page.tsx:46-82` — identical waterfall, identical fix.
- [shrink] Same ~35-line "resolve member + paid registration ids" block duplicated verbatim in both files — extract one helper (e.g. `lib/data/member.ts`).
- [perf] `app/api/events/register/route.ts:61-112` — identity chain and event fetch independent but serial (up to 4 round trips before any write, on the paid-checkout path). `Promise.all` the event fetch with identity resolution; guard order intact.
- [perf] Officer pages pattern — `officer/applications/page.tsx:37-52`, `officer/events/page.tsx:22-45`, `officer/gallery/page.tsx:27-46`, `officer/goodphil/page.tsx:23-50`, `officer/scan/page.tsx:26-42`: role query then data query, but data reads use the admin client and don't depend on the role result. `Promise.all`, check redirect after. One fewer round trip per officer page.
- [perf] `app/(pages)/pamilyas/page.tsx:70` and `onboarding/basic-info/page.tsx:42` — `getSettings()` independent of the auth/member chain; start early / `Promise.all`.

### Door-scan tally fetches every ticket row per scan
- [perf] `app/api/scan-ticket/route.ts:29-40` — `eventTally()` pulls **all paid ticket rows** and counts in JS on every scan. 500-ticket event = 500 rows per door scan at the most latency-sensitive moment. Fix: two head-only count queries (`.select('id', { count: 'exact', head: true })`, paid and paid+checked_in) in `Promise.all`. Same numbers, zero row transfer, race semantics unchanged.
- [shrink] `scan-ticket/route.ts:65-80` — selects `attendee_email` + `registration_id`, never used. Drop.

### Eager heavy imports in client chunks
- [perf] `officer/events/OfficerEventsClient.tsx:18` and `officer/gallery/OfficerGalleryClient.tsx:18` — static `import imageCompression from 'browser-image-compression'` (~50KB) used only inside upload handlers. Fix: `await import(...)` in the handler — the events file already does exactly this for `qrcode` at `:594`; copy the pattern.
- [perf] `officer/scan/ScanClient.tsx:16` — `html5-qrcode` (~300KB) static import. Needed at mount for the scanner, so eager is defensible; a lazy import inside the start-scanner effect would paint the page shell instantly on officer phones at check-in. Optional.
- [ok] FullCalendar already dynamic-imported with `ssr:false` and gated to md+ viewports — no action.

### Misc render/network
- [perf] `officer/gallery/OfficerGalleryClient.tsx:386` — raw `<img src={gallery.cover_photo_url}>` renders full-size S3 cover into a 72×72 thumbnail; every archived gallery downloads its full cover. Fix: `next/image` `width={72} height={72}` (S3 host already in `remotePatterns`). Data-URL previews at `:490`/`:687` correctly stay raw.
- [perf] `app/globals.css:261-264` — reduced-motion rule sets `animation-duration: 0.01ms !important` but not iteration count, so every `infinite` animation (watermark marquee, `.pamilya-cta-glow`, `.nudge-down`, `fsa-float`) restarts ~every frame forever for reduced-motion users. Fix: add `animation-iteration-count: 1 !important;`. Invisible, kills a busy loop.
- [perf] `officer/applications/ApplicationsClient.tsx:742-771` — both tabs' filter→sort→search pipelines run every render (each keystroke re-sorts up to 1,000 rows twice). `useMemo` per tab. Officer-only, low urgency.
- [perf] `app/api/galleries/[id]/route.ts:53` — PATCH reads full multipart body before any size guard; siblings pre-check Content-Length. Comes free with the shared upload helper below.
- [shrink] `app/api/events/register/route.ts:18-28` — `ipHits` rate-limit map never prunes idle IPs; slow leak on long-lived nodes. One-line delete-on-empty in `isRateLimited`.
- [native] `components/PhotoCarousel.tsx:60-65` — `resize` listener recomputes `innerWidth < 768` per event; `matchMedia('(max-width: 767px)')` `change` event fires only at crossings. Minor.
- [perf] `components/Footer.tsx:7,24-25,63-70` — whole site-wide footer is client-only so the socials row can scroll-reveal; a ~15-line client wrapper for that one div makes the rest server-rendered. Low impact, optional.
- [perf] `lib/useRevealOnScroll.ts:39-43,86-93` — 500ms safety-net polls `getBoundingClientRect()` indefinitely for never-revealed elements. Deliberate never-blank guarantee — note only; act only if it shows on a profile.

---

## P3 — Duplication (shrink: extract once, delete copies)

- [shrink] **~200-line modal + 9 helpers duplicated**: `components/UpcomingEventsSection.tsx:20-42,147-334` vs `app/(pages)/events/EventsPageClient.tsx:26-56` + modal block — comments even admit it ("identical logic to EventsPageClient"). Pricing/early-bird/deadline logic lives in two drift-prone copies; a bug fixed in one silently survives in the other. Extract shared `EventDetailModal` + helpers module.
- [shrink] `isTicketed/isHybrid/hasAttendanceQR/hasPoints` defined 3× — `OfficerEventsClient.tsx:48-64`, `EventsPageClient.tsx:54-57`, `UpcomingEventsSection.tsx:39-41`. Natural home: `utils/eventTypes.ts`.
- [shrink] **Cover-upload validation copy-pasted 3×** (~90 lines, already drifting: cover route omits gif, galleries [id] PATCH omits the Content-Length pre-check): `app/api/galleries/route.ts:19-21,81-108`, `galleries/[id]/route.ts:16-18,80-104`, `officer/events/[id]/cover/route.ts:16-17,45-70`. Extract `validateAndUploadCover()`; all security checks preserved, pure extraction.
- [shrink] **Active-member guard block 3×** (15 lines each): `onboarding/submit/route.ts:71-89`, `onboarding/update-basic-info/route.ts:52-65`, `onboarding/not-interested/route.ts:27-40`. Add `requireActiveMember()` beside `requireUser` in `lib/auth.ts`.
- [shrink] **Optimistic-lock 409 branch duplicated verbatim**: `officer/applications/ading/[id]/route.ts:71-93` vs `kuyate/[id]/route.ts:72-94`. Extract `reviewConflictResponse()`; the `.eq('status', …)` lock writes stay untouched.
- [shrink] **Play/pageshow replay routine 3×**: `HeroSection.tsx:24-49` duplicates `AnimatedTitle.tsx:44-62` / `AnimatedLetters.tsx:81-102` — and HeroSection hand-applies what `<AnimatedTitle animation="fadeIn">` already does. Render through AnimatedTitle; ~25 lines gone, pixel-identical.
- [shrink] **Hand-rolled IntersectionObservers** duplicating `useRevealOnScroll`: `WhoAreWeText.tsx:16-26` (1×), `MissionStatementSection.tsx:20-43` (2×). Swap for the hook; inherits never-blank + reduced-motion handling for free.
- [stdlib] `onboarding/update-basic-info/route.ts:20-21` — local `titleCase` = `toTitleCase` from `lib/format.ts` char-for-char. Note: `submit/route.ts:24-30` uses a *third* variant that also lowercases the tail — the two onboarding paths normalize names differently; pick one intentionally.
- [stdlib] `components/QuickNavRail.tsx:64-67` — local reduced-motion ref duplicates exported `prefersReducedMotion()` in `lib/useRevealOnScroll.ts:5`.
- [native] `onboarding/submit/route.ts:104`, `update-basic-info/route.ts:79`, `member/update-profile/route.ts:53` — `formatPhone()` re-formats a value `phoneField` (`lib/schemas.ts:119`) already transformed + regex-verified. No-op second pass; store `parsed.phone ?? null` directly.
- [shrink] `officer/events/route.ts:27` — officer column list duplicates `PUBLIC_EVENT_COLUMNS` exactly; `officer/events/page.tsx:44` repeats it a third time + `attend_qr_token`. One exported constant.
- [shrink] `onboarding/OnboardingClient.tsx:583-627,770-773,1096-1112` — `style={{ color:'#ffffff', backgroundColor:'#141414' }}` inline on 30 `<option>`s + 16 hand-written MBTI options. One CSS rule + `MBTI_TYPES.map()`; ~50 lines, identical rendering.

---

## P4 — Dead code & config (delete: zero risk)

- [delete] `lib/schemas.ts:39-49` — `updateProfileSchema`: zero callers, comment names a route that doesn't exist.
- [delete] `lib/schemas.ts:54-56` — `attendTokenSchema`: zero callers.
- [delete] `lib/format.ts:18-21` — `toSentenceCase`: zero callers.
- [delete] `types/database.ts:182-188` — `AppSettings`: unused **and** stale (missing 3 fields `getSettings()` actually returns — wrong documentation). Delete or derive: `Awaited<ReturnType<typeof getSettings>>`.
- [delete] `types/database.ts` — `EventRegistration`, `RegistrationTicket`, `Attendance`, `Photo`, `Setting` exported, never imported. Defensible as schema mirror; if kept, they drift with no compiler pressure.
- [delete] `utils/supabase/middleware.ts:24-29` — 3 of 4 `ALLOWED_UNPAID_PATHS` entries unreachable (list only consulted under `pathname.startsWith('/member')`; `/onboarding`, `/auth`, `/login` can never match). Reduce to `['/membership']`.
- [delete] `components/SmoothImage.tsx:40` — `BlurInImg` exported, zero call sites.
- [delete] `package.json:17` — `@stripe/stripe-js`: **zero imports** (checkout is server-created Stripe-hosted redirect). `npm uninstall @stripe/stripe-js`. Keep the js.stripe.com dns-prefetch (hosted checkout still uses it).
- [delete] `public/.impeccable/hook.cache.json` — tool cache; gitignore.
- [delete] globals.css dead-token purge (~25 lines): `@keyframes backdropIn` (:271), `--carousel-card-w`/`--carousel-offset` + their mobile media block (:102-104,113-118), `--font-size-hero`/`--font-size-heading` (:85-86), `--ease-spring`/`--ease-standard` (:98,100 — call sites hardcode the same curves inline), `--shadow-overlay` (:91 + @theme :181), `--color-surface-card`/`--color-surface-section` (:66,68 + @theme :167,169), `--color-border-visible` (:73), `--primitive-border-07` (:44), all four `--color-officer-*` + `--primitive-bg-deep` (:106-110,:36).
- [native] `app/globals.css:343` — `* { box-sizing: border-box }`: Tailwind v4 preflight already sets it.
- [native] `app/globals.css:285-287` — `.week-pill { cursor:pointer }`: both usage sites are `<button>`s covered by `:27`. Keep the class name (used as a selector hook at `EventsPageClient:959`).
- [shrink] `app/globals.css:18-23` vs `:244-246` — two `html {}` blocks 220 lines apart; body `:252` repeats `scrollbar-gutter` from html `:20`. Merge.
- [yagni] `components/GoodphilNavRail.tsx:1` — `'use client'` with no hooks/state/events; server components may render client children. Drop the directive.
- [yagni] `officer/applications/page.tsx:15-22` — server `sortByStatusThenDate` immediately re-sorted client-side; its order only survives into CSV export. Drop one of the two orderings (or comment why both exist).
- [yagni] `app/sitemap.ts:19` — `lastModified: new Date()` stamps crawl time on every URL — tells crawlers nothing, can erode trust. Omit or use real dates.
- [native] `officer/events/[id]/route.ts:34-47` — manual 4-round-trip FK cascade delete vs `ON DELETE CASCADE` (would be a migration, not route code). Deliberate + officer-only; optional.
- [native] `next.config.ts:16` — `hostname: '*.amazonaws.com'` lets the optimizer proxy any S3 bucket on the internet; narrow to the actual bucket host. (Security hardening, not perf.)
- Stale comments: `app/auth/logout/route.ts:2` (says "redirects to /login", handler returns JSON), `app/globals.css:195` (`heroFadeIn` comment mentions translateY, keyframe is opacity-only). Sync per handoff-doc-sync convention.
- Nits: `app/api/onboarding/submit/route.ts:49` + `member/update-profile/route.ts:33` — `await req.json()` without catch → malformed JSON 500s where siblings 400. `stripe-webhook/route.ts:120` vs `:189` — inconsistent Resend env gating.

---

## What's already right (don't touch)

FullCalendar dynamic-imported + viewport-gated · events query `unstable_cache`d with tag invalidation · `preload` (Next 16) used correctly, `sizes` on all fill images · Stripe/S3/Resend clients module-scope singletons · stripe-webhook already fully parallelized, emails non-blocking · `qrcode` lazy-imported in client files · fonts via `next/font` with swap + subsets · Analytics/SpeedInsights placed correctly · Navbar scroll handler rAF-gated + passive · kuyate email claim/release race dance intentional · middleware matcher excludes static assets correctly · `scripts/check-auth-guards.mjs` clean.

**Clean files (audited, no findings):** app/error.tsx, app/not-found.tsx, terms, privacy, auth/callback, goodphil/page.tsx, attend, about/page.tsx, login/*, membership/*, archives/* (`revalidate=3600`), member/profile/* (+edit), member/orders/*, member/attendance/*, officer/scan/ScanClient (eager import defensible), officer/goodphil/GoodphilClient, events/EventCalendar, events/RegisterModal, DeleteEventModal, ProgressBars, onboarding/page + BasicInfoClient, all loading.tsx/segment error.tsx · lib/stripe, lib/resend, utils/s3, lib/auth, lib/api-response, lib/membership, lib/constants, lib/settings, lib/data/events, lib/email/* · utils/eventTypes, utils/validate-image, utils/supabase/{server,client} · api/me, api/membership/checkout, api/onboarding/not-interested, api/officer/applications/[id], api/stripe-webhook (perf) · components: AnimatedLetters, AnimatedTitle, BaybayinRule, HeroWatermark, Modal, ScrollFadeIn, SimpleHeader, SiteChrome, SmoothImage (minus dead export) · tsconfig, eslint.config, postcss.config.

---

## Estimated net

- **First-load bytes:** −~950KB logos (all pages/login), −20–30% on every photo (AVIF), −~1MB per social unfurl.
- **Repo/deploy:** public/ 83MB → ~10MB.
- **Latency:** −50–150ms every request (middleware), −1–2 DB round trips on home/events/register/officer pages, door-scan tally from O(tickets) rows to 2 count queries.
- **Code:** roughly −700 lines via dedup + dead-code deletion, −1 dependency. No behavior change anywhere.
