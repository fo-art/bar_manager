'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import { chooseBar } from '../../lib/activebar'

const L = {
  fr: {
    title: 'Bilan',
    bar: 'Bar',
    allBars: 'Tous les bars',
    seeAll: 'Voir tous les bars',
    seeOne: 'Voir seulement ce bar',
    from: 'Du',
    to: 'Au',
    today: 'Aujourd’hui',
    d7: '7 jours',
    d30: '30 jours',
    month: 'Ce mois',
    resultTitle: 'Résultat de la période',
    revenue: 'Chiffre d’affaires',
    salesWord: 'ventes',
    pay_cash: 'Espèces',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Crédit (ardoise)',
    cogs: 'Coût des marchandises vendues',
    gross: 'Marge brute',
    loss: 'Casse / pertes',
    gift: 'Offerts',
    adjust: 'Écarts d’inventaire',
    expenses: 'Dépenses',
    rebates: 'Ristournes fournisseurs',
    net: 'Bénéfice net',
    others: 'Autres indicateurs',
    creditOut: 'Ardoises impayées (à ce jour)',
    creditIn: 'Ardoises encaissées sur la période',
    cashDiff: 'Écarts de caisse cumulés',
    voids: 'Ventes annulées',
    purchases: 'Achats de stock',
    expCat: 'Dépenses par catégorie',
    c_rent: 'Loyer',
    c_salaries: 'Salaires',
    c_electricity: 'Électricité',
    c_water: 'Eau',
    c_transport: 'Transport',
    c_repairs: 'Réparations',
    c_other: 'Autre',
    topTitle: 'Boissons les plus vendues (bénéfice)',
    serversTitle: 'Ventes par serveur',
    costWarn: 'Les boissons sans prix d’achat sont comptées à 0 : le bénéfice est alors surestimé.',
    noData: 'Aucune vente sur cette période.',
    unitQty: 'bouteilles',
    exportCsv: 'Excel (.csv)',
    exportPdf: 'PDF',
    locked: 'Accès verrouillé : contactez l’administrateur.',
  },
  en: {
    title: 'Report',
    bar: 'Bar',
    allBars: 'All bars',
    seeAll: 'See all bars',
    seeOne: 'See this bar only',
    from: 'From',
    to: 'To',
    today: 'Today',
    d7: '7 days',
    d30: '30 days',
    month: 'This month',
    resultTitle: 'Period result',
    revenue: 'Revenue',
    salesWord: 'sales',
    pay_cash: 'Cash',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Credit (tab)',
    cogs: 'Cost of goods sold',
    gross: 'Gross margin',
    loss: 'Breakage / losses',
    gift: 'Gifts',
    adjust: 'Inventory differences',
    expenses: 'Expenses',
    rebates: 'Supplier rebates',
    net: 'Net profit',
    others: 'Other indicators',
    creditOut: 'Unpaid tabs (to date)',
    creditIn: 'Tabs collected in the period',
    cashDiff: 'Cumulative cash differences',
    voids: 'Voided sales',
    purchases: 'Stock purchases',
    expCat: 'Expenses by category',
    c_rent: 'Rent',
    c_salaries: 'Salaries',
    c_electricity: 'Electricity',
    c_water: 'Water',
    c_transport: 'Transport',
    c_repairs: 'Repairs',
    c_other: 'Other',
    topTitle: 'Best-selling drinks (profit)',
    serversTitle: 'Sales by server',
    costWarn: 'Drinks without a purchase price count as 0: profit is then overestimated.',
    noData: 'No sales in this period.',
    unitQty: 'bottles',
    exportCsv: 'Excel (.csv)',
    exportPdf: 'PDF',
    locked: 'Access locked: contact the administrator.',
  },
}

const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
const dayStr = (offset) => new Date(Date.now() + 3600000 - offset * 86400000).toISOString().slice(0, 10)
const clean = (s) => String(s).replace(/’/g, "'")

