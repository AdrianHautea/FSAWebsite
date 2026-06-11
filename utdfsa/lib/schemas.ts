import { z } from 'zod'

export const scanTicketSchema = z.object({
  qr_code: z.string().uuid('Invalid QR code format'),
})

export const attendeeSchema = z.object({
  fname: z.string().min(1).max(50).trim(),
  lname: z.string().min(1).max(50).trim(),
  email: z.string().email(),
})

export const eventRegisterSchema = z.object({
  event_id: z.string().uuid(),
  tickets: z.array(attendeeSchema).min(1).max(20),
})

export const updateProfileSchema = z.object({
  first_name: z.string().min(1).max(50).trim(),
  last_name: z.string().min(1).max(50).trim(),
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]{7,15}$/, 'Invalid phone number')
    .optional()
    .nullable(),
  year: z.enum(['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Alumni']).optional().nullable(),
  major: z.string().max(100).trim().optional().nullable(),
})

export const attendTokenSchema = z.object({
  token: z.string().min(1).max(100),
})

const dollarsToCents = z
  .number()
  .min(0)
  .transform(v => Math.round(v * 100))

export const createEventSchema = z.object({
  name: z.string().min(1).max(200).trim(),
  description: z.string().max(2000).trim().optional().nullable(),
  event_type: z.enum(['General Meeting', 'Risk Management', 'Party', 'GP Event', 'Regular Event', 'Other']),
  event_date: z.string().min(1),          // ISO string from datetime-local
  location: z.string().min(1, 'Location is required').trim().max(200),
  points: z.number().int().min(0).optional().nullable(),
  price_dollars_members: dollarsToCents,
  price_dollars_nonmembers: dollarsToCents,
  eb_price_dollars_members: dollarsToCents.optional().nullable(),
  eb_price_dollars_nonmembers: dollarsToCents.optional().nullable(),
  eb_deadline: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
  registration_closes_at: z.string().datetime({ offset: true }).optional().nullable(),
})

// all fields optional for PATCH
export const updateEventSchema = createEventSchema.partial()

// turns empty string / null / undefined into null before further validation
function nullIfEmpty(v: unknown) {
  return v === '' || v === null || v === undefined ? null : v
}

// 10-digit phone — accepts formatted or raw; stores digits only
export const phoneField = z.preprocess(
  nullIfEmpty,
  z.string()
    .transform(v => v.replace(/\D/g, ''))
    .refine(v => v.length === 10, 'must be a valid 10-digit phone number')
    .nullable()
)

export const adingApplicationSchema = z.object({
  instagram: z.preprocess(
    nullIfEmpty,
    z.string().max(50).transform(v => v.replace(/^@/, '')).nullable()
  ).optional(),

  phone: phoneField.optional(),

  birthday: z.preprocess(
    nullIfEmpty,
    z.string()
      .refine(v => {
        const d = new Date(v)
        if (isNaN(d.getTime())) return false
        const today = new Date()
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

  activity_level: z.number().int().min(1).max(10).optional().nullable(),

  hobbies: z.preprocess(nullIfEmpty, z.string().max(300).nullable()).optional(),

  fave_music_genre: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  fave_artist: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  fave_food: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  pam_vibe: z.preprocess(nullIfEmpty, z.string().max(500).nullable()).optional(),

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

  future_kuyate: z.preprocess(nullIfEmpty, z.string().max(100).nullable()).optional(),

  // stored uppercase; empty input treated as null
  mbti: z.preprocess(
    nullIfEmpty,
    z.string()
      .regex(/^[EI][NS][TF][JP]$/i, 'must be a valid MBTI type (e.g. INFP)')
      .transform(v => v.toUpperCase())
      .nullable()
  ).optional(),

  additional_notes: z.preprocess(nullIfEmpty, z.string().max(1000).nullable()).optional(),
})

export const kuyateApplicationSchema = z.object({
  additional_notes: z.preprocess(nullIfEmpty, z.string().max(1000).nullable()).optional(),

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

  acknowledges_responsibilities: z.literal(true),

  why_kuyate: z.string().min(50, 'please share at least 50 characters').max(1000),
}).superRefine((data, ctx) => {
  if (data.wants_to_be_pam_head && !data.pam_head_phone) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'phone number is required when applying to be a pamilya head',
      path: ['pam_head_phone'],
    })
  }
})
