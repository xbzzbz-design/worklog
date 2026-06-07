import { useEffect, useState } from 'react'
import { HandHelping, Plus, X } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { HelpRequest, AppUser, HelpUrgency } from '../lib/types'

interface FullRequest extends HelpRequest {
  author?: AppUser
  handler?: AppUser
}

const urgencyColor: Record<HelpUrgency, string> = {
  low: 'var(--good)',
  medium: 'var(--amber)',
  high: 'var(--bad)',
}
const urgencyBg: Record<HelpUrgency, string> = {
  low: 'var(--good-bg)',
  medium: 'var(--amber-bg)',
  high: 'var(--bad-bg)',
}

export default function HelpBoard() {
  const [requests, setRequests] = useState<FullRequest[]>([])
  const [me, setMe] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [desc, setDesc] = useState('')
  const [urgency, setUrgency] = useState<HelpUrgency>('medium')
  const [hours, setHours] = useState('')
  const [thanks, setThanks] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  async function load() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: profile }, { data: reqs }, { data: users }] = await Promise.all([
      supabase.from('users').select('*').eq('id', user.id).single(),
      supabase.from('help_requests').select('*').order('created_at', { ascending: false }),
      supabase.from('users').select('*'),
    ])
    setMe(profile)
    const usersMap = Object.fromEntries((users || []).map(u => [u.id, u]))
    setRequests((reqs || []).map(r => ({
      ...r,
      author: usersMap[r.author_id],
      handler: r.handled_by ? usersMap[r.handled_by] : undefined,
    })) as FullRequest[])
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function submit() {
    if (!me || !desc.trim()) return
    await supabase.from('help_requests').insert({
      author_id: me.id,
      description: desc.trim(),
      urgency,
      hours_needed: hours ? parseFloat(hours) : null,
    })
    setDesc(''); setHours(''); setShowForm(false)
    load()
  }

  async function claim(id: string) {
    if (!me) return
    setSavingId(id)
    await supabase.from('help_requests').update({ status: 'claimed', handled_by: me.id }).eq('id', id)
    setSavingId(null); load()
  }

  async function resolve(r: FullRequest) {
    setSavingId(r.id)
    await supabase.from('help_requests').update({
      status: 'resolved',
      thanks_message: thanks.trim() || null,
      resolved_at: new Date().toISOString(),
    }).eq('id', r.id)
    setThanks(''); setSavingId(null); load()
  }

  async function cancel(id: string) {
    await supabase.from('help_requests').delete().eq('id', id)
    load()
  }

  const open = requests.filter(r => r.status === 'open' || r.status === 'claimed')
  const resolved = requests.filter(r => r.status === 'resolved')
  const resolvedThisMonth = resolved.filter(r => r.resolved_at && r.resolved_at.startsWith(new Date().toISOString().slice(0, 7))).length

  if (loading) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Loading…</div>

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <HandHelping size={22} color="var(--primary)" />
          <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>We've got each other</h1>
        </div>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
          When you back each other up, it'll show here.
        </p>
        {resolvedThisMonth > 0 && (
          <div style={{ marginTop: 10, background: 'var(--primary-light)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--primary)' }}>
            The team backed each other up <strong>{resolvedThisMonth} time{resolvedThisMonth !== 1 ? 's' : ''}</strong> this month.
          </div>
        )}
      </div>

      <div style={{ padding: '0 16px 16px' }}>
        <button className="btn-primary" onClick={() => setShowForm(v => !v)}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={18} /> Raise a hand
          </span>
        </button>
      </div>

      {showForm && (
        <div style={{ margin: '0 16px 16px' }} className="card">
          <div style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontWeight: 600 }}>What do you need help with?</div>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)' }}><X size={18} /></button>
            </div>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)}
              placeholder="Describe what you need…"
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', minHeight: 80, color: 'var(--text)', background: 'var(--surface)' }}
            />
            <div style={{ display: 'flex', gap: 8, margin: '10px 0' }}>
              {(['low', 'medium', 'high'] as HelpUrgency[]).map(u => (
                <button key={u} onClick={() => setUrgency(u)} style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: '2px solid',
                  borderColor: urgency === u ? urgencyColor[u] : 'var(--border)',
                  background: urgency === u ? urgencyBg[u] : 'transparent',
                  color: urgency === u ? urgencyColor[u] : 'var(--text-2)',
                  fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
                }}>{u.charAt(0).toUpperCase() + u.slice(1)}</button>
              ))}
            </div>
            <input
              type="number" value={hours} onChange={e => setHours(e.target.value)}
              placeholder="Hours needed (optional)"
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)' }}
            />
            <button className="btn-primary" style={{ marginTop: 12 }} onClick={submit}>Post request</button>
          </div>
        </div>
      )}

      {/* Open requests */}
      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {open.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-2)', fontSize: 14 }}>
            No open requests — all good right now 🌿
          </div>
        )}
        {open.map(r => {
          const isMine = r.author_id === me?.id
          const isClaimer = r.handled_by === me?.id
          return (
            <div key={r.id} className="card" style={{ padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{r.author?.name || 'Someone'}</div>
                <span style={{ fontSize: 11, borderRadius: 6, padding: '3px 8px', background: urgencyBg[r.urgency as HelpUrgency], color: urgencyColor[r.urgency as HelpUrgency], fontWeight: 600 }}>
                  {r.urgency}
                </span>
              </div>
              <p style={{ margin: '0 0 8px', fontSize: 14 }}>{r.description}</p>
              {r.hours_needed && <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 8 }}>~{r.hours_needed}h needed</div>}
              {r.status === 'claimed' && r.handler && (
                <div style={{ fontSize: 13, color: 'var(--good)', marginBottom: 8 }}>
                  ✓ {r.handler.name} is lending a hand
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                {!isMine && r.status === 'open' && (
                  <button className="btn-primary" style={{ fontSize: 13, padding: '9px 0' }} onClick={() => claim(r.id)} disabled={savingId === r.id}>
                    Lend a hand
                  </button>
                )}
                {isMine && r.status === 'claimed' && (
                  <div style={{ width: '100%' }}>
                    <input
                      placeholder="Send a quick thanks (optional)…"
                      value={thanks} onChange={e => setThanks(e.target.value)}
                      style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: 10, fontSize: 14, fontFamily: 'inherit', marginBottom: 8, color: 'var(--text)', background: 'var(--surface)' }}
                    />
                    <button className="btn-primary" style={{ fontSize: 13, padding: '9px 0' }} onClick={() => resolve(r)} disabled={savingId === r.id}>
                      Mark resolved ✓
                    </button>
                  </div>
                )}
                {isMine && r.status === 'open' && (
                  <button className="btn-secondary" style={{ fontSize: 13 }} onClick={() => cancel(r.id)}>Cancel</button>
                )}
                {isClaimer && !isMine && (
                  <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Waiting for them to mark it resolved…</div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Resolved */}
      {resolved.length > 0 && (
        <div style={{ padding: '20px 16px 0' }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-2)', marginBottom: 10 }}>Handled together</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {resolved.slice(0, 5).map(r => (
              <div key={r.id} className="card" style={{ padding: '12px 16px', opacity: 0.8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>{r.author?.name}</span>
                  <span style={{ fontSize: 12, color: 'var(--good)' }}>✓ resolved</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>{r.description}</p>
                {r.thanks_message && (
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--primary)', fontStyle: 'italic' }}>"{r.thanks_message}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
