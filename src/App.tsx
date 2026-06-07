import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from './pages/Login'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [theme] = useState(() => localStorage.getItem('wl-theme') || 'light')
  const runtimeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('wl-theme', theme)
  }, [theme])

  useEffect(() => {
    sendRuntimeSession()
  }, [session])

  if (session === undefined) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100svh', background:'var(--surface)' }}>
        <div style={{ color:'var(--text-2)', fontSize:14 }}>Loading…</div>
      </div>
    )
  }

  if (!session) return <Login />

  function sendRuntimeSession() {
    if (!session || !runtimeRef.current?.contentWindow) return
    runtimeRef.current.contentWindow.postMessage({
      type: 'WL_SESSION',
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    }, window.location.origin)
  }

  return (
    <iframe
      ref={runtimeRef}
      title="WorkLog"
      src={`${import.meta.env.BASE_URL}app/WorkLog.html`}
      onLoad={sendRuntimeSession}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100svh',
        border: 0,
        background: 'var(--surface)',
      }}
    />
  )
}
