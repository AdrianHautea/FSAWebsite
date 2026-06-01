import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { uploadToS3 } from '@/utils/s3'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function GET() {
  const admin = createAdminClient()

  const { data: galleries, error } = await admin
    .from('galleries')
    .select('*')
    .eq('is_published', true)
    .order('year', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
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

  if (!title) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 })
  }
  if (!coverFile || coverFile.size === 0) {
    return NextResponse.json({ error: 'Cover photo is required' }, { status: 400 })
  }

  const ext = coverFile.name.split('.').pop() ?? 'jpg'
  const key = `covers/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
  const buffer = Buffer.from(await coverFile.arrayBuffer())

  let publicUrl: string
  try {
    publicUrl = await uploadToS3(key, buffer, coverFile.type)
  } catch (err) {
    console.error('S3 upload error:', err)
    return NextResponse.json({ error: `Upload failed: ${String(err)}` }, { status: 500 })
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
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }

  return NextResponse.json(gallery, { status: 201 })
}
