export type MembershipStatus = 'pending' | 'active' | 'expired'
export type UserRole = 'member' | 'officer' | 'admin'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type PaymentProvider = 'stripe' | 'paypal' | 'venmo' | 'zelle' | 'cash'
export type FormStatus = 'draft' | 'published' | 'closed'
export type SubmissionStatus = 'draft' | 'submitted' | 'reviewed' | 'accepted' | 'rejected'
export type QuestionType = 
  | 'short_text' | 'long_text' | 'multiple_choice' 
  | 'checkbox' | 'dropdown' | 'date' | 'number' 
  | 'ranking' | 'file_upload'

export interface Member {
  id: string
  created_at: string
  email: string
  first_name: string
  last_name: string
  role: UserRole
  membership_status: MembershipStatus | null
  membership_expires_at: string | null
  amt_paid: number | null
  payment_verified_at: string | null
  points: number | null
  phone: string | null
  year: string | null
  major: string | null
  interests: string[] | null
  pamilya: string | null
  confirmation_id: string | null
  payment_provider: PaymentProvider | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_method: string | null
  payment_metadata: Record<string, unknown> | null
  stripe_customer_id: string | null
}

export interface Event {
  id: string
  created_at: string
  name: string
  description: string | null
  event_type: string
  event_date: string
  location: string | null
  points: number | null
  attend_qr_token: string | null
  attend_qr_open: boolean | null
  attend_qr_expires_at: string | null
  price_cents_members: number
  price_cents_nonmembers: number
  eb_price_members: number | null
  eb_price_nonmembers: number | null
  eb_deadline: string | null
  is_active: boolean
}

export interface EventRegistration {
  id: string
  member_id: string | null
  event_id: string | null
  created_at: string
  payment_status: PaymentStatus
  guest_email: string | null
  guest_fname: string | null
  guest_lname: string | null
  num_tickets: number
  amt_expected: number
  amt_paid: number | null
  payment_verified_at: string | null
  payment_provider: PaymentProvider | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_method: string | null
  payment_metadata: Record<string, unknown> | null
}

export interface RegistrationTicket {
  id: string
  registration_id: string
  created_at: string
  qr_code: string
  attendee_fname: string | null
  attendee_lname: string | null
  attendee_email: string | null
  checked_in: boolean
  checked_in_at: string | null
  checked_in_by: string | null
}

export interface Attendance {
  id: string
  member_id: string | null
  event_id: string | null
  created_at: string
}

export interface Form {
  id: string
  created_at: string
  title: string
  slug: string
  description: string | null
  form_type: string
  status: FormStatus
  member_only: boolean
  opens_at: string | null
  closes_at: string | null
  allow_multiple_submissions: boolean
  created_by: string
  updated_at: string
}

export interface FormQuestion {
  id: string
  created_at: string
  form_id: string
  question_text: string
  question_type: QuestionType
  required: boolean
  options_json: unknown | null
  placeholder_text: string | null
  order_index: number
  max_length: number | null
  created_by: string | null
}

export interface FormSubmission {
  id: string
  created_at: string
  form_id: string
  member_id: string
  submitted_at: string
  status: SubmissionStatus
  reviewer_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
}

export interface FormAnswer {
  id: string
  created_at: string
  submission_id: string
  question_id: string
  answer_text: string | null
  answer_json: unknown | null
  uploaded_file_url: string | null
}