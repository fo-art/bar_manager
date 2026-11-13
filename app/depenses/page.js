'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import AskBox from '../components/askbox'
import { chooseBar } from '../../lib/activebar'

const L = {
  fr: {
    title: 'Dépenses et ristournes',
    bar: 'Bar',
    from: 'Du',
    to: 'Au',
    add: 'Ajouter une écriture',
    kind: 'Type',
    k_expense: 'Dépense',
    k_rebate: 'Ristourne fournisseur',
    category: 'Catégorie',
    c_rent: 'Loyer',
    c_salaries: 'Salaires',
    c_electricity: 'Électricité',
    c_water: 'Eau',
    c_transport: 'Transport',
    c_repairs: 'Réparations',
    c_other: 'Autre',
    c_rebate: 'Ristourne',
    label_expense: 'Description',
    label_rebate: 'Fournisseur',
    amount: 'Montant (FCFA)',
    date: 'Date',
    note: 'Remarque',
    save: 'Enregistrer',
    cancel: 'Annuler',
    saved: 'Enregistré',
    totalExpenses: 'Total des dépenses',
    totalRebates: 'Total des ristournes',
    empty: 'Aucune écriture sur cette période',
    voidBtn: 'Annuler',
    voidReason: 'Motif de l’annulation :',
    voided: 'Annulée',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    badAmount: 'Montant invalide (nombre entier positif).',
  },
  en: {
    title: 'Expenses and rebates',
    bar: 'Bar',
    from: 'From',
    to: 'To',
    add: 'Add an entry',
    kind: 'Type',
    k_expense: 'Expense',
    k_rebate: 'Supplier rebate',
    category: 'Category',
    c_rent: 'Rent',
    c_salaries: 'Salaries',
    c_electricity: 'Electricity',
    c_water: 'Water',
    c_transport: 'Transport',
    c_repairs: 'Repairs',
    c_other: 'Other',
    c_rebate: 'Rebate',
    label_expense: 'Description',
    label_rebate: 'Supplier',
    amount: 'Amount (FCFA)',
    date: 'Date',
    note: 'Note',
    save: 'Save',
    cancel: 'Cancel',
    saved: 'Saved',
    totalExpenses: 'Total expenses',
    totalRebates: 'Total rebates',
    empty: 'No entries in this period',
    voidBtn: 'Void',
    voidReason: 'Reason for voiding:',
    voided: 'Voided',
    locked: 'Access locked: contact the administrator.',
    badAmount: 'Invalid amount (positive whole number).',
  },
}

const CATS = ['rent', 'salaries', 'electricity', 'water', 'transport', 'repairs', 'other']
const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'
const dayStr = (offset) => new Date(Date.now() + 3600000 - offset * 86400000).toISOString().slice(0, 10)
const EMPTY = { kind: 'expense', category: 'rent', label: '', amount: '', entry_date: dayStr(0), note: '' }

