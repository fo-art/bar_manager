'use client'
import { usePrefs } from '../../components/Providers'
import { T } from '../content'
import { CONTACT, PRICES } from '../../../lib/config'

const fmt = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'

export default function Formules() {
  const { lang } = usePrefs()
  const t = T[lang].plans
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <p style={{ color: 'var(--muted)' }}>{t.trial}</p>
      <div className="site-grid">
        {t.list.map(([name, points], i) => (
          <div className="card site-card" key={name}>
            <h3>{name}</h3>
            <p style={{ fontWeight: 700, color: 'var(--ink)', margin: '0 0 8px' }}>
              {PRICES[i + 1] ? fmt(PRICES[i + 1]) + ' ' + t.perMonth : t.onRequest}
            </p>
            <ul style={{ margin: '0 0 12px', paddingLeft: 18, color: 'var(--muted)', fontSize: 14 }}>
              {points.map((p) => <li key={p}>{p}</li>)}
            </ul>
            <a className="site-cta" href={'https://wa.me/' + CONTACT.whatsapp + '?text=' + encodeURIComponent(t.msg + ' ' + name)}>{t.cta}</a>
          </div>
        ))}
      </div>
    </div>
  )
}
