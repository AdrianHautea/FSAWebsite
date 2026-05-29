import { z } from 'zod'

export const scanTicketSchema = z.object({
  qr_code: z.string().uuid('Invalid QR code format'),
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