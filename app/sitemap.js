import { SITE_URL } from '../lib/config'

export default function sitemap() {
  const pages = ['/', '/site/fonctionnalites', '/site/formules', '/site/contact', '/site/confidentialite']
  return pages.map((p) => ({
    url: SITE_URL + p,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: p === '/' ? 1 : 0.7,
  }))
}
