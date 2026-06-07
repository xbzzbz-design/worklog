import { useState, useEffect } from 'react'
import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import {
  Layers, Home, Plus, Clock, BarChart2, Users, HelpCircle,
  Star, UserCircle, Settings, Sun, Moon, Menu, X, LogOut,
  ChevronRight
} from 'lucide-react'
import { supabase } from '../lib/supabase'

interface LayoutProps {
  theme: string
  setTheme: (t: string) => void
}

const navItems = [
  { to: '/home',      label: 'Home',       icon: Home },
  { to: '/timeline',  label: 'Timeline',   icon: Clock },
  { to: '/report',    label: 'Report',     icon: BarChart2 },
  { to: '/team',      label: 'Team',       icon: Users },
  { to: '/helpboard', label: 'Help Board', icon: HelpCircle },
  { to: '/stats',     label: 'My Stats',   icon: Star },
  { to: '/clients',   label: 'Clients',    icon: UserCircle },
  { to: '/settings',  label: 'Settings',   icon: Settings },
  { to: '/help',      label: 'Help',       icon: HelpCircle },
]

const bottomNav = [
  { to: '/home',      label: 'Home',     icon: Home },
  { to: '/timeline',  label: 'Timeline', icon: Clock },
  { to: '/team',      label: 'Team',     icon: Users },
  { to: '/helpboard', label: 'Help',     icon: HelpCircle },
]

