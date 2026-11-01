'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'

export default function Dashboard() {
  const router = useRouter()
  const { t } = usePrefs()
  const [profile, setProfile] = useState(null)
  const [account, setAccount] = useState(null)

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
        const { data: a } = await supabase.from('accounts').select('*').eq('id', p.account_id).single()
        setAccount(a)
      }
    }
    load()
  }, [router])

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (!profile) return <div className="container">{t('loading')}</div>

  return (
    <div className="container">
      <div className="card">
        <h1>{t('hello')} {profile.full_name || profile.email}</h1>
        <p>{t('role')} : <span className="badge badge-ok">{profile.role}</span></p>
        {account && <p>{t('account')} : {account.name} ({t('type')} {account.plan_type})</p>}
        {profile.role === 'super_admin' && <button className="btn-primary" style={{ marginBottom: 12 }} onClick={() => router.push('/super')}>Espace Super Admin</button>}
        <button className="btn-outline" onClick={logout}>{t('logout')}</button>
      </div>
    </div>
  )
}
