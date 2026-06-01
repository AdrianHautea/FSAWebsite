import { createUserClient, createAdminClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'

const client = new google.auth.OAuth2(
    process.env.NEXT_CLIENT_ID,
    process.env.NEXT_CLIENT_SECRET
)

client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

