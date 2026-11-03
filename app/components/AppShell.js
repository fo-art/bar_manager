'use client'
import './shell.css'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from './Providers'

const ICONS = {
  home: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
  sales: ['M2 3h2.5l2.4 11.2a2 2 0 0 0 2 1.6h8.6a2 2 0 0 0 2-1.6L21 7H5.5', 'M9 20.5h.01', 'M18 20.5h.01'],
  cash: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8', 'M12 17.5v-11'],
  stock: ['M7.5 4.3l9 5.2', 'M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.3 7l8.7 5 8.7-5', 'M12 22V12'],
  drinks: ['M17 11h1a3 3 0 0 1 0 6h-1', 'M9 12v6', 'M13 12v6', 'M14 7.5c-1 0-1.4.5-3 .5s-2-.5-3-.5-1.7.5-2.5.5a2.5 2.5 0 0 1 0-5c.8 0 1.6.5 2.5.5S9.4 2 11 2s2 1.5 3 1.5 1.7-.5 2.5-.5a2.5 2.5 0 0 1 0 5c-.8 0-1.5-.5-2.5-.5z', 'M5 8v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V8'],
  expenses: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
  report: ['M3 3v16a2 2 0 0 0 2 2h16', 'M18 17V9', 'M13 17V5', 'M8 17v-3'],
  log: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  team: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'M9 3a4 4 0 1 0 0 8a4 4 0 1 0 0-8z', 'M22 21v-2a4 4 0 0 0-3-3.9', 'M16 3.1a4 4 0 0 1 0 7.8'],
  account: ['M12 2a10 10 0 1 0 0 20a10 10 0 1 0 0-20z', 'M12 7a3 3 0 1 0 0 6a3 3 0 1 0 0-6z', 'M7 20.7V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.7'],
  more: ['M5 12h.01', 'M12 12h.01', 'M19 12h.01'],
}

function Icon({ name }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {(ICONS[name] || []).map((d) => <path key={d} d={d} />)}
    </svg>
  )
}

const ALL = ['super_admin', 'admin', 'accountant', 'server']
const WORK = ['admin', 'accountant', 'server']
const MGMT = ['admin', 'accountant']

const ITEMS = [
  { href: '/dashboard', icon: 'home', fr: 'Accueil', en: 'Home', roles: ALL, main: true },
  { href: '/ventes', icon: 'sales', fr: 'Ventes', en: 'Sales', roles: WORK, main: true },
  { href: '/caisse', icon: 'cash', fr: 'Caisse', en: 'Cash', roles: WORK, main: true },
  { href: '/stock', icon: 'stock', fr: 'Stock', en: 'Stock', roles: MGMT, main: true },
  { href: '/boissons', icon: 'drinks', fr: 'Boissons', en: 'Drinks', roles: MGMT },
  { href: '/depenses', icon: 'expenses', fr: 'Dépenses', en: 'Expenses', roles: MGMT },
  { href: '/bilan', icon: 'report', fr: 'Bilan', en: 'Report', roles: MGMT },
  { href: '/journal', icon: 'log', fr: 'Journal', en: 'Log', roles: MGMT },
  { href: '/equipe', icon: 'team', fr: 'Équipe', en: 'Team', roles: ['admin'] },
  { href: '/compte', icon: 'account', fr: 'Mon compte', en: 'My account', roles: ALL },
]

export default function AppShell({ children }) {
  const pathname = usePathname()
  const { lang } = usePrefs()
  const [role, setRole] = useState('')
  const [open, setOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data: p } = await supabase.from('profiles').select('role').eq('id', user.id).single()
      if (p) setRole(p.role)
    }
    load()
  }, [])

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  const visible = ITEMS.filter((i) => i.roles.includes(role))
  const main = visible.filter((i) => i.main)
  const more = visible.filter((i) => !i.main)
  const isActive = (i) => pathname.startsWith(i.href)
  const link = (i, cls) => (
    <Link key={i.href} href={i.href} className={cls + (isActive(i) ? ' active' : '')}>
      <Icon name={i.icon} />
      <span>{i[lang]}</span>
    </Link>
  )

  return (
    <div className="shell">
      <nav className="shell-side">
        <div className="shell-brand">Bar Manager</div>
        {visible.map((i) => link(i, 'shell-item'))}
      </nav>
      <main className="shell-main">{children}</main>
      <nav className="shell-bottom">
        {main.map((i) => link(i, 'shell-item'))}
        <button className={'shell-item' + (open || more.some(isActive) ? ' active' : '')} onClick={() => setOpen(!open)}>
          <Icon name="more" />
          <span>{lang === 'fr' ? 'Plus' : 'More'}</span>
        </button>
      </nav>
      {open && (
        <>
          <div className="shell-back" onClick={() => setOpen(false)} />
          <div className="shell-sheet">
            <div className="shell-sheet-title">{lang === 'fr' ? 'Autres rubriques' : 'More sections'}</div>
            <div className="shell-sheet-grid">
              {more.map((i) => link(i, 'shell-sheet-item'))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
