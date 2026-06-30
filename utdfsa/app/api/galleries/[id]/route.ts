// ── route.ts ─────────────────────────────────────────────
// DELETE /api/galleries/[id] — hard-delete a gallery by id
// PATCH  /api/galleries/[id] — update gallery fields (officer/admin only)
//
// data:  galleries, members (role check)
// notes: restricted to officer and admin roles.
//        cover photo is optional on PATCH — omitting it keeps the existing one.
import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { uploadToS3 } from '@/utils/s3'
import { imageMagicBytesMatch } from '@/utils/validate-image'
import { NextResponse } from 'next/server'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_GOOGLE_PHOTOS_HOSTS = ['photos.google.com', 'photos.app.goo.gl']
const MIME_EXT: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' }
const MAX_COVER_BYTES = 20 * 1024 * 1024

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .single()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await admin
    .from('galleries')
    .delete()
    .eq('id', id)

  if (error) {
    console.error('[galleries] delete error:', error)
    return NextResponse.json({ error: 'Failed to delete gallery' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const supabase = await createUserClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: member } = await admin
    .from('members')
    .select('role')
    .eq('email', user.email!)
    .single()

  if (!member || (member.role !== 'officer' && member.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const formData = await req.formData()
  const title = (formData.get('title') as string | null)?.trim()
  const google_photos_url = (formData.get('google_photos_url') as string | null)?.trim() || null
  const description = (formData.get('description') as string | null)?.trim() || null
  const semester = (formData.get('semester') as string | null)?.trim() || null
  const yearRaw = (formData.get('year') as string | null)?.trim()
  const year = yearRaw ? Number(yearRaw) : null
  const isPublishedRaw = formData.get('is_published') as string | null
  const coverFile = formData.get('cover') as File | null

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (title.length > 200) {
    return NextResponse.json({ error: 'Title must be 200 characters or fewer' }, { status: 400 })
  }
  if (description && description.length > 1000) {
    return NextResponse.json({ error: 'Description must be 1000 characters or fewer' }, { status: 400 })
  }
  if (semester !== null && !['Fall', 'Spring', 'Summer'].includes(semester)) {
    return NextResponse.json({ error: 'Semester must be Fall, Spring, or Summer' }, { status: 400 })
  }
  if (year !== null && (!Number.isInteger(year) || year < 2000 || year > 2050)) {
    return NextResponse.json({ error: 'Year must be between 2000 and 2050' }, { status: 400 })
  }
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

  const updates: Record<string, unknown> = {
    title,
    google_photos_url,
    description,
    semester: semester || null,
    year: yearRaw ? year : null,
    ...(isPublishedRaw !== null ? { is_published: isPublishedRaw === 'true' } : {}),
  }

  if (coverFile && coverFile.size > 0) {
    if (coverFile.size > MAX_COVER_BYTES) {
      return NextResponse.json({ error: 'Image must be under 20MB.' }, { status: 400 })
    }
    if (!ALLOWED_IMAGE_TYPES.includes(coverFile.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, WEBP, and GIF images are accepted.' },
        { status: 400 }
      )
    }
    const ext = MIME_EXT[coverFile.type] ?? 'jpg'
    const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const buffer = Buffer.from(await coverFile.arrayBuffer())

    if (!imageMagicBytesMatch(coverFile.type, buffer)) {
      return NextResponse.json({ error: 'File content does not match declared image type.' }, { status: 400 })
    }

    let publicUrl: string
    try {
      publicUrl = await uploadToS3(key, buffer, coverFile.type)
    } catch (err) {
      console.error('[galleries] S3 upload error:', err)
      return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
    }
    updates.cover_photo_url = publicUrl
  }

  const { data: gallery, error: updateError } = await admin
    .from('galleries')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateError) {
    console.error('[galleries] update error:', updateError)
    return NextResponse.json({ error: 'Failed to update gallery' }, { status: 500 })
  }

  return NextResponse.json({ gallery })
}
