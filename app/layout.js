import './globals.css'
import Providers from './components/Providers'
import PrefsBar from './components/PrefsBar'

export const metadata = {
  title: 'Bar Manager',
  description: 'Gestion de débit de boissons',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>
        <Providers>
          <PrefsBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
