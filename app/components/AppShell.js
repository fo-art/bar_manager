'use client'
import './shell.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrefs } from './Providers'

const ITEMS = [
  { href: '/dashboard', icon: '🏠', fr: 'Accueil', en: 'Home' },
  { href: '/ventes', icon: '💰', fr: 'Ventes', en: 'Sales' },
  { href: '/caisse', icon: '🧾', fr: 'Caisse', en: 'Cash' },
  { href: '/boissons', icon: '🍺', fr: 'Boissons', en: 'Drinks' },
  { href: '/stock', icon: '📦', fr: 'Stock', en: 'Stock' },
  { href: '/journal', icon: '📋', fr: 'Journal', en: 'Log' },
]

export default function AppShell({ children }) {
  const pathname = usePathname()
  const { lang } = usePrefs()

  function items() {
    return ITEMS.map((i) => (
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
