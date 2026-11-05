'use client'
import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from './Providers'
import { buildSpec } from '../../lib/reportSpecs'
import { makePdf } from '../../lib/reportPdf'

const RPC = { sales: 'get_sales_report', cash: 'get_cash_report', stock: 'get_stock_report' }
const TITLE = {
  sales: ['Bilan des ventes', 'Sales report'],
  cash: ['Bilan de caisse', 'Cash report'],
  stock: ['Bilan de stock', 'Stock report'],
}
const dayStr = (offset) => new Date(Date.now() + 3600000 - offset * 86400000).toISOString().slice(0, 10)

export default function ReportPanel({ kind, barId, barName }) {
  const { lang } = usePrefs()
  const fr = lang === 'fr'
  const [open, setOpen] = useState(false)
  const [from, setFrom] = useState(dayStr(0).slice(0, 8) + '01')
  const [to, setTo] = useState(dayStr(0))
  const [spec, setSpec] = useState(null)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')

  function quick(days) {
    setFrom(dayStr(days - 1))
    setTo(dayStr(0))
    setSpec(null)
  }

  async function generate() {
    setBusy(true)
    setErr('')
    const { data, error } = await supabase.rpc(RPC[kind], { p_bar: barId, p_from: from, p_to: to })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setSpec(buildSpec(kind, data, lang, { from, to, barName }))
  }

  async function download() {
    setBusy(true)
    try {
      await makePdf(spec, 'bilan_' + kind + '_' + from + '_' + to)
    } catch (e) {
      setErr(e.message)
    }
    setBusy(false)
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <button type="button" onClick={() => setOpen(!open)} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center', background: 'none', border: 0, padding: 0, color: 'var(--ink)', fontSize: 19, fontWeight: 700 }}>
        <span>{TITLE[kind][fr ? 0 : 1]}</span>
        <span>{open ? '▴' : '▾'}</span>
      </button>
      {open && (
        <div style={{ marginTop: 16 }}>
          {err && <div className="error-msg">{err}</div>}
          <div className="field">
            <label>{fr ? 'Du' : 'From'}</label>
            <input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setSpec(null) }} />
          </div>
          <div className="field">
            <label>{fr ? 'Au' : 'To'}</label>
            <input type="date" value={to} onChange={(e) => { setTo(e.target.value); setSpec(null) }} />
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <button type="button" className="btn-outline" onClick={() => quick(1)}>{fr ? 'Aujourd’hui' : 'Today'}</button>
            <button type="button" className="btn-outline" onClick={() => quick(7)}>{fr ? '7 jours' : '7 days'}</button>
            <button type="button" className="btn-outline" onClick={() => quick(30)}>{fr ? '30 jours' : '30 days'}</button>
            <button type="button" className="btn-outline" onClick={() => { setFrom(dayStr(0).slice(0, 8) + '01'); setTo(dayStr(0)); setSpec(null) }}>{fr ? 'Ce mois' : 'This month'}</button>
          </div>
          <button type="button" className="btn-primary" disabled={busy || !barId || !from || !to} onClick={generate}>{fr ? 'Afficher le bilan' : 'Show report'}</button>
          {spec && (
            <div style={{ marginTop: 16 }}>
              {spec.summary.map(([label, value], i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
                  <span>{label}</span>
                  <strong style={{ whiteSpace: 'nowrap' }}>{value}</strong>
                </div>
              ))}
              <button type="button" className="btn-primary" disabled={busy} onClick={download}>{fr ? 'Télécharger en PDF' : 'Download PDF'}</button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
