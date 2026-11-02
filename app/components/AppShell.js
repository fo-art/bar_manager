'use client'
import './shell.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from './Providers'

const ITEMS = [
  { href: '/dashboard', icon: '🏠', fr: 'Accueil', en: 'Home', roles: ['super_admin', 'admin', 'accountant', 'server'] },
  { href: '/ventes', icon: '💰', fr: 'Ventes', en: 'Sales', roles: ['admin', 'accountant', 'server'] },
  { href: '/caisse', icon: '🧾', fr: 'Caisse', en: 'Cash', roles: ['admin', 'accountant', 'server'] },
  { href: '/boissons', icon: '🍺', fr: 'Boissons', en: 'Drinks', roles: ['admin', 'accountant'] },
  { href: '/stock', icon: '📦', fr: 'Stock', en: 'Stock', roles: ['admin', 'accountant'] },
  { href: '/journal', icon: '📋', fr: 'Journal', en: 'Log', roles: ['admin', 'accountant'] },
  { href: '/equipe', icon: '👥', fr: 'Équipe', en: 'Team', roles: ['admin'] },
]

export default function AppShell({ children }) {
  const pathname = usePathname()
  const { lang } = usePrefs()
  const [role, setRole] = useState('')

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p) setRole(p.role)
    }
    load()
  }, [])

  function items() {
    return ITEMS.filter((i) => i.roles.includes(role)).map((i) => (
      <Link key={i.href} href={i.href} style={{ flex: '1 0 72px' }} className={'shell-item' + (pathname.startsWith(i.href) ? ' active' : '')}>
        <span className="ico">{i.icon}</span>
        <span>{i[lang]}</span>
      </Link>
    ))
  }

  return (
    <div className="shell">
      <nav className="shell-side">
        <div className="shell-brand">Bar Manager</div>
        {items()}
      </nav>
      <main className="shell-main">{children}</main>
      <nav className="shell-bottom" style={{ overflowX: 'auto' }}>{items()}</nav>
    </div>
  )
}
