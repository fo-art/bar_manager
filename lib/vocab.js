// lib/vocab.js : remplace le vocabulaire "bar" par le vocabulaire "boutique",
// uniquement pour les comptes dont business_type = 'shop'. Aucun effet pour un bar.

const PAIRS_FR = [
  // Accords féminin/masculin à traiter avant les mots seuls (ordre important)
  ['une boisson', 'un article'],
  ['aucune boisson', 'aucun article'],
  ['cette boisson', 'cet article'],
  ['du nouveau bar', 'de la nouvelle boutique'],
  ['nouveau bar', 'nouvelle boutique'],
  ['premier bar', 'première boutique'],
  ['un bar', 'une boutique'],
  ['ce bar', 'cette boutique'],
  ['le bar choisi', 'la boutique choisie'],
  ['le bar', 'la boutique'],
  ['bar ajouté', 'boutique ajoutée'],
  ['aucun bar', 'aucune boutique'],
  ['tous les bars', 'toutes les boutiques'],
  ['boissons les plus vendues', 'articles les plus vendus'],
  ['boisson créée', 'article créé'],
  ['boisson la plus vendue', 'article le plus vendu'],
  ['boissons vendues par serveur', 'articles vendus par vendeur'],
  ['boissons vendues', 'articles vendus'],
  ['boissons prises à crédit par client', 'articles pris à crédit par client'],
  ['boissons suivies', 'articles suivis'],
  ['boisson modifiée', 'article modifié'],
  ['boisson suspendue', 'article suspendu'],
  ['boisson réactivée', 'article réactivé'],
  ['boisson mise à la corbeille', 'article mis à la corbeille'],
  ['boisson restaurée', 'article restauré'],
  ['boisson supprimée définitivement', 'article supprimé définitivement'],
  ['serveur(se)', 'vendeur(se)'],
  ['serveuses', 'vendeuses'],
  ['serveurs', 'vendeurs'],
  ['serveuse', 'vendeuse'],
  ['serveur', 'vendeur'],
  ['boissons', 'articles'],
  ['boisson', 'article'],
  ['bouteilles', 'unités'],
  ['bouteille', 'unité'],
  ['casiers', 'cartons'],
  ['casier', 'carton'],
  ['bars', 'boutiques'],
  ['bar', 'boutique'],
]

const PAIRS_EN = [
  // Accords a/an à traiter avant les mots seuls (ordre important)
  ['a drink', 'an item'],
  ['servers', 'sellers'],
  ['server', 'seller'],
  ['drinks', 'items'],
  ['drink', 'item'],
  ['bottles', 'units'],
  ['bottle', 'unit'],
  ['cases', 'cartons'],
  ['case', 'carton'],
  ['bars', 'shops'],
  ['bar', 'shop'],
]

function escapeReg(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function applyCase(match, replacement) {
  if (match === match.toUpperCase()) return replacement.toUpperCase()
  if (match[0] === match[0].toUpperCase()) return replacement[0].toUpperCase() + replacement.slice(1)
  return replacement
}

function buildReplacer(pairs) {
  const compiled = pairs.map(([from, to]) => [
    new RegExp('(?<![\\p{L}])' + escapeReg(from) + '(?![\\p{L}])', 'giu'),
    to,
  ])
  return (text) => {
    let out = text
    for (const [re, to] of compiled) {
      out = out.replace(re, (m) => applyCase(m, to))
    }
    return out
  }
}

const replaceFr = buildReplacer(PAIRS_FR)
const replaceEn = buildReplacer(PAIRS_EN)

// business : 'bar' | 'shop' | null. lang : 'fr' | 'en'.
// Retourne une fonction v(text) à utiliser ainsi dans chaque page :
//   const { lang, v } = usePrefs()
//   const tr = (k) => v(L[lang][k])
export function makeVocab(business, lang) {
  if (business !== 'shop') return (text) => text
  const replace = lang === 'en' ? replaceEn : replaceFr
  return (text) => (typeof text === 'string' ? replace(text) : text)
}
