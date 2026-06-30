// ── route.ts ─────────────────────────────────────────────
// POST /api/officer/events/[id]/cover — upload or replace an event cover photo
//
// data:  events (cover_photo_url field)
// deps:  s3 (cover photo upload)
// notes: key is deterministic per event id (overwriting on re-upload);
//        officer/admin only
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { uploadToS3 } from '@/utils/s3'
import { imageMagicBytesMatch } from '@/utils/validate-image'
import { NextResponse } from 'next/server'

// accepted mime types for event cover photos
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 20 * 1024 * 1024 // 20 MB

type RouteContext = { params: Promise<{ id: string }> }

// ── auth guard ───────────────────────────────────────────
// returns null if unauthenticated or caller is not officer/admin
async function requireOfficer() {
  // respects rls — user client; only returns a user if a valid session exists
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // bypass rls — admin client needed to read role from members table
  const admin = createAdminClient()
  const { data: member } = await admin
    .from('members')
    .select('id, role')
    .eq('email', user.email!)
    .maybeSingle()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) return null
  return { admin }
}

export async function POST(req: Request, { params }: RouteContext) {
  const ctx = await requireOfficer()
  if (!ctx) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params

  // reject before reading body if Content-Length already exceeds limit
  const contentLength = Number(req.headers.get('content-length') ?? 0)
  if (contentLength > MAX_SIZE_BYTES + 65536) {
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file || file.size === 0) {
    return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
  }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPEG, PNG, and WebP images are accepted.' },
      { status: 400 }
    )
  }

  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 20 MB.' }, { status: 400 })
  }

  // derive extension from mime type for a consistent key
  const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const ext = extMap[file.type] ?? 'jpg'
  const key = `covers/events/${id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

  if (!imageMagicBytesMatch(file.type, buffer)) {
    return NextResponse.json({ error: 'File content does not match declared image type.' }, { status: 400 })
  }

  let publicUrl: string
  try {
    publicUrl = await uploadToS3(key, buffer, file.type)
  } catch (err) {
    console.error('[events/[id]/cover] S3 upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  const { error: dbError } = await ctx.admin
    .from('events')
    .update({ cover_photo_url: publicUrl })
    .eq('id', id)

  if (dbError) {
    console.error('[events/[id]/cover] db update error:', dbError)
    return NextResponse.json({ error: 'Failed to save cover photo.' }, { status: 500 })
  }

  return NextResponse.json({ url: publicUrl })
}
