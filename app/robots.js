import { SITE_URL } from '../lib/config'

export default function robots() {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/site/'],
        disallow: ['/api/', '/dashboard', '/ventes', '/caisse', '/boissons', '/stock', '/depenses', '/bilan', '/journal', '/equipe', '/compte', '/super', '/ticket', '/verification', '/connexion'],
      },
    ],
    sitemap: SITE_URL + '/sitemap.xml',
    host: SITE_URL,
  }
}
