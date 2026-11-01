import { createClient } from '@supabase/supabase-js'

export function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SECRET_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )
}

export async function requireSuperAdmin(request) {
  const auth = request.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!token) return null
  const admin = adminClient()
  const { data: userData } = await admin.auth.getUser(token)
  const user = userData && userData.user
  if (!user) return null
  const { data: profile } = await admin
    .from('profiles').select('role').eq('id', user.id).single()
  if (!profile || profile.role !== 'super_admin') return null
  return admin
}
