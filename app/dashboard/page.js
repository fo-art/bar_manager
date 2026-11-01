'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function Dashboard() {
  const router = useRouter()
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

  if (!profile) return <div className="container">Chargement...</div>

  return (
    <div className="container">
      <div className="card">
        <h1>Bonjour {profile.full_name || profile.email}</h1>
        <p>Rôle : {profile.role}</p>
        {account && <p>Compte : {account.name} (type {account.plan_type})</p>}
        <button onClick={logout}>Déconnexion</button>
      </div>
    </div>
  )
}
