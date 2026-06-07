import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Star, ChevronLeft, ChevronRight, X, Edit2, Trash2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Entry, Client } from '../lib/types'
import { JOB_TYPES } from '../lib/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function groupByDate(entries: Entry[]): Record<string, Entry[]> {
  const g: Record<string, Entry[]> = {}
  for (const e of entries) {
    if (!g[e.date]) g[e.date] = []
    g[e.date].push(e)
  }
  return g
}

function JtBadge({ type }: { type: string }) {
  const jt = JOB_TYPES[type as keyof typeof JOB_TYPES]
  return (
    <span className={`jt-${type}`} style={{
      fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 99,
    }}>
      {jt?.short ?? type}
    </span>
  )
}

// ── Entry card (shared) ───────────────────────────────────────────────────────

function EntryCard({ entry, onClick }: { entry: Entry; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: 10,
      width: '100%', background: 'none', border: 'none',
      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
      padding: '10px 14px',
    }}>
      <JtBadge type={entry.job_type} />
      <span style={{ flex: 1, fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0 }}>
        {entry.client?.name ?? '—'}
        {entry.note && <span style={{ color: 'var(--text-3)', marginLeft: 6 }}>· {entry.note}</span>}
      </span>
      <span style={{ fontSize: 13, fontWeight: 700, flexShrink: 0 }}>{entry.calculated_units.toFixed(2)}</span>
      {entry.is_flagged && <Flag size={12} style={{ color: 'var(--bad)', flexShrink: 0 }} />}
      {entry.is_starred && <Star size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
    </button>
  )
}

// ── Detail modal ──────────────────────────────────────────────────────────────

