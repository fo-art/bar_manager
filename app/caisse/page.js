'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import ReportPanel from '../components/ReportPanel'

const L = {
  fr: {
    title: 'Caisse',
    tabClose: 'Clôture',
    tabCredits: 'Ardoises',
    bar: 'Bar',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    closeHelp: 'Comptez les espèces que vous remettez, puis saisissez le montant. L’écart avec les ventes en espèces sera calculé.',
    counted: 'Espèces comptées (FCFA)',
    note: 'Remarque (facultatif)',
    closeBtn: 'Clôturer ma caisse',
    closed: 'Caisse clôturée',
    expected: 'Attendu',
    countedLbl: 'Compté',
    diff: 'Écart',
    history: 'Clôtures récentes',
    noClosures: 'Aucune clôture',
    creditsTitle: 'Ardoises impayées',
    noCredits: 'Aucune ardoise impayée',
    balance: 'Reste à payer',
    paidSoFar: 'déjà payé',
    collect: 'Encaisser',
    amount: 'Montant reçu (FCFA)',
    payment: 'Mode de paiement',
    pay_cash: 'Espèces',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    save: 'Enregistrer',
    cancel: 'Annuler',
    paymentSaved: 'Paiement enregistré',
    badAmount: 'Montant invalide (nombre entier requis).',
  },
  en: {
    title: 'Cash',
    tabClose: 'Closing',
    tabCredits: 'Tabs',
    bar: 'Bar',
    locked: 'Access locked: contact the administrator.',
    closeHelp: 'Count the cash you hand over, then enter the amount. The difference with cash sales will be calculated.',
    counted: 'Cash counted (FCFA)',
    note: 'Note (optional)',
    closeBtn: 'Close my cash register',
    closed: 'Cash closed',
    expected: 'Expected',
    countedLbl: 'Counted',
    diff: 'Difference',
    history: 'Recent closings',
    noClosures: 'No closings',
    creditsTitle: 'Unpaid tabs',
    noCredits: 'No unpaid tabs',
    balance: 'Balance due',
    paidSoFar: 'already paid',
    collect: 'Collect',
    amount: 'Amount received (FCFA)',
    payment: 'Payment method',
    pay_cash: 'Cash',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    save: 'Save',
    cancel: 'Cancel',
    paymentSaved: 'Payment recorded',
    badAmount: 'Invalid amount (whole number required).',
  },
}

const METHODS = ['cash', 'mtn_momo', 'orange_money']
const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'
const who = (p) => (p ? p.full_name || p.email : '-')

