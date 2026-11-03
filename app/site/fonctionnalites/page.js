'use client'
import { usePrefs } from '../../components/Providers'
import { T } from '../content'

export default function Fonctionnalites() {
  const { lang } = usePrefs()
  const t = T[lang].features
  return (
    <div>
      <h1 style={{ marginTop: 0 }}>{t.title}</h1>
      <div className="site-grid">
        {t.items.map(([icon, title, text]) => (
          <div className="card site-card" key={title}>
            <h3>{icon} {title}</h3>
            <p>{text}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
