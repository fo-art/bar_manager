'use client'
import { usePrefs } from './Providers'

export default function PrefsBar() {
  const { lang, setLang, theme, setTheme } = usePrefs()
  return (
    <div className="prefs-bar">
      <button onClick={() => setLang(lang === 'fr' ? 'en' : 'fr')}>
        {lang === 'fr' ? 'EN' : 'FR'}
      </button>
      <button onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
        {theme === 'light' ? '🌙' : '☀️'}
      </button>
    </div>
  )
}
