'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import Collapsible from '../components/Collapsible'
import ReportPanel from '../components/ReportPanel'
import AskBox from '../components/askbox'
import { chooseBar } from '../../lib/activebar'

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
    left: 'disponibles',
    today: 'Ventes du jour',
    noSales: 'Aucune vente aujourd’hui',
    voided: 'Annulée',
    voidBtn: 'Annuler la vente',
    voidReason: 'Motif de l’annulation :',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    clear: 'Vider le panier',
    printTicket: 'Imprimer le ticket',
    orders: 'Commandes en cours',
    newOrder: '+ Nouvelle commande',
    orderName: 'Nom de la commande (table ou client)',
    orderNamePh: 'Ex. : Table 3, Jean',
    createOrder: 'Créer la commande',
    noOrders: 'Aucune commande en cours',
    open: 'Ouvrir',
    close: 'Fermer',
    statusOpen: 'En cours',
    statusValidated: 'Validée',
    validateOrder: 'Valider la commande',
    modify: 'Modifier',
    billOrder: 'Facturer',
    confirmBill: 'Confirmer la facture',
    back: 'Retour',
    cancel: 'Annuler',
    cancelOrder: 'Annuler la commande',
    cancelAsk: 'Motif de l’annulation de la commande :',
    cancelConfirmEmpty: 'Annuler cette commande vide ?',
    directSale: 'Vente directe (paiement immédiat)',
    history: 'Historique de la commande',
    ev_created: 'Commande créée',
    ev_item: 'Modification',
    ev_validated: 'Commande validée',
    ev_reopened: 'Rouverte pour modification',
    ev_billed: 'Facturée',
    ev_cancelled: 'Commande annulée',
    items: 'boisson(s)',
    emptyOrder: 'Aucune boisson dans cette commande',
    validatedHelp: 'Commande validée. Quand le client demande sa facture, appuyez sur Facturer. Pour ajouter ou changer une boisson, appuyez sur Modifier.',
    billed: 'Commande facturée',
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
    left: 'available',
    today: 'Today’s sales',
    noSales: 'No sales today',
    voided: 'Voided',
    voidBtn: 'Void sale',
    voidReason: 'Reason for voiding:',
    locked: 'Access locked: contact the administrator.',
    clear: 'Clear cart',
    printTicket: 'Print receipt',
    orders: 'Open orders',
    newOrder: '+ New order',
    orderName: 'Order name (table or customer)',
    orderNamePh: 'E.g. Table 3, John',
    createOrder: 'Create order',
    noOrders: 'No open orders',
    open: 'Open',
    close: 'Close',
    statusOpen: 'Open',
    statusValidated: 'Validated',
    validateOrder: 'Validate order',
    modify: 'Edit',
    billOrder: 'Bill',
    confirmBill: 'Confirm the bill',
    back: 'Back',
    cancel: 'Cancel',
    cancelOrder: 'Cancel order',
    cancelAsk: 'Reason for cancelling the order:',
    cancelConfirmEmpty: 'Cancel this empty order?',
    directSale: 'Direct sale (immediate payment)',
    history: 'Order history',
    ev_created: 'Order created',
    ev_item: 'Change',
    ev_validated: 'Order validated',
    ev_reopened: 'Reopened for editing',
    ev_billed: 'Billed',
    ev_cancelled: 'Order cancelled',
    items: 'drink(s)',
    emptyOrder: 'No drinks in this order',
    validatedHelp: 'Order validated. When the customer asks for the bill, press Bill. To add or change a drink, press Edit.',
    billed: 'Order billed',
  },
}

const METHODS = ['cash', 'mtn_momo', 'orange_money', 'credit']
const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

function dayStart() {
  const d = new Date(Date.now() + 3600000)
  d.setUTCHours(0, 0, 0, 0)
  return new Date(d.getTime() - 3600000).toISOString()
}

