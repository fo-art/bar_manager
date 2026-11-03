'use client'
import { usePrefs } from '../../components/Providers'
import { T } from '../content'
import { CONTACT } from '../../../lib/config'

export default function Confidentialite() {
  const { lang } = usePrefs()
  const t = T[lang].privacy
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>{t.updated}</p>
      {t.sections.map(([title, text]) => (
        <div key={title} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px' }}>{title}</h3>
          <p style={{ margin: 0 }}>{text}</p>
        </div>
      ))}
      <p>{t.contactLine} WhatsApp {CONTACT.whatsappLabel} · {CONTACT.phoneLabel}{CONTACT.email && ' · ' + CONTACT.email}</p>
    </div>
  )
}
