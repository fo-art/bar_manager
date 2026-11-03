'use client'
import Link from 'next/link'
import { usePrefs } from '../components/Providers'
import { T } from './content'
import { CONTACT } from '../../lib/config'

export default function Accueil() {
  const { lang } = usePrefs()
  const t = T[lang].home
  return (
    <div>
      <section className="site-hero">
        <h1>{t.title}</h1>
        <p>{t.subtitle}</p>
        <div className="site-btns">
          <a className="site-cta" href={'https://wa.me/' + CONTACT.whatsapp}>{t.cta}</a>
          <Link className="site-cta outline" href="/">{T[lang].nav.login}</Link>
        </div>
      </section>
      <div className="site-grid">
        {t.points.map(([icon, title, text]) => (
          <div className="card site-card" key={title}>
            <h3>{icon} {title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
