'use client'
import { useState } from 'react'
import { usePrefs } from './Providers'

const GREEN = '#16a34a'

const T = {
  fr: {
    search: 'Rechercher une boisson',
    all: 'Toutes',
    out: 'Épuisé',
    left: 'en stock',
    showOut: 'Épuisées',
    none: 'Aucune boisson disponible.',
    cats: { beer: 'Bières', soft: 'Gazeuses', liquor: 'Spiritueux', wine: 'Vins', water: 'Eaux', juice: 'Jus', other: 'Autres' },
  },
  en: {
    search: 'Search a drink',
    all: 'All',
    out: 'Sold out',
    left: 'in stock',
    showOut: 'Sold out',
    none: 'No drinks available.',
    cats: { beer: 'Beers', soft: 'Soft drinks', liquor: 'Spirits', wine: 'Wines', water: 'Water', juice: 'Juices', other: 'Other' },
  },
}

function Chip({ on, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{ flex: '0 0 auto', padding: '6px 12px', borderRadius: 999, cursor: 'pointer', fontSize: 13, color: on ? '#fff' : 'inherit', background: on ? GREEN : 'transparent', border: '1px solid ' + (on ? GREEN : 'var(--line)') }}
    >
      {children}
    </button>
  )
}

export default function DrinkPicker({ drinks, qtyOf, roomOf, onChange, busy, locked, fmt, summary }) {
  const { lang, v, biz } = usePrefs()
  const t = T[lang]
  const tr = (k) => v(t[k])
  const isShop = biz === 'shop'
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('all')
  const [showOut, setShowOut] = useState(false)

  const term = q.trim().toLowerCase()
  const items = drinks.map((d) => ({ d, n: qtyOf(d.id), room: roomOf(d) }))
  const cats = []
  for (const it of items) {
    if (it.d.category && !cats.includes(it.d.category)) cats.push(it.d.category)
  }
  const outCount = items.filter((it) => it.room <= 0 && it.n === 0).length
  const visible = items.filter((it) => {
    if (cat !== 'all' && it.d.category !== cat) return false
    if (term) return it.d.name.toLowerCase().includes(term)
    if (!showOut && it.room <= 0 && it.n === 0) return false
    return true
  })

  return (
    <div>
      <div className="field">
        <input placeholder={tr('search')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      {(cats.length > 1 || outCount > 0) && (
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 8, marginBottom: 4 }}>
          {cats.length > 1 && <Chip on={cat === 'all'} onClick={() => setCat('all')}>{tr('all')}</Chip>}
          {cats.length > 1 && cats.map((c) => <Chip key={c} on={cat === c} onClick={() => setCat(c)}>{isShop ? c : (t.cats[c] || c)}</Chip>)}
          {outCount > 0 && <Chip on={showOut} onClick={() => setShowOut(!showOut)}>{tr('showOut')} ({outCount})</Chip>}
        </div>
      )}
      {summary}
      {visible.length === 0 && <p style={{ margin: '8px 0', color: 'var(--muted)' }}>{tr('none')}</p>}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(112px, 1fr))', gap: 8 }}>
        {visible.map(({ d, n, room }) => {
          const out = room <= 0
          return (
            <div
              key={d.id}
              style={{ border: n > 0 ? '2px solid ' + GREEN : '1px solid var(--line)', background: n > 0 ? 'rgba(22,163,74,0.12)' : 'transparent', borderRadius: 12, padding: n > 0 ? 7 : 8, opacity: out ? 0.55 : 1 }}
            >
              <div style={{ fontWeight: 700, lineHeight: 1.2, minHeight: 34, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', wordBreak: 'break-word' }}>{d.name}</div>
              <div style={{ fontSize: 13, margin: '4px 0 0' }}>{fmt(d.sell_price)}</div>
              <div style={{ fontSize: 12, color: out ? 'var(--err)' : 'var(--muted)', margin: '0 0 8px' }}>{out ? tr('out') : room + ' ' + tr('left')}</div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                <button type="button" className="btn-outline" style={{ flex: 1, minWidth: 0, padding: '8px 0', marginTop: 0 }} disabled={busy || n === 0} onClick={() => onChange(d, n - 1)}>-</button>
                <strong style={{ minWidth: 24, textAlign: 'center', fontSize: 18 }}>{n}</strong>
                <button type="button" className="btn-outline" style={{ flex: 1, minWidth: 0, padding: '8px 0', marginTop: 0 }} disabled={busy || locked || n >= room} onClick={() => onChange(d, n + 1)}>+</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
