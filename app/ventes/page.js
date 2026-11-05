'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import ReportPanel from '../components/ReportPanel'

const L = {
  fr: {
    title: 'Ventes',
    search: 'Rechercher une boisson',
    bar: 'Bar',
    cart: 'Panier',
    cartEmpty: 'Panier vide',
    total: 'Total',
    payment: 'Mode de paiement',
    pay_cash: 'Espèces',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Crédit (ardoise)',
    customer: 'Nom du client',
    validate: 'Valider la vente',
    sold: 'Vente enregistrée',
    outStock: 'Épuisé',
    left: 'en stock',
    today: 'Ventes du jour',
    noSales: 'Aucune vente aujourd’hui',
    voided: 'Annulée',
    voidBtn: 'Annuler la vente',
    voidReason: 'Motif de l’annulation :',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    clear: 'Vider le panier',
    printTicket: 'Imprimer le ticket',
  },
  en: {
    title: 'Sales',
    search: 'Search a drink',
    bar: 'Bar',
    cart: 'Cart',
    cartEmpty: 'Cart is empty',
    total: 'Total',
    payment: 'Payment method',
    pay_cash: 'Cash',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Credit (tab)',
    customer: 'Customer name',
    validate: 'Confirm sale',
    sold: 'Sale recorded',
    outStock: 'Sold out',
    left: 'in stock',
    today: 'Today’s sales',
    noSales: 'No sales today',
    voided: 'Voided',
    voidBtn: 'Void sale',
    voidReason: 'Reason for voiding:',
    locked: 'Access locked: contact the administrator.',
    clear: 'Clear cart',
    printTicket: 'Print receipt',
  },
}

const METHODS = ['cash', 'mtn_momo', 'orange_money', 'credit']
const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

function dayStart() {
  const d = new Date(Date.now() + 3600000)
  d.setUTCHours(0, 0, 0, 0)
  return new Date(d.getTime() - 3600000).toISOString()
}

