// ── lib/schemas.ts ────────────────────────────────────────
// zod validation schemas for all api route inputs and form submissions
//
// notes: dollarsToCents and nullIfEmpty are shared transforms reused across schemas;
//        phoneField is a reusable preprocessor for all phone inputs

import { z } from 'zod'

// ── ticket scanning ───────────────────────────────────────

// validates the qr code value from the scanner — must be a uuid
export const scanTicketSchema = z.object({
  qr_code: z.string().uuid('Invalid QR code format'),
})

// ── event registration ────────────────────────────────────

// shape of a single attendee on a ticket purchase
export const attendeeSchema = z.object({
  fname: z.string().min(1).max(50).trim(),
  lname: z.string().min(1).max(50).trim(),
  email: z.string().email(),
})

// payload sent when registering for an event; supports multi-ticket orders (up to 10)
export const eventRegisterSchema = z.object({
  event_id: z.string().uuid(),
  tickets: z.array(attendeeSchema).min(1).max(10),
})

// ── member profile update ─────────────────────────────────

// used by PATCH /api/member/profile
export const updateProfileSchema = z.object({
  first_name: z.string().min(1).max(50).trim(),
  last_name: z.string().min(1).max(50).trim(),
  // phone is optional; accepts formatted or raw input
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]{7,15}$/, 'Invalid phone number')
    .optional()
    .nullable(),
  year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Alumni']).optional().nullable(),
  major: z.string().max(100).trim().optional().nullable(),
})

// ── attendance token ──────────────────────────────────────

// validates the short token from the event QR code used to record attendance
export const attendTokenSchema = z.object({
  token: z.string().min(1).max(100),
})

// ── shared transforms ─────────────────────────────────────

// dollarsToCents: takes a dollar float from the form and converts to integer cents for stripe/db
// e.g. 12.50 → 1250; Math.round avoids floating-point rounding errors
const dollarsToCents = z
  .number()
  .min(0)
  .transform(v => Math.round(v * 100))

// ── event management ──────────────────────────────────────

// used by POST /api/officer/events — all price fields go through dollarsToCents
export const createEventSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  event_type: z.enum(['General Meeting', 'Risk Management', 'Party', 'GP Event', 'Regular Event', 'Other']),
  event_date: z.string().min(1),          // ISO string from datetime-local
  location: z.string().min(1, 'Location is required').trim().max(200),
  points: z.number().int().min(0).optional().nullable(),
  // price inputs arrive as dollar floats; stored in db as integer cents
  price_dollars_members: dollarsToCents,
  price_dollars_nonmembers: dollarsToCents,
  eb_price_dollars_members: dollarsToCents.optional().nullable(),
  eb_price_dollars_nonmembers: dollarsToCents.optional().nullable(),
  eb_deadline: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  is_visible: z.boolean().default(true),
  // requires a timezone-offset ISO string so the server can interpret the correct moment
  registration_closes_at: z.string().datetime({ offset: true }).optional().nullable(),
})

// all fields optional for PATCH
export const updateEventSchema = createEventSchema.partial()

// ── shared preprocessors ──────────────────────────────────

// nullIfEmpty preprocessor: turns empty string / null / undefined into null before further validation
// used on optional text fields so unsubmitted form inputs don't fail string validators
function nullIfEmpty(v: unknown) {
  return v === '' || v === null || v === undefined ? null : v
}

// 10-digit phone — accepts formatted or raw; stores as (xxx) xxx-xxxx
export const phoneField = z.preprocess(
  nullIfEmpty,
  z.string()
    .transform(v => {
      const digits = v.replace(/\D/g, '')
      if (digits.length !== 10) return digits
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    })
    .refine(v => /^\(\d{3}\) \d{3}-\d{4}$/.test(v), 'must be a valid 10-digit phone number')
    .nullable()
)

// ── ading application ─────────────────────────────────────

