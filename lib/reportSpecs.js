const num = (n) => String(Math.round(Number(n) || 0)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ')
const fmt = (n) => num(n) + ' FCFA'
const pct = (a, b) => (b ? String(Math.round((a / b) * 1000) / 10).replace('.', ',') + ' %' : '-')
const dt = (ts) => {
  const iso = new Date(new Date(ts).getTime() + 3600000).toISOString()
  return iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4) + ' ' + iso.slice(11, 16)
}
const dd = (day) => day.slice(8, 10) + '/' + day.slice(5, 7) + '/' + day.slice(0, 4)
const t = (lang, fr, en) => (lang === 'fr' ? fr : en)
const pay = (lang, m) => ({ cash: t(lang, 'Espèces', 'Cash'), mtn_momo: 'MTN MoMo', orange_money: 'Orange Money', credit: t(lang, 'Crédit', 'Credit') }[m] || m)
const mk = (lang, k) => ({ purchase: t(lang, 'Entrée', 'Entry'), loss: t(lang, 'Perte / casse', 'Loss'), gift: t(lang, 'Offert', 'Gift'), adjustment: t(lang, 'Inventaire / ajustement', 'Count / adjustment') }[k] || k)
const cat = (lang, c) => ({ beer: t(lang, 'Bière', 'Beer'), soft: t(lang, 'Boisson gazeuse', 'Soft drink'), liquor: t(lang, 'Spiritueux', 'Spirits'), wine: t(lang, 'Vin', 'Wine'), water: t(lang, 'Eau', 'Water'), juice: t(lang, 'Jus', 'Juice'), other: t(lang, 'Autre', 'Other') }[c] || c)
const items = (list) => (list || []).map((i) => i.qty + ' x ' + i.name).join(', ')
const sum = (list, key) => list.reduce((a, r) => a + (Number(r[key]) || 0), 0)
const top = (list, key) => list.reduce((best, r) => (!best || r[key] > best[key] ? r : best), null)
const ago = (ts) => Math.max(0, Math.floor((Date.now() - new Date(ts).getTime()) / 86400000))

