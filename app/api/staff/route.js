import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAdmin } from '../../../lib/serverAdmin'

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

async function limitError(admin, accountId, role) {
  const { data: acc } = await admin.from('accounts').select('plan_type').eq('id', accountId).single()
  const { data: plan } = await admin
    .from('plans').select('max_servers, max_accountants').eq('type', acc.plan_type).single()
  const max = role === 'server' ? plan.max_servers : plan.max_accountants
  if (max === null) return null
  if (max === 0) return 'Votre type d’abonnement n’autorise pas ce rôle'
  const { count } = await admin
    .from('profiles')
    .select('id', { count: 'exact', head: true })
    .eq('account_id', accountId)
    .eq('role', role)
    .eq('is_active', true)
  if (count >= max) return 'Limite atteinte pour votre type d’abonnement (' + max + ')'
  return null
}

async function pickBar(admin, accountId, wanted) {
  const { data: bars } = await admin.from('bars').select('id').eq('account_id', accountId).eq('is_active', true)
  const list = bars || []
  if (wanted) {
    if (!list.some((b) => b.id === wanted)) return { error: 'Bar introuvable' }
    return { barId: wanted }
  }
  if (list.length > 1) return { error: 'Choisissez le bar du serveur' }
  return { barId: list.length === 1 ? list[0].id : null }
}

async function loadStaff(admin, accountId, userId) {
  const { data } = await admin
    .from('profiles').select('id, role, is_active, email, deleted_at').eq('id', userId).eq('account_id', accountId).single()
  if (!data || data.deleted_at || !['server', 'accountant'].includes(data.role)) return null
  return data
}

export async function POST(request) {
  const ctx = await requireAdmin(request)
  if (!ctx) return fail('Accès refusé', 403)
  const { admin, profile } = ctx
  const body = await request.json()

  if (body.action === 'create') {
    const { email, password, full_name, role } = body
    if (!email || !password || password.length < 8 || !full_name || !['server', 'accountant'].includes(role)) {
      return fail('Champs obligatoires manquants (mot de passe : 8 caractères minimum)')
    }
    const { data: ok } = await admin.rpc('account_is_active', { acc: profile.account_id })
    if (!ok) return fail('Accès verrouillé : abonnement terminé ou suspendu')
    const lim = await limitError(admin, profile.account_id, role)
    if (lim) return fail(lim)
    let barId = null
    if (role === 'server') {
      const pick = await pickBar(admin, profile.account_id, body.bar_id)
      if (pick.error) return fail(pick.error)
      barId = pick.barId
    }
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error) return fail(created.error.message)
    const ins = await admin.from('profiles').insert({
      id: created.data.user.id, email, full_name, role, account_id: profile.account_id, bar_id: barId,
    })
    if (ins.error) {
      await admin.auth.admin.deleteUser(created.data.user.id)
      return fail(ins.error.message)
    }
    return NextResponse.json({ ok: true })
  }

  const target = await loadStaff(admin, profile.account_id, body.user_id)
  if (!target) return fail('Employé introuvable')

  if (body.action === 'reset_password') {
    if (!body.password || body.password.length < 8) return fail('Mot de passe : 8 caractères minimum')
    const { error } = await admin.auth.admin.updateUserById(target.id, { password: body.password })
    if (error) return fail(error.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'set_active') {
    const active = !!body.active
    if (active) {
      const lim = await limitError(admin, profile.account_id, target.role)
      if (lim) return fail(lim)
    }
    const { error } = await admin.from('profiles').update({ is_active: active }).eq('id', target.id)
    if (error) return fail(error.message)
    await admin.auth.admin.updateUserById(target.id, { ban_duration: active ? 'none' : '876000h' })
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'set_bar') {
    if (target.role !== 'server') return fail('Seuls les serveurs peuvent être affectés à un bar')
    let barId = null
    if (body.bar_id) {
      const pick = await pickBar(admin, profile.account_id, body.bar_id)
      if (pick.error) return fail(pick.error)
      barId = pick.barId
    }
    const { error } = await admin.from('profiles').update({ bar_id: barId }).eq('id', target.id)
    if (error) return fail(error.message)
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'update') {
    const fullName = String(body.full_name || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    if (!fullName || fullName.length > 80) return fail('Nom invalide')
    if (!/^\S+@\S+\.\S+$/.test(email)) return fail('Identifiant e-mail invalide')
    let barId = null
    if (target.role === 'server' && body.bar_id) {
      const pick = await pickBar(admin, profile.account_id, body.bar_id)
      if (pick.error) return fail(pick.error)
      barId = pick.barId
    }
    const emailChanged = email !== String(target.email).toLowerCase()
    if (emailChanged) {
      const pattern = email.replace(/[\\%_]/g, (c) => '\\' + c)
      const { data: dup } = await admin.from('profiles').select('id').ilike('email', pattern).neq('id', target.id).limit(1)
      if (dup && dup.length) return fail('Cet identifiant est déjà utilisé')
      const { error } = await admin.auth.admin.updateUserById(target.id, { email, email_confirm: true })
      if (error) return fail(error.message)
    }
    const { error: e2 } = await userClient(request).rpc('staff_update', { p_user: target.id, p_name: fullName, p_email: email, p_bar: barId })
    if (e2) {
      if (emailChanged) await admin.auth.admin.updateUserById(target.id, { email: target.email, email_confirm: true })
      return fail(e2.message)
    }
    return NextResponse.json({ ok: true })
  }

  if (body.action === 'delete') {
    const reason = String(body.reason || '').trim()
    if (!reason) return fail('Motif obligatoire')
    const { error } = await userClient(request).rpc('staff_delete', { p_user: target.id, p_reason: reason })
    if (error) return fail(error.message)
    await admin.auth.admin.updateUserById(target.id, { ban_duration: '876000h' })
    return NextResponse.json({ ok: true })
  }

  return fail('Action inconnue')
}