// form schema for the ading (new member) application
export const adingApplicationSchema = z.object({
  // strip leading @ so both "@handle" and "handle" are stored the same way
  instagram: z.preprocess(
    nullIfEmpty,
    z.string().max(50).transform(v => v.replace(/^@/, '')).nullable()
  ).optional(),

  phone: phoneField.optional(),

  // birthday: validates the date is parseable and the applicant is at least 13
  birthday: z.preprocess(
    nullIfEmpty,
    z.string()
      .refine(v => {
        const d = new Date(v)
        if (isNaN(d.getTime())) return false
        const today = new Date()
        // compute age accounting for whether the birthday has passed this year
        const age = today.getFullYear() - d.getFullYear()
        const m = today.getMonth() - d.getMonth()
        const adj = (m < 0 || (m === 0 && today.getDate() < d.getDate())) ? age - 1 : age
        return adj >= 13
      }, 'must be at least 13 years old')
      .nullable()
  ).optional(),

  pronouns: z.enum([
    'He/Him', 'She/Her', 'They/Them', 'He/They', 'She/They', 'Any', 'Prefer not to say',
  ]).optional().nullable(),

  // 1–10 self-reported activity scale
  activity_level: z.number().int().min(1).max(10).optional().nullable(),

  hobbies: z.preprocess(nullIfEmpty, z.string().max(300).nullable()).optional(),

  fave_music_genre: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  fave_artist: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  fave_food: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  pam_vibe: z.preprocess(nullIfEmpty, z.string().max(500).nullable()).optional(),

  // 1–10 preference for small vs. large group hangouts
  hangout_size_preference: z.number().int().min(1).max(10).optional().nullable(),

  fave_tv_show_movie: z.preprocess(nullIfEmpty, z.string().max(200).nullable()).optional(),

  availability: z.object({
    days: z.array(z.enum([
      'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday',
    ])),
    times: z.string().max(200),
  }).optional().nullable(),

  thoughts_on_drinking: z.preprocess(nullIfEmpty, z.string().max(500).nullable()).optional(),

  dislikes: z.preprocess(nullIfEmpty, z.string().max(500).nullable()).optional(),

  pam_dealbreakers: z.preprocess(nullIfEmpty, z.string().max(500).nullable()).optional(),

  pam_incompatibilities: z.preprocess(nullIfEmpty, z.string().max(500).nullable()).optional(),

  future_kuyate: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  // stored uppercase; empty input treated as null
  mbti: z.preprocess(
    nullIfEmpty,
    z.string()
      .regex(/^[EI][NS][TF][JP]$/i, 'must be a valid MBTI type (e.g. INFP)')
      // normalize to uppercase before storing (form may submit mixed case)
      .transform(v => v.toUpperCase())
      .nullable()
  ).optional(),

  additional_notes: z.preprocess(nullIfEmpty, z.string().max(1000).nullable()).optional(),
})

// ── kuyate application ────────────────────────────────────

// form schema for the kuya/ate (mentor) application
export const kuyateApplicationSchema = z.object({
  additional_notes: z.preprocess(nullIfEmpty, z.string().max(1000).nullable()).optional(),

  // strip leading @ so both "@handle" and "handle" are stored the same way
  instagram: z.preprocess(
    nullIfEmpty,
    z.string().max(50).transform(v => v.replace(/^@/, '')).nullable()
  ).optional(),

  // 'I am unsure' selection is stored as 'Looking'
  pamilya_name: z.preprocess(
    nullIfEmpty,
    z.string().max(100).transform(v => v === 'I am unsure' ? 'Looking' : v).nullable()
  ).optional(),

  wants_to_be_pam_head: z.boolean().default(false),

  pam_head_phone: phoneField.optional(),

  // applicant must explicitly check a box confirming they understand the responsibilities
  acknowledges_responsibilities: z.literal(true),

  why_kuyate: z.string().min(50, 'please share at least 50 characters').max(1000),
}).superRefine((data, ctx) => {
  // cross-field validation: pam head applicants must provide a phone number
  if (data.wants_to_be_pam_head && !data.pam_head_phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'phone number is required when applying to be a pamilya head',
      path: ['pam_head_phone'],
    })
  }
})
