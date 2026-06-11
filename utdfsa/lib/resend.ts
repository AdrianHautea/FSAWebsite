// singleton resend client — import { resend } from '@/lib/resend' for sending transactional emails

import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY!)