export default function Bilan() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [activeId, setActiveId] = useState('')
  const [from, setFrom] = useState(dayStr(0).slice(0, 8) + '01')
  const [to, setTo] = useState(dayStr(0))
  const [data, setData] = useState(null)
  const [err, setErr] = useState('')

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
        const id = chooseBar(b)
        setActiveId(id)
        setBarId(id)
      }
    }
    init()
  }, [router])

  useEffect(() => {
    if (!profile || !from || !to) return
    async function load() {
      setErr('')
      const { data: d, error } = await supabase.rpc('get_bilan', { p_bar: barId || null, p_from: from, p_to: to })
      if (error) setErr(error.message)
      else setData(d)
    }
    load()
  }, [profile, barId, from, to])

  function quick(days) {
    setFrom(dayStr(days - 1))
    setTo(dayStr(0))
  }

  function download(blob, name) {
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = name
    a.click()
    URL.revokeObjectURL(url)
  }

  if (!profile) return <div className="container">...</div>

  const d = data
  const lo = d ? d.losses : null
  const gross = d ? d.sales.total - d.cogs : 0
  const net = d ? gross - lo.loss - lo.gift - lo.adjust - d.expenses + d.rebates : 0
  const rows = d ? [
    { h: tr('resultTitle') },
    { l: tr('revenue') + ' (' + d.sales.count + ' ' + tr('salesWord') + ')', v: fmt(d.sales.total), b: 1 },
    { l: '· ' + tr('pay_cash'), v: fmt(d.sales.cash) },
    { l: '· ' + tr('pay_mtn_momo'), v: fmt(d.sales.mtn_momo) },
    { l: '· ' + tr('pay_orange_money'), v: fmt(d.sales.orange_money) },
    { l: '· ' + tr('pay_credit'), v: fmt(d.sales.credit) },
    { l: tr('cogs'), v: fmt(-d.cogs) },
    { l: tr('gross'), v: fmt(gross), b: 1 },
    { l: tr('loss'), v: fmt(-lo.loss) },
    { l: tr('gift'), v: fmt(-lo.gift) },
    { l: tr('adjust'), v: fmt(-lo.adjust) },
    { l: tr('expenses'), v: fmt(-d.expenses) },
    { l: tr('rebates'), v: fmt(d.rebates) },
    { l: tr('net'), v: fmt(net), b: 1 },
    { h: tr('others') },
    { l: tr('creditOut'), v: fmt(d.credit_outstanding) },
    { l: tr('creditIn'), v: fmt(d.credit_collected) },
    { l: tr('cashDiff'), v: fmt(d.cash_diff) },
    { l: tr('voids') + ' (' + d.voids.count + ')', v: fmt(d.voids.total) },
    { l: tr('purchases'), v: fmt(d.purchases) },
    { h: tr('expCat') },
    ...d.expenses_by_category.map((c) => ({ l: tr('c_' + c.category), v: fmt(c.total) })),
    { h: tr('topTitle') },
    ...d.top.map((t) => ({ l: t.name + ' · ' + t.qty + ' ' + tr('unitQty'), v: fmt(t.profit) })),
    { h: tr('serversTitle') },
    ...d.servers.map((s) => ({ l: s.name + ' · ' + s.count, v: fmt(s.total) })),
  ] : []
  const barName = barId ? (bars.find((b) => b.id === barId) || {}).name : tr('allBars')
  const fileName = 'bilan_' + from + '_' + to

  function exportCsv() {
    const q = (x) => '"' + String(x).replace(/"/g, '""') + '"'
    const lines = [q(tr('title') + ' ' + barName), q(from + ' / ' + to)]
    for (const r of rows) {
      if (r.h) lines.push('', q(r.h))
      else lines.push(q(r.l) + ';' + r.v.replace(' FCFA', '').replace(/ /g, ''))
    }
    download(new Blob(['\uFEFF' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), fileName + '.csv')
  }

  async function exportPdf() {
    const { jsPDF } = await import('jspdf')
    const doc = new jsPDF()
    let y = 16
    doc.setFontSize(16)
    doc.text(clean(tr('title') + ' - ' + barName), 14, y)
    doc.setFontSize(10)
    y += 7
    doc.text(from + ' / ' + to, 14, y)
    y += 8
    for (const r of rows) {
      if (y > 280) {
        doc.addPage()
        y = 16
      }
      if (r.h) {
        y += 3
        doc.setFont('helvetica', 'bold')
        doc.text(clean(r.h), 14, y)
        y += 6
      } else {
        doc.setFont('helvetica', r.b ? 'bold' : 'normal')
        doc.text(clean(r.l), 14, y)
        doc.text(r.v, 196, y, { align: 'right' })
        y += 6
      }
    }
    doc.save(fileName + '.pdf')
  }

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        {bars.length > 1 && (
          <>
            <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{tr('bar')} : <strong>{barName}</strong></p>
            <button type="button" className="btn-outline" style={{ marginBottom: 12 }} onClick={() => setBarId(barId ? '' : activeId)}>{barId ? tr('seeAll') : tr('seeOne')}</button>
          </>
        )}
        <div className="field">
          <label>{tr('from')}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>{tr('to')}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn-outline" onClick={() => quick(1)}>{tr('today')}</button>
          <button className="btn-outline" onClick={() => quick(7)}>{tr('d7')}</button>
          <button className="btn-outline" onClick={() => quick(30)}>{tr('d30')}</button>
          <button className="btn-outline" onClick={() => { setFrom(dayStr(0).slice(0, 8) + '01'); setTo(dayStr(0)) }}>{tr('month')}</button>
        </div>
      </div>

      {d && (
        <div className="card" style={{ marginTop: 16 }}>
          {rows.map((r, i) => r.h ? (
            <h2 key={i} style={{ fontSize: 16, margin: '18px 0 6px', color: 'var(--green-dark)' }}>{r.h}</h2>
          ) : (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, padding: '6px 0', borderBottom: '1px solid var(--line)', fontWeight: r.b ? 700 : 400 }}>
              <span>{r.l}</span>
              <span style={{ whiteSpace: 'nowrap' }}>{r.v}</span>
            </div>
          ))}
          <p style={{ margin: '12px 0', color: 'var(--muted)', fontSize: 13 }}>{tr('costWarn')}</p>
          {d.sales.count === 0 && <p style={{ color: 'var(--muted)' }}>{tr('noData')}</p>}
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-outline" style={{ flex: 1 }} onClick={exportCsv}>{tr('exportCsv')}</button>
            <button className="btn-outline" style={{ flex: 1 }} onClick={exportPdf}>{tr('exportPdf')}</button>
          </div>
        </div>
      )}
    </div>
  )
}
