import { ImageResponse } from 'next/og'

export const alt = 'Bar Manager : gestion de bar et de snack-bar'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#16a34a', color: '#fff', padding: 60 }}>
        <div style={{ fontSize: 96, fontWeight: 700 }}>Bar Manager</div>
        <div style={{ fontSize: 42, marginTop: 24, textAlign: 'center' }}>Gérez votre bar sans pertes</div>
        <div style={{ fontSize: 30, marginTop: 24, opacity: 0.9 }}>Ventes · Stock · Caisse · Bénéfices | Cameroun</div>
      </div>
    ),
    { ...size }
  )
}
