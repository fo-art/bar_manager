'use client'
import { useState } from 'react'

export default function Collapsible({ title, count, flat, forceOpen, defaultOpen, children }) {
  const [open, setOpen] = useState(!!defaultOpen)
  const shown = open || !!forceOpen
  const box = flat
    ? { borderTop: '1px solid var(--line)', paddingTop: 12, marginTop: 12 }
    : { marginTop: 16 }
  return (
    <div className={flat ? '' : 'card'} style={box}>
      <button type="button" onClick={() => setOpen(!shown)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', gap: 8, background: 'none', border: 0, padding: 0, color: 'var(--ink)', fontSize: flat ? 16 : 19, fontWeight: 700, textAlign: 'left' }}>
        <span>
          {title}
          {count !== undefined && <span className="badge" style={{ marginLeft: 8 }}>{count}</span>}
        </span>
        <span>{shown ? '▴' : '▾'}</span>
      </button>
      {shown && <div style={{ marginTop: 14 }}>{children}</div>}
    </div>
  )
}
