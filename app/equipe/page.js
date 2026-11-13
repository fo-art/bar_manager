'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import AskBox from '../components/askbox'
import { chooseBar } from '../../lib/activebar'

const L = {
  fr: {
    title: 'Équipe',
    add: 'Ajouter un employé',
    name: 'Nom complet',
    email: 'Identifiant e-mail',
    emailHelp: 'Pas besoin d’une vraie adresse : inventez un identifiant du type marie@monbar.com.',
    password: 'Mot de passe (8 caractères minimum)',
    role: 'Rôle',
    role_server: 'Serveur(se)',
    role_accountant: 'Comptable / secrétaire',
    create: 'Créer le compte',
    cancel: 'Annuler',
    resetPwd: 'Mot de passe',
    deactivate: 'Désactiver',
    reactivate: 'Réactiver',
    inactive: 'Désactivé',
    active: 'Actif',
    quota: 'Quota de votre abonnement',
    servers: 'Serveurs',
    accountants: 'Comptables',
    unlimited: 'illimité',
    created: 'Compte créé',
    done: 'Modification enregistrée',
    newPwd: 'Nouveau mot de passe pour',
    confirmOff: 'Désactiver cet employé ? Il ne pourra plus se connecter.',
    empty: 'Aucun employé',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    barLabel: 'Bar',
    allBars: 'Tous les bars',
    edit: 'Modifier',
    editTitle: 'Modifier l’employé',
    save: 'Enregistrer',
    del: 'Supprimer',
    deleted: 'Employé supprimé (archivé)',
    delReason: 'Motif de la suppression de',
    delHelp: 'Le compte est archivé : il ne peut plus se connecter et libère sa place dans votre quota. Son historique (ventes, journal) est conservé.',
  },
  en: {
    title: 'Team',
    add: 'Add an employee',
    name: 'Full name',
    email: 'Email login',
    emailHelp: 'No real address needed: make up a login like marie@mybar.com.',
    password: 'Password (8 characters minimum)',
    role: 'Role',
    role_server: 'Server',
    role_accountant: 'Accountant / secretary',
    create: 'Create account',
    cancel: 'Cancel',
    resetPwd: 'Password',
    deactivate: 'Deactivate',
    reactivate: 'Reactivate',
    inactive: 'Deactivated',
    active: 'Active',
    quota: 'Your plan quota',
    servers: 'Servers',
    accountants: 'Accountants',
    unlimited: 'unlimited',
    created: 'Account created',
    done: 'Change saved',
    newPwd: 'New password for',
    confirmOff: 'Deactivate this employee? They will no longer be able to log in.',
    empty: 'No employees',
    locked: 'Access locked: contact the administrator.',
    barLabel: 'Bar',
    allBars: 'All bars',
    edit: 'Edit',
    editTitle: 'Edit employee',
    save: 'Save',
    del: 'Delete',
    deleted: 'Employee deleted (archived)',
    delReason: 'Reason for deleting',
    delHelp: 'The account is archived: it can no longer log in and frees its slot in your quota. Its history (sales, log) is kept.',
  },
}

const EMPTY = { full_name: '', email: '', password: '', role: 'server', bar_id: '' }

