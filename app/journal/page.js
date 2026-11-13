'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'

const L = {
  fr: {
    title: 'Journal d’activité',
    period: 'Période',
    p_today: 'Aujourd’hui',
    p_7: '7 derniers jours',
    p_30: '30 derniers jours',
    p_all: 'Tout',
    user: 'Utilisateur',
    allUsers: 'Tous les utilisateurs',
    group: 'Type d’activité',
    g_all: 'Toutes',
    g_sales: 'Ventes et ardoises',
    g_stock: 'Stock',
    g_drinks: 'Boissons et prix',
    g_cash: 'Clôtures de caisse',
    g_login: 'Connexions',
    g_team: 'Équipe',
    more: 'Voir plus',
    empty: 'Aucune activité',
    locked: 'Accès verrouillé : contactez l’administrateur.',
    pay_cash: 'Espèces',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Crédit (ardoise)',
    expected: 'Attendu',
    counted: 'Compté',
    diff: 'Écart',
    a_login: 'Connexion',
    a_sale: 'Vente',
    a_sale_voided: 'Vente annulée',
    a_credit_payment: 'Ardoise encaissée',
    a_cash_closed: 'Caisse clôturée',
    a_drink_created: 'Boisson créée',
    a_drink_updated: 'Boisson modifiée',
    a_price_changed: 'Prix de vente modifié',
    a_cost_changed: 'Prix d’achat modifié',
    a_drink_suspended: 'Boisson suspendue',
    a_drink_reactivated: 'Boisson réactivée',
    a_drink_trashed: 'Boisson mise à la corbeille',
    a_drink_restored: 'Boisson restaurée',
    a_drink_deleted: 'Boisson supprimée définitivement',
    a_stock_purchase: 'Entrée de stock',
    a_stock_loss: 'Perte / casse',
    a_stock_gift: 'Offert',
    a_stock_adjustment: 'Inventaire / ajustement',
    a_order_cancelled: 'Commande annulée',
  },
  en: {
    title: 'Activity log',
    period: 'Period',
    p_today: 'Today',
    p_7: 'Last 7 days',
    p_30: 'Last 30 days',
    p_all: 'All',
    user: 'User',
    allUsers: 'All users',
    group: 'Activity type',
    g_all: 'All',
    g_sales: 'Sales and tabs',
    g_stock: 'Stock',
    g_drinks: 'Drinks and prices',
    g_cash: 'Cash closings',
    g_login: 'Logins',
    g_team: 'Team',
    more: 'Show more',
    empty: 'No activity',
    locked: 'Access locked: contact the administrator.',
    pay_cash: 'Cash',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Credit (tab)',
    expected: 'Expected',
    counted: 'Counted',
    diff: 'Difference',
    a_login: 'Login',
    a_sale: 'Sale',
    a_sale_voided: 'Sale voided',
    a_credit_payment: 'Tab payment received',
    a_cash_closed: 'Cash closed',
    a_drink_created: 'Drink created',
    a_drink_updated: 'Drink updated',
    a_price_changed: 'Selling price changed',
    a_cost_changed: 'Purchase price changed',
    a_drink_suspended: 'Drink suspended',
    a_drink_reactivated: 'Drink reactivated',
    a_drink_trashed: 'Drink moved to trash',
    a_drink_restored: 'Drink restored',
    a_drink_deleted: 'Drink permanently deleted',
    a_stock_purchase: 'Stock entry',
    a_stock_loss: 'Loss / breakage',
    a_stock_gift: 'Gift',
    a_stock_adjustment: 'Count / adjustment',
    a_order_cancelled: 'Order cancelled',
  },
}

const GROUPS = {
  sales: ['sale', 'sale_voided', 'credit_payment', 'order_cancelled'],
  stock: ['stock_purchase', 'stock_loss', 'stock_gift', 'stock_adjustment'],
  drinks: ['drink_created', 'drink_updated', 'price_changed', 'cost_changed', 'drink_suspended', 'drink_reactivated', 'drink_trashed', 'drink_restored', 'drink_deleted'],
  cash: ['cash_closed'],
  login: ['login'],
  team: ['staff_created', 'staff_deactivated', 'staff_reactivated', 'staff_updated', 'staff_deleted'],
}
const fmt = (n) => Number(n).toLocaleString('fr-FR') + ' FCFA'

function since(p) {
  if (p === 'all') return null
  const d = new Date(Date.now() + 3600000)
  d.setUTCHours(0, 0, 0, 0)
  const todayStart = d.getTime() - 3600000
  if (p === 'today') return new Date(todayStart).toISOString()
  return new Date(todayStart - (Number(p) - 1) * 86400000).toISOString()
}

