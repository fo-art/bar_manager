'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { usePrefs } from './components/Providers'

const M = {
  fr: {
    locked: 'Trop de tentatives. Compte bloqué pendant {n} minute(s).',
    remaining: 'Mot de passe incorrect. Essais restants : {n}.',
    network: 'Connexion impossible. Vérifiez votre réseau.',
    discover: 'Découvrir Bar Manager',
  },
  en: {
    locked: 'Too many attempts. Account locked for {n} minute(s).',
    remaining: 'Incorrect password. Attempts left: {n}.',
    network: 'Unable to connect. Check your network.',
    discover: 'Discover Bar Manager',
  },
}

export default function Login() {
  const router = useRouter()
  const { t, lang } = usePrefs()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      })
      const json = await res.json()
      if (res.status === 429) {
        setError(M[lang].locked.replace('{n}', json.minutes))
      } else if (!res.ok) {
        setError(json.remaining !== undefined && json.remaining <= 3 ? M[lang].remaining.replace('{n}', json.remaining) : t('loginError'))
      } else {
        await supabase.auth.setSession({ access_token: json.access_token, refresh_token: json.refresh_token })
        await supabase.rpc('log_login')
        router.push('/dashboard')
        return
      }
    } catch (e) {
      setError(M[lang].network)
    }
    setLoading(false)
  }

  return (
    <div className="page-center">
      <div className="card">
        <h1>{t('appName')}</h1>
        <p style={{ textAlign: 'center', color: 'var(--muted)', margin: '-8px 0 20px' }}>{t('loginSubtitle')}</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleLogin}>
          <div className="field">
            <label>{t('email')}</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>{t('password')}</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? t('loggingIn') : t('login')}</button>
        </form>
        <p style={{ textAlign: 'center', margin: '16px 0 0' }}>
          <Link href="/site" style={{ color: 'var(--green-dark)' }}>{M[lang].discover}</Link>
        </p>
      </div>
    </div>
  )
}
