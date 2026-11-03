'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../lib/supabaseClient'
import SiteShell from './site/SiteShell'
import Accueil from './site/page'

export default function Home() {
  const router = useRouter()
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) router.replace('/dashboard')
    })
  }, [router])
  return (
    <SiteShell>
      <Accueil />
    </SiteShell>
  )
}