export default function Journal() {
  const router = useRouter()
  const { lang } = usePrefs()
    const EXTRA = {
    fr: { a_staff_created: 'Employé ajouté', a_staff_deactivated: 'Employé désactivé', a_staff_reactivated: 'Employé réactivé', a_expense_added: 'Dépense enregistrée', a_rebate_added: 'Ristourne fournisseur', a_finance_voided: 'Écriture annulée', a_staff_updated: 'Employé modifié', a_staff_deleted: 'Employé supprimé', f_name: 'Nom', f_email: 'Identifiant', f_bar: 'Bar', f_allbars: 'Tous les bars' },
    en: { a_staff_created: 'Employee added', a_staff_deactivated: 'Employee deactivated', a_staff_reactivated: 'Employee reactivated', a_expense_added: 'Expense recorded', a_rebate_added: 'Supplier rebate', a_finance_voided: 'Entry voided', a_staff_updated: 'Employee updated', a_staff_deleted: 'Employee deleted', f_name: 'Name', f_email: 'Login', f_bar: 'Bar', f_allbars: 'All bars' },
  }
  const tr = (k) => L[lang][k] || EXTRA[lang][k] || k
  const [profile, setProfile] = useState(null)
  const [locked, setLocked] = useState(false)
  const [users, setUsers] = useState([])
  const [logs, setLogs] = useState([])
  const [period, setPeriod] = useState('today')
  const [userId, setUserId] = useState('')
  const [group, setGroup] = useState('all')
  const [limit, setLimit] = useState(50)
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
      const { data: u } = await supabase.from('profiles').select('id, full_name, email').order('full_name')
      setUsers(u || [])
    }
    init()
  }, [router])

  useEffect(() => {
    if (!profile) return
    async function load() {
      let qy = supabase
        .from('activity_log')
        .select('*, profiles(full_name, email), bars(name)')
        .order('created_at', { ascending: false })
        .limit(limit)
      const from = since(period)
      if (from) qy = qy.gte('created_at', from)
      if (userId) qy = qy.eq('user_id', userId)
      if (group !== 'all') qy = qy.in('action', GROUPS[group])
      const { data, error } = await qy
      if (error) setErr(error.message)
      else setLogs(data)
    }
    load()
  }, [profile, period, userId, group, limit])

  function detail(l) {
    const d = l.details || {}
    if (l.action === 'sale') return fmt(d.total) + ' · ' + tr('pay_' + d.method) + (d.customer ? ' · ' + d.customer : '')
    if (l.action === 'sale_voided') return fmt(d.total) + (d.reason ? ' · ' + d.reason : '')
    if (l.action === 'order_cancelled') return (d.label || '') + ((d.items || []).length ? ' · ' + d.items.map((i) => i.qty + ' × ' + i.drink).join(', ') : '') + (d.reason ? ' · ' + d.reason : '')
    if (l.action === 'staff_deleted') return (d.name || '') + (d.reason ? ' · ' + d.reason : '')
    if (l.action === 'staff_updated') return (d.name || '') + ' · ' + Object.entries(d.changes || {}).map(([k, v]) => tr('f_' + k) + ' : ' + (v.old || (k === 'bar' ? tr('f_allbars') : '-')) + ' → ' + (v.new || (k === 'bar' ? tr('f_allbars') : '-'))).join(' · ')
    if (l.action === 'credit_payment') return fmt(d.amount) + ' · ' + tr('pay_' + d.method) + (d.customer ? ' · ' + d.customer : '')
    if (l.action === 'cash_closed') return tr('expected') + ' ' + fmt(d.expected) + ' · ' + tr('counted') + ' ' + fmt(d.counted) + ' · ' + tr('diff') + ' ' + fmt(d.difference)
    if (l.action === 'price_changed' || l.action === 'cost_changed') return d.name + ' : ' + fmt(d.old) + ' → ' + fmt(d.new)
    if (l.action.startsWith('stock_')) return d.name + ' : ' + (d.qty > 0 ? '+' : '') + d.qty + (d.note ? ' · ' + d.note : '')
    return d.name || ''
  }

  if (!profile) return <div className="container">...</div>

  return (
    <div className="container">
      <div className="card">
        <h1>{tr('title')}</h1>
        {err && <div className="error-msg">{err}</div>}
        {locked && <div className="error-msg">{tr('locked')}</div>}
        <div className="field">
          <label>{tr('period')}</label>
          <select value={period} onChange={(e) => { setPeriod(e.target.value); setLimit(50) }}>
            <option value="today">{tr('p_today')}</option>
            <option value="7">{tr('p_7')}</option>
            <option value="30">{tr('p_30')}</option>
            <option value="all">{tr('p_all')}</option>
          </select>
        </div>
        <div className="field">
          <label>{tr('user')}</label>
          <select value={userId} onChange={(e) => { setUserId(e.target.value); setLimit(50) }}>
            <option value="">{tr('allUsers')}</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.full_name || u.email}</option>)}
          </select>
        </div>
        <div className="field">
          <label>{tr('group')}</label>
          <select value={group} onChange={(e) => { setGroup(e.target.value); setLimit(50) }}>
            {['all', 'sales', 'stock', 'drinks', 'cash', 'login', 'team'].map((g) => <option key={g} value={g}>{tr('g_' + g)}</option>)}
          </select>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        {logs.length === 0 && <p style={{ margin: 0, color: 'var(--muted)' }}>{tr('empty')}</p>}
        {logs.map((l) => (
          <div key={l.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 14 }}>
            <strong>{tr('a_' + l.action)}</strong>
            <div style={{ color: 'var(--muted)', fontSize: 13 }}>
              {new Date(l.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
              {' · '}{l.profiles ? (l.profiles.full_name || l.profiles.email) : '-'}{l.bars && ' · ' + l.bars.name}
            </div>
            {detail(l) && <div style={{ fontSize: 13 }}>{detail(l)}</div>}
          </div>
        ))}
        {logs.length >= limit && <button className="btn-outline" style={{ width: '100%', marginTop: 12 }} onClick={() => setLimit(limit + 50)}>{tr('more')}</button>}
      </div>
    </div>
  )
}
