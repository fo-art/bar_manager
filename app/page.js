'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import { usePrefs } from './components/Providers'

export default function Login() {
  const router = useRouter()
  const { t } = usePrefs()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })
    if (authError) {
      setError(t('loginError'))
      setLoading(false)
      return
    }
    router.push('/dashboard')
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
      </div>
    </div>
  )
}
