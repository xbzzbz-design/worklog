import { useState } from 'react'
import { Layers, Mail, ArrowRight, CheckCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { emailRedirectTo: window.location.href },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{
      minHeight: '100svh',
      background: 'var(--surface)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px 16px',
    }}>
      <div style={{
        width: '100%',
        maxWidth: 400,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 32,
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
          <div style={{
            width: 56, height: 56,
            background: 'var(--primary-light)',
            borderRadius: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Layers size={28} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <h1 className="serif" style={{ fontSize: 28, margin: 0, fontWeight: 400, letterSpacing: '-0.02em' }}>
              WorkLog
            </h1>
            <p style={{ color: 'var(--text-2)', fontSize: 15, margin: '6px 0 0', lineHeight: 1.5 }}>
              Fair workload tracking for design teams
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="card" style={{ width: '100%', padding: 28 }}>
          {!sent ? (
            <>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 6px' }}>
                Welcome back
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, margin: '0 0 24px', lineHeight: 1.6 }}>
                Enter your email and we'll send you a magic link — no password needed.
              </p>

              <form onSubmit={handleSend} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>Email address</span>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} style={{
                      position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
                      color: 'var(--text-3)',
                    }} />
                    <input
                      type="email"
                      value={email}
                      onChange={e => setEmail(e.target.value)}
                      placeholder="you@studio.com"
                      required
                      autoFocus
                      style={{
                        width: '100%', padding: '12px 12px 12px 38px',
                        border: '1.5px solid var(--border)',
                        borderRadius: 10, fontSize: 15,
                        background: 'var(--surface)',
                        color: 'var(--text)',
                        fontFamily: 'inherit',
                        outline: 'none',
                        boxSizing: 'border-box',
                        transition: 'border-color .15s',
                      }}
                      onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={e => e.target.style.borderColor = 'var(--border)'}
                    />
                  </div>
                </label>

                {error && (
                  <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0 }}>{error}</p>
                )}

                <button
                  type="submit"
                  className="btn-primary"
                  disabled={loading}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                >
                  {loading ? 'Sending…' : (
                    <>Send magic link <ArrowRight size={16} /></>
                  )}
                </button>
              </form>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 48, height: 48,
                background: 'var(--good-bg)',
                borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 16px',
              }}>
                <CheckCircle size={24} style={{ color: 'var(--good)' }} />
              </div>
              <h2 style={{ fontSize: 18, fontWeight: 600, margin: '0 0 8px' }}>
                Check your email
              </h2>
              <p style={{ color: 'var(--text-2)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
                We sent a magic link to <strong>{email}</strong>.
                Click the link to sign in — it expires in 1 hour.
              </p>
              <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>
                No email? Check spam, or{' '}
                <button
                  onClick={() => setSent(false)}
                  style={{
                    background: 'none', border: 'none', color: 'var(--primary)',
                    cursor: 'pointer', fontWeight: 500, fontSize: 13, fontFamily: 'inherit', padding: 0,
                  }}
                >
                  try again
                </button>.
              </p>
            </div>
          )}
        </div>

        {/* Warm footer */}
        <p style={{
          color: 'var(--text-3)', fontSize: 13, textAlign: 'center',
          maxWidth: 320, lineHeight: 1.6, margin: 0,
        }}>
          Your work deserves to be seen. WorkLog helps make sure it is.
        </p>
      </div>
    </div>
  )
}
