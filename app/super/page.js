'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

const EMPTY = { email: '', password: '', full_name: '', account_name: '', bar_name: '', plan_type: 1 }

function daysLeft(a) {
  const ends = [new Date(a.trial_ends_at).getTime()]
  if (a.subscription_ends_at) ends.push(new Date(a.subscription_ends_at).getTime())
  const exp = Math.max(...ends) + a.grace_days * 86400000
  return Math.ceil((exp - Date.now()) / 86400000)
}

export default function SuperAdmin() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [accounts, setAccounts] = useState([])
  const [form, setForm] = useState(EMPTY)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function call(payload) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/super/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erreur')
    return json
  }

  async function load() {
    const { data, error } = await supabase
      .from('accounts')
      .select('*, bars(id, name), profiles(id, email, full_name)')
      .order('created_at', { ascending: false })
    if (error) setErr(error.message)
    else setAccounts(data)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (!p || p.role !== 'super_admin') {
        router.push('/dashboard')
        return
      }
      setReady(true)
      load()
    }
    init()
  }, [router])

  async function run(fn, okText) {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await fn()
      setMsg(okText)
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  function create(e) {
    e.preventDefault()
    run(async () => {
      await call({ action: 'create', ...form, plan_type: Number(form.plan_type) })
      setForm(EMPTY)
    }, 'Compte créé')
  }

  function extend(a) {
    const v = window.prompt('Nombre de jours à ajouter à ' + a.name + ' :', '30')
    if (!v) return
    run(() => call({ action: 'extend', account_id: a.id, days: v }), 'Abonnement prolongé')
  }

  function toggleStatus(a) {
    const next = a.status === 'active' ? 'suspended' : 'active'
    run(async () => {
      const { error } = await supabase.from('accounts').update({ status: next }).eq('id', a.id)
      if (error) throw new Error(error.message)
    }, next === 'suspended' ? 'Compte suspendu' : 'Compte réactivé')
  }

  function changePlan(a, plan) {
    run(async () => {
      const { error } = await supabase.from('accounts').update({ plan_type: Number(plan) }).eq('id', a.id)
      if (error) throw new Error(error.message)
    }, 'Type modifié')
  }

  function addBar(a) {
    const v = window.prompt('Nom du nouveau bar pour ' + a.name + ' :')
    if (!v) return
    run(async () => {
      const { error } = await supabase.from('bars').insert({ account_id: a.id, name: v })
      if (error) throw new Error('Limite du type atteinte ou erreur : ' + error.message)
    }, 'Bar ajouté')
  }

  function resetPassword(owner) {
    const v = window.prompt('Nouveau mot de passe pour ' + owner.email + ' (8 caractères minimum) :')
    if (!v) return
    run(() => call({ action: 'reset_password', user_id: owner.id, password: v }), 'Mot de passe modifié')
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  function field(label, key, type = 'text') {
    return (
      <div className="field">
        <label>{label}</label>
        <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required={key !== 'full_name'} />
      </div>
    )
  }

  if (!ready) return <div className="container">Chargement...</div>

  return (
    <div className="container">
      <div className="card">
        <h1>Espace Super Admin</h1>
        {msg && <div className="ok-msg">{msg}</div>}
        {err && <div className="error-msg">{err}</div>}
        <form onSubmit={create}>
          {field('Nom du gérant', 'full_name')}
          {field('E-mail de connexion', 'email', 'email')}
          {field('Mot de passe (8 caractères minimum)', 'password')}
          {field('Nom du compte (établissement)', 'account_name')}
          {field('Nom du premier bar', 'bar_name')}
          <div className="field">
            <label>Type d'abonnement</label>
            <select value={form.plan_type} onChange={(e) => setForm({ ...form, plan_type: e.target.value })}>
              <option value="1">Type 1 : 1 bar, 2 serveuses</option>
              <option value="2">Type 2 : 1 bar, 5 serveuses</option>
              <option value="3">Type 3 : 1 bar, comptable, serveuses illimitées</option>
              <option value="4">Type 4 : plusieurs bars</option>
            </select>
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>Créer le compte (essai 15 jours)</button>
        </form>
      </div>

      {accounts.map((a) => {
        const owner = (a.profiles || [])[0]
        const left = daysLeft(a)
        return (
          <div className="card" key={a.id} style={{ marginTop: 16 }}>
            <h1>{a.name}</h1>
            <p style={{ margin: '0 0 8px' }}>
              {owner ? owner.email : '-'} · Type {a.plan_type}{' '}
              <span className={'badge ' + (a.status === 'suspended' ? 'badge-err' : left > 0 ? 'badge-ok' : 'badge-warn')}>
                {a.status === 'suspended' ? 'Suspendu' : left > 0 ? left + ' j restants' : 'Expiré'}
              </span>
            </p>
            <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
              Bars : {(a.bars || []).map((b) => b.name).join(', ') || '-'}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-outline" disabled={busy} onClick={() => extend(a)}>Prolonger</button>
              <button className="btn-outline" disabled={busy} onClick={() => addBar(a)}>+ Bar</button>
              <button className="btn-outline" disabled={busy || !owner} onClick={() => resetPassword(owner)}>Mot de passe</button>
              <select className="btn-outline" disabled={busy} value={a.plan_type} onChange={(e) => changePlan(a, e.target.value)}>
                <option value="1">Type 1</option>
                <option value="2">Type 2</option>
                <option value="3">Type 3</option>
                <option value="4">Type 4</option>
              </select>
              <button className="btn-danger" disabled={busy} onClick={() => toggleStatus(a)}>
                {a.status === 'active' ? 'Suspendre' : 'Réactiver'}
              </button>
            </div>
          </div>
        )
      })}

      <button className="btn-outline" style={{ marginTop: 16 }} onClick={logout}>Déconnexion</button>
    </div>
  )
}
