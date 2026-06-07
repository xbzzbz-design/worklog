import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Star, Plus } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Entry, AppUser } from '../lib/types'
import { JOB_TYPES } from '../lib/types'

function greeting(name: string): string {
  const h = new Date().getHours()
  if (h < 12) return `Good morning, ${name}`
  if (h < 17) return `Good afternoon, ${name}`
  return `Good evening, ${name}`
}

function SkeletonLine({ w = '100%', h = 16 }: { w?: string; h?: number }) {
  return (
    <div style={{
      width: w, height: h,
      background: 'var(--surface-2)',
      borderRadius: 6,
      animation: 'pulse 1.5s ease-in-out infinite',
    }} />
  )
}

function ProgressRing({
  value, max, size = 140,
}: { value: number; max: number; size?: number }) {
  const r = (size - 16) / 2
  const circ = 2 * Math.PI * r
  const pct = Math.min(value / Math.max(max, 0.01), 1.5)
  const dash = pct * circ
  const over = value > max
  const color = over ? 'var(--bad)' : 'var(--good)'

  return (
    <svg width={size} height={size} style={{ display: 'block' }}>
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke="var(--surface-2)" strokeWidth={8} />
      <circle cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={`${Math.min(dash, circ)} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: 'stroke-dasharray .6s ease' }}
      />
      {over && (
        <circle cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--bad)" strokeWidth={8}
          strokeDasharray={`${dash - circ} ${circ}`}
          strokeLinecap="round"
          strokeOpacity={0.3}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      )}
      <text x={size / 2} y={size / 2 - 6}
        textAnchor="middle"
        fontSize={22} fontWeight={700}
        fill={color} fontFamily="Inter,sans-serif">
        {value.toFixed(1)}
      </text>
      <text x={size / 2} y={size / 2 + 14}
        textAnchor="middle"
        fontSize={11} fill="var(--text-3)" fontFamily="Inter,sans-serif">
        of {max} units
      </text>
    </svg>
  )
}

function EntryCard({ entry }: { entry: Entry }) {
  const jt = JOB_TYPES[entry.job_type]
  return (
    <div className="card" style={{
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <span className={`jt-${entry.job_type}`} style={{
        fontSize: 11, fontWeight: 600,
        padding: '3px 8px', borderRadius: 99,
        whiteSpace: 'nowrap', flexShrink: 0,
      }}>
        {jt.short}
      </span>
      <span style={{ fontSize: 13, color: 'var(--text-2)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {entry.client?.name ?? '—'}
      </span>
      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginLeft: 'auto', flexShrink: 0 }}>
        {entry.calculated_units.toFixed(2)}
      </span>
      {entry.is_flagged && <Flag size={12} style={{ color: 'var(--bad)', flexShrink: 0 }} />}
      {entry.is_starred && <Star size={12} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
    </div>
  )
}

export default function Home() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [todayEntries, setTodayEntries] = useState<Entry[]>([])
  const [monthEntries, setMonthEntries] = useState<Entry[]>([])
  const [lastMonthUnits, setLastMonthUnits] = useState(0)
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const [{ data: userData }, { data: todayData }, { data: monthData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('entries')
        .select('*, client:clients(*)')
        .eq('user_id', authUser.id)
        .eq('date', new Date().toISOString().slice(0, 10))
        .order('created_at', { ascending: false }),
      supabase.from('entries')
        .select('*, client:clients(*)')
        .eq('user_id', authUser.id)
        .gte('date', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0, 10))
        .order('date', { ascending: false }),
    ])

    // Last month
    const now = new Date()
    const lmStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10)
    const lmEnd = new Date(now.getFullYear(), now.getMonth(), 0).toISOString().slice(0, 10)
    const { data: lastMonthData } = await supabase.from('entries')
      .select('calculated_units')
      .eq('user_id', authUser.id)
      .gte('date', lmStart)
      .lte('date', lmEnd)

    setUser(userData as AppUser)
    setTodayEntries((todayData ?? []) as Entry[])
    setMonthEntries((monthData ?? []) as Entry[])
    setLastMonthUnits((lastMonthData ?? []).reduce((s, e) => s + (e.calculated_units ?? 0), 0))
    setLoading(false)
  }

  const todayUnits = todayEntries.reduce((s, e) => s + e.calculated_units, 0)
  const monthUnits = monthEntries.reduce((s, e) => s + e.calculated_units, 0)
  const dailyMax = user?.daily_max ?? 7
  const starred = monthEntries.filter(e => e.is_starred)

  function monthComparison() {
    if (lastMonthUnits === 0) return null
    const diff = monthUnits - lastMonthUnits
    const pct = Math.abs(Math.round((diff / lastMonthUnits) * 100))
    if (diff < -0.5) return { text: `Lighter than last month — enjoy the breathing room`, good: true }
    if (diff > 0.5) return { text: `Strong month — up ${pct}% from last month`, good: false }
    return { text: 'Steady pace — similar to last month', good: true }
  }

  const comparison = monthComparison()

  if (loading) {
    return (
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <SkeletonLine w="60%" h={32} />
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
          <div style={{ width: 140, height: 140, borderRadius: '50%', background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
        </div>
        {[1, 2, 3].map(i => <SkeletonLine key={i} h={52} />)}
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>
      </div>
    )
  }

  return (
    <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Greeting */}
      <h1 className="serif" style={{ fontSize: 26, margin: 0, fontWeight: 400 }}>
        {greeting(user?.name ?? 'there')} 👋
      </h1>

      {/* Today ring */}
      <div className="card" style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--text-2)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Today
        </p>
        <ProgressRing value={todayUnits} max={dailyMax} />
        {todayUnits === 0 && (
          <p style={{ color: 'var(--text-3)', fontSize: 13, margin: 0 }}>No entries yet — log your first piece today</p>
        )}
        {todayUnits > dailyMax && (
          <p style={{ color: 'var(--bad)', fontSize: 13, margin: 0, fontWeight: 500 }}>
            Over daily capacity — consider flagging or spreading work
          </p>
        )}
        {todayUnits > 0 && todayUnits <= dailyMax && (
          <p style={{ color: 'var(--good)', fontSize: 13, margin: 0, fontWeight: 500 }}>
            Within capacity — great work
          </p>
        )}
      </div>

      {/* Affirmation */}
      <div style={{
        padding: '14px 18px',
        background: 'var(--primary-light)',
        borderRadius: 'var(--radius)',
        borderLeft: '3px solid var(--primary)',
      }}>
        <p style={{ margin: 0, fontSize: 14, color: 'var(--primary)', lineHeight: 1.6, fontStyle: 'italic' }}>
          "Your work is visible here — even on the days no one says thank you."
        </p>
      </div>

      {/* Today's entries */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Today's entries</h2>
          <button
            onClick={() => navigate('/entry')}
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              background: 'var(--primary-light)', color: 'var(--primary)',
              border: 'none', borderRadius: 8, padding: '6px 12px',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            <Plus size={14} /> Add
          </button>
        </div>
        {todayEntries.length === 0 ? (
          <div style={{
            padding: '20px 0', textAlign: 'center',
            color: 'var(--text-3)', fontSize: 14,
          }}>
            Nothing logged yet today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayEntries.map(e => <EntryCard key={e.id} entry={e} />)}
          </div>
        )}
      </section>

      {/* Month summary */}
      <section>
        <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>This month</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Total units</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{monthUnits.toFixed(1)}</p>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Pieces</p>
            <p style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{monthEntries.length}</p>
          </div>
        </div>
        {comparison && (
          <div style={{
            marginTop: 10,
            padding: '10px 14px',
            background: 'var(--good-bg)',
            borderRadius: 10,
            fontSize: 13,
            color: 'var(--good)',
            fontWeight: 500,
          }}>
            {comparison.text}
          </div>
        )}
      </section>

      {/* Starred gallery */}
      {starred.length > 0 && (
        <section>
          <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
            <Star size={15} style={{ color: 'var(--amber)' }} /> Starred this month
          </h2>
          <div style={{
            display: 'flex', gap: 10, overflowX: 'auto',
            paddingBottom: 4,
          }}>
            {starred.map(e => (
              <div key={e.id} className="card" style={{
                minWidth: 160, padding: '10px 14px', flexShrink: 0,
              }}>
                <span className={`jt-${e.job_type}`} style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 6,
                }}>
                  {JOB_TYPES[e.job_type].short}
                </span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{e.client?.name ?? '—'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>{e.calculated_units.toFixed(2)} units</p>
                {e.note && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {e.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
