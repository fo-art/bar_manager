'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import { CONTACT } from '../../lib/config'

const linkStyle = { display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '20px', marginBottom: 8 }
const BAR_KEY = 'bar_id'
const MAX_BARS_ADMIN = 3
const GREEN = '#16a34a'
const tile = { flex: 1, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--hover)', textAlign: 'center' }

const L = {
  fr: {
    plan: 'Formule',
    activeBar: 'Bar à gérer',
    hint: 'Toutes les rubriques s’ouvrent sur le bar choisi.',
    addBar: 'Ajouter un bar ou une boutique',
    barName: 'Nom du nouveau bar',
    create: 'Créer',
    cancel: 'Annuler',
    added: 'Bar ajouté.',
    limit: 'Limite de 3 bars atteinte. Contactez-nous pour en ajouter.',
    bar_denied: 'Action réservée à l’administrateur.',
    bar_locked: 'Compte verrouillé.',
    bar_name: 'Nom invalide (1 à 80 caractères).',
    bar_plan: 'Votre abonnement ne permet pas d’ajouter un bar.',
    bar_limit: 'Limite de 3 bars atteinte.',
    generic: 'Erreur. Réessayez.',
  },
  en: {
    plan: 'Plan',
    activeBar: 'Bar to manage',
    hint: 'Every section opens on the selected bar.',
    addBar: 'Add a bar or shop',
    barName: 'New bar name',
    create: 'Create',
    cancel: 'Cancel',
    added: 'Bar added.',
    limit: 'Limit of 3 bars reached. Contact us to add more.',
    bar_denied: 'Action reserved to the administrator.',
    bar_locked: 'Account locked.',
    bar_name: 'Invalid name (1 to 80 characters).',
    bar_plan: 'Your plan does not allow adding a bar.',
    bar_limit: 'Limit of 3 bars reached.',
    generic: 'Error. Please try again.',
  },
}

