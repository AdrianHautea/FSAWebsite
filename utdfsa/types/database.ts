export type MembershipStatus = 'pending' | 'active' | 'expired'
export type UserRole = 'member' | 'officer' | 'admin'
export type PaymentStatus = 'pending' | 'paid' | 'failed'
export type PaymentProvider = 'stripe' | 'paypal' | 'venmo' | 'zelle' | 'cash'

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
  pamilya: string | null
  payment_provider: PaymentProvider | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
  payment_method: string | null
  payment_metadata: Record<string, unknown> | null
  stripe_customer_id: string | null
  avatar_url: string | null
  onboarding_complete: boolean
  contact_email: string | null
  member_type: 'ading' | 'kuyate' | 'not_interested' | null
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
  attend_qr_token?: string | null
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
  cover_photo_url: string | null
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

// static decoration/website photos — managed directly, not officer-created
export interface Photo {
  id: string
  event_id: string | null
  created_at: string
  s3_key: string
  caption: string | null
  sort_order: number | null
  uploaded_at: string
}

// officer-created archive galleries shown on /archives
export interface Gallery {
  id: string
  created_at: string
  title: string
  description: string | null
  cover_photo_url: string
  google_photos_url: string | null
  event_id: string | null
  semester: string | null
  year: number | null
  created_by: string
  is_published: boolean
}

// represents a single row in the settings table
export interface Setting {
  key: string
  value: string
  description: string | null
  updated_at: string
}

// typed shape of what getSettings() returns — use this in components
export interface AppSettings {
  membershipPriceCents: number
  earlyBirdPriceCents: number
  earlyBirdDeadline: Date
  membershipYear: string
}

export interface GoodphilEligibility {
  id: string
  first_name: string
  last_name: string
  email: string
  phone: string | null
  pamilya: string | null
  points: number | null
  dues_paid: boolean
  attended_risk_mgmt: boolean
  total_meetings_attended: number
  meets_points_requirement: boolean
  automated_requirements_met: boolean
}