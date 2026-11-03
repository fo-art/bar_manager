'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from '../components/Providers'
import SiteShell from '../site/SiteShell'

const L = {
  fr: {
    title: 'Vérification d’un ticket',
    loading: 'Vérification en cours...',
    invalid: 'Ticket non reconnu. Ce ticket n’est pas authentique ou le code est incorrect.',
    valid: 'Ticket authentique',
    voided: 'Ce ticket a été annulé',
    bar: 'Établissement',
    ref: 'Référence',
    date: 'Date',
    total: 'Total',
    payment: 'Paiement',
    pay_cash: 'Espèces',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Crédit (ardoise)',
  },
  en: {
    title: 'Receipt verification',
    loading: 'Verifying...',
    invalid: 'Receipt not recognized. It is not authentic or the code is incorrect.',
    valid: 'Authentic receipt',
    voided: 'This receipt has been voided',
    bar: 'Venue',
    ref: 'Reference',
    date: 'Date',
    total: 'Total',
    payment: 'Payment',
    pay_cash: 'Cash',
    pay_mtn_momo: 'MTN MoMo',
    pay_orange_money: 'Orange Money',
    pay_credit: 'Credit (tab)',
  },
}

const fmt = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' FCFA'

export default function Verification() {
  const { lang } = usePrefs()
  const tr = (k) => L[lang][k]
  const [state, setState] = useState('loading')
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const code = new URLSearchParams(window.location.search).get('c') || ''
      const { data: d } = await supabase.rpc('verify_ticket', { p_code: code })
      if (!d) {
        setState('invalid')
        return
      }
      setData(d)
      setState(d.voided ? 'voided' : 'valid')
    }
    load()
  }, [])

  return (
    <SiteShell>
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h1>{tr('title')}</h1>
        {state === 'loading' && <p>{tr('loading')}</p>}
        {state === 'invalid' && <div className="error-msg">{tr('invalid')}</div>}
        {state === 'valid' && <div className="ok-msg"><strong>✔ {tr('valid')}</strong></div>}
        {state === 'voided' && <div className="error-msg"><strong>✖ {tr('voided')}</strong></div>}
        {data && (
          <div style={{ fontSize: 14 }}>
            <p style={{ margin: '0 0 4px' }}>{tr('bar')} : <strong>{data.bar}</strong></p>
            <p style={{ margin: '0 0 4px' }}>{tr('ref')} : <strong>{data.ref}</strong></p>
            <p style={{ margin: '0 0 12px' }}>{tr('date')} : {new Date(data.created_at).toLocaleString(lang === 'fr' ? 'fr-FR' : 'en-GB', { timeZone: 'Africa/Douala' })}</p>
            {data.items.map((it, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                <span>{it.qty} × {it.name}</span>
                <span>{fmt(it.qty * it.price)}</span>
              </div>
            ))}
            <p style={{ fontSize: 17, fontWeight: 700, margin: '12px 0 4px' }}>{tr('total')} : {fmt(data.total)}</p>
            <p style={{ margin: 0 }}>{tr('payment')} : {tr('pay_' + data.method)}</p>
          </div>
        )}
      </div>
    </SiteShell>
  )
}
