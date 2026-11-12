'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import { chooseBar } from '../../lib/activebar'

const L = {
  fr: {
    title: 'Boissons',
    add: 'Ajouter une boisson',
    search: 'Rechercher une boisson',
    tabActive: 'Actives',
    tabSuspended: 'Suspendues',
    tabTrash: 'Corbeille',
    name: 'Nom',
    category: 'Catégorie',
    buy: 'Prix d’achat par bouteille (FCFA)',
    sell: 'Prix de vente par bouteille (FCFA)',
    perCase: 'Bouteilles par casier',
    threshold: 'Seuil d’alerte du stock',
    save: 'Enregistrer',
    cancel: 'Annuler',
    edit: 'Modifier',
    suspend: 'Suspendre',
    reactivate: 'Réactiver',
    toTrash: 'Mettre à la corbeille',
    restore: 'Restaurer',
    deleteForever: 'Supprimer définitivement',
    confirmTrash: 'Mettre cette boisson à la corbeille ?',
    confirmDelete: 'Supprimer définitivement ? Cette action est irréversible.',
    margin: 'Marge',
    empty: 'Aucune boisson',
    saved: 'Enregistré',
    bar: 'Bar',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    duplicate: 'Cette boisson existe déjà dans ce bar.',
    cat_beer: 'Bière',
    cat_soft: 'Boisson gazeuse',
    cat_liquor: 'Spiritueux',
    cat_wine: 'Vin',
    cat_water: 'Eau',
    cat_juice: 'Jus',
    cat_other: 'Autre',
  },
  en: {
    title: 'Drinks',
    add: 'Add a drink',
    search: 'Search a drink',
    tabActive: 'Active',
    tabSuspended: 'Suspended',
    tabTrash: 'Trash',
    name: 'Name',
    category: 'Category',
    buy: 'Purchase price per bottle (FCFA)',
    sell: 'Selling price per bottle (FCFA)',
    perCase: 'Bottles per case',
    threshold: 'Stock alert level',
    save: 'Save',
    cancel: 'Cancel',
    edit: 'Edit',
    suspend: 'Suspend',
    reactivate: 'Reactivate',
    toTrash: 'Move to trash',
    restore: 'Restore',
    deleteForever: 'Delete permanently',
    confirmTrash: 'Move this drink to the trash?',
    confirmDelete: 'Delete permanently? This cannot be undone.',
    margin: 'Margin',
    empty: 'No drinks',
    saved: 'Saved',
    bar: 'Bar',
    locked: 'Access locked: contact the administrator.',
    duplicate: 'This drink already exists in this bar.',
    cat_beer: 'Beer',
    cat_soft: 'Soft drink',
    cat_liquor: 'Spirits',
    cat_wine: 'Wine',
    cat_water: 'Water',
    cat_juice: 'Juice',
    cat_other: 'Other',
  },
}

const CATS = ['beer', 'soft', 'liquor', 'wine', 'water', 'juice', 'other']
const EMPTY = { name: '', category: 'beer', buy_price: '', sell_price: '', units_per_case: 12, alert_threshold: 6 }
const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

function buyOf(d) {
  const c = d.drink_costs
  const row = Array.isArray(c) ? c[0] : c
  return row ? row.buy_price : null
}

