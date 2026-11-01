import './globals.css'

export const metadata = {
  title: 'Bar Manager',
  description: 'Gestion de débit de boissons',
}

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  )
}
