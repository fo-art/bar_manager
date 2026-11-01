'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import { CONTACT } from '../../lib/config'

const linkStyle = { display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '20px', marginBottom: 8 }

export default function Dashboard() {
  const router = useRouter()
  const { t, lang } = usePrefs()
  const [profile, setProfile] = useState(null)
  const [access, setAccess] = useState(null)
  const [bars, setBars] = useState([])

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
        const { data: b } = await supabase.from('bars').select('id, name').order('created_at')
        setBars(b || [])
      }
    }
    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
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

  return (
    <div className="container">
      <div className="card">
        <h1>{t('hello')} {profile.full_name || profile.email}</h1>
        <p>{t('role')} : <span className="badge badge-ok">{t('role_' + profile.role)}</span></p>
        {profile.role === 'super_admin' && (
          <button className="btn-primary" style={{ marginBottom: 12 }} onClick={() => router.push('/super')}>{t('superSpace')}</button>
        )}
        <button className="btn-outline" onClick={logout}>{t('logout')}</button>
      </div>

      {access && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1>{t('subscription')}</h1>
          <p style={{ margin: '0 0 8px' }}>
            {access.account_name} · {t('type')} {access.plan_type}{' '}
            <span className={'badge ' + (locked ? 'badge-err' : soon ? 'badge-warn' : 'badge-ok')}>
              {suspended ? t('suspended') : locked ? t('expired') : t('active')}
            </span>
          </p>
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>
            {t('expiresOn')} {date}{!locked && ' · ' + access.days_left + ' ' + t('daysLeft')}
          </p>
          {!locked && bars.length > 0 && (
            <p style={{ margin: '0 0 12px' }}>{t('bars')} : {bars.map((b) => b.name).join(', ')}</p>
          )}
          {soon && <div className="error-msg">{t('lowDays')}</div>}
          {locked && (
            <div className="error-msg">
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
    </div>
  )
}
