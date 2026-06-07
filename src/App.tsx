import { useEffect, useState } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Layout from './components/Layout'
import Login from './pages/Login'
import Home from './pages/Home'
import Entry from './pages/Entry'
import Timeline from './pages/Timeline'
import Report from './pages/Report'
import Team from './pages/Team'
import HelpBoard from './pages/HelpBoard'
import Stats from './pages/Stats'
import Clients from './pages/Clients'
import Settings from './pages/Settings'
import Help from './pages/Help'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [theme, setTheme] = useState(() => localStorage.getItem('wl-theme') || 'light')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('wl-theme', theme)
  }, [theme])

  if (session === undefined) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100svh', background:'var(--surface)' }}>
        <div style={{ color:'var(--text-2)', fontSize:14 }}>Loading…</div>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout theme={theme} setTheme={setTheme} />}>
          <Route index element={<Navigate to="/home" replace />} />
          <Route path="home" element={<Home />} />
          <Route path="entry" element={<Entry />} />
          <Route path="entry/:id" element={<Entry />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="report" element={<Report />} />
          <Route path="team" element={<Team />} />
          <Route path="helpboard" element={<HelpBoard />} />
          <Route path="stats" element={<Stats />} />
          <Route path="clients" element={<Clients />} />
          <Route path="settings" element={<Settings />} />
          <Route path="help" element={<Help />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