export default function Dashboard() {
  const router = useRouter()
  const { t, lang } = usePrefs()
  const m = L[lang]
  const [profile, setProfile] = useState(null)
  const [access, setAccess] = useState(null)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  function pickBar(list, wanted) {
    let id = wanted
    if (!list.find((b) => b.id === id)) {
      try { id = localStorage.getItem(BAR_KEY) } catch (e) {}
    }
    if (!list.find((b) => b.id === id)) id = list.length ? list[0].id : ''
    setBarId(id)
    try { if (id) localStorage.setItem(BAR_KEY, id) } catch (e) {}
  }

  async function loadBars(wanted) {
    const { data: b } = await supabase.from('bars').select('id, name, is_active').order('created_at')
    const list = b || []
    setBars(list)
    pickBar(list.filter((x) => x.is_active), wanted)
  }

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(p)
      if (p && p.account_id) {
        const { data: acc } = await supabase.rpc('my_access')
        setAccess(acc && acc.length ? acc[0] : null)
        await loadBars('')
      }
    }
    load()
  }, [router])

  function changeBar(id) {
    setBarId(id)
    try { localStorage.setItem(BAR_KEY, id) } catch (e) {}
  }

  async function addBar(e) {
    e.preventDefault()
    setBusy(true)
    setErr('')
    setMsg('')
    const { data, error } = await supabase.rpc('add_bar', { p_name: newName })
    if (error) {
      setErr(m[error.message] || m.generic)
    } else {
      setMsg(m.added)
      setNewName('')
      setAdding(false)
      await loadBars(data)
    }
    setBusy(false)
  }

  if (!profile) return <div className="container">{t('loading')}</div>

  const locked = access && !access.is_active
  const suspended = access && access.status === 'suspended'
  const soon = access && access.is_active && access.days_left <= 5
  const date = access
    ? new Date(access.expires_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
        timeZone: 'Africa/Douala', day: 'numeric', month: 'long', year: 'numeric',
      })
    : ''
  const activeBars = bars.filter((b) => b.is_active)
  const current = activeBars.find((b) => b.id === barId)
  const isAdmin = profile.role === 'admin'
  const canAdd = isAdmin && !locked && access && Number(access.plan_type) === 4
  const atLimit = bars.length >= MAX_BARS_ADMIN
  const showBarCard = (isAdmin || profile.role === 'accountant') && !locked && access && (activeBars.length > 1 || canAdd)

  return (
    <div className="container">
      <div className="card" style={{ background: 'linear-gradient(135deg, #14532d, ' + GREEN + ')', color: '#fff', border: 'none' }}>
        <div style={{ opacity: 0.85, fontSize: 14 }}>{t('hello')}</div>
        <div style={{ fontSize: 24, fontWeight: 700, margin: '2px 0 12px', wordBreak: 'break-word' }}>{profile.full_name || profile.email}</div>
        <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 999, fontSize: 13, background: 'rgba(255,255,255,0.2)' }}>{t('role_' + profile.role)}</span>
        {current && !locked && (
          <div style={{ marginTop: 14, fontSize: 15, opacity: 0.95 }}>{m.activeBar} : <strong>{current.name}</strong></div>
        )}
        {profile.role === 'super_admin' && (
          <button className="btn-outline" style={{ marginTop: 14, background: '#fff', color: '#14532d', borderColor: '#fff' }} onClick={() => router.push('/super')}>{t('superSpace')}</button>
        )}
      </div>

      {access && (
        <div className="card" style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
            <strong style={{ fontSize: 18 }}>{t('subscription')}</strong>
            <span className={'badge ' + (locked ? 'badge-err' : soon ? 'badge-warn' : 'badge-ok')}>
              {suspended ? t('suspended') : locked ? t('expired') : t('active')}
            </span>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <div style={tile}>
              <div style={{ fontSize: 22, fontWeight: 700 }}>{access.plan_type}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.plan}</div>
            </div>
            {!locked && (
              <div style={tile}>
                <div style={{ fontSize: 22, fontWeight: 700 }}>{access.days_left}</div>
                <div style={{ fontSize: 12, color: 'var(--muted)' }}>{t('daysLeft')}</div>
              </div>
            )}
          </div>
          <p style={{ margin: '12px 0 0', color: 'var(--muted)', fontSize: 14 }}>{t('expiresOn')} {date}</p>
          {soon && <div className="error-msg" style={{ marginTop: 12 }}>{t('lowDays')}</div>}
          {locked && (
            <div className="error-msg" style={{ marginTop: 12 }}>
              <strong>{t('lockedTitle')}</strong><br />
              {suspended ? t('lockedSuspended') : t('lockedExpired')}
            </div>
          )}
          {locked && (
            <>
              <a className="btn-primary" style={linkStyle} href={'https://wa.me/' + CONTACT.whatsapp}>{t('contactWhatsapp')}</a>
              <a className="btn-outline" style={linkStyle} href={'tel:' + CONTACT.phone}>{t('call')} {CONTACT.phoneLabel}</a>
            </>
          )}
        </div>
      )}

      {showBarCard && (
        <div className="card" style={{ marginTop: 16 }}>
          <strong style={{ fontSize: 18 }}>{m.activeBar}</strong>
          {activeBars.length > 1 && (
            <>
              <p style={{ margin: '6px 0 12px', color: 'var(--muted)', fontSize: 14 }}>{m.hint}</p>
              {activeBars.map((b) => {
                const on = b.id === barId
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => changeBar(b.id)}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', textAlign: 'left', padding: '14px 16px', marginBottom: 8, borderRadius: 12, cursor: 'pointer', fontSize: 16, color: 'inherit', border: on ? '2px solid ' + GREEN : '1px solid var(--line)', background: on ? 'rgba(22,163,74,0.12)' : 'transparent' }}
                  >
                    <span>{b.name}</span>
                    {on && <span style={{ color: GREEN, fontWeight: 700 }}>✓</span>}
                  </button>
                )
              })}
            </>
          )}
          {msg && <div className="ok-msg">{msg}</div>}
          {err && <div className="error-msg">{err}</div>}
          {canAdd && !adding && !atLimit && (
            <button className="btn-outline" style={{ marginTop: 4 }} onClick={() => { setAdding(true); setMsg(''); setErr('') }}>{m.addBar}</button>
          )}
          {canAdd && atLimit && (
            <>
              <p style={{ margin: '4px 0 8px', color: 'var(--muted)', fontSize: 14 }}>{m.limit}</p>
              <a className="btn-outline" style={linkStyle} href={'https://wa.me/' + CONTACT.whatsapp}>{t('contactWhatsapp')}</a>
            </>
          )}
          {canAdd && adding && (
            <form onSubmit={addBar} style={{ marginTop: 8 }}>
              <div className="field">
                <label>{m.barName}</label>
                <input value={newName} onChange={(e) => setNewName(e.target.value)} maxLength={80} required />
              </div>
              <button type="submit" className="btn-primary" disabled={busy} style={{ marginBottom: 8 }}>{m.create}</button>
              <button type="button" className="btn-outline" disabled={busy} onClick={() => { setAdding(false); setNewName('') }}>{m.cancel}</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