export default function Layout({ theme, setTheme }: LayoutProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [userName, setUserName] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        const { data } = await supabase.from('users').select('name').eq('id', user.id).single()
        if (data) setUserName(data.name)
      }
    })
  }, [])

  // Simulate sync indicator on navigation
  useEffect(() => {
    setSyncing(true)
    const t = setTimeout(() => setSyncing(false), 800)
    return () => clearTimeout(t)
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setDrawerOpen(false)
  }

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '10px 14px',
    borderRadius: 10,
    textDecoration: 'none',
    fontSize: 14,
    fontWeight: 500,
    color: isActive ? 'var(--primary)' : 'var(--text-2)',
    background: isActive ? 'var(--primary-light)' : 'transparent',
    transition: 'background .15s, color .15s',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100svh' }}>

      {/* ── Appbar ── */}
      <header style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        height: 56,
        gap: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <Layers size={22} style={{ color: 'var(--primary)' }} />
          <span className="serif" style={{ fontSize: 18, fontWeight: 400, letterSpacing: '-0.02em' }}>WorkLog</span>
        </div>

        {/* Sync pill */}
        <div style={{
          fontSize: 11, fontWeight: 500,
          padding: '3px 10px', borderRadius: 99,
          background: syncing ? 'var(--amber-bg)' : 'var(--good-bg)',
          color: syncing ? 'var(--amber)' : 'var(--good)',
          transition: 'background .3s, color .3s',
        }}>
          {syncing ? 'Syncing…' : 'Saved'}
        </div>

        {/* Theme toggle */}
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-2)', padding: 6, borderRadius: 8,
            display: 'flex', alignItems: 'center',
          }}
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Hamburger (mobile) */}
        <button
          onClick={() => setDrawerOpen(true)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--text-2)', padding: 6, borderRadius: 8,
            display: 'flex', alignItems: 'center',
          }}
          className="mobile-only"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </header>

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Desktop sidebar ── */}
        <aside style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          padding: '16px 12px',
          position: 'sticky', top: 56, height: 'calc(100svh - 56px)',
          overflowY: 'auto',
        }} className="desktop-only">

          {/* New Entry shortcut */}
          <NavLink to="/entry" style={{ textDecoration: 'none', marginBottom: 8 }}>
            {({ isActive }) => (
              <div style={{
                ...linkStyle(isActive),
                background: isActive ? 'var(--primary)' : 'var(--primary)',
                color: 'white',
                fontWeight: 600,
                justifyContent: 'center',
                gap: 8,
                borderRadius: 10,
                padding: '11px 14px',
              }}>
                <Plus size={16} /> New Entry
              </div>
            )}
          </NavLink>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} style={{ textDecoration: 'none' }}>
                {({ isActive }) => (
                  <div style={linkStyle(isActive)}>
                    <Icon size={16} />
                    {label}
                  </div>
                )}
              </NavLink>
            ))}
          </div>

          <div style={{ flex: 1 }} />

          {userName && (
            <div style={{
              padding: '10px 14px',
              borderTop: '1px solid var(--border)',
              marginTop: 12,
              fontSize: 13,
              color: 'var(--text-2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
              <span>{userName}</span>
              <button
                onClick={signOut}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', display: 'flex' }}
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </aside>

        {/* ── Page content ── */}
        <main style={{
          flex: 1, overflowY: 'auto',
          paddingBottom: 80, // room for bottom nav
          minWidth: 0,
        }}>
          <Outlet />
        </main>
      </div>

      {/* ── Bottom nav (mobile) ── */}
      <nav className="mobile-only" style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 40,
        background: 'var(--surface)',
        borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center',
        height: 64,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        {/* Left 2 */}
        {bottomNav.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, paddingTop: 8,
                color: isActive ? 'var(--primary)' : 'var(--text-3)',
              }}>
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}

        {/* FAB center */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', paddingTop: 6 }}>
          <button
            onClick={() => navigate('/entry')}
            style={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: 'var(--primary)',
              border: 'none',
              color: 'white',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 4px 16px rgba(75,63,176,.45)',
              marginTop: -14,
            }}
            aria-label="New Entry"
          >
            <Plus size={26} />
          </button>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--text-3)', marginTop: 3 }}>New</span>
        </div>

        {/* Right 2 */}
        {bottomNav.slice(2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} style={{ textDecoration: 'none', flex: 1 }}>
            {({ isActive }) => (
              <div style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                gap: 3, paddingTop: 8,
                color: isActive ? 'var(--primary)' : 'var(--text-3)',
              }}>
                <Icon size={20} />
                <span style={{ fontSize: 10, fontWeight: 500 }}>{label}</span>
              </div>
            )}
          </NavLink>
        ))}
      </nav>

      {/* ── Slide-in drawer (mobile) ── */}
      {drawerOpen && (
        <>
          <div
            onClick={() => setDrawerOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.35)',
              zIndex: 60, backdropFilter: 'blur(2px)',
            }}
          />
          <aside style={{
            position: 'fixed', top: 0, right: 0, bottom: 0,
            width: 280,
            background: 'var(--surface)',
            zIndex: 70,
            display: 'flex', flexDirection: 'column',
            padding: '20px 16px',
            boxShadow: '-4px 0 24px rgba(0,0,0,.15)',
            animation: 'slideIn .2s ease',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span className="serif" style={{ fontSize: 18 }}>Menu</span>
              <button
                onClick={() => setDrawerOpen(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex' }}
              >
                <X size={20} />
              </button>
            </div>

            {userName && (
              <div style={{
                padding: '10px 14px', marginBottom: 12,
                background: 'var(--primary-light)', borderRadius: 10,
                fontSize: 14, fontWeight: 500, color: 'var(--primary)',
              }}>
                {userName}
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 2, flex: 1 }}>
              {[
                { to: '/settings',  label: 'Settings',   icon: Settings },
                { to: '/clients',   label: 'Clients',    icon: UserCircle },
                { to: '/stats',     label: 'My Stats',   icon: Star },
                { to: '/help',      label: 'Help',       icon: HelpCircle },
              ].map(({ to, label, icon: Icon }) => (
                <NavLink key={to} to={to} style={{ textDecoration: 'none' }} onClick={() => setDrawerOpen(false)}>
                  {({ isActive }) => (
                    <div style={{
                      ...linkStyle(isActive),
                      justifyContent: 'space-between',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Icon size={16} /> {label}
                      </div>
                      <ChevronRight size={14} style={{ color: 'var(--text-3)' }} />
                    </div>
                  )}
                </NavLink>
              ))}
            </div>

            <button
              onClick={signOut}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '12px 14px', borderRadius: 10,
                background: 'var(--bad-bg)', color: 'var(--bad)',
                border: 'none', cursor: 'pointer', fontWeight: 600,
                fontSize: 14, fontFamily: 'inherit', width: '100%',
              }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </aside>
        </>
      )}

      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); }
          to   { transform: translateX(0); }
        }
        .mobile-only  { display: flex; }
        .desktop-only { display: none; }
        @media (min-width: 768px) {
          .mobile-only  { display: none !important; }
          .desktop-only { display: flex !important; }
        }
        [data-theme="dark"] .card { background: var(--surface-2); }
      `}</style>
    </div>
  )
}