export default function Boissons() {
  const router = useRouter()
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [bars, setBars] = useState([])
  const [barId, setBarId] = useState('')
  const [drinks, setDrinks] = useState([])
  const [tab, setTab] = useState('active')
  const [q, setQ] = useState('')
  const [form, setForm] = useState(null)
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  const role = profile ? profile.role : ''
  const isAdmin = role === 'admin'
  const canEdit = role === 'admin' || role === 'accountant'

  async function loadDrinks(id) {
    if (!id) return
    const { data, error } = await supabase
      .from('drinks')
      .select('*, drink_costs(buy_price)')
      .eq('bar_id', id)
      .order('name')
    if (error) setErr(error.message)
    else setDrinks(data)
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
        loadDrinks(id)
      }
    }
    init()
  }, [router])

  async function run(fn, okKey) {
    setBusy(true)
    setErr('')
    setMsg('')
    try {
      await fn()
      setMsg(tr(okKey))
      await loadDrinks(barId)
    } catch (e) {
      setErr(e.message.includes('drinks_unique_name') ? tr('duplicate') : e.message)
    }
    setBusy(false)
  }

  function save(e) {
    e.preventDefault()
    run(async () => {
      const row = {
        name: form.name.trim(),
        category: form.category,
        sell_price: Number(form.sell_price),
        units_per_case: Number(form.units_per_case),
        alert_threshold: Number(form.alert_threshold),
      }
      let id = editId
      if (editId) {
        const { error } = await supabase.from('drinks').update(row).eq('id', editId)
        if (error) throw new Error(error.message)
      } else {
        const { data, error } = await supabase.from('drinks').insert({ ...row, bar_id: barId }).select('id').single()
        if (error) throw new Error(error.message)
        id = data.id
      }
      const { error: e2 } = await supabase.from('drink_costs').upsert({ drink_id: id, buy_price: Number(form.buy_price) })
      if (e2) throw new Error(e2.message)
      setForm(null)
      setEditId(null)
    }, 'saved')
  }

  function openEdit(d) {
    const buy = buyOf(d)
    setEditId(d.id)
    setForm({ name: d.name, category: d.category, buy_price: buy == null ? 0 : buy, sell_price: d.sell_price, units_per_case: d.units_per_case, alert_threshold: d.alert_threshold })
    setTimeout(() => {
      const el = document.getElementById('inline-form')
      if (el) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    }, 60)
  }

  function patch(d, values, confirmKey) {
    if (confirmKey && !window.confirm(tr(confirmKey))) return
    run(async () => {
      const { error } = await supabase.from('drinks').update(values).eq('id', d.id)
      if (error) throw new Error(error.message)
    }, 'saved')
  }

  function removeForever(d) {
    if (!window.confirm(tr('confirmDelete'))) return
    run(async () => {
      const { error } = await supabase.from('drinks').delete().eq('id', d.id)
      if (error) throw new Error(error.message)
    }, 'saved')
  }

  function inp(key, label, type = 'text') {
    return (
      <div className="field">
        <label>{label}</label>
        <input type={type} value={form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.value })} required />
      </div>
    )
  }

  function renderForm() {
    return (
      <form onSubmit={save}>
        {inp('name', tr('name'))}
        <div className="field">
          <label>{tr('category')}</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
            {CATS.map((c) => <option key={c} value={c}>{tr('cat_' + c)}</option>)}
          </select>
        </div>
        {inp('buy_price', tr('buy'), 'number')}
        {inp('sell_price', tr('sell'), 'number')}
        {inp('units_per_case', tr('perCase'), 'number')}
        {inp('alert_threshold', tr('threshold'), 'number')}
        <button type="submit" className="btn-primary" disabled={busy}>{tr('save')}</button>
        <button type="button" className="btn-outline" style={{ width: '100%', marginTop: 8 }} onClick={() => { setForm(null); setEditId(null) }}>{tr('cancel')}</button>
      </form>
    )
  }

  if (!profile) return <div className="container">...</div>

  const tabs = isAdmin ? ['active', 'suspended', 'trash'] : role === 'accountant' ? ['active', 'suspended'] : []
  const list = drinks.filter((d) => {
    const inTab = tab === 'trash' ? d.deleted_at : tab === 'suspended' ? !d.deleted_at && d.is_suspended : !d.deleted_at && !d.is_suspended
    return inTab && d.name.toLowerCase().includes(q.toLowerCase())
  })

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {msg && <div className="ok-msg">{msg}</div>}
        {err && <div className="error-msg">{err}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        {bars.length > 1 && (
          <p style={{ margin: '0 0 12px', color: 'var(--muted)' }}>{tr('bar')} : <strong>{(bars.find((b) => b.id === barId) || {}).name}</strong></p>
        )}
        <div className="field">
          <input placeholder={tr('search')} value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        {tabs.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {tabs.map((k) => (
              <button key={k} className={tab === k ? 'btn-primary' : 'btn-outline'} style={{ flex: 1, marginTop: 0, padding: '8px 4px' }} onClick={() => setTab(k)}>
                {tr(k === 'active' ? 'tabActive' : k === 'suspended' ? 'tabSuspended' : 'tabTrash')}
              </button>
            ))}
          </div>
        )}
        {canEdit && !locked && !form && (
          <button className="btn-primary" onClick={() => { setEditId(null); setForm(EMPTY) }}>{tr('add')}</button>
        )}
      </div>

      {form && !editId && (
        <div className="card" style={{ marginTop: 16 }}>
          <h1>{tr('add')}</h1>
          {renderForm()}
        </div>
      )}

      {list.length === 0 && <p style={{ textAlign: 'center', color: 'var(--muted)', marginTop: 24 }}>{tr('empty')}</p>}

      {list.map((d) => {
        const buy = buyOf(d)
        return (
          <div className="card" key={d.id} style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <strong>{d.name}</strong>
              <span className="badge">{tr('cat_' + d.category)}</span>
            </div>
            <p style={{ margin: '6px 0 12px', color: 'var(--muted)', fontSize: 14 }}>
              {fmt(d.sell_price)}
              {canEdit && buy != null && ' · ' + tr('margin') + ' ' + fmt(d.sell_price - buy)}
            </p>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {canEdit && tab !== 'trash' && <button className="btn-outline" disabled={busy} onClick={() => openEdit(d)}>{tr('edit')}</button>}
              {isAdmin && tab === 'active' && <button className="btn-outline" disabled={busy} onClick={() => patch(d, { is_suspended: true })}>{tr('suspend')}</button>}
              {isAdmin && tab === 'suspended' && <button className="btn-outline" disabled={busy} onClick={() => patch(d, { is_suspended: false })}>{tr('reactivate')}</button>}
              {isAdmin && tab !== 'trash' && <button className="btn-danger" disabled={busy} onClick={() => patch(d, { deleted_at: new Date().toISOString() }, 'confirmTrash')}>{tr('toTrash')}</button>}
              {isAdmin && tab === 'trash' && <button className="btn-outline" disabled={busy} onClick={() => patch(d, { deleted_at: null })}>{tr('restore')}</button>}
              {isAdmin && tab === 'trash' && <button className="btn-danger" disabled={busy} onClick={() => removeForever(d)}>{tr('deleteForever')}</button>}
            </div>
            {form && editId === d.id && (
              <div id="inline-form" style={{ marginTop: 12, padding: 12, border: '1px solid var(--line)', borderRadius: 12, background: 'var(--hover)' }}>
                <strong style={{ display: 'block', marginBottom: 10 }}>{tr('edit')}</strong>
                {renderForm()}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
