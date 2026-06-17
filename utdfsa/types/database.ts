// ── types/database.ts ─────────────────────────────────────
// typescript types mirroring the supabase database schema;
// used across server components, api routes, and client hooks.
//
// data:  members, events, event_registrations, registration_tickets,
//        attendance, photos, galleries, settings
// notes: keep in sync with supabase migrations; nullable fields
//        reflect columns that allow null in the db

// ── union types ───────────────────────────────────────────

// membership lifecycle: pending → active → expired
export type MembershipStatus = 'pending' | 'active' | 'expired'
// access tiers: member (base), officer (club staff), admin (full access)
export type UserRole = 'member' | 'officer' | 'admin'
// stripe/manual payment lifecycle
export type PaymentStatus = 'pending' | 'paid' | 'failed'
// all accepted payment methods — stripe is processed automatically; others are manual
export type PaymentProvider = 'stripe' | 'paypal' | 'venmo' | 'zelle' | 'cash'

// ── member ────────────────────────────────────────────────

// a registered UTD FSA member; one row per google account that has signed up
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

// ── event ─────────────────────────────────────────────────

// an org event that members can register for or attend in person
export interface Event {
  id: string
  created_at: string
  name: string
  description: string | null
  event_type: string
  event_date: string
  location: string | null
  // points awarded to members who attend this event
  points: number | null
  // short token embedded in the in-person attendance QR code
  attend_qr_token?: string | null
  attend_qr_open: boolean | null
  attend_qr_expires_at: string | null
  // all prices stored in cents to avoid floating-point issues
  price_cents_members: number
  price_cents_nonmembers: number
  // early-bird pricing; null means no early-bird tier
  eb_price_members: number | null
  eb_price_nonmembers: number | null
  eb_deadline: string | null
  // is_active controls whether the event accepts new registrations
  is_active: boolean
  // is_visible controls whether the event appears on the public events page
  is_visible: boolean
  cover_photo_url: string | null
  registration_closes_at: string | null
}

// ── event registration ────────────────────────────────────

// a ticket purchase; one registration can contain multiple tickets (num_tickets)
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

// ── registration ticket ───────────────────────────────────

// a single ticket within a registration; each ticket has its own unique qr code
export interface RegistrationTicket {
  id: string
  registration_id: string
  created_at: string
  // uuid used as the QR code value; scanned at the door to check in
  qr_code: string
  attendee_fname: string | null
  attendee_lname: string | null
  attendee_email: string | null
  checked_in: boolean
  checked_in_at: string | null
  // member id of the officer who scanned this ticket
  checked_in_by: string | null
}

// ── attendance ────────────────────────────────────────────

// records in-person attendance for a member at a specific event (separate from ticket check-in)
export interface Attendance {
  id: string
  member_id: string | null
  event_id: string | null
  created_at: string
}

// ── photos ────────────────────────────────────────────────

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

// ── gallery ───────────────────────────────────────────────

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

// ── settings ──────────────────────────────────────────────

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

// ── ading application ─────────────────────────────────────

// a submitted ading (new member) application row
export interface AdingApplication {
  id: string
  member_id: string
  submitted_at: string
  status: 'pending' | 'accepted' | 'rejected'
  instagram: string | null
  phone: string | null
  birthday: string | null
  pronouns: string | null
  activity_level: number | null
  hobbies: string | null
  fave_music_genre: string | null
  fave_artist: string | null
  fave_food: string | null
  pam_vibe: string | null
  hangout_size_preference: number | null
  fave_tv_show_movie: string | null
  availability: { days: string[]; times: string } | null
  thoughts_on_drinking: string | null
  dislikes: string | null
  pam_dealbreakers: string | null
  pam_incompatibilities: string | null
  future_kuyate: string | null
  mbti: string | null
  additional_notes: string | null
}

// ── goodphil eligibility ──────────────────────────────────

// computed eligibility view used on the officer goodphil dashboard
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