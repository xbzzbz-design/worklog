import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import Login from './pages/Login'

const runtimeVersion = '2026-06-08-39'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [theme] = useState(() => localStorage.getItem('wl-theme') || 'light')
  const runtimeRef = useRef<HTMLIFrameElement | null>(null)
  const deferredPrompt = useRef<any>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  // PWA install: capture the native prompt here (top window) and let the in-iframe
  // install button request it via postMessage.
  useEffect(() => {
    const onBIP = (e: Event) => { e.preventDefault(); deferredPrompt.current = e }
    const onInstalled = () => {
      deferredPrompt.current = null
      runtimeRef.current?.contentWindow?.postMessage({ type: 'WL_INSTALLED' }, window.location.origin)
    }
    const onMsg = async (ev: MessageEvent) => {
      if (ev.origin !== window.location.origin) return
      if (ev.data?.type !== 'WL_INSTALL_REQUEST') return
      const dp = deferredPrompt.current as any
      if (dp && typeof dp.prompt === 'function') {
        dp.prompt()
        try { await dp.userChoice } catch { /* ignore */ }
        deferredPrompt.current = null
      } else {
        runtimeRef.current?.contentWindow?.postMessage({ type: 'WL_INSTALL_UNAVAILABLE' }, window.location.origin)
      }
    }
    window.addEventListener('beforeinstallprompt', onBIP)
    window.addEventListener('appinstalled', onInstalled)
    window.addEventListener('message', onMsg)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBIP)
      window.removeEventListener('appinstalled', onInstalled)
      window.removeEventListener('message', onMsg)
    }
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
      src={`${import.meta.env.BASE_URL}app/WorkLog.html?v=${runtimeVersion}`}
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
