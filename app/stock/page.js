'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import Collapsible from '../components/Collapsible'
import ReportPanel from '../components/ReportPanel'

const L = {
  fr: {
    title: 'Stock',
    search: 'Rechercher une boisson',
    bar: 'Bar',
    low: 'Stock bas',
    out: 'Rupture',
    restock: 'à réapprovisionner',
    bottles: 'bouteilles',
    cases: 'casiers',
    btnIn: '+ Entrée',
    btnOut: 'Sortie',
    btnCount: 'Inventaire',
    kind_purchase: 'Entrée (achat)',
    kind_loss: 'Perte / casse',
    kind_gift: 'Offert',
    kind_adjustment: 'Inventaire / ajustement',
    kind_sale: 'Vente',
    type: 'Type de sortie',
    quantity: 'Quantité',
    unit: 'Unité',
    costPer: 'Prix d’achat par bouteille (FCFA)',
    counted: 'Quantité comptée (en bouteilles)',
    note: 'Motif / remarque',
    noteReq: 'Le motif est obligatoire pour cette opération.',
    save: 'Enregistrer',
    cancel: 'Annuler',
    saved: 'Enregistré',
    recent: 'Mouvements récents',
    empty: 'Aucune boisson',
    noMove: 'Aucun mouvement',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    noChange: 'Aucune différence avec le stock actuel.',
    badQty: 'Quantité invalide (nombre entier requis).',
    current: 'Stock actuel',
    drinksTitle: 'Boissons',
  },
  en: {
    title: 'Stock',
    search: 'Search a drink',
    bar: 'Bar',
    low: 'Low stock',
    out: 'Out of stock',
    restock: 'to restock',
    bottles: 'bottles',
    cases: 'cases',
    btnIn: '+ Entry',
    btnOut: 'Out',
    btnCount: 'Count',
    kind_purchase: 'Entry (purchase)',
    kind_loss: 'Loss / breakage',
    kind_gift: 'Gift',
    kind_adjustment: 'Count / adjustment',
    kind_sale: 'Sale',
    type: 'Type of output',
    quantity: 'Quantity',
    unit: 'Unit',
    costPer: 'Purchase price per bottle (FCFA)',
    counted: 'Counted quantity (in bottles)',
    note: 'Reason / note',
    noteReq: 'A reason is required for this operation.',
    save: 'Save',
    cancel: 'Cancel',
    saved: 'Saved',
    recent: 'Recent movements',
    empty: 'No drinks',
    noMove: 'No movements',
    locked: 'Access locked: contact the administrator.',
    noChange: 'No difference from current stock.',
    badQty: 'Invalid quantity (whole number required).',
    current: 'Current stock',
    drinksTitle: 'Drinks',
  },
}

const fmtDate = (s, lang) => new Date(s).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', {
  timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
})

