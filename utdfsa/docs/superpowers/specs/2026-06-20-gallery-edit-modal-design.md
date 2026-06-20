# Gallery Archive Edit Modal

**Date:** 2026-06-20
**Scope:** `app/(pages)/officer/gallery/OfficerGalleryClient.tsx`, `app/api/galleries/[id]/route.ts`

---

## Goal

Allow officers to edit any gallery archive's fields (and optionally replace its cover photo) from the Gallery Management page, via a modal that also surfaces the delete action.

---

## API — `PATCH /api/galleries/[id]`

Added to the existing `app/api/galleries/[id]/route.ts` alongside DELETE.

- **Auth:** same officer/admin role check as DELETE.
- **Body:** multipart form data with these fields:
  - `title` (required)
  - `google_photos_url` (optional)
  - `description` (optional)
  - `semester` (optional — Fall | Spring | Summer)
  - `year` (optional — integer 2000–2050)
  - `is_published` (optional — "true" | "false" string, defaults to current value if omitted)
  - `cover` (optional File) — if present, uploads to S3 and replaces `cover_photo_url`; if absent, keeps existing cover
- **Validation:** mirrors POST — title length ≤ 200, description ≤ 1000, semester enum, year bounds, google_photos_url domain allowlist.
- **Response:** returns the updated gallery row on success (`{ gallery }`), standard error shape on failure.

---

## Client — `OfficerGalleryClient.tsx`

### New state

| State | Type | Purpose |
|---|---|---|
| `editingGallery` | `Gallery \| null` | Which archive's edit modal is open |
| `editForm` | same shape as `EMPTY_FORM` + `is_published: boolean` | Pre-filled from `editingGallery` on open |
| `editCoverFile` | `File \| null` | Optional replacement cover selected in edit modal |
| `editCoverPreview` | `string \| null` | `data:` URL preview of the new cover file |
| `editSubmitting` | `boolean` | True while PATCH is in flight |
| `editError` | `string \| null` | Validation or API error shown in edit modal |
| `editDeletingId` | `string \| null` | True while DELETE is in flight from edit modal |

### Edit button

Added to each gallery row's actions area (between "View Album" and "Delete"). Clicking sets `editingGallery` to that row and pre-fills `editForm` from it.

The existing per-row "Delete" button is retained for direct deletion without opening the edit modal.

### Edit modal

Uses the same `Modal` component and `bg-[#141414]` dark shell as the create modal.

**Header:** "Edit Archive" title + close button (same styling as create modal header).

**Fields (in order):**
1. Archive Name (text, required)
2. Cover Photo — shows current cover as 1:1 square preview; clicking preview or "Change Cover" button opens file picker. Selecting a file stages it in `editCoverFile`; leaving blank keeps existing cover on save.
3. Album Link (url input, optional — not required on edit since it may have been set at create)
4. Semester / Year (grid, same as create)
5. Description (textarea, optional)
6. Published toggle — pill-style toggle (matching events page pattern); controls `is_published`. Label: "Published" / sublabel: "Show this archive on the public Gallery page".

**Footer layout:**
- Bottom-left: "Delete Archive" button — red outline (`border border-[rgba(239,111,111,0.4)] text-[#ef6f6f]`). On click: calls `DELETE /api/galleries/[id]`, shows "Deleting…" while in flight, closes modal and calls `router.refresh()` on success. No type-to-confirm required.
- Bottom-right: "Cancel" (outline) + "Save Changes" (purple fill, disabled while submitting).

**On submit:** PATCH `/api/galleries/[id]` with multipart form. On success: `router.refresh()` and close modal. On error: show inline error banner inside modal (same style as create modal).

---

## What is NOT changing

- The create modal flow is unchanged.
- The per-row inline "Delete" button (using `confirm()`) is kept as-is.
- No new files — all changes are in the two existing files above.
