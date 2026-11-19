import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireSuperAdmin } from '../../../../lib/serverAdmin'

export const dynamic = 'force-dynamic'

function fail(message, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

function userClient(request) {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: request.headers.get('authorization') || '' } },
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export async function POST(request) {
  const admin = await requireSuperAdmin(request)
  if (!admin) return fail('Accès refusé', 403)

  const body = await request.json()

  if (body.action === 'reset_password') {
    if (!body.user_id || !body.password || body.password.length < 8) {
      return fail('Mot de passe : 8 caractères minimum')
    }
    const { error } = await admin.auth.admin.updateUserById(body.user_id, { password: body.password })
    if (error) return fail(error.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'extend') {
    const days = parseInt(body.days, 10)
    if (!body.account_id || !days) return fail('Nombre de jours invalide')
    const { data: a, error: e1 } = await admin
      .from('accounts')
      .select('trial_ends_at, subscription_ends_at')
      .eq('id', body.account_id)
      .single()
    if (e1) return fail(e1.message)
    const ends = [Date.now(), new Date(a.trial_ends_at).getTime()]
    if (a.subscription_ends_at) ends.push(new Date(a.subscription_ends_at).getTime())
    const next = new Date(Math.max(...ends) + days * 86400000).toISOString()
    const { error: e2 } = await admin
      .from('accounts')
      .update({ subscription_ends_at: next })
      .eq('id', body.account_id)
    if (e2) return fail(e2.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'create') {
    const { email, password, full_name, account_name, plan_type, bar_name } = body
    if (!email || !password || password.length < 8 || !account_name || !bar_name) {
      return fail('Champs obligatoires manquants (mot de passe : 8 caractères minimum)')
    }
    const created = await admin.auth.admin.createUser({
      email, password, email_confirm: true,
    })
    if (created.error) return fail(created.error.message)
    const userId = created.data.user.id

    const acc = await admin.from('accounts')
      .insert({ name: account_name, plan_type: plan_type || 1 }).select().single()
    if (acc.error) {
      await admin.auth.admin.deleteUser(userId)
      return fail(acc.error.message)
    }
    const prof = await admin.from('profiles').insert({
      id: userId, email, full_name: full_name || null, role: 'admin', account_id: acc.data.id,
    })
    const bar = prof.error ? null : await admin.from('bars')
      .insert({ account_id: acc.data.id, name: bar_name })
    const err = prof.error || (bar && bar.error)
    if (err) {
      await admin.from('accounts').delete().eq('id', acc.data.id)
      await admin.auth.admin.deleteUser(userId)
      return fail(err.message)
    }
    return NextResponse.json({ ok: true, account_id: acc.data.id })
  }

  if (body.action === 'impersonate') {
    if (!body.user_id) return fail('Compte introuvable')
    const { data: target, error: e1 } = await admin
      .from('profiles').select('id, email, account_id, role, is_active').eq('id', body.user_id).single()
    if (e1 || !target) return fail('Compte introuvable')
    if (target.role !== 'admin') return fail('Seul un compte administrateur peut être ouvert')
    if (!target.is_active) return fail('Ce compte est désactivé')
    const { data: link, error: e2 } = await admin.auth.admin.generateLink({ type: 'magiclink', email: target.email })
    if (e2) return fail(e2.message)
    const hashed = link && link.properties && link.properties.hashed_token
    if (!hashed) return fail('Lien de connexion indisponible')
    const { error: e3 } = await userClient(request).rpc('log_support_access', { p_account: target.account_id, p_target: target.email })
    if (e3) return fail(e3.message)
    return NextResponse.json({ ok: true, token_hash: hashed })
  }

  return fail('Action inconnue')
}
