'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { dictionary } from '../../lib/i18n'
import { makeVocab } from '../../lib/vocab'
import { supabase } from '../../lib/supabaseClient'

const PrefsContext = createContext(null)

export function usePrefs() {
  return useContext(PrefsContext)
}

export default function Providers({ children }) {
  const [lang, setLang] = useState('fr')
  const [theme, setTheme] = useState('light')
  const [biz, setBiz] = useState(null)

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

  async function loadBiz() {
    const { data } = await supabase.rpc('my_business')
    setBiz(data || null)
  }

  useEffect(() => {
    loadBiz()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => loadBiz())
    return () => subscription.unsubscribe()
  }, [])

  const t = (key) => dictionary[lang][key] || key
  const v = makeVocab(biz, lang)

  return (
    <PrefsContext.Provider value={{ lang, setLang, theme, setTheme, t, biz, v }}>
      {children}
    </PrefsContext.Provider>
  )
}
