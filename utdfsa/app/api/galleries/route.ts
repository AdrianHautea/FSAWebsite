// ── route.ts ─────────────────────────────────────────────
// GET  /api/galleries — list published galleries (public)
// POST /api/galleries — create a gallery with a cover photo (officer/admin only)
//
// data:  galleries, members (role check)
// deps:  s3 (cover photo upload)
// notes: cover image is uploaded to S3 before the db row is written;
//        google photos url is validated against an allowlist of trusted hosts
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { uploadToS3 } from '@/utils/s3'
import { imageMagicBytesMatch } from '@/utils/validate-image'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// accepted mime types for the cover photo upload
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
// derive extension from MIME type — never trust the user-supplied filename extension
const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
// only official google photos domains are accepted to prevent open-redirect abuse
const ALLOWED_GOOGLE_PHOTOS_HOSTS = ['photos.google.com', 'photos.app.goo.gl']

// ── GET ───────────────────────────────────────────────────
// public endpoint — use user client so RLS policies apply
export async function GET() {
  const supabase = await createUserClient()

  // respects rls — only returns published galleries visible to everyone
  // explicit columns: excludes created_by (officer uuid) from the public response
  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('id, title, cover_photo_url, google_photos_url, description, semester, year, is_published, created_at')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[galleries] fetch error:', error)
    return NextResponse.json({ error: 'Failed to load galleries' }, { status: 500 })
  }

  return NextResponse.json(galleries ?? [], {
    headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400' },
  })
}

// ── POST ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // ── auth check ───────────────────────────────────────────
  // returns 401 if no valid session
  const supabase = await createUserClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // bypass rls — needed to read role from members table before the caller is
  // verified as officer/admin; read-only, scoped to the caller's own email
  const admin = createAdminClient()

  // fetch the caller's id and role from the members table; used for role check and created_by
  const { data: member, error: memberError } = await admin
    .from('members')
    .select('id, role')
    .eq('email', user.email!)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  // only officers and admins may create galleries
  const isOfficer = member.role === 'officer' || member.role === 'admin'
  if (!isOfficer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // reject before reading body if Content-Length already exceeds limit
  const contentLength = Number(request.headers.get('content-length') ?? 0)
  if (contentLength > 20 * 1024 * 1024 + 65536) { // 20MB + form field overhead
    return NextResponse.json({ error: 'Request too large.' }, { status: 413 })
  }

  const formData = await request.formData()
  const title = (formData.get('title') as string | null)?.trim()
  const google_photos_url = (formData.get('google_photos_url') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null
  const semester = (formData.get('semester') as string | null)?.trim() || null
  const yearRaw = (formData.get('year') as string | null)?.trim()
  const year = yearRaw ? Number(yearRaw) : null
  const coverFile = formData.get('cover') as File | null

  // title required, max 200 chars
  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'Title must be 200 characters or fewer' }, { status: 400 })
  }

  // description max 1000 chars
  if (description && description.length > 1000) {
    return NextResponse.json({ error: 'Description must be 1000 characters or fewer' }, { status: 400 })
  }

  // semester enum
  if (semester !== null && !['Fall', 'Spring', 'Summer'].includes(semester)) {
    return NextResponse.json({ error: 'Semester must be Fall, Spring, or Summer' }, { status: 400 })
  }

  // year bounds
  if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2050)) {
    return NextResponse.json({ error: 'Year must be between 2000 and 2050' }, { status: 400 })
  }

  // google photos url — must start with https:// and match allowed domains
  if (google_photos_url !== null) {
    let parsedUrl: URL
    try {
      parsedUrl = new URL(google_photos_url)
    } catch {
      return NextResponse.json({ error: 'Invalid Google Photos URL' }, { status: 400 })
    }
    if (
      parsedUrl.protocol !== 'https:' ||
      !ALLOWED_GOOGLE_PHOTOS_HOSTS.includes(parsedUrl.hostname)
    ) {
      return NextResponse.json(
        { error: 'Google Photos URL must be from photos.google.com or photos.app.goo.gl' },
        { status: 400 }
      )
    }
  }

  if (!coverFile || coverFile.size === 0) {
    return NextResponse.json({ error: 'Cover photo is required' }, { status: 400 })
  }

  if (coverFile.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: 'Image must be under 20MB.' }, { status: 400 })
  }

  // validate cover file type against allowlist
  if (!ALLOWED_IMAGE_TYPES.includes(coverFile.type)) {
    return NextResponse.json(
      { error: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF images are accepted.' },
      { status: 400 }
    )
  }

  // derive extension from MIME type — never trust the user-supplied filename
  const ext = MIME_EXT[coverFile.type] ?? 'jpg'
  // timestamp + random suffix prevents key collisions across concurrent uploads
  const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await coverFile.arrayBuffer())

  if (!imageMagicBytesMatch(coverFile.type, buffer)) {
    console.warn('[security] magic-bytes mismatch on cover upload', { route: '/api/galleries', declaredType: coverFile.type, ts: new Date().toISOString() })
    return NextResponse.json({ error: 'File content does not match declared image type.' }, { status: 400 })
  }

  // upload cover image to s3; returns the public cdn url
  let publicUrl: string
  try {
    publicUrl = await uploadToS3(key, buffer, coverFile.type)
  } catch (err) {
    console.error('[galleries] S3 upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

  // ── db insert ────────────────────────────────────────────
  // bypass rls — officer action; inserts into galleries
  const { data: gallery, error: insertError } = await admin
    .from('galleries')
    .insert({
      title,
      cover_photo_url: publicUrl,
      google_photos_url,
      description,
      semester,
      year,
      created_by: member.id,
      is_published: true,
    })
    .select()
    .single()

  if (insertError) {
    console.error('[galleries] insert error:', insertError)
    return NextResponse.json({ error: 'Failed to create gallery' }, { status: 500 })
  }

  return NextResponse.json(gallery, { status: 201 })
}
