'use client'
import './site.css'
import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrefs } from '../components/Providers'
import { T } from './content'
import { CONTACT } from '../../lib/config'

const LINKS = [
  ['/', 'home'],
  ['/site/fonctionnalites', 'features'],
  ['/site/formules', 'plans'],
  ['/site/contact', 'contact'],
  ['/site/confidentialite', 'privacy'],
]

export default function SiteShell({ children }) {
  const pathname = usePathname()
  const { lang, setLang, theme, setTheme } = usePrefs()
  const [open, setOpen] = useState(false)
  const t = T[lang]
  const isActive = (href) => (href === '/' ? pathname === '/' || pathname === '/site' : pathname === href)
  const links = (cls) => LINKS.map(([href, key]) => (
    <Link key={href} href={href} onClick={() => setOpen(false)} className={cls + (isActive(href) ? ' active' : '')}>{t.nav[key]}</Link>
  ))

  return (
    <div className="site">
      <header className="site-head">
        <div className="site-bar">
          <Link href="/" className="site-brand">🍺 {t.brand}</Link>
          <nav className="site-nav">{links('site-link')}</nav>
          <div className="site-actions">
            <button className="site-icon" onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>{lang === 'fr' ? 'EN' : 'FR'}</button>
            <button className="site-icon" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '🌙' : '☀️'}</button>
            <Link href="/connexion" className="site-login">{t.nav.login}</Link>
            <button className="site-icon site-burger" onClick={() => setOpen(!open)} aria-label="Menu">{open ? '✕' : '☰'}</button>
          </div>
        </div>
        {open && (
          <nav className="site-drawer">
            {links('site-link')}
            <Link href="/connexion" className="site-login">{t.nav.login}</Link>
          </nav>
        )}
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-foot">
        <div>© {new Date().getFullYear()} {t.brand} · Douala, Cameroun</div>
        <div>WhatsApp {CONTACT.whatsappLabel} · Tel {CONTACT.phoneLabel}</div>
      </footer>
    </div>
  )
}