const dt = (s, lang) => new Date(s).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

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
  const [orders, setOrders] = useState([])
  const [reserved, setReserved] = useState({})
  const [openId, setOpenId] = useState('')
  const [newLabel, setNewLabel] = useState(null)
  const [billing, setBilling] = useState(null)
  const [ask, setAsk] = useState(null)
  const [events, setEvents] = useState([])

  async function reloadOrders(id) {
    if (!id) return
    const { data: od } = await supabase
      .from('orders')
      .select('id, label, status, created_at, server_id, profiles(full_name, email), order_items(drink_id, qty)')
      .eq('bar_id', id)
      .in('status', ['open', 'validated'])
      .order('created_at')
    setOrders(od || [])
    const { data: rs } = await supabase.rpc('bar_reserved', { p_bar: id })
    const map = {}
    for (const r of rs || []) map[r.drink_id] = r.reserved
    setReserved(map)
  }

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
      .select('id, server_id, total, payment_method, customer_name, created_at, voided_at, void_reason, profiles!sales_server_id_fkey(full_name, email), sale_items(qty, unit_price, drinks(name))')
      .eq('bar_id', id)
      .gte('created_at', dayStart())
      .order('created_at', { ascending: false })
    setSales(sl || [])
    await reloadOrders(id)
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
        const id = chooseBar(b)
        setBarId(id)
        loadAll(id)
      }
    }
    init()
  }, [router])

  useEffect(() => {
    if (!barId) return undefined
    const timer = setInterval(() => reloadOrders(barId), 20000)
    return () => clearInterval(timer)
  }, [barId])

  useEffect(() => {
    if (!openId || !profile || profile.role === 'server') {
      setEvents([])
      return
    }
    supabase
      .from('order_events')
      .select('id, action, details, created_at, profiles(full_name, email)')
      .eq('order_id', openId)
      .order('created_at')
      .then(({ data }) => setEvents(data || []))
  }, [openId, orders, profile])

  async function act(name, args, okKey) {
    setBusy(true)
    setErr('')
    setMsg('')
    const { data, error } = await supabase.rpc(name, args)
    setBusy(false)
    await reloadOrders(barId)
    if (error) {
      setErr(error.message)
      return null
    }
    if (okKey) setMsg(tr(okKey))
    return data === null || data === undefined ? true : data
  }

  async function createOrder(e) {
    e.preventDefault()
    const id = await act('order_create', { p_bar: barId, p_label: newLabel }, null)
    if (id && id !== true) {
      setNewLabel(null)
      setOpenId(id)
      setQ('')
    }
  }

  function reopen(o) {
    setBilling(null)
    act('order_reopen', { p_order: o.id }, null)
  }

  async function doCancelOrder(o, reason) {
    setAsk(null)
    const ok = await act('order_cancel', { p_order: o.id, p_reason: reason }, null)
    if (ok) setOpenId('')
  }

  function cancelOrder(o) {
    if (o.order_items.length > 0) {
      setAsk({ kind: 'order', id: o.id })
      return
    }
    if (!window.confirm(tr('cancelConfirmEmpty'))) return
    doCancelOrder(o, '')
  }

  async function billOrder(o) {
    const saleId = await act('order_bill', { p_order: o.id, p_method: billing.method, p_customer: billing.customer.trim() || null }, 'billed')
    if (saleId && saleId !== true) {
      setLastSale(saleId)
      setBilling(null)
      setOpenId('')
      await loadAll(barId)
    }
  }

  function change(d, delta) {
    const next = (cart[d.id] || 0) + delta
    const max = Math.max(0, (stock[d.id] || 0) - (reserved[d.id] || 0))
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

  async function voidSale(s, reason) {
    setBusy(true)
    setErr('')
    const { error } = await supabase.rpc('void_sale', { p_sale: s.id, p_reason: reason })
    setBusy(false)
    setAsk(null)
    if (error) {
      setErr(error.message)
    } else {
      if (lastSale === s.id) setLastSale('')
      await loadAll(barId)
    }
  }

  const orderTotal = (o) => o.order_items.reduce((sum, i) => { const d = drinks.find((x) => x.id === i.drink_id); return sum + (d ? d.sell_price * i.qty : 0) }, 0)

  if (!profile) return <div className="container">...</div>

  const isAdmin = profile.role === 'admin'
  const isServer = profile.role === 'server'
  const canVoid = (s) => !s.voided_at && (isAdmin || (isServer && s.server_id === profile.id))
  const term = q.toLowerCase()
  const list = drinks.filter((d) => d.name.toLowerCase().includes(term))
  const lines = drinks.filter((d) => cart[d.id])
  const total = lines.reduce((sum, d) => sum + d.sell_price * cart[d.id], 0)
  const validSales = sales.filter((s) => !s.voided_at)
  const dayTotal = validSales.reduce((sum, s) => sum + s.total, 0)

  function renderOrder(o) {
    const qtyOf = (id) => (o.order_items.find((i) => i.drink_id === id) || {}).qty || 0
    const recap = o.order_items.map((i) => ({ qty: i.qty, d: drinks.find((x) => x.id === i.drink_id) })).filter((l) => l.d)
    const isOpen = o.status === 'open'
    const isBilling = billing && billing.id === o.id
    const canCancel = isAdmin || (isServer && o.server_id === profile.id)
    return (
      <div style={{ marginTop: 12, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--hover)' }}>
        {isOpen && (
          <>
            <div className="field">
              <input placeholder={tr('search')} value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            {list.map((d) => {
              const n = qtyOf(d.id)
              const room = Math.max(0, (stock[d.id] || 0) - (reserved[d.id] || 0) + n)
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                  <div style={{ flex: 1 }}>
                    <strong>{d.name}</strong>
                    <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fmt(d.sell_price)} · {room > 0 ? room + ' ' + tr('left') : tr('outStock')}</div>
                  </div>
                  <button className="btn-outline" style={{ minWidth: 40, padding: '8px 0' }} disabled={busy || n === 0} onClick={() => act('order_set_item', { p_order: o.id, p_drink: d.id, p_qty: n - 1 }, null)}>-</button>
                  <strong style={{ minWidth: 20, textAlign: 'center' }}>{n}</strong>
                  <button className="btn-outline" style={{ minWidth: 40, padding: '8px 0' }} disabled={busy || locked || n >= room} onClick={() => act('order_set_item', { p_order: o.id, p_drink: d.id, p_qty: n + 1 }, null)}>+</button>
                </div>
              )
            })}
          </>
        )}
        {recap.length === 0 && <p style={{ margin: '8px 0', color: 'var(--muted)' }}>{tr('emptyOrder')}</p>}
        {recap.map((l) => (
          <div key={l.d.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
            <span>{l.qty} × {l.d.name}</span>
            <span>{fmt(l.d.sell_price * l.qty)}</span>
          </div>
        ))}
        <p style={{ fontSize: 18, fontWeight: 700, margin: '12px 0' }}>{tr('total')} : {fmt(orderTotal(o))}</p>
        {isOpen && (
          <>
            <button className="btn-primary" disabled={busy || locked || recap.length === 0} onClick={() => act('order_validate', { p_order: o.id }, null)}>{tr('validateOrder')}</button>
            {(canCancel || recap.length === 0) && <button className="btn-danger" style={{ width: '100%', marginTop: 8 }} disabled={busy} onClick={() => cancelOrder(o)}>{tr('cancelOrder')}</button>}
          </>
        )}
        {!isOpen && !isBilling && (
          <>
            <p style={{ margin: '0 0 8px', color: 'var(--muted)', fontSize: 13 }}>{tr('validatedHelp')}</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-outline" style={{ flex: 1 }} disabled={busy} onClick={() => reopen(o)}>{tr('modify')}</button>
              <button className="btn-primary" style={{ flex: 1, marginTop: 0 }} disabled={busy || locked} onClick={() => setBilling({ id: o.id, method: 'cash', customer: o.label })}>{tr('billOrder')}</button>
            </div>
            {canCancel && <button className="btn-danger" style={{ width: '100%', marginTop: 8 }} disabled={busy} onClick={() => cancelOrder(o)}>{tr('cancelOrder')}</button>}
          </>
        )}
        {isBilling && (
          <>
            <div className="field">
              <label>{tr('payment')}</label>
              <select value={billing.method} onChange={(e) => setBilling({ ...billing, method: e.target.value })}>
                {METHODS.map((m) => <option key={m} value={m}>{tr('pay_' + m)}</option>)}
              </select>
            </div>
            {billing.method === 'credit' && (
              <div className="field">
                <label>{tr('customer')}</label>
                <input value={billing.customer} onChange={(e) => setBilling({ ...billing, customer: e.target.value })} />
              </div>
            )}
            <button className="btn-primary" disabled={busy || locked} onClick={() => billOrder(o)}>{tr('confirmBill')}</button>
            <button className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setBilling(null)}>{tr('back')}</button>
          </>
        )}
        {ask && ask.kind === 'order' && ask.id === o.id && (
          <AskBox label={tr('cancelAsk')} submitText={tr('cancelOrder')} cancelText={tr('back')} busy={busy} onSubmit={(r) => doCancelOrder(o, r)} onCancel={() => setAsk(null)} />
        )}
        {!isServer && events.length > 0 && (
          <Collapsible flat title={tr('history')} count={events.length}>
            {events.map((ev) => (
              <div key={ev.id} style={{ fontSize: 13, padding: '4px 0' }}>
                {dt(ev.created_at, lang)} · {tr('ev_' + ev.action)}{ev.profiles ? ' · ' + (ev.profiles.full_name || ev.profiles.email) : ''}
                {ev.action === 'item' && ' · ' + ev.details.drink + ' : ' + ev.details.from + ' → ' + ev.details.to}
                {ev.action === 'cancelled' && ev.details.reason && ' · ' + ev.details.reason}
              </div>
            ))}
          </Collapsible>
        )}
      </div>
    )
  }

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
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{tr('bar')} : <strong>{(bars.find((b) => b.id === barId) || {}).name}</strong></p>
        )}
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h1>{tr('orders')} · {orders.length}</h1>
        {newLabel === null ? (
          <button className="btn-primary" disabled={locked} onClick={() => setNewLabel('')}>{tr('newOrder')}</button>
        ) : (
          <form onSubmit={createOrder}>
            <div className="field">
              <label>{tr('orderName')}</label>
              <input value={newLabel} placeholder={tr('orderNamePh')} maxLength={60} onChange={(e) => setNewLabel(e.target.value)} required />
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>{tr('createOrder')}</button>
            <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setNewLabel(null)}>{tr('cancel')}</button>
          </form>
        )}
        {orders.length === 0 && <p style={{ margin: '12px 0 0', color: 'var(--muted)' }}>{tr('noOrders')}</p>}
        {orders.map((o) => (
          <div key={o.id} style={{ padding: '12px 0', borderBottom: '1px solid var(--line)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'center' }}>
              <strong>{o.label}</strong>
              <span className={'badge ' + (o.status === 'validated' ? 'badge-warn' : 'badge-ok')}>{tr(o.status === 'validated' ? 'statusValidated' : 'statusOpen')}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {o.order_items.reduce((s, i) => s + i.qty, 0)} {tr('items')} · {fmt(orderTotal(o))}{!isServer && o.profiles ? ' · ' + (o.profiles.full_name || o.profiles.email) : ''}
            </div>
            <button className="btn-outline" style={{ marginTop: 8 }} onClick={() => { setOpenId(openId === o.id ? '' : o.id); setBilling(null); setQ('') }}>{openId === o.id ? tr('close') : tr('open')}</button>
            {openId === o.id && renderOrder(o)}
          </div>
        ))}
      </div>

      <Collapsible title={tr('directSale')}>
        <div className="field">
          <input placeholder={tr('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {list.map((d) => {
          const left = Math.max(0, (stock[d.id] || 0) - (reserved[d.id] || 0))
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
        {lines.length === 0 && <p style={{ margin: '12px 0 0', color: 'var(--muted)' }}>{tr('cartEmpty')}</p>}
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
      </Collapsible>

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
            {!s.voided_at && (
              <a className="btn-outline" style={{ display: 'inline-block', marginTop: 6, marginRight: 8, textDecoration: 'none', lineHeight: '24px' }} href={'/ticket?id=' + s.id} target="_blank" rel="noreferrer">🖨 {tr('printTicket')}</a>
            )}
            {canVoid(s) && !(ask && ask.kind === 'sale' && ask.id === s.id) && <button className="btn-danger" style={{ marginTop: 6 }} disabled={busy} onClick={() => setAsk({ kind: 'sale', id: s.id })}>{tr('voidBtn')}</button>}
            {ask && ask.kind === 'sale' && ask.id === s.id && (
              <AskBox label={tr('voidReason')} submitText={tr('voidBtn')} cancelText={tr('back')} busy={busy} onSubmit={(r) => voidSale(s, r)} onCancel={() => setAsk(null)} />
            )}
            {s.voided_at && s.void_reason && <div style={{ fontSize: 13, color: 'var(--err)' }}>{s.void_reason}</div>}
          </div>
        ))}
      </div>

      <ReportPanel key={barId} kind="sales" barId={barId} barName={(bars.find((b) => b.id === barId) || {}).name} />
    </div>
  )
}
