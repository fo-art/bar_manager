import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { adminClient } from '../../../lib/serverAdmin'

export const dynamic = 'force-dynamic'

const MAX_FAILS = 10
const LOCK_MINUTES = 15

export async function POST(request) {
  const body = await request.json()
  const email = String(body.email || '').trim().toLowerCase()
  const password = String(body.password || '')
  if (!email || !password) return NextResponse.json({ error: 'invalid' }, { status: 400 })

  const admin = adminClient()
  const { data: row } = await admin.from('login_attempts').select('*').eq('email', email).maybeSingle()
  const now = Date.now()
  const lockedUntil = row && row.locked_until ? new Date(row.locked_until).getTime() : 0
  if (lockedUntil > now) {
    return NextResponse.json({ error: 'locked', minutes: Math.ceil((lockedUntil - now) / 60000) }, { status: 429 })
  }

  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const { data, error } = await anon.auth.signInWithPassword({ email, password })

  if (error || !data.session) {
    const count = (lockedUntil > 0 ? 0 : row ? row.failed_count : 0) + 1
    const lock = count >= MAX_FAILS
    await admin.from('login_attempts').upsert({
      email,
      failed_count: lock ? 0 : count,
      locked_until: lock ? new Date(now + LOCK_MINUTES * 60000).toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    if (lock) return NextResponse.json({ error: 'locked', minutes: LOCK_MINUTES }, { status: 429 })
    return NextResponse.json({ error: 'invalid', remaining: MAX_FAILS - count }, { status: 401 })
  }

  if (row) await admin.from('login_attempts').delete().eq('email', email)
  return NextResponse.json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token })
}
