'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { dictionary } from '../../lib/i18n'

const PrefsContext = createContext(null)

export function usePrefs() {
  return useContext(PrefsContext)
}

export default function Providers({ children }) {
  const [lang, setLang] = useState('fr')
  const [theme, setTheme] = useState('light')

  useEffect(() => {
    try {
      const l = localStorage.getItem('lang')
      const th = localStorage.getItem('theme')
      if (l === 'fr' || l === 'en') setLang(l)
      if (th === 'light' || th === 'dark') setTheme(th)
    } catch (e) {}
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.lang = lang
    try {
      localStorage.setItem('lang', lang)
      localStorage.setItem('theme', theme)
    } catch (e) {}
  }, [lang, theme])

  const t = (key) => dictionary[lang][key] || key

  return (
    <PrefsContext.Provider value={{ lang, setLang, theme, setTheme, t }}>
      {children}
    </PrefsContext.Provider>
  )
}