function salesSpec(data, lang) {
  const s = data.summary
  const profit = data.by_drink.length > 0 && data.by_drink[0].profit != null
  const best = top(data.by_day, 'total')
  const busy = top(data.by_hour, 'count')
  const due = sum(data.credit_customers, 'balance')
  const prev = data.prev.total
  const summary = [
    [t(lang, 'Nombre de ventes', 'Number of sales'), String(s.count)],
    [t(lang, 'Bouteilles vendues', 'Bottles sold'), String(s.items)],
    [t(lang, 'Chiffre d’affaires', 'Revenue'), fmt(s.total)],
    [pay(lang, 'cash'), fmt(s.cash) + ' (' + pct(s.cash, s.total) + ')'],
    [pay(lang, 'mtn_momo'), fmt(s.mtn_momo) + ' (' + pct(s.mtn_momo, s.total) + ')'],
    [pay(lang, 'orange_money'), fmt(s.orange_money) + ' (' + pct(s.orange_money, s.total) + ')'],
    [pay(lang, 'credit'), fmt(s.credit) + ' (' + pct(s.credit, s.total) + ')'],
    [t(lang, 'Ticket moyen', 'Average ticket'), fmt(s.count ? s.total / s.count : 0)],
    [t(lang, 'Plus gros ticket', 'Largest ticket'), fmt(s.max_ticket)],
    [t(lang, 'Ventes annulées', 'Voided sales'), data.voids.count + ' / ' + fmt(data.voids.total)],
    [t(lang, 'Période précédente (même durée)', 'Previous period (same length)'), fmt(prev) + (prev ? ' (' + (s.total >= prev ? '+' : '') + pct(s.total - prev, prev) + ')' : '')],
    [t(lang, 'Meilleur jour', 'Best day'), best ? dd(best.day) + ' / ' + fmt(best.total) : '-'],
    [t(lang, 'Heure la plus active', 'Busiest hour'), busy ? busy.hour + ' h / ' + busy.count + ' ' + t(lang, 'ventes', 'sales') : '-'],
    [t(lang, 'Boisson la plus vendue', 'Best-selling drink'), data.by_drink.length ? data.by_drink[0].name + ' / ' + data.by_drink[0].qty : '-'],
    [t(lang, 'Clients à crédit', 'Credit customers'), String(data.credit_customers.length)],
    [t(lang, 'Crédit restant à payer (ces ventes)', 'Credit still unpaid (these sales)'), fmt(due)],
  ]
  const sections = [
    {
      title: t(lang, 'Boissons vendues', 'Drinks sold'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Catégorie', 'Category'), t(lang, 'Quantité', 'Quantity'), t(lang, 'Espèces', 'Cash'), 'MoMo', 'Orange', t(lang, 'Crédit', 'Credit'), t(lang, 'Chiffre d’affaires', 'Revenue'), t(lang, '% du CA', '% of revenue')].concat(profit ? [t(lang, 'Bénéfice brut', 'Gross profit')] : []),
      body: data.by_drink.map((r) => [r.name, cat(lang, r.category), String(r.qty), String(r.q_cash), String(r.q_mtn), String(r.q_orange), String(r.q_credit), fmt(r.revenue), pct(r.revenue, s.total)].concat(profit ? [fmt(r.profit)] : [])),
    },
    {
      title: t(lang, 'Ventes par catégorie', 'Sales by category'),
      head: [t(lang, 'Catégorie', 'Category'), t(lang, 'Quantité', 'Quantity'), t(lang, 'Chiffre d’affaires', 'Revenue'), t(lang, '% du CA', '% of revenue')],
      body: data.by_category.map((r) => [cat(lang, r.category), String(r.qty), fmt(r.revenue), pct(r.revenue, s.total)]),
    },
    {
      title: t(lang, 'Clients à crédit', 'Credit customers'),
      head: [t(lang, 'Client', 'Customer'), 'Tickets', t(lang, 'Bouteilles', 'Bottles'), t(lang, 'Total crédit', 'Total credit'), t(lang, 'Payé', 'Paid'), t(lang, 'Reste', 'Balance'), t(lang, 'Premier achat', 'First purchase'), t(lang, 'Dernier achat', 'Last purchase')],
      body: data.credit_customers.map((r) => [r.customer, String(r.tickets), String(r.items), fmt(r.total), fmt(r.paid), fmt(r.balance), dt(r.first_ts), dt(r.last_ts)]),
    },
    {
      title: t(lang, 'Boissons prises à crédit par client', 'Drinks taken on credit by customer'),
      head: [t(lang, 'Client', 'Customer'), t(lang, 'Boisson', 'Drink'), t(lang, 'Quantité', 'Quantity'), t(lang, 'Montant', 'Amount')],
      body: data.credit_drinks.map((r) => [r.customer, r.drink, String(r.qty), fmt(r.amount)]),
    },
    {
      title: t(lang, 'Détail des ventes à crédit', 'Credit sales detail'),
      head: ['Date', t(lang, 'Réf.', 'Ref.'), t(lang, 'Client', 'Customer'), t(lang, 'Serveur', 'Server'), t(lang, 'Articles', 'Items'), 'Total', t(lang, 'Payé', 'Paid'), t(lang, 'Reste', 'Balance')],
      body: data.credit_sales.map((r) => [dt(r.ts), r.ref, r.customer, r.server, items(r.items), fmt(r.total), fmt(r.paid), fmt(r.total - r.paid)]),
    },
    {
      title: t(lang, 'Ventes par serveur', 'Sales by server'),
      head: [t(lang, 'Serveur', 'Server'), t(lang, 'Ventes', 'Sales'), t(lang, 'Bouteilles', 'Bottles'), t(lang, 'Chiffre d’affaires', 'Revenue'), t(lang, 'dont crédit', 'of which credit'), t(lang, 'Annulations', 'Voids')],
      body: data.by_server.map((r) => [r.name, String(r.count), String(r.items), fmt(r.total), fmt(r.credit), String(r.voids)]),
    },
    {
      title: t(lang, 'Boissons vendues par serveur', 'Drinks sold by server'),
      head: [t(lang, 'Serveur', 'Server'), t(lang, 'Boisson', 'Drink'), t(lang, 'Quantité', 'Quantity'), t(lang, 'Chiffre d’affaires', 'Revenue')],
      body: data.by_server_drink.map((r) => [r.server, r.drink, String(r.qty), fmt(r.revenue)]),
    },
    {
      title: t(lang, 'Ventes par jour', 'Sales by day'),
      head: ['Date', t(lang, 'Ventes', 'Sales'), t(lang, 'Bouteilles', 'Bottles'), t(lang, 'Espèces', 'Cash'), 'MTN MoMo', 'Orange Money', t(lang, 'Crédit', 'Credit'), 'Total'],
      body: data.by_day.map((r) => [dd(r.day), String(r.count), String(r.items), fmt(r.cash), fmt(r.mtn_momo), fmt(r.orange_money), fmt(r.credit), fmt(r.total)]),
    },
    {
      title: t(lang, 'Ventes par heure', 'Sales by hour'),
      head: [t(lang, 'Heure', 'Hour'), t(lang, 'Ventes', 'Sales'), t(lang, 'Chiffre d’affaires', 'Revenue')],
      body: data.by_hour.map((r) => [r.hour + ' h', String(r.count), fmt(r.total)]),
    },
    {
      title: t(lang, 'Ventes annulées', 'Voided sales'),
      head: ['Date', t(lang, 'Annulée le', 'Voided on'), t(lang, 'Réf.', 'Ref.'), t(lang, 'Serveur', 'Server'), 'Total', t(lang, 'Motif', 'Reason'), t(lang, 'Annulée par', 'Voided by')],
      body: data.voids_list.map((r) => [dt(r.ts), dt(r.voided_at), r.ref, r.server, fmt(r.total), r.reason || '', r.voided_by || '']),
    },
    {
      title: t(lang, 'Détail de toutes les ventes', 'All sales detail'),
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
  const short = cl.filter((r) => r.difference < 0)
  const over = cl.filter((r) => r.difference > 0)
  const credits = data.credits_open
  const due = credits.reduce((a, r) => a + r.total - r.paid, 0)
  const byCust = {}
  for (const r of credits) {
    const k = (r.customer || '').trim().toLowerCase()
    const e = byCust[k] || { customer: r.customer || '', tickets: 0, total: 0, paid: 0, oldest: r.ts }
    e.tickets += 1
    e.total += r.total
    e.paid += r.paid
    if (r.ts < e.oldest) e.oldest = r.ts
    byCust[k] = e
  }
  const custRows = Object.values(byCust).sort((a, b) => b.total - b.paid - (a.total - a.paid))
  const summary = [
    [t(lang, 'Ventes en espèces', 'Cash sales'), fmt(m.cash)],
    [t(lang, 'Ventes MTN MoMo', 'MTN MoMo sales'), fmt(m.mtn_momo)],
    [t(lang, 'Ventes Orange Money', 'Orange Money sales'), fmt(m.orange_money)],
    [t(lang, 'Ventes à crédit (ardoises)', 'Credit sales (tabs)'), fmt(m.credit)],
    [t(lang, 'Ardoises encaissées en espèces', 'Tabs collected in cash'), fmt(c.cash)],
    [t(lang, 'Ardoises encaissées par mobile money', 'Tabs collected by mobile money'), fmt(c.mtn_momo + c.orange_money)],
    [t(lang, 'Espèces attendues (ventes + ardoises)', 'Expected cash (sales + tabs)'), fmt(m.cash + c.cash)],
    [t(lang, 'Total encaissé tous modes', 'Total received, all methods'), fmt(m.cash + m.mtn_momo + m.orange_money + c.cash + c.mtn_momo + c.orange_money)],
    [t(lang, 'Clôtures de caisse', 'Cash closings'), String(cl.length)],
    [t(lang, 'Total attendu aux clôtures', 'Total expected at closings'), fmt(sum(cl, 'expected'))],
    [t(lang, 'Total compté aux clôtures', 'Total counted at closings'), fmt(sum(cl, 'counted'))],
    [t(lang, 'Écart total des clôtures', 'Total closing difference'), fmt(sum(cl, 'difference'))],
    [t(lang, 'Clôtures avec manque', 'Closings with shortfall'), short.length + ' / ' + fmt(sum(short, 'difference'))],
    [t(lang, 'Clôtures avec excédent', 'Closings with surplus'), over.length + ' / ' + fmt(sum(over, 'difference'))],
    [t(lang, 'Ardoises impayées (à ce jour)', 'Unpaid tabs (to date)'), fmt(due) + ' / ' + custRows.length + ' ' + t(lang, 'clients', 'customers')],
  ]
  const sections = [
    {
      title: t(lang, 'Encaissements par jour', 'Receipts by day'),
      head: ['Date', t(lang, 'Espèces', 'Cash'), 'MTN MoMo', 'Orange Money', t(lang, 'Crédit (non encaissé)', 'Credit (not collected)'), t(lang, 'Ardoises en espèces', 'Tabs in cash'), t(lang, 'Ardoises mobile', 'Tabs mobile'), t(lang, 'Clôtures', 'Closings'), t(lang, 'Écart', 'Difference')],
      body: data.by_day.map((r) => [dd(r.day), fmt(r.cash), fmt(r.mtn_momo), fmt(r.orange_money), fmt(r.credit), fmt(r.collected_cash), fmt(r.collected_mobile), String(r.closings), fmt(r.difference)]),
    },
    {
      title: t(lang, 'Clôtures de caisse', 'Cash closings'),
      head: ['Date', t(lang, 'Serveur', 'Server'), t(lang, 'Période depuis', 'Period since'), t(lang, 'Attendu', 'Expected'), t(lang, 'Compté', 'Counted'), t(lang, 'Écart', 'Difference'), t(lang, 'Remarque', 'Note')],
      body: cl.map((r) => [dt(r.ts), r.server, dt(r.start_ts), fmt(r.expected), fmt(r.counted), fmt(r.difference), r.note || '']),
    },
    {
      title: t(lang, 'Écarts de caisse', 'Cash differences'),
      head: ['Date', t(lang, 'Serveur', 'Server'), t(lang, 'Attendu', 'Expected'), t(lang, 'Compté', 'Counted'), t(lang, 'Écart', 'Difference'), t(lang, 'Remarque', 'Note')],
      body: cl.filter((r) => r.difference !== 0).map((r) => [dt(r.ts), r.server, fmt(r.expected), fmt(r.counted), fmt(r.difference), r.note || '']),
    },
    {
      title: t(lang, 'Caisse par serveur', 'Cash by server'),
      head: [t(lang, 'Serveur', 'Server'), t(lang, 'Ventes en espèces', 'Cash sales'), t(lang, 'Ventes mobile money', 'Mobile money sales'), t(lang, 'Ardoises en espèces', 'Tabs in cash'), t(lang, 'Clôtures', 'Closings'), t(lang, 'Écart total', 'Total difference')],
      body: data.by_server.map((r) => [r.name, fmt(r.cash_sales), fmt(r.mobile_sales), fmt(r.cash_collected), String(r.closings), fmt(r.difference)]),
    },
    {
      title: t(lang, 'Ardoises encaissées', 'Tab payments received'),
      head: ['Date', t(lang, 'Client', 'Customer'), t(lang, 'Montant', 'Amount'), t(lang, 'Mode', 'Method'), t(lang, 'Reçu par', 'Received by')],
      body: data.payments.map((r) => [dt(r.ts), r.customer || '', fmt(r.amount), pay(lang, r.method), r.receiver]),
    },
    {
      title: t(lang, 'Ardoises impayées par client', 'Unpaid tabs by customer'),
      head: [t(lang, 'Client', 'Customer'), 'Tickets', 'Total', t(lang, 'Payé', 'Paid'), t(lang, 'Reste', 'Balance'), t(lang, 'Plus ancienne', 'Oldest'), t(lang, 'Jours', 'Days')],
      body: custRows.map((r) => [r.customer, String(r.tickets), fmt(r.total), fmt(r.paid), fmt(r.total - r.paid), dt(r.oldest), String(ago(r.oldest))]),
    },
    {
      title: t(lang, 'Ardoises impayées : détail', 'Unpaid tabs: detail'),
      head: ['Date', t(lang, 'Réf.', 'Ref.'), t(lang, 'Client', 'Customer'), t(lang, 'Serveur', 'Server'), 'Total', t(lang, 'Payé', 'Paid'), t(lang, 'Reste', 'Balance')],
      body: credits.map((r) => [dt(r.ts), r.ref, r.customer || '', r.server, fmt(r.total), fmt(r.paid), fmt(r.total - r.paid)]),
    },
    {
      title: t(lang, 'Paiements mobile money (MTN MoMo, Orange Money)', 'Mobile money payments (MTN MoMo, Orange Money)'),
      head: ['Date', t(lang, 'Réf.', 'Ref.'), t(lang, 'Serveur', 'Server'), t(lang, 'Mode', 'Method'), t(lang, 'Montant', 'Amount')],
      body: data.mobile_sales.map((r) => [dt(r.ts), r.ref, r.server, pay(lang, r.method), fmt(r.total)]),
    },
  ]
  return { title: t(lang, 'Bilan de caisse', 'Cash report'), summary, sections }
}

function stockSpec(data, lang, days) {
  const rows = data.drinks
  const avg = (r) => r.sold / days
  const need = (r) => Math.max(0, Math.ceil(avg(r) * 7) - r.on_hand)
  const valueBuy = rows.reduce((a, r) => a + r.closing * r.buy, 0)
  const valueSell = rows.reduce((a, r) => a + r.closing * r.sell, 0)
  const low = rows.filter((r) => r.on_hand <= r.threshold)
  const out = rows.filter((r) => r.on_hand <= 0)
  const lossValue = rows.reduce((a, r) => a + (r.losses + r.gifts + r.shortage) * r.buy, 0)
  const byCat = {}
  for (const r of rows) {
    const e = byCat[r.category] || { qty: 0, buy: 0, sell: 0 }
    e.qty += r.closing
    e.buy += r.closing * r.buy
    e.sell += r.closing * r.sell
    byCat[r.category] = e
  }
  const summary = [
    [t(lang, 'Boissons suivies', 'Drinks tracked'), String(rows.length)],
    [t(lang, 'Stock initial (bouteilles)', 'Opening stock (bottles)'), String(sum(rows, 'opening'))],
    [t(lang, 'Entrées (bouteilles)', 'Entries (bottles)'), String(sum(rows, 'purchases'))],
    [t(lang, 'Ventes (bouteilles)', 'Sales (bottles)'), String(sum(rows, 'sold'))],
    [t(lang, 'Pertes / casse', 'Losses'), String(sum(rows, 'losses'))],
    [t(lang, 'Offerts', 'Gifts'), String(sum(rows, 'gifts'))],
    [t(lang, 'Inventaire / ajustements (net)', 'Count / adjustments (net)'), String(sum(rows, 'adjust'))],
    [t(lang, 'Stock final (bouteilles)', 'Closing stock (bottles)'), String(sum(rows, 'closing'))],
    [t(lang, 'Valeur du stock final (prix d’achat)', 'Closing stock value (purchase price)'), fmt(valueBuy)],
    [t(lang, 'Valeur du stock final (prix de vente)', 'Closing stock value (selling price)'), fmt(valueSell)],
    [t(lang, 'Montant des achats de la période', 'Purchases amount in the period'), fmt(sum(rows, 'purchase_cost'))],
    [t(lang, 'Valeur des pertes, offerts et manques d’inventaire', 'Value of losses, gifts and inventory shortages'), fmt(lossValue)],
    [t(lang, 'Boissons en rupture (actuel)', 'Drinks out of stock (current)'), String(out.length)],
    [t(lang, 'Boissons en stock bas, hors rupture (actuel)', 'Drinks low on stock, excluding out (current)'), String(low.length - out.length)],
  ]
  const sections = [
    {
      title: t(lang, 'Stock par boisson', 'Stock by drink'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Catégorie', 'Category'), t(lang, 'Initial', 'Opening'), t(lang, 'Entrées', 'Entries'), t(lang, 'Ventes', 'Sales'), t(lang, 'Pertes', 'Losses'), t(lang, 'Offerts', 'Gifts'), t(lang, 'Inventaire', 'Count'), t(lang, 'Final', 'Closing'), t(lang, 'Actuel', 'Current'), t(lang, 'Seuil', 'Alert'), t(lang, 'Valeur finale (achat)', 'Closing value (cost)')],
      body: rows.map((r) => [r.name, cat(lang, r.category), String(r.opening), String(r.purchases), String(r.sold), String(r.losses), String(r.gifts), String(r.adjust), String(r.closing), r.on_hand + (r.on_hand <= r.threshold ? ' !' : ''), String(r.threshold), fmt(r.closing * r.buy)]),
    },
    {
      title: t(lang, 'Stock par catégorie (final)', 'Stock by category (closing)'),
      head: [t(lang, 'Catégorie', 'Category'), t(lang, 'Bouteilles', 'Bottles'), t(lang, 'Valeur (achat)', 'Value (cost)'), t(lang, 'Valeur (vente)', 'Value (selling)')],
      body: Object.keys(byCat).map((k) => [cat(lang, k), String(byCat[k].qty), fmt(byCat[k].buy), fmt(byCat[k].sell)]),
    },
    {
      title: t(lang, 'Boissons à réapprovisionner', 'Drinks to restock'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Stock actuel', 'Current stock'), t(lang, 'Seuil', 'Alert'), t(lang, 'Ventes moy./jour', 'Avg sales/day'), t(lang, 'Suggestion 7 jours (bouteilles)', '7-day suggestion (bottles)'), t(lang, 'Suggestion (casiers)', 'Suggestion (cases)')],
      body: low.map((r) => [r.name, String(r.on_hand), String(r.threshold), avg(r).toFixed(1).replace('.', ','), String(need(r)), String(Math.ceil(need(r) / (r.upc || 1)))]),
    },
    {
      title: t(lang, 'Boissons sans vente sur la période', 'Drinks with no sales in the period'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Stock actuel', 'Current stock'), t(lang, 'Valeur immobilisée (achat)', 'Tied-up value (cost)')],
      body: rows.filter((r) => r.sold === 0 && r.on_hand > 0).map((r) => [r.name, String(r.on_hand), fmt(r.on_hand * r.buy)]),
    },
    {
      title: t(lang, 'Classement des ventes', 'Sales ranking'),
      head: ['#', t(lang, 'Boisson', 'Drink'), t(lang, 'Vendues', 'Sold'), t(lang, 'Moy./jour', 'Avg/day'), t(lang, 'Dernière vente', 'Last sale')],
      body: rows.filter((r) => r.sold > 0).sort((a, b) => b.sold - a.sold).map((r, i) => [String(i + 1), r.name, String(r.sold), avg(r).toFixed(1).replace('.', ','), r.last_sale ? dt(r.last_sale) : '-']),
    },
    {
      title: t(lang, 'Achats par boisson', 'Purchases by drink'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Quantité', 'Quantity'), t(lang, 'Montant', 'Amount'), t(lang, 'Prix moyen', 'Average price'), t(lang, 'Prix min.', 'Min price'), t(lang, 'Prix max.', 'Max price')],
      body: rows.filter((r) => r.purchases > 0).map((r) => [r.name, String(r.purchases), fmt(r.purchase_cost), fmt(r.purchase_cost / r.purchases), r.min_cost != null ? fmt(r.min_cost) : '', r.max_cost != null ? fmt(r.max_cost) : '']),
    },
    {
      title: t(lang, 'Pertes, offerts et écarts d’inventaire', 'Losses, gifts and inventory differences'),
      head: [t(lang, 'Boisson', 'Drink'), t(lang, 'Casse (qté)', 'Loss (qty)'), t(lang, 'Valeur casse', 'Loss value'), t(lang, 'Offerts (qté)', 'Gifts (qty)'), t(lang, 'Valeur offerts', 'Gift value'), t(lang, 'Manque inventaire (qté)', 'Shortage (qty)'), t(lang, 'Valeur manque', 'Shortage value'), t(lang, 'Surplus inventaire (qté)', 'Surplus (qty)')],
      body: rows.filter((r) => r.losses || r.gifts || r.shortage || r.overage).map((r) => [r.name, String(r.losses), fmt(r.losses * r.buy), String(r.gifts), fmt(r.gifts * r.buy), String(r.shortage), fmt(r.shortage * r.buy), String(r.overage)]),
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
  const days = Math.round((new Date(ctx.to) - new Date(ctx.from)) / 86400000) + 1
  const spec = which === 'sales' ? salesSpec(data, lang) : which === 'cash' ? cashSpec(data, lang) : stockSpec(data, lang, days)
  spec.bar = t(lang, 'Établissement : ', 'Venue: ') + (ctx.barName || data.bar || '')
  spec.period = t(lang, 'Période : du ', 'Period: from ') + dd(ctx.from) + t(lang, ' au ', ' to ') + dd(ctx.to)
  spec.generated = t(lang, 'Généré le ', 'Generated on ') + dt(new Date().toISOString())
  spec.summaryTitle = t(lang, 'Résumé', 'Summary')
  spec.empty = t(lang, 'Aucune donnée sur cette période.', 'No data in this period.')
  return spec
}