export default function Ventes() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [drinks, setDrinks] = useState([])
  const [stock, setStock] = useState({})
  const [sales, setSales] = useState([])
  const [cart, setCart] = useState({})
  const [method, setMethod] = useState('cash')
  const [customer, setCustomer] = useState('')
  const [q, setQ] = useState('')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)
  const [lastSale, setLastSale] = useState('')

  async function loadAll(id) {
    if (!id) return
    const { data: dr, error } = await supabase
      .from('drinks')
      .select('id, name, sell_price')
      .eq('bar_id', id)
      .is('deleted_at', null)
      .eq('is_suspended', false)
      .order('name')
    if (error) {
      setErr(error.message)
      return
    }
    setDrinks(dr)
    const { data: st } = await supabase.rpc('bar_stock', { p_bar: id })
    const map = {}
    for (const r of st || []) map[r.drink_id] = r.stock
    setStock(map)
    const { data: sl } = await supabase
      .from('sales')
      .select('id, total, payment_method, customer_name, created_at, voided_at, void_reason, profiles!sales_server_id_fkey(full_name, email), sale_items(qty, unit_price, drinks(name))')
      .eq('bar_id', id)
      .gte('created_at', dayStart())
      .order('created_at', { ascending: false })
    setSales(sl || [])
  }

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/')
        return
      }
      const { data: p } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (!p || !p.account_id) {
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
    setCart({})
    loadAll(id)
  }

  function change(d, delta) {
    const next = (cart[d.id] || 0) + delta
    const max = stock[d.id] || 0
    if (next < 0 || next > max) return
    const copy = { ...cart }
    if (next === 0) delete copy[d.id]
    else copy[d.id] = next
    setCart(copy)
    setLastSale('')
  }

  async function validate() {
    setBusy(true)
    setErr('')
    setMsg('')
    const items = Object.entries(cart).map(([drink_id, qty]) => ({ drink_id, qty }))
    const { data: saleId, error } = await supabase.rpc('create_sale', { p_bar: barId, p_items: items, p_method: method, p_customer: customer.trim() || null })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setCart({})
    setCustomer('')
    setLastSale(saleId)
    setMsg(tr('sold'))
    await loadAll(barId)
  }

  async function voidSale(s) {
    const reason = window.prompt(tr('voidReason'))
    if (!reason || !reason.trim()) return
    setBusy(true)
    setErr('')
    const { error } = await supabase.rpc('void_sale', { p_sale: s.id, p_reason: reason })
    setBusy(false)
    if (error) setErr(error.message)
    else await loadAll(barId)
  }

  if (!profile) return <div className="container">...</div>

  const isAdmin = profile.role === 'admin'
  const term = q.toLowerCase()
  const list = drinks.filter((d) => d.name.toLowerCase().includes(term))
  const lines = drinks.filter((d) => cart[d.id])
  const total = lines.reduce((sum, d) => sum + d.sell_price * cart[d.id], 0)
  const validSales = sales.filter((s) => !s.voided_at)
  const dayTotal = validSales.reduce((sum, s) => sum + s.total, 0)

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        {lastSale && (
          <a className="btn-primary" style={{ display: 'block', textAlign: 'center', textDecoration: 'none', lineHeight: '20px', marginBottom: 12 }} href={'/ticket?id=' + lastSale + '&auto=1'} target="_blank" rel="noreferrer">{tr('printTicket')}</a>
        )}
        {locked && <div className="error-msg">{tr('locked')}</div>}
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
        {list.map((d) => {
          const left = stock[d.id] || 0
          const n = cart[d.id] || 0
          return (
            <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
              <div style={{ flex: 1 }}>
                <strong>{d.name}</strong>
                <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fmt(d.sell_price)} · {left > 0 ? left + ' ' + tr('left') : tr('outStock')}</div>
              </div>
              <button className="btn-outline" style={{ minWidth: 40, padding: '8px 0' }} disabled={n === 0} onClick={() => change(d, -1)}>-</button>
              <strong style={{ minWidth: 20, textAlign: 'center' }}>{n}</strong>
              <button className="btn-outline" style={{ minWidth: 40, padding: '8px 0' }} disabled={locked || n >= left} onClick={() => change(d, 1)}>+</button>
            </div>
          )
        })}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h1>{tr('cart')}</h1>
        {lines.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('cartEmpty')}</p>}
        {lines.map((d) => (
          <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{cart[d.id]} × {d.name}</span>
            <span>{fmt(d.sell_price * cart[d.id])}</span>
          </div>
        ))}
        {lines.length > 0 && (
          <>
            <p style={{ fontSize: 18, fontWeight: 700, margin: '12px 0' }}>{tr('total')} : {fmt(total)}</p>
            <div className="field">
              <label>{tr('payment')}</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)}>
                {METHODS.map((m) => <option key={m} value={m}>{tr('pay_' + m)}</option>)}
              </select>
            </div>
            {method === 'credit' && (
              <div className="field">
                <label>{tr('customer')}</label>
                <input value={customer} onChange={(e) => setCustomer(e.target.value)} />
              </div>
            )}
            <button className="btn-primary" disabled={busy || locked} onClick={validate}>{tr('validate')}</button>
            <button className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setCart({})}>{tr('clear')}</button>
          </>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h1>{tr('today')} · {fmt(dayTotal)}</h1>
        {sales.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('noSales')}</p>}
        {sales.map((s) => (
          <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14, opacity: s.voided_at ? 0.55 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <strong>{fmt(s.total)} · {tr('pay_' + s.payment_method)}{s.customer_name && ' · ' + s.customer_name}</strong>
              {s.voided_at && <span className="badge badge-err">{tr('voided')}</span>}
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {new Date(s.created_at).toLocaleTimeString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala', hour: '2-digit', minute: '2-digit' })}
              {' · '}{s.profiles ? (s.profiles.full_name || s.profiles.email) : '-'}
            </div>
            <div style={{ fontSize: 13 }}>{(s.sale_items || []).map((i) => i.qty + ' × ' + (i.drinks ? i.drinks.name : '?')).join(', ')}</div>
            <a className="btn-outline" style={{ display: 'inline-block', marginTop: 6, marginRight: 8, textDecoration: 'none', lineHeight: '24px' }} href={'/ticket?id=' + s.id} target="_blank" rel="noreferrer">🖨 {tr('printTicket')}</a>
            {isAdmin && !s.voided_at && <button className="btn-danger" style={{ marginTop: 6 }} disabled={busy} onClick={() => voidSale(s)}>{tr('voidBtn')}</button>}
            {s.voided_at && s.void_reason && <div style={{ fontSize: 13, color: 'var(--err)' }}>{s.void_reason}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
