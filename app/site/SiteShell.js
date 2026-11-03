'use client'
import './site.css'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { usePrefs } from '../components/Providers'
import { T } from './content'
import { CONTACT } from '../../lib/config'

const LINKS = [
  ['/site', 'home'],
  ['/site/fonctionnalites', 'features'],
  ['/site/formules', 'plans'],
  ['/site/contact', 'contact'],
  ['/site/confidentialite', 'privacy'],
]

export default function SiteShell({ children }) {
  const pathname = usePathname()
  const { lang } = usePrefs()
  const t = T[lang]
  return (
    <div className="site">
      <header className="site-head">
        <div className="site-brand">🍺 {t.brand}</div>
        <nav className="site-nav">
          {LINKS.map(([href, key]) => (
            <Link key={href} href={href} className={pathname === href ? 'active' : ''}>{t.nav[key]}</Link>
          ))}
          <Link href="/" className="site-login">{t.nav.login}</Link>
        </nav>
      </header>
      <main className="site-main">{children}</main>
      <footer className="site-foot">
        <div>© {new Date().getFullYear()} {t.brand} · Douala, Cameroun</div>
        <div>WhatsApp {CONTACT.whatsappLabel} · Tel {CONTACT.phoneLabel}</div>
      </footer>
    </div>
  )
}
