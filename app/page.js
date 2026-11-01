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
    <div className="container">
      <div className="card">
        <h1>{t('appName')}</h1>
        <p>{t('loginSubtitle')}</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleLogin}>
          <label>{t('email')}</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label>{t('password')}</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          <button type="submit" disabled={loading}>{loading ? t('loggingIn') : t('login')}</button>
        </form>
      </div>
    </div>
  )
}