export default function Stock() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [drinks, setDrinks] = useState([])
  const [stock, setStock] = useState({})
  const [moves, setMoves] = useState([])
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadAll(id) {
    if (!id) return
    const { data: dr, error } = await supabase
      .from('drinks')
      .select('id, name, units_per_case, alert_threshold, drink_costs(buy_price)')
      .eq('bar_id', id)
      .is('deleted_at', null)
      .order('name')
    if (error) {
      setErr(error.message)
      return
    }
    setDrinks(dr)
    const { data: st } = await supabase.from('drink_stock').select('drink_id, stock').in('drink_id', dr.map((d) => d.id))
    const map = {}
    for (const r of st || []) map[r.drink_id] = r.stock
    setStock(map)
    const { data: mv } = await supabase
      .from('stock_movements')
      .select('*, drinks(name), profiles(full_name, email)')
      .eq('bar_id', id)
      .order('created_at', { ascending: false })
      .limit(30)
    setMoves(mv || [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || !p.account_id || (p.role !== 'admin' && p.role !== 'accountant')) {
        router.push('/dashboard')
        return
      }
      setProfile(p)
      const { data: acc } = await supabase.rpc('my_access')
      if (acc && acc[0] && !acc[0].is_active) setLocked(true)
      const { data: b } = await supabase.from('bars').select('id, name').eq('is_active', true).order('created_at')
      setBars(b || [])
      if (b && b.length) {
        setBarId(b[0].id)
        loadAll(b[0].id)
      }
    }
    init()
  }, [router])

  function changeBar(id) {
    setBarId(id)
    loadAll(id)
  }

  function openForm(d, mode) {
    setErr('')
    setMsg('')
    const buy = d.drink_costs ? (Array.isArray(d.drink_costs) ? d.drink_costs[0] : d.drink_costs) : null
    setForm({ drink: d, mode, kind: mode === 'in' ? 'purchase' : mode === 'out' ? 'loss' : 'adjustment', qty: '', unit: mode === 'in' ? 'case' : 'bottle', cost: buy ? buy.buy_price : '', note: '' })
  }

  async function save(e) {
    e.preventDefault()
    const d = form.drink
    const n = Number(form.qty)
    const current = stock[d.id] || 0
    const needNote = form.mode !== 'in'
    if (!Number.isInteger(n) || n < 0 || (form.mode !== 'count' && n === 0)) {
      setErr(tr('badQty'))
      return
    }
    if (needNote && !form.note.trim()) {
      setErr(tr('noteReq'))
      return
    }
    const bottles = n * (form.unit === 'case' && form.mode !== 'count' ? d.units_per_case : 1)
    let qty = bottles
    if (form.mode === 'out') qty = -bottles
    if (form.mode === 'count') qty = n - current
    if (qty === 0) {
      setErr(tr('noChange'))
      return
    }
    setBusy(true)
    setErr('')
    const row = {
      drink_id: d.id,
      kind: form.kind,
      qty,
      unit_cost: form.mode === 'in' && form.cost !== '' ? Number(form.cost) : null,
      note: form.note.trim() || null,
    }
    const { error } = await supabase.from('stock_movements').insert(row)
    if (!error && row.unit_cost !== null) {
      await supabase.from('drink_costs').upsert({ drink_id: d.id, buy_price: row.unit_cost })
    }
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg(tr('saved'))
    setForm(null)
    await loadAll(barId)
  }

  if (!profile) return <div className="container">...</div>

  const term = q.toLowerCase()
  const list = drinks.filter((d) => d.name.toLowerCase().includes(term))
  const lowCount = drinks.filter((d) => (stock[d.id] || 0) <= d.alert_threshold).length

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        {lowCount > 0 && <div className="error-msg">{lowCount} {tr('restock')}</div>}
        {bars.length > 1 && (
          <div className="field">
            <label>{tr('bar')}</label>
            <select value={barId} onChange={(e) => changeBar(e.target.value)}>
              {bars.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div className="field">
          <input placeholder={tr('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      {form && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1>{form.drink.name} · {tr('current')} : {stock[form.drink.id] || 0}</h1>
          <form onSubmit={save}>
            {form.mode === 'out' && (
              <div className="field">
                <label>{tr('type')}</label>
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                  <option value="loss">{tr('kind_loss')}</option>
                  <option value="gift">{tr('kind_gift')}</option>
                </select>
              </div>
            )}
            <div className="field">
              <label>{form.mode === 'count' ? tr('counted') : tr('quantity')}</label>
              <input type="number" min="0" value={form.qty} onChange={(e) => setForm({ ...form, qty: e.target.value })} required />
            </div>
            {form.mode !== 'count' && (
              <div className="field">
                <label>{tr('unit')}</label>
                <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}>
                  <option value="case">{tr('cases')} ({form.drink.units_per_case})</option>
                  <option value="bottle">{tr('bottles')}</option>
                </select>
              </div>
            )}
            {form.mode === 'in' && (
              <div className="field">
                <label>{tr('costPer')}</label>
                <input type="number" min="0" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
            )}
            <div className="field">
              <label>{tr('note')}</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>{tr('save')}</button>
            <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setForm(null)}>{tr('cancel')}</button>
          </form>
        </div>
      )}

      <Collapsible title={tr('drinksTitle')} count={list.length} forceOpen={q !== ''}>
        {list.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('empty')}</p>}
        {list.map((d) => {
          const s = stock[d.id] || 0
          const upc = d.units_per_case || 1
          const state = s <= 0 ? 'out' : s <= d.alert_threshold ? 'low' : ''
          return (
            <div key={d.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                <strong>{d.name}</strong>
                {state && <span className={'badge ' + (state === 'out' ? 'badge-err' : 'badge-warn')}>{tr(state)}</span>}
              </div>
              <p style={{ margin: '6px 0 10px', color: 'var(--muted)', fontSize: 14 }}>
                {s} {tr('bottles')}{upc > 1 && s > 0 && ' · ' + Math.floor(s / upc) + ' ' + tr('cases') + ' + ' + (s % upc)}
              </p>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button className="btn-outline" disabled={busy || locked} onClick={() => openForm(d, 'in')}>{tr('btnIn')}</button>
                <button className="btn-outline" disabled={busy || locked} onClick={() => openForm(d, 'out')}>{tr('btnOut')}</button>
                <button className="btn-outline" disabled={busy || locked} onClick={() => openForm(d, 'count')}>{tr('btnCount')}</button>
              </div>
            </div>
          )
        })}
      </Collapsible>

      <Collapsible title={tr('recent')} count={moves.length}>
        {moves.length === 0 && <p style={{ color: 'var(--muted)', margin: 0 }}>{tr('noMove')}</p>}
        {moves.map((m) => (
          <div key={m.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
            <strong>{m.drinks ? m.drinks.name : '-'}</strong> · {tr('kind_' + m.kind)} · {m.qty > 0 ? '+' : ''}{m.qty}
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {fmtDate(m.created_at, lang)} · {m.profiles ? (m.profiles.full_name || m.profiles.email) : '-'}{m.note && ' · ' + m.note}
            </div>
          </div>
        ))}
      </Collapsible>

      <ReportPanel key={barId} kind="stock" barId={barId} barName={(bars.find((b) => b.id === barId) || {}).name} />
    </div>
  )
}
