'use client'
import { usePrefs } from '../../components/Providers'
import { T } from '../content'
import { CONTACT } from '../../../lib/config'

export default function Contact() {
  const { lang } = usePrefs()
  const t = T[lang].contact
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: 'var(--muted)' }}>{t.text}</p>
      <div className="site-btns" style={{ justifyContent: 'flex-start' }}>
        <a className="site-cta" href={'https://wa.me/' + CONTACT.whatsapp}>{t.whatsapp} · {CONTACT.whatsappLabel}</a>
        <a className="site-cta outline" href={'tel:' + CONTACT.phone}>{t.call} · {CONTACT.phoneLabel}</a>
        {CONTACT.email && <a className="site-cta outline" href={'mailto:' + CONTACT.email}>{CONTACT.email}</a>}
      </div>
    </div>
  )
}
