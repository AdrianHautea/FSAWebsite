// ── lib/constants.ts ──────────────────────────────────────
// shared constants used across the codebase
//
// notes: update COVER_PHOTO_ASPECT_RATIO if card layout changes —
//        the cropper will enforce the new ratio on all future uploads

// ── cover photo constraints ───────────────────────────────

// controls the crop ratio enforced on all cover photo uploads
export const COVER_PHOTO_ASPECT_RATIO = 16 / 9

// minimum output dimensions in pixels for acceptable quality
export const COVER_PHOTO_MIN_WIDTH = 800
export const COVER_PHOTO_MIN_HEIGHT = 450

// ── event column selection ────────────────────────────────

// explicit column list for events fetched on PUBLIC pages (home, events).
// SECURITY — deliberately excludes attend_qr_token: that token is the in-person
// check-in secret and must never reach the browser, or any visitor could scrape it
// and self-award attendance points. never use select('*') for events on a public page.
// only the officer events page (server-side, role-gated) may select attend_qr_token.
export const PUBLIC_EVENT_COLUMNS =
  'id, created_at, name, description, event_type, event_date, location, points, ' +
  'attend_qr_open, attend_qr_expires_at, price_cents_members, price_cents_nonmembers, ' +
  'eb_price_members, eb_price_nonmembers, eb_deadline, is_active, is_visible, ' +
  'cover_photo_url, registration_closes_at'
