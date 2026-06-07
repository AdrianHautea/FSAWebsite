import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { uploadToS3 } from '@/utils/s3'
import { NextResponse } from 'next/server'

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

type RouteContext = { params: Promise<{ id: string }> }

async function requireOfficer() {
  const supabase = await createUserClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

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
    return NextResponse.json({ error: 'File too large. Maximum size is 5 MB.' }, { status: 400 })
  }

  // derive extension from mime type for a consistent key
  const extMap: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
  const ext = extMap[file.type] ?? 'jpg'
  const key = `covers/events/${id}.${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())

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