export default function Depenses() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [askId, setAskId] = useState('')
  const [from, setFrom] = useState(dayStr(0).slice(0, 8) + '01')
  const [to, setTo] = useState(dayStr(0))
  const [entries, setEntries] = useState([])
  const [form, setForm] = useState(null)
  const [reload, setReload] = useState(0)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

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
      if (b && b.length) setBarId(chooseBar(b))
    }
    init()
  }, [router])

  useEffect(() => {
    if (!profile || !barId) return
    async function load() {
      const { data, error } = await supabase
        .from('finance_entries')
        .select('*, profiles!finance_entries_created_by_fkey(full_name, email)')
        .eq('bar_id', barId)
        .gte('entry_date', from)
        .lte('entry_date', to)
        .order('entry_date', { ascending: false })
        .order('created_at', { ascending: false })
      if (error) setErr(error.message)
      else setEntries(data)
    }
    load()
  }, [profile, barId, from, to, reload])

  async function save(e) {
    e.preventDefault()
    const n = Number(form.amount)
    if (!Number.isInteger(n) || n <= 0) {
      setErr(tr('badAmount'))
      return
    }
    setBusy(true)
    setErr('')
    setMsg('')
    const { error } = await supabase.from('finance_entries').insert({
      bar_id: barId,
      kind: form.kind,
      category: form.kind === 'rebate' ? 'rebate' : form.category,
      label: form.label.trim(),
      amount: n,
      entry_date: form.entry_date,
      note: form.note.trim() || null,
    })
    setBusy(false)
    if (error) {
      setErr(error.message)
      return
    }
    setMsg(tr('saved'))
    setForm(null)
    setReload(reload + 1)
  }

  async function voidEntry(en, reason) {
    setBusy(true)
    setErr('')
    const { error } = await supabase.rpc('void_finance_entry', { p_id: en.id, p_reason: reason })
    setBusy(false)
    setAskId('')
    if (error) setErr(error.message)
    else setReload(reload + 1)
  }

  if (!profile) return <div className="container">...</div>

  const valid = entries.filter((en) => !en.voided_at)
  const sum = (kind) => valid.filter((en) => en.kind === kind).reduce((s, en) => s + en.amount, 0)
  const isAdmin = profile.role === 'admin'

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {msg && <div className="ok-msg">{msg}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        {bars.length > 1 && (
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{tr('bar')} : <strong>{(bars.find((b) => b.id === barId) || {}).name}</strong></p>
        )}
        <div className="field">
          <label>{tr('from')}</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="field">
          <label>{tr('to')}</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <p style={{ margin: '0 0 12px' }}>
          <strong>{tr('totalExpenses')} : {fmt(sum('expense'))}</strong><br />
          <strong>{tr('totalRebates')} : {fmt(sum('rebate'))}</strong>
        </p>
        {!form && <button className="btn-primary" disabled={locked} onClick={() => setForm(EMPTY)}>{tr('add')}</button>}
      </div>

      {form && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1>{tr('add')}</h1>
          <form onSubmit={save}>
            <div className="field">
              <label>{tr('kind')}</label>
              <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
                <option value="expense">{tr('k_expense')}</option>
                <option value="rebate">{tr('k_rebate')}</option>
              </select>
            </div>
            {form.kind === 'expense' && (
              <div className="field">
                <label>{tr('category')}</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATS.map((c) => <option key={c} value={c}>{tr('c_' + c)}</option>)}
                </select>
              </div>
            )}
            <div className="field">
              <label>{form.kind === 'rebate' ? tr('label_rebate') : tr('label_expense')}</label>
              <input value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
            </div>
            <div className="field">
              <label>{tr('amount')}</label>
              <input type="number" min="1" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
            </div>
            <div className="field">
              <label>{tr('date')}</label>
              <input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>{tr('note')}</label>
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>{tr('save')}</button>
            <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => setForm(null)}>{tr('cancel')}</button>
          </form>
        </div>
      )}

      <div className="card" style={{ marginTop: 16 }}>
        {entries.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('empty')}</p>}
        {entries.map((en) => (
          <div key={en.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14, opacity: en.voided_at ? 0.55 : 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>{en.label}</strong>
              <span>{en.kind === 'rebate' ? '+' : '-'} {fmt(en.amount)}</span>
            </div>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {en.entry_date} · {tr('c_' + en.category)} · {en.profiles ? (en.profiles.full_name || en.profiles.email) : '-'}
              {en.voided_at && <span className="badge badge-err" style={{ marginLeft: 8 }}>{tr('voided')}</span>}
            </div>
            {en.note && <div style={{ fontSize: 13 }}>{en.note}</div>}
            {en.voided_at && en.void_reason && <div style={{ fontSize: 13, color: 'var(--err)' }}>{en.void_reason}</div>}
            {isAdmin && !en.voided_at && askId !== en.id && <button className="btn-danger" style={{ marginTop: 6 }} disabled={busy || locked} onClick={() => setAskId(en.id)}>{tr('voidBtn')}</button>}
            {askId === en.id && (
              <AskBox label={tr('voidReason')} submitText={tr('voidBtn')} cancelText={tr('cancel')} busy={busy} onSubmit={(r) => voidEntry(en, r)} onCancel={() => setAskId('')} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
