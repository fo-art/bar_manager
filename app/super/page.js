'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import AskBox from '../components/askbox'

const EMPTY = { email: '', password: '', full_name: '', account_name: '', bar_name: '', plan_type: 1, business_type: 'bar' }

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
  const [delBar, setDelBar] = useState(null)
  const [delAccount, setDelAccount] = useState(null)
  const [delBarErr, setDelBarErr] = useState('')
  const [delAccountErr, setDelAccountErr] = useState('')

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

  async function confirmDeleteBar(bar, typed) {
    setBusy(true)
    setDelBarErr('')
    try {
      const { data: ls } = await supabase.from('listings').select('photos').eq('bar_id', bar.id)
      const photos = (ls || []).flatMap((l) => l.photos || [])
      if (photos.length) await supabase.storage.from('listings').remove(photos)
      const { error } = await supabase.rpc('super_delete_bar', { p_bar: bar.id, p_confirm_name: typed })
      if (error) throw new Error(error.message)
      setDelBar(null)
      await load()
    } catch (e) {
      setDelBarErr(e.message)
    }
    setBusy(false)
  }

  async function confirmDeleteAccount(a, typed) {
    setBusy(true)
    setDelAccountErr('')
    try {
      await call({ action: 'delete_account', account_id: a.id, confirm_name: typed })
      setDelAccount(null)
      await load()
    } catch (e) {
      setDelAccountErr(e.message)
    }
    setBusy(false)
  }

  function resetPassword(owner) {
    const v = window.prompt('Nouveau mot de passe pour ' + owner.email + ' (8 caractères minimum) :')
    if (!v) return
    run(() => call({ action: 'reset_password', user_id: owner.id, password: v }), 'Mot de passe modifié')
  }

  async function openAccount(owner) {
    if (!owner) return
    if (!window.confirm('Ouvrir le compte de ' + (owner.full_name || owner.email) + ' ?')) return
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      const json = await call({ action: 'impersonate', user_id: owner.id })
      const { data: { session } } = await supabase.auth.getSession()
      sessionStorage.setItem('superSession', JSON.stringify({ access_token: session.access_token, refresh_token: session.refresh_token }))
      const { error } = await supabase.auth.verifyOtp({ token_hash: json.token_hash, type: 'magiclink' })
      if (error) throw new Error(error.message)
      router.push('/dashboard')
    } catch (e) {
      setErr(e.message)
      setBusy(false)
    }
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
                    {field('Mot de passe (8 caractères minimum)', 'password', 'password')}
          {field('Nom du compte (établissement)', 'account_name')}
          <div className="field">
            <label>Type d'établissement</label>
            <select value={form.business_type} onChange={(e) => setForm({ ...form, business_type: e.target.value })}>
              <option value="bar">Bar</option>
              <option value="shop">Boutique / commerce</option>
            </select>
          </div>
          {field(form.business_type === 'shop' ? 'Nom de la première boutique' : 'Nom du premier bar', 'bar_name')}
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
              {owner ? owner.email : '-'} · Type {a.plan_type} ·{' '}
              <span className="badge">{a.business_type === 'shop' ? 'Boutique' : 'Bar'}</span>{' '}
              <span className={'badge ' + (a.status === 'suspended' ? 'badge-err' : left > 0 ? 'badge-ok' : 'badge-warn')}>
                {a.status === 'suspended' ? 'Suspendu' : left > 0 ? left + ' j restants' : 'Expiré'}
              </span>
            </p>
            <div style={{ margin: '0 0 12px' }}>
              <div style={{ color: 'var(--muted)', fontSize: 14, marginBottom: 4 }}>Bars :</div>
              {(a.bars || []).length === 0 && <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>-</p>}
              {(a.bars || []).map((b) => (
                <div key={b.id}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '4px 0' }}>
                    <span style={{ fontSize: 14 }}>{b.name}</span>
                    <button className="btn-danger" style={{ marginTop: 0, padding: '4px 10px', fontSize: 13 }} disabled={busy} onClick={() => { setDelBarErr(''); setDelBar(delBar && delBar.id === b.id ? null : b) }}>Supprimer</button>
                  </div>
                  {delBar && delBar.id === b.id && (
                    <>
                      {delBarErr && <div className="error-msg">{delBarErr}</div>}
                      <AskBox
                        label={'Tape exactement « ' + b.name + ' » pour confirmer la suppression définitive (ventes, stock et historique inclus) :'}
                        submitText="Supprimer définitivement"
                        cancelText="Annuler"
                        busy={busy}
                        onSubmit={(v) => confirmDeleteBar(b, v)}
                        onCancel={() => { setDelBar(null); setDelBarErr('') }}
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn-outline" disabled={busy || !owner} onClick={() => openAccount(owner)}>Ouvrir</button>
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
              <button className="btn-danger" disabled={busy} onClick={() => { setDelAccountErr(''); setDelAccount(delAccount && delAccount.id === a.id ? null : a) }}>Supprimer le compte</button>
            </div>
            {delAccount && delAccount.id === a.id && (
              <>
                {delAccountErr && <div className="error-msg">{delAccountErr}</div>}
                <AskBox
                  label={'Tape exactement « ' + a.name + ' » pour confirmer la suppression définitive de tout le compte (bars, ventes, stock, équipe) :'}
                  submitText="Supprimer définitivement"
                  cancelText="Annuler"
                  busy={busy}
                  onSubmit={(v) => confirmDeleteAccount(a, v)}
                  onCancel={() => { setDelAccount(null); setDelAccountErr('') }}
                />
              </>
            )}
          </div>
        )
      })}

      <button className="btn-outline" style={{ marginTop: 16 }} onClick={logout}>Déconnexion</button>
    </div>
  )
}
