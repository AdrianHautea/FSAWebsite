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
  event_type: z.string().min(1).max(50).trim(),
  event_date: z.string().min(1),          // ISO string from datetime-local
  location: z.string().max(200).trim().optional().nullable(),
  points: z.number().int().min(0).optional().nullable(),
  price_dollars_members: dollarsToCents,
  price_dollars_nonmembers: dollarsToCents,
  eb_price_dollars_members: dollarsToCents.optional().nullable(),
  eb_price_dollars_nonmembers: dollarsToCents.optional().nullable(),
  eb_deadline: z.string().optional().nullable(),
  is_active: z.boolean().default(true),
})

// all fields optional for PATCH
export const updateEventSchema = createEventSchema.partial()