function DetailModal({ entry, onClose, onEdit, onDelete }: {
  entry: Entry; onClose: () => void; onEdit: () => void; onDelete: () => void
}) {
  const jt = JOB_TYPES[entry.job_type]
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 80,
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.4)', backdropFilter: 'blur(2px)' }} />
      <div className="card" style={{
        position: 'relative', width: '100%', maxWidth: 560,
        borderRadius: '20px 20px 0 0', padding: '24px 20px 32px',
        maxHeight: '80svh', overflowY: 'auto',
        animation: 'slideUp .25s ease',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16,
          background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)',
          display: 'flex',
        }}>
          <X size={20} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <JtBadge type={entry.job_type} />
          <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{fmtDate(entry.date)}</span>
          {entry.is_flagged && <Flag size={13} style={{ color: 'var(--bad)' }} />}
          {entry.is_starred && <Star size={13} style={{ color: 'var(--amber)' }} />}
        </div>

        <h2 className="serif" style={{ fontSize: 22, margin: '0 0 6px', fontWeight: 400 }}>
          {entry.client?.name ?? 'No client'}
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
          {[
            ['Job type', jt.label],
            ['Quantity', String(entry.quantity)],
            ['Units', entry.calculated_units.toFixed(2)],
            ['Revision', entry.is_revision ? `Round ${entry.revision_round}` : 'New'],
          ].map(([k, v]) => (
            <div key={k} style={{ background: 'var(--surface-2)', borderRadius: 10, padding: '10px 12px' }}>
              <p style={{ margin: '0 0 2px', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{k}</p>
              <p style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{v}</p>
            </div>
          ))}
        </div>

        {entry.note && (
          <div style={{ marginBottom: 14, padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 10 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.5 }}>{entry.note}</p>
          </div>
        )}

        {entry.drive_link && (
          <a href={entry.drive_link} target="_blank" rel="noopener noreferrer"
            style={{ fontSize: 13, color: 'var(--primary)', display: 'block', marginBottom: 14 }}>
            View in Drive →
          </a>
        )}

        {entry.manual_override != null && (
          <p style={{ fontSize: 12, color: 'var(--amber)', margin: '0 0 14px' }}>
            Override: {entry.manual_override} units — {entry.manual_override_reason}
          </p>
        )}

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onEdit} className="btn-secondary"
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Edit2 size={14} /> Edit
          </button>
          <button onClick={onDelete}
            style={{
              flex: 1, padding: '10px 16px', borderRadius: 10, border: 'none',
              background: 'var(--bad-bg)', color: 'var(--bad)',
              cursor: 'pointer', fontWeight: 600, fontSize: 14,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              fontFamily: 'inherit',
            }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      </div>
      <style>{`@keyframes slideUp { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  )
}

// ── Calendar view ─────────────────────────────────────────────────────────────

function CalendarView({ entries, dailyMax }: { entries: Entry[]; dailyMax: number }) {
  const [month, setMonth] = useState(() => {
    const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const navigate = useNavigate()

  const grouped = groupByDate(entries)

  function daysInMonth(m: Date) {
    return new Date(m.getFullYear(), m.getMonth() + 1, 0).getDate()
  }
  function startDow(m: Date) {
    return new Date(m.getFullYear(), m.getMonth(), 1).getDay()
  }

  const days = daysInMonth(month)
  const start = startDow(month)

  function dotColor(date: string) {
    const dayEntries = grouped[date]
    if (!dayEntries?.length) return 'var(--border)'
    const units = dayEntries.reduce((s, e) => s + e.calculated_units, 0)
    return units > dailyMax ? 'var(--bad)' : 'var(--good)'
  }

  function dotSize(date: string) {
    const dayEntries = grouped[date]
    if (!dayEntries?.length) return 6
    const units = dayEntries.reduce((s, e) => s + e.calculated_units, 0)
    return Math.min(14, 6 + units * 1.2)
  }

  const monthLabel = month.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  const selectedEntries = selectedDay ? (grouped[selectedDay] ?? []) : []

  return (
    <div>
      {/* Month header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <button type="button" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', padding: 4 }}>
          <ChevronLeft size={20} />
        </button>
        <span style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: 15 }}>{monthLabel}</span>
        <button type="button" onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-2)', display: 'flex', padding: 4 }}>
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Weekday headers */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2, marginBottom: 4 }}>
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, padding: '4px 0' }}>{d}</div>
        ))}
      </div>

      {/* Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
        {Array.from({ length: start }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: days }).map((_, i) => {
          const d = i + 1
          const dateStr = isoDate(new Date(month.getFullYear(), month.getMonth(), d))
          const isSelected = selectedDay === dateStr
          const hasEntries = !!grouped[dateStr]?.length
          const isToday = dateStr === isoDate(new Date())
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelectedDay(isSelected ? null : dateStr)}
              style={{
                aspectRatio: '1', display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 3,
                border: isSelected ? '2px solid var(--primary)' : '1px solid transparent',
                borderRadius: 10,
                background: isSelected ? 'var(--primary-light)' : isToday ? 'var(--surface-2)' : 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: isToday ? 'var(--primary)' : 'var(--text)' }}>{d}</span>
              <div style={{
                width: dotSize(dateStr), height: dotSize(dateStr),
                borderRadius: '50%',
                background: hasEntries ? dotColor(dateStr) : 'transparent',
                transition: 'all .2s',
              }} />
            </button>
          )
        })}
      </div>

      {/* Day slide-up panel */}
      {selectedDay && (
        <div style={{
          marginTop: 16, padding: '16px 0',
          borderTop: '1.5px solid var(--border)',
          animation: 'slideUp .2s ease',
        }}>
          <p style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>
            {fmtDate(selectedDay)} — {selectedEntries.reduce((s, e) => s + e.calculated_units, 0).toFixed(2)} units
          </p>
          {selectedEntries.length === 0 ? (
            <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No entries this day.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {selectedEntries.map(e => (
                <div key={e.id} className="card">
                  <EntryCard entry={e} onClick={() => setSelectedEntry(e)} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {selectedEntry && (
        <DetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={() => navigate(`/entry/${selectedEntry.id}`)}
          onDelete={async () => {
            if (!confirm('Delete this entry?')) return
            await supabase.from('entries').delete().eq('id', selectedEntry.id)
            setSelectedEntry(null)
          }}
        />
      )}

      <style>{`@keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
    </div>
  )
}

// ── List view ─────────────────────────────────────────────────────────────────

function ListView({ entries }: { entries: Entry[] }) {
  const navigate = useNavigate()
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)

  const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date))
  const grouped = groupByDate(sorted)
  const dates = Object.keys(grouped).sort((a, b) => b.localeCompare(a))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {dates.map(date => (
        <div key={date}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>{fmtDate(date)}</p>
            <span style={{ fontSize: 12, color: 'var(--text-3)' }}>
              {grouped[date].reduce((s, e) => s + e.calculated_units, 0).toFixed(2)} units
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {grouped[date].map(e => (
              <div key={e.id} className="card">
                <EntryCard entry={e} onClick={() => setSelectedEntry(e)} />
              </div>
            ))}
          </div>
        </div>
      ))}

      {selectedEntry && (
        <DetailModal
          entry={selectedEntry}
          onClose={() => setSelectedEntry(null)}
          onEdit={() => navigate(`/entry/${selectedEntry.id}`)}
          onDelete={async () => {
            if (!confirm('Delete this entry?')) return
            await supabase.from('entries').delete().eq('id', selectedEntry.id)
            setSelectedEntry(null)
          }}
        />
      )}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Timeline() {
  const [view, setView] = useState<'calendar' | 'list'>('calendar')
  const [entries, setEntries] = useState<Entry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)
  const [dailyMax, setDailyMax] = useState(7)

  // filters
  const [filterClient, setFilterClient] = useState('')
  const [filterJobType, setFilterJobType] = useState('')
  const [filterFlagged, setFilterFlagged] = useState(false)
  const [filterStarred, setFilterStarred] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [{ data: userData }, { data: entryData }, { data: clientData }] = await Promise.all([
      supabase.from('users').select('daily_max').eq('id', user.id).single(),
      supabase.from('entries').select('*, client:clients(*)').eq('user_id', user.id).order('date', { ascending: false }),
      supabase.from('clients').select('*'),
    ])
    if (userData) setDailyMax((userData as any).daily_max ?? 7)
    setEntries((entryData ?? []) as Entry[])
    setClients((clientData ?? []) as Client[])
    setLoading(false)
  }

  const filtered = entries.filter(e => {
    if (filterClient && e.client_id !== filterClient) return false
    if (filterJobType && e.job_type !== filterJobType) return false
    if (filterFlagged && !e.is_flagged) return false
    if (filterStarred && !e.is_starred) return false
    return true
  })

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 12px', borderRadius: 99,
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary-light)' : 'var(--surface-2)',
    color: active ? 'var(--primary)' : 'var(--text-2)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto' }}>
      <h1 className="serif" style={{ fontSize: 24, margin: '0 0 16px', fontWeight: 400 }}>Timeline</h1>

      {/* View toggle */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {(['calendar', 'list'] as const).map(v => (
          <button key={v} type="button" onClick={() => setView(v)} style={chipStyle(view === v)}>
            {v === 'calendar' ? '📅 Calendar' : '📋 List'}
          </button>
        ))}
      </div>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
        <select
          value={filterClient}
          onChange={e => setFilterClient(e.target.value)}
          style={{
            padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 99,
            background: 'var(--surface-2)', fontSize: 13, color: 'var(--text-2)',
            fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <option value="">All clients</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        <select
          value={filterJobType}
          onChange={e => setFilterJobType(e.target.value)}
          style={{
            padding: '6px 10px', border: '1.5px solid var(--border)', borderRadius: 99,
            background: 'var(--surface-2)', fontSize: 13, color: 'var(--text-2)',
            fontFamily: 'inherit', cursor: 'pointer', flexShrink: 0,
          }}
        >
          <option value="">All types</option>
          {Object.entries(JOB_TYPES).map(([k, v]) => <option key={k} value={k}>{v.short}</option>)}
        </select>

        <button type="button" onClick={() => setFilterFlagged(f => !f)} style={chipStyle(filterFlagged)}>
          🚩 Flagged
        </button>
        <button type="button" onClick={() => setFilterStarred(s => !s)} style={chipStyle(filterStarred)}>
          ⭐ Starred
        </button>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: 40 }}>Loading…</div>
      ) : view === 'calendar' ? (
        <CalendarView entries={filtered} dailyMax={dailyMax} />
      ) : (
        filtered.length === 0 ? (
          <div style={{ color: 'var(--text-3)', fontSize: 14, textAlign: 'center', padding: 40 }}>
            No entries match your filters.
          </div>
        ) : (
          <ListView entries={filtered} />
        )
      )}
    </div>
  )
}