export default function Caisse() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [tab, setTab] = useState('close')
  const [closures, setClosures] = useState([])
  const [credits, setCredits] = useState([])
  const [counted, setCounted] = useState('')
  const [note, setNote] = useState('')
  const [pay, setPay] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function loadAll(id) {
    if (!id) return
    const { data: cl } = await supabase
      .from('cash_closures')
      .select('*, profiles(full_name, email)')
      .eq('bar_id', id)
      .order('period_end', { ascending: false })
      .limit(15)
    setClosures(cl || [])
    const { data: cr } = await supabase
      .from('sales')
      .select('id, total, customer_name, created_at, profiles!sales_server_id_fkey(full_name, email), credit_payments(amount)')
      .eq('bar_id', id)
      .eq('payment_method', 'credit')
      .is('voided_at', null)
      .is('paid_at', null)
      .order('created_at')
    setCredits(cr || [])
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
    loadAll(id)
  }

  async function closeCash(e) {
    e.preventDefault()
    const n = Number(counted)
    if (!Number.isInteger(n) || n < 0) {
      setErr(tr('badAmount'))
      return
    }
    setBusy(true)
    setErr('')
    setMsg('')
    const { data, error } = await supabase.rpc('close_cash', { p_bar: barId, p_counted: n, p_note: note.trim() || null })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    const r = data[0]
    setMsg(tr('closed') + ' · ' + tr('expected') + ' ' + fmt(r.out_expected) + ' · ' + tr('countedLbl') + ' ' + fmt(n) + ' · ' + tr('diff') + ' ' + fmt(r.out_difference))
    setCounted('')
    setNote('')
    await loadAll(barId)
  }

  async function savePay(e) {
    e.preventDefault()
    const n = Number(pay.amount)
    if (!Number.isInteger(n) || n <= 0) {
      setErr(tr('badAmount'))
      return
    }
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await supabase.rpc('pay_credit', { p_sale: pay.sale.id, p_amount: n, p_method: pay.method })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg(tr('paymentSaved'))
    setPay(null)
    await loadAll(barId)
  }

  if (!profile) return <div className="container">...</div>

  const balanceOf = (s) => s.total - (s.credit_payments || []).reduce((sum, p) => sum + p.amount, 0)
  const totalDue = credits.reduce((sum, s) => sum + balanceOf(s), 0)

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        {bars.length > 1 && (
          <div className="field">
            <label>{tr('bar')}</label>
            <select value={barId} onChange={(e) => changeBar(e.target.value)}>
              {bars.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={tab === 'close' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, marginTop: 0, padding: '8px 4px' }} onClick={() => setTab('close')}>{tr('tabClose')}</button>
          <button className={tab === 'credits' ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, marginTop: 0, padding: '8px 4px' }} onClick={() => setTab('credits')}>{tr('tabCredits')}</button>
        </div>
      </div>

      {tab === 'close' && (
        <>
          <div className="card" style={{ marginTop: 16 }}>
            <p style={{ marginTop: 0, color: 'var(--muted)', fontSize: 14 }}>{tr('closeHelp')}</p>
            <form onSubmit={closeCash}>
              <div className="field">
                <label>{tr('counted')}</label>
                <input type="number" min="0" value={counted} onChange={(e) => setCounted(e.target.value)} required />
              </div>
              <div className="field">
                <label>{tr('note')}</label>
                <input value={note} onChange={(e) => setNote(e.target.value)} />
              </div>
              <button type="submit" className="btn-primary" disabled={busy || locked}>{tr('closeBtn')}</button>
            </form>
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h1>{tr('history')}</h1>
            {closures.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('noClosures')}</p>}
            {closures.map((c) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
                <strong>{who(c.profiles)}</strong>
                <span className={'badge ' + (c.difference === 0 ? 'badge-ok' : 'badge-err')} style={{ marginLeft: 8 }}>{tr('diff')} {fmt(c.difference)}</span>
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {new Date(c.period_end).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  {' · '}{tr('expected')} {fmt(c.expected_cash)} · {tr('countedLbl')} {fmt(c.counted_cash)}
                </div>
                {c.note && <div style={{ fontSize: 13 }}>{c.note}</div>}
              </div>
            ))}
          </div>
        </>
      )}

      {tab === 'credits' && (
        <>
          {pay && (
            <div className="card" style={{ marginTop: 16 }}>
              <h1>{pay.sale.customer_name} · {tr('balance')} {fmt(balanceOf(pay.sale))}</h1>
              <form onSubmit={savePay}>
                <div className="field">
                  <label>{tr('amount')}</label>
                  <input type="number" min="1" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} required />
                </div>
                <div className="field">
                  <label>{tr('payment')}</label>
                  <select value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}>
                    {METHODS.map((m) => <option key={m} value={m}>{tr('pay_' + m)}</option>)}
                  </select>
                </div>
                <button type="submit" className="btn-primary" disabled={busy}>{tr('save')}</button>
                <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setPay(null)}>{tr('cancel')}</button>
              </form>
            </div>
          )}
          <div className="card" style={{ marginTop: 16 }}>
            <h1>{tr('creditsTitle')} · {fmt(totalDue)}</h1>
            {credits.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('noCredits')}</p>}
            {credits.map((s) => (
              <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
                <strong>{s.customer_name}</strong> · {tr('balance')} {fmt(balanceOf(s))}
                <div style={{ color: 'var(--muted)', fontSize: 13 }}>
                  {new Date(s.created_at).toLocaleDateString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala' })} · {fmt(s.total)} · {who(s.profiles)}
                </div>
                <button className="btn-outline" style={{ marginTop: 6 }} disabled={busy || locked} onClick={() => setPay({ sale: s, amount: balanceOf(s), method: 'cash' })}>{tr('collect')}</button>
              </div>
            ))}
          </div>
        </>
      )}

      <ReportPanel key={barId} kind="cash" barId={barId} barName={(bars.find((b) => b.id === barId) || {}).name} />
    </div>
  )
}
