import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { uploadToS3 } from '@/utils/s3'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const ALLOWED_GOOGLE_PHOTOS_HOSTS = ['photos.google.com', 'photos.app.goo.gl']

// public endpoint — use user client so RLS policies apply
export async function GET() {
  const supabase = await createUserClient()

  const { data: galleries, error } = await supabase
    .from('galleries')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error('[galleries] fetch error:', error)
    return NextResponse.json({ error: 'Failed to load galleries' }, { status: 500 })
  }

  return NextResponse.json(galleries ?? [])
}

export async function POST(request: NextRequest) {
  const supabase = await createUserClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: member, error: memberError } = await admin
    .from('members')
    .select('id, role')
    .eq('email', user.email!)
    .single()

  if (memberError || !member) {
    return NextResponse.json({ error: 'Member not found' }, { status: 404 })
  }

  const isOfficer = member.role === 'officer' || member.role === 'admin'
  if (!isOfficer) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  const ext = coverFile.name.split('.').pop() ?? 'jpg'
  const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await coverFile.arrayBuffer())

  let publicUrl: string
  try {
    publicUrl = await uploadToS3(key, buffer, coverFile.type)
  } catch (err) {
    console.error('[galleries] S3 upload error:', err)
    return NextResponse.json({ error: 'Upload failed. Please try again.' }, { status: 500 })
  }

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
