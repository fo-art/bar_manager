const num = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fmt = (n) => num(n) + ' FCFA'
const dt = (ts) => {
  const iso = new Date(new Date(ts).getTime() + 3600000).toISOString()
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) + ' ' + iso.slice(11, 16)
}
const dd = (day) => day.slice(8, 10) + '/' + day.slice(5, 7) + '/' + day.slice(0, 4)
const t = (lang, fr, en) => (lang === 'fr' ? fr : en)
const pay = (lang, m) => ({ cash: t(lang, 'Espèces', 'Cash'), mtn_momo: 'MTN MoMo', orange_money: 'Orange Money', credit: t(lang, 'Crédit', 'Credit') }[m] || m)
const mk = (lang, k) => ({ purchase: t(lang, 'Entrée', 'Entry'), loss: t(lang, 'Perte / casse', 'Loss'), gift: t(lang, 'Offert', 'Gift'), adjustment: t(lang, 'Inventaire / ajustement', 'Count / adjustment') }[k] || k)
const items = (list) => (list || []).map((i) => i.qty + ' x ' + i.name).join(', ')

function salesSpec(data, lang) {
  const s = data.summary
  const showProfit = data.by_drink.length > 0 && data.by_drink[0].profit != null
  const summary = [
    [t(lang, 'Nombre de ventes', 'Number of sales'), String(s.count)],
    [t(lang, 'Chiffre d’affaires', 'Revenue'), fmt(s.total)],
    [pay(lang, 'cash'), fmt(s.cash)],
    [pay(lang, 'mtn_momo'), fmt(s.mtn_momo)],
    [pay(lang, 'orange_money'), fmt(s.orange_money)],
    [pay(lang, 'credit'), fmt(s.credit)],
    [t(lang, 'Ventes annulées', 'Voided sales'), data.voids.count + ' / ' + fmt(data.voids.total)],
    [t(lang, 'Ticket moyen', 'Average ticket'), fmt(s.count ? s.total / s.count : 0)],
  ]
  const sections = [
    {
      title: t(lang, 'Ventes par boisson', 'Sales by drink'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Quantité', 'Quantity'), t(lang, 'Chiffre d’affaires', 'Revenue')].concat(showProfit ? [t(lang, 'Bénéfice brut', 'Gross profit')] : []),
      body: data.by_drink.map((r) => [r.name, String(r.qty), fmt(r.revenue)].concat(showProfit ? [fmt(r.profit)] : [])),
    },
    {
      title: t(lang, 'Ventes par serveur', 'Sales by server'),
      head: [t(lang, 'Serveur', 'Server'), t(lang, 'Ventes', 'Sales'), 'Total'],
      body: data.by_server.map((r) => [r.name, String(r.count), fmt(r.total)]),
    },
    {
      title: t(lang, 'Ventes par jour', 'Sales by day'),
      head: ['Date', t(lang, 'Ventes', 'Sales'), 'Total'],
      body: data.by_day.map((r) => [dd(r.day), String(r.count), fmt(r.total)]),
    },
    {
      title: t(lang, 'Détail des ventes', 'Sales detail'),
      head: ['Date', t(lang, 'Réf.', 'Ref.'), t(lang, 'Serveur', 'Server'), t(lang, 'Paiement', 'Payment'), t(lang, 'Articles', 'Items'), 'Total', t(lang, 'Statut', 'Status')],
      body: data.sales.map((r) => [dt(r.ts), r.ref, r.server, pay(lang, r.method) + (r.customer ? ' (' + r.customer + ')' : ''), items(r.items), fmt(r.total), r.voided ? t(lang, 'Annulée', 'Voided') + (r.void_reason ? ' : ' + r.void_reason : '') : 'OK']),
      note: data.truncated ? t(lang, 'Liste limitée aux 3000 premières ventes de la période.', 'List limited to the first 3000 sales of the period.') : '',
    },
  ]
  return { title: t(lang, 'Bilan des ventes', 'Sales report'), summary, sections }
}

function cashSpec(data, lang) {
  const m = data.methods
  const c = data.collected
  const cl = data.closures
  const sum = (key) => cl.reduce((a, r) => a + r[key], 0)
  const due = data.credits_open.reduce((a, r) => a + r.total - r.paid, 0)
  const summary = [
    [t(lang, 'Ventes en espèces', 'Cash sales'), fmt(m.cash)],
    [t(lang, 'Ventes MTN MoMo', 'MTN MoMo sales'), fmt(m.mtn_momo)],
    [t(lang, 'Ventes Orange Money', 'Orange Money sales'), fmt(m.orange_money)],
    [t(lang, 'Ventes à crédit (ardoises)', 'Credit sales (tabs)'), fmt(m.credit)],
    [t(lang, 'Ardoises encaissées en espèces', 'Tabs collected in cash'), fmt(c.cash)],
    [t(lang, 'Ardoises encaissées MTN MoMo', 'Tabs collected MTN MoMo'), fmt(c.mtn_momo)],
    [t(lang, 'Ardoises encaissées Orange Money', 'Tabs collected Orange Money'), fmt(c.orange_money)],
    [t(lang, 'Espèces attendues (ventes + ardoises)', 'Expected cash (sales + tabs)'), fmt(m.cash + c.cash)],
    [t(lang, 'Clôtures de caisse', 'Cash closings'), String(cl.length)],
    [t(lang, 'Total attendu aux clôtures', 'Total expected at closings'), fmt(sum('expected'))],
    [t(lang, 'Total compté aux clôtures', 'Total counted at closings'), fmt(sum('counted'))],
    [t(lang, 'Écart total des clôtures', 'Total closing difference'), fmt(sum('difference'))],
    [t(lang, 'Ardoises impayées (à ce jour)', 'Unpaid tabs (to date)'), fmt(due)],
  ]
  const sections = [
    {
      title: t(lang, 'Clôtures de caisse', 'Cash closings'),
      head: [t(lang, 'Date', 'Date'), t(lang, 'Serveur', 'Server'), t(lang, 'Période depuis', 'Period since'), t(lang, 'Attendu', 'Expected'), t(lang, 'Compté', 'Counted'), t(lang, 'Écart', 'Difference'), t(lang, 'Remarque', 'Note')],
      body: cl.map((r) => [dt(r.ts), r.server, dt(r.start_ts), fmt(r.expected), fmt(r.counted), fmt(r.difference), r.note || '']),
    },
    {
      title: t(lang, 'Espèces par serveur', 'Cash by server'),
      head: [t(lang, 'Serveur', 'Server'), t(lang, 'Ventes en espèces', 'Cash sales'), t(lang, 'Ardoises en espèces', 'Tabs in cash'), t(lang, 'Clôtures', 'Closings'), t(lang, 'Écart total', 'Total difference')],
      body: data.by_server.map((r) => [r.name, fmt(r.cash_sales), fmt(r.cash_collected), String(r.closings), fmt(r.difference)]),
    },
    {
      title: t(lang, 'Ardoises encaissées', 'Tab payments received'),
      head: ['Date', t(lang, 'Client', 'Customer'), t(lang, 'Montant', 'Amount'), t(lang, 'Mode', 'Method'), t(lang, 'Reçu par', 'Received by')],
      body: data.payments.map((r) => [dt(r.ts), r.customer || '', fmt(r.amount), pay(lang, r.method), r.receiver]),
    },
    {
      title: t(lang, 'Ardoises impayées à ce jour', 'Unpaid tabs to date'),
      head: ['Date', t(lang, 'Réf.', 'Ref.'), t(lang, 'Client', 'Customer'), t(lang, 'Serveur', 'Server'), 'Total', t(lang, 'Payé', 'Paid'), t(lang, 'Reste', 'Balance')],
      body: data.credits_open.map((r) => [dt(r.ts), r.ref, r.customer || '', r.server, fmt(r.total), fmt(r.paid), fmt(r.total - r.paid)]),
    },
  ]
  return { title: t(lang, 'Bilan de caisse', 'Cash report'), summary, sections }
}

function stockSpec(data, lang) {
  const rows = data.drinks
  const sum = (key) => rows.reduce((a, r) => a + r[key], 0)
  const valueBuy = rows.reduce((a, r) => a + r.closing * r.buy, 0)
  const valueSell = rows.reduce((a, r) => a + r.closing * r.sell, 0)
  const low = rows.filter((r) => r.on_hand <= r.threshold).length
  const summary = [
    [t(lang, 'Boissons suivies', 'Drinks tracked'), String(rows.length)],
    [t(lang, 'Stock initial (bouteilles)', 'Opening stock (bottles)'), String(sum('opening'))],
    [t(lang, 'Entrées', 'Entries'), String(sum('purchases'))],
    [t(lang, 'Ventes', 'Sales'), String(sum('sold'))],
    [t(lang, 'Pertes / casse', 'Losses'), String(sum('losses'))],
    [t(lang, 'Offerts', 'Gifts'), String(sum('gifts'))],
    [t(lang, 'Inventaire / ajustements', 'Count / adjustments'), String(sum('adjust'))],
    [t(lang, 'Stock final (bouteilles)', 'Closing stock (bottles)'), String(sum('closing'))],
    [t(lang, 'Valeur du stock final (prix d’achat)', 'Closing stock value (purchase price)'), fmt(valueBuy)],
    [t(lang, 'Valeur du stock final (prix de vente)', 'Closing stock value (selling price)'), fmt(valueSell)],
    [t(lang, 'Boissons en stock bas ou en rupture (actuel)', 'Drinks low or out of stock (current)'), String(low)],
  ]
  const sections = [
    {
      title: t(lang, 'Stock par boisson', 'Stock by drink'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Initial', 'Opening'), t(lang, 'Entrées', 'Entries'), t(lang, 'Ventes', 'Sales'), t(lang, 'Pertes', 'Losses'), t(lang, 'Offerts', 'Gifts'), t(lang, 'Inventaire', 'Count'), t(lang, 'Final', 'Closing'), t(lang, 'Actuel', 'Current'), t(lang, 'Seuil', 'Alert'), t(lang, 'Valeur finale (achat)', 'Closing value (cost)')],
      body: rows.map((r) => [r.name, String(r.opening), String(r.purchases), String(r.sold), String(r.losses), String(r.gifts), String(r.adjust), String(r.closing), r.on_hand + (r.on_hand <= r.threshold ? ' !' : ''), String(r.threshold), fmt(r.closing * r.buy)]),
    },
    {
      title: t(lang, 'Mouvements de stock (hors ventes)', 'Stock movements (excluding sales)'),
      head: ['Date', t(lang, 'Boisson', 'Drink'), 'Type', t(lang, 'Quantité', 'Quantity'), t(lang, 'Prix d’achat', 'Purchase price'), t(lang, 'Par', 'By'), t(lang, 'Motif', 'Reason')],
      body: data.movements.map((r) => [dt(r.ts), r.drink, mk(lang, r.kind), (r.qty > 0 ? '+' : '') + r.qty, r.unit_cost != null ? fmt(r.unit_cost) : '', r.who || '', r.note || '']),
      note: data.truncated_moves ? t(lang, 'Liste limitée aux 5000 premiers mouvements de la période.', 'List limited to the first 5000 movements of the period.') : '',
    },
  ]
  return { title: t(lang, 'Bilan de stock', 'Stock report'), summary, sections }
}

export function buildSpec(which, data, lang, ctx) {
  const spec = which === 'sales' ? salesSpec(data, lang) : which === 'cash' ? cashSpec(data, lang) : stockSpec(data, lang)
  spec.bar = t(lang, 'Établissement : ', 'Venue: ') + (ctx.barName || data.bar || '')
  spec.period = t(lang, 'Période : du ', 'Period: from ') + dd(ctx.from) + t(lang, ' au ', ' to ') + dd(ctx.to)
  spec.generated = t(lang, 'Généré le ', 'Generated on ') + dt(new Date().toISOString())
  spec.summaryTitle = t(lang, 'Résumé', 'Summary')
  spec.empty = t(lang, 'Aucune donnée sur cette période.', 'No data in this period.')
  return spec
}
