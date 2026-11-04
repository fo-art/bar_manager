import './globals.css'
import Providers from './components/Providers'
import PrefsBar from './components/PrefsBar'
import { SITE_URL } from '../lib/config'

const TITLE = 'Bar Manager : gestion de bar et de snack-bar au Cameroun'
const DESC = 'Application de gestion de débit de boissons : ventes des serveurs, stock, caisse, ardoises et bénéfices. Pensée pour les bars et snack-bars du Cameroun. Essai gratuit de 15 jours.'

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: TITLE, template: '%s | Bar Manager' },
  description: DESC,
  applicationName: 'Bar Manager',
  keywords: ['gestion de bar', 'logiciel bar Cameroun', 'gestion de stock boissons', 'application snack bar', 'caisse bar Douala'],
  openGraph: { title: TITLE, description: DESC, siteName: 'Bar Manager', locale: 'fr_FR', type: 'website' },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESC },
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Bar Manager',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  inLanguage: ['fr', 'en'],
  description: DESC,
  url: SITE_URL,
  areaServed: 'CM',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
        <Providers>
          <PrefsBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
