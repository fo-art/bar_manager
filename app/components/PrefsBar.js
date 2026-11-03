'use client'
import './prefs.css'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'
import { usePrefs } from './Providers'

export default function PrefsBar() {
  const router = useRouter()
  const pathname = usePathname()
  const { lang, setLang, theme, setTheme } = usePrefs()
  const siteLike = pathname === '/' || pathname.startsWith('/site') || pathname.startsWith('/verification')
  const isLogin = pathname === '/connexion'
  const isHome = isLogin || pathname === '/dashboard'

  function back() {
    if (window.history.length > 1) router.back()
    else router.push('/dashboard')
  }

  async function logout() {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (siteLike) return null

  return (
    <>
      {!isHome && <button className="fb-back" onClick={back} aria-label="Retour">←</button>}
      <div className="fb-right">
        <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>{lang === 'fr' ? 'EN' : 'FR'}</button>
        <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>{theme === 'light' ? '🌙' : '☀️'}</button>
        {!isLogin && <button onClick={logout}>{lang === 'fr' ? 'Déconnexion' : 'Log out'}</button>}
      </div>
    </>
  )
}