export default function Equipe() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [staff, setStaff] = useState([])
  const [bars, setBars] = useState([])
  const [plan, setPlan] = useState(null)
  const [activeId, setActiveId] = useState('')
  const [panel, setPanel] = useState(null)
  const [edit, setEdit] = useState(null)
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function call(payload) {
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token },
      body: JSON.stringify(payload),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Erreur')
    return json
  }

  async function load() {
    const { data: s } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, is_active, bar_id')
      .in('role', ['server', 'accountant'])
      .is('deleted_at', null)
      .order('created_at')
    setStaff(s || [])
    const { data: b } = await supabase.from('bars').select('id, name').eq('is_active', true).order('created_at')
    setBars(b || [])
    if (b && b.length) setActiveId(chooseBar(b))
    const { data: a } = await supabase.from('accounts').select('plan_type, plans(max_servers, max_accountants)').single()
    setPlan(a ? a.plans : null)
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || p.role !== 'admin') {
        router.push('/dashboard')
        return
      }
      setProfile(p)
      const { data: acc } = await supabase.rpc('my_access')
      if (acc && acc[0] && !acc[0].is_active) setLocked(true)
      load()
    }
    init()
  }, [router])

  async function run(fn, okKey) {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await fn()
      setMsg(tr(okKey))
      await load()
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  function create(e) {
    e.preventDefault()
    run(async () => {
      await call({ action: 'create', ...form, bar_id: form.role === 'server' ? activeId : '' })
      setForm(null)
    }, 'created')
  }

  function resetPwd(s, v) {
    setPanel(null)
    run(() => call({ action: 'reset_password', user_id: s.id, password: v }), 'done')
  }

  function openEdit(s) {
    setEdit({ full_name: s.full_name || '', email: s.email, bar_id: s.bar_id || '' })
    setPanel({ kind: 'edit', id: s.id })
  }

  function saveEdit(e, s) {
    e.preventDefault()
    run(async () => {
      await call({ action: 'update', user_id: s.id, full_name: edit.full_name, email: edit.email, bar_id: edit.bar_id })
      setPanel(null)
    }, 'done')
  }

  function remove(s, reason) {
    run(async () => {
      await call({ action: 'delete', user_id: s.id, reason })
      setPanel(null)
    }, 'deleted')
  }

  function toggle(s) {
    if (s.is_active && !window.confirm(tr('confirmOff'))) return
    run(() => call({ action: 'set_active', user_id: s.id, active: !s.is_active }), 'done')
  }

  function setBar(s, barId) {
    run(() => call({ action: 'set_bar', user_id: s.id, bar_id: barId }), 'done')
  }

  function field(label, key, type = 'text') {
    return (
      <div className="field">
        <label>{label}</label>
        <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
      </div>
    )
  }

  if (!profile) return <div className="container">...</div>

  const count = (role) => staff.filter((s) => s.role === role && s.is_active).length
  const quota = (role, max) => count(role) + ' / ' + (max === null || max === undefined ? tr('unlimited') : max)
  const barName = (id) => (bars.find((b) => b.id === id) || {}).name || tr('allBars')
  const shown = bars.length > 1 ? staff.filter((s) => s.role === 'accountant' || !s.bar_id || s.bar_id === activeId) : staff

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        {plan && (
          <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
            {tr('quota')} : {tr('servers')} {quota('server', plan.max_servers)} · {tr('accountants')} {quota('accountant', plan.max_accountants)}
          </p>
        )}
        {bars.length > 1 && (
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{tr('barLabel')} : <strong>{barName(activeId)}</strong></p>
        )}
        {!form && <button className="btn-primary" disabled={locked} onClick={() => setForm(EMPTY)}>{tr('add')}</button>}
      </div>

      {form && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1>{tr('add')}</h1>
          <form onSubmit={create}>
            {field(tr('name'), 'full_name')}
            {field(tr('email'), 'email', 'email')}
            <p style={{ margin: '-8px 0 14px', color: 'var(--muted)', fontSize: 13 }}>{tr('emailHelp')}</p>
                        {field(tr('password'), 'password', 'password')}
            <div className="field">
              <label>{tr('role')}</label>
              <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="server">{tr('role_server')}</option>
                <option value="accountant">{tr('role_accountant')}</option>
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>{tr('create')}</button>
            <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setForm(null)}>{tr('cancel')}</button>
          </form>
        </div>
      )}

      {shown.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 24 }}>{tr('empty')}</p>}

      {shown.map((s) => (
        <div className="card" key={s.id} style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <strong>{s.full_name || s.email}</strong>
            <span className={'badge ' + (s.is_active ? 'badge-ok' : 'badge-err')}>{s.is_active ? tr('active') : tr('inactive')}</span>
          </div>
          <p style={{ margin: '6px 0 12px', color: 'var(--muted)', fontSize: 14 }}>{s.email} · {tr('role_' + s.role)}{bars.length > 1 && ' · ' + (s.role === 'accountant' || !s.bar_id ? tr('allBars') : barName(s.bar_id))}</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-outline" disabled={busy || locked} onClick={() => openEdit(s)}>{tr('edit')}</button>
            <button className="btn-outline" disabled={busy} onClick={() => setPanel({ kind: 'pwd', id: s.id })}>{tr('resetPwd')}</button>
            <button className={s.is_active ? 'btn-danger' : 'btn-outline'} disabled={busy || locked} onClick={() => toggle(s)}>{s.is_active ? tr('deactivate') : tr('reactivate')}</button>
            <button className="btn-danger" disabled={busy || locked} onClick={() => setPanel({ kind: 'del', id: s.id })}>{tr('del')}</button>
          </div>
          {panel && panel.id === s.id && panel.kind === 'pwd' && (
            <AskBox type="password" label={tr('newPwd') + ' ' + (s.full_name || s.email) + ' :'} submitText={tr('resetPwd')} cancelText={tr('cancel')} busy={busy} onSubmit={(v) => resetPwd(s, v)} onCancel={() => setPanel(null)} />
          )}
          {panel && panel.id === s.id && panel.kind === 'edit' && edit && (
            <form onSubmit={(e) => saveEdit(e, s)} style={{ marginTop: 8, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--hover)' }}>
              <strong style={{ display: 'block', marginBottom: 10 }}>{tr('editTitle')}</strong>
              <div className="field">
                <label>{tr('name')}</label>
                <input value={edit.full_name} onChange={(e) => setEdit({ ...edit, full_name: e.target.value })} required />
              </div>
              <div className="field">
                <label>{tr('email')}</label>
                <input type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} required />
              </div>
              {s.role === 'server' && bars.length > 1 && (
                <div className="field">
                  <label>{tr('barLabel')}</label>
                  <select value={edit.bar_id} onChange={(e) => setEdit({ ...edit, bar_id: e.target.value })}>
                    <option value="">{tr('allBars')}</option>
                    {bars.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              )}
              <button type="submit" className="btn-primary" disabled={busy}>{tr('save')}</button>
              <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setPanel(null)}>{tr('cancel')}</button>
            </form>
          )}
          {panel && panel.id === s.id && panel.kind === 'del' && (
            <>
              <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 13 }}>{tr('delHelp')}</p>
              <AskBox label={tr('delReason') + ' ' + (s.full_name || s.email) + ' :'} submitText={tr('del')} cancelText={tr('cancel')} busy={busy} onSubmit={(r) => remove(s, r)} onCancel={() => setPanel(null)} />
            </>
          )}
        </div>
      ))}
    </div>
  )
}
