'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'

const L = {
  fr: {
    title: 'Mon compte',
    email: 'Identifiant',
    role: 'Rôle',
    account: 'Compte',
    name: 'Nom affiché',
    saveName: 'Enregistrer le nom',
    nameSaved: 'Nom enregistré',
    pwdTitle: 'Changer mon mot de passe',
    current: 'Mot de passe actuel',
    newPwd: 'Nouveau mot de passe (8 caractères minimum)',
    confirm: 'Confirmer le nouveau mot de passe',
    changePwd: 'Changer le mot de passe',
    pwdSaved: 'Mot de passe modifié',
    wrongCurrent: 'Le mot de passe actuel est incorrect.',
    tooShort: 'Le nouveau mot de passe doit avoir au moins 8 caractères.',
    mismatch: 'La confirmation ne correspond pas.',
    same: 'Le nouveau mot de passe doit être différent de l’ancien.',
    role_super_admin: 'Super administrateur',
    role_admin: 'Administrateur',
    role_accountant: 'Comptable / secrétaire',
    role_server: 'Serveur(se)',
  },
  en: {
    title: 'My account',
    email: 'Login',
    role: 'Role',
    account: 'Account',
    name: 'Display name',
    saveName: 'Save name',
    nameSaved: 'Name saved',
    pwdTitle: 'Change my password',
    current: 'Current password',
    newPwd: 'New password (8 characters minimum)',
    confirm: 'Confirm new password',
    changePwd: 'Change password',
    pwdSaved: 'Password changed',
    wrongCurrent: 'The current password is incorrect.',
    tooShort: 'The new password must be at least 8 characters.',
    mismatch: 'The confirmation does not match.',
    same: 'The new password must be different from the old one.',
    role_super_admin: 'Super administrator',
    role_admin: 'Administrator',
    role_accountant: 'Accountant / secretary',
    role_server: 'Server',
  },
}

export default function Compte() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [accountName, setAccountName] = useState('')
  const [name, setName] = useState('')
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p) {
        router.push('/')
        return
      }
      setProfile(p)
      setName(p.full_name || '')
      if (p.account_id) {
        const { data: acc } = await supabase.rpc('my_access')
        if (acc && acc[0]) setAccountName(acc[0].account_name)
      }
    }
    init()
  }, [router])

  async function saveName(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await supabase.from('profiles').update({ full_name: name.trim() || null }).eq('id', profile.id)
    setBusy(false)
    if (error) setErr(error.message)
    else setMsg(tr('nameSaved'))
  }

  async function changePassword(e) {
    e.preventDefault()
    setErr('')
    setMsg('')
    if (next.length < 8) return setErr(tr('tooShort'))
    if (next !== confirm) return setErr(tr('mismatch'))
    if (next === current) return setErr(tr('same'))
    setBusy(true)
    const check = await supabase.auth.signInWithPassword({ email: profile.email, password: current })
    if (check.error) {
      setBusy(false)
      return setErr(tr('wrongCurrent'))
    }
    const { error } = await supabase.auth.updateUser({ password: next })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setCurrent('')
    setNext('')
    setConfirm('')
    setMsg(tr('pwdSaved'))
  }

  if (!profile) return <div className="container">...</div>

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        <p style={{ margin: '0 0 6px' }}>{tr('email')} : <strong>{profile.email}</strong></p>
        <p style={{ margin: '0 0 6px' }}>{tr('role')} : <span className="badge badge-ok">{tr('role_' + profile.role)}</span></p>
        {accountName && <p style={{ margin: '0 0 16px' }}>{tr('account')} : <strong>{accountName}</strong></p>}
        <form onSubmit={saveName}>
          <div className="field">
            <label>{tr('name')}</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <button type="submit" className="btn-outline" style={{ width: '100%' }} disabled={busy}>{tr('saveName')}</button>
        </form>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h1>{tr('pwdTitle')}</h1>
        <form onSubmit={changePassword}>
          <div className="field">
            <label>{tr('current')}</label>
            <input type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div className="field">
            <label>{tr('newPwd')}</label>
            <input type="password" autoComplete="new-password" value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div className="field">
            <label>{tr('confirm')}</label>
            <input type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={busy}>{tr('changePwd')}</button>
        </form>
      </div>
    </div>
  )
}
