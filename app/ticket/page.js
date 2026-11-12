'use client'
import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'

const L = {
  fr: {
    title: 'TICKET DE VENTE',
    date: 'Date',
    ref: 'Réf.',
    server: 'Serveur',
    total: 'TOTAL',
    voided: 'ANNULÉ',
    scan: 'Scannez le QR code pour vérifier l’authenticité',
    thanks: 'Merci de votre visite !',
    print: 'Imprimer le ticket',
    back: 'Retour',
    notFound: 'Ticket introuvable.',
    pay_cash: 'Espèces',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Crédit (ardoise)',
  },
  en: {
    title: 'SALES RECEIPT',
    date: 'Date',
    ref: 'Ref.',
    server: 'Server',
    total: 'TOTAL',
    voided: 'VOIDED',
    scan: 'Scan the QR code to verify authenticity',
    thanks: 'Thank you for your visit!',
    print: 'Print receipt',
    back: 'Back',
    notFound: 'Receipt not found.',
    pay_cash: 'Cash',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Credit (tab)',
  },
}

const CSS = `
.ticket-wrap { max-width: 340px; margin: 0 auto; padding: 64px 12px 24px; }
.ticket { background: #fff; color: #000; padding: 14px 12px; font-family: 'Courier New', monospace; font-size: 13px; line-height: 1.45; border: 1px solid var(--line); }
.t-center { text-align: center; }
.t-big { font-size: 16px; font-weight: 700; }
.t-small { font-size: 11px; }
.t-void { font-size: 18px; font-weight: 700; border: 2px solid #000; margin: 6px 0; padding: 2px; text-align: center; }
.t-line { border-top: 1px dashed #000; margin: 8px 0; }
.t-row { display: flex; justify-content: space-between; gap: 8px; }
.t-qr { display: block; width: 150px; height: 150px; margin: 6px auto; }
.t-actions { display: flex; gap: 8px; margin-top: 16px; }
@page { size: 80mm auto; margin: 3mm; }
@media print {
  body { background: #fff !important; }
  .no-print, .fb-back, .fb-right { display: none !important; }
  .ticket-wrap { max-width: none; padding: 0; }
  .ticket { border: 0; padding: 0; }
  .void-ticket { display: none !important; }
}
`

const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'

export default function Ticket() {
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [sale, setSale] = useState(null)
  const [qr, setQr] = useState('')
  const [err, setErr] = useState(false)

  useEffect(() => {
    async function load() {
      const params = new URLSearchParams(window.location.search)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        window.location.href = '/connexion'
        return
      }
      const { data, error } = await supabase
        .from('sales')
        .select('id, total, payment_method, customer_name, created_at, voided_at, ticket_code, bars(name), profiles!sales_server_id_fkey(full_name, email), sale_items(qty, unit_price, drinks(name))')
        .eq('id', params.get('id'))
        .single()
      if (error || !data) {
        setErr(true)
        return
      }
      setSale(data)
      const url = window.location.origin + '/verification?c=' + data.ticket_code
      setQr(await QRCode.toDataURL(url, { margin: 1, width: 280 }))
      if (params.get('auto') === '1' && !data.voided_at) setTimeout(() => window.print(), 600)
    }
    load()
  }, [])

  if (err) return <div className="container">{tr('notFound')}</div>
  if (!sale) return <div className="container">...</div>

  const server = sale.profiles ? sale.profiles.full_name || sale.profiles.email : '-'
  const ref = sale.ticket_code.slice(0, 8).toUpperCase()
  const date = new Date(sale.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala', day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  const pay = tr('pay_' + sale.payment_method) + (sale.customer_name ? ' : ' + sale.customer_name : '')

  return (
    <div className="ticket-wrap">
      <style>{CSS}</style>
      <div className={'ticket' + (sale.voided_at ? ' void-ticket' : '')}>
        <div className="t-center t-big">{sale.bars ? sale.bars.name : ''}</div>
        <div className="t-center">{tr('title')}</div>
        {sale.voided_at && <div className="t-void">{tr('voided')}</div>}
        <div className="t-line" />
        <div>{tr('date')} : {date}</div>
        <div>{tr('ref')} : {ref}</div>
        <div>{tr('server')} : {server}</div>
        <div className="t-line" />
        {sale.sale_items.map((it, i) => (
          <div className="t-row" key={i}>
            <span>{it.qty} x {it.drinks ? it.drinks.name : '?'}</span>
            <span>{fmt(it.qty * it.unit_price)}</span>
          </div>
        ))}
        <div className="t-line" />
        <div className="t-row t-big">
          <span>{tr('total')}</span>
          <span>{fmt(sale.total)}</span>
        </div>
        <div>{pay}</div>
        <div className="t-line" />
        {qr && <img className="t-qr" src={qr} alt="QR" />}
        <div className="t-center t-small">{tr('scan')}</div>
        <div className="t-center t-small">{ref}</div>
        <div className="t-center">{tr('thanks')}</div>
      </div>
      <div className="no-print t-actions">
        {!sale.voided_at && <button className="btn-primary" onClick={() => window.print()}>{tr('print')}</button>}
        <button className="btn-outline" onClick={() => window.history.back()}>{tr('back')}</button>
      </div>
    </div>
  )
}
