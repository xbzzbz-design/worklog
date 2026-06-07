import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Flag, Star } from 'lucide-react'
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

function initials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

const AVATAR_COLORS = [
  ['#e0e7ff','#4338ca'], ['#dcfce7','#16a34a'], ['#fce7f3','#9d174d'],
  ['#e0f2fe','#0369a1'], ['#fef3c7','#d97706'], ['#ede9ff','#4b3fb0'],
]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff
  return AVATAR_COLORS[h % AVATAR_COLORS.length]
}

function EntryCard({ entry, isNew }: { entry: Entry; isNew?: boolean }) {
  const jt = JOB_TYPES[entry.job_type]
  const clientName = entry.client?.name ?? '—'
  const [bg, fg] = clientName === '—' ? ['var(--surface-2)', 'var(--text-3)'] : avatarColor(clientName)
  return (
    <div className="card" style={{
      padding: '10px 14px',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      {/* Avatar */}
      <div style={{
        width: 36, height: 36, borderRadius: '50%',
        background: bg, color: fg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>
        {clientName === '—' ? '?' : initials(clientName)}
      </div>
      {/* Middle */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {clientName}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <span className={`jt-${entry.job_type}`} style={{ fontSize: 10, fontWeight: 600, padding: '1px 6px', borderRadius: 99 }}>
            {jt.short}
          </span>
          {isNew && <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-3)', background: 'var(--surface-2)', padding: '1px 6px', borderRadius: 99 }}>New</span>}
          {entry.is_revision && <span style={{ fontSize: 10, color: 'var(--amber)' }}>Rev</span>}
        </div>
      </div>
      {/* Right */}
      <div style={{ textAlign: 'right', flexShrink: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 700 }}>{(entry.manual_override ?? entry.calculated_units).toFixed(2)}</div>
        {entry.is_starred && <Star size={11} style={{ color: 'var(--amber)' }} />}
        {entry.is_flagged && <Flag size={11} style={{ color: 'var(--bad)' }} />}
      </div>
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

  function heroText() {
    if (todayUnits === 0) return 'Fresh start — log your first piece.'
    if (todayUnits > dailyMax * 1.2) return `That's a big day — ${todayUnits.toFixed(2)} units logged.`
    if (todayUnits > dailyMax * 0.8) return `Solid work today — ${todayUnits.toFixed(2)} units.`
    return `Good start — ${todayUnits.toFixed(2)} units so far.`
  }

  return (
    <div style={{ padding: '0 0 100px', maxWidth: 640, margin: '0 auto' }}>
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.5} }`}</style>

      {/* Header area */}
      <div style={{ padding: '20px 16px 0' }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--primary)' }}>
          {greeting(user?.name ?? 'there')}
        </p>
        <h1 className="serif" style={{ fontSize: 28, margin: '0 0 20px', fontWeight: 400, lineHeight: 1.2 }}>
          <em>{heroText()}</em>
        </h1>
      </div>

      {/* Today ring card */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card" style={{ padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 20 }}>
          <ProgressRing value={todayUnits} max={dailyMax} size={120} />
          <div style={{ flex: 1 }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, fontWeight: 600, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Today</p>
            <p style={{ margin: '0 0 6px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.4 }}>
              {todayUnits === 0
                ? 'Nothing logged yet'
                : `You've logged ${todayUnits.toFixed(2)} units across ${todayEntries.length} job${todayEntries.length !== 1 ? 's' : ''}.`}
            </p>
            {todayUnits > dailyMax && (
              <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--bad-bg)', color: 'var(--bad)', borderRadius: 99, padding: '3px 10px', display: 'inline-block' }}>
                {(todayUnits - dailyMax).toFixed(2)} over your daily max
              </span>
            )}
            {todayUnits > 0 && todayUnits <= dailyMax && (
              <span style={{ fontSize: 12, fontWeight: 600, background: 'var(--good-bg)', color: 'var(--good)', borderRadius: 99, padding: '3px 10px', display: 'inline-block' }}>
                Within capacity
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Today's entries */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Today's log</span>
          <button
            onClick={() => navigate('/timeline')}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: 13, fontWeight: 600, padding: 0, fontFamily: 'inherit' }}
          >
            View all →
          </button>
        </div>
        {todayEntries.length === 0 ? (
          <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-3)', fontSize: 14 }}>
            Nothing logged yet today.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {todayEntries.map((e, i) => <EntryCard key={e.id} entry={e} isNew={i === 0} />)}
          </div>
        )}
      </div>

      {/* Month summary */}
      <div style={{ padding: '0 16px 16px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'block', marginBottom: 10 }}>This month</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Units</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{monthUnits.toFixed(1)}</p>
          </div>
          <div className="card" style={{ padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 12, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>Pieces</p>
            <p style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{monthEntries.length}</p>
          </div>
        </div>
        {comparison && (
          <div style={{ marginTop: 10, padding: '10px 14px', background: comparison.good ? 'var(--good-bg)' : 'var(--primary-light)', borderRadius: 10, fontSize: 13, color: comparison.good ? 'var(--good)' : 'var(--primary)', fontWeight: 500 }}>
            {comparison.text}
          </div>
        )}
      </div>

      {/* Starred gallery */}
      {starred.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.08em', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 10 }}>
            <Star size={12} style={{ color: 'var(--amber)' }} /> Starred this month
          </span>
          <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 4 }}>
            {starred.map(e => (
              <div key={e.id} className="card" style={{ minWidth: 160, padding: '10px 14px', flexShrink: 0 }}>
                <span className={`jt-${e.job_type}`} style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, display: 'inline-block', marginBottom: 6 }}>
                  {JOB_TYPES[e.job_type].short}
                </span>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>{e.client?.name ?? '—'}</p>
                <p style={{ margin: '2px 0 0', fontSize: 12, color: 'var(--text-3)' }}>{(e.manual_override ?? e.calculated_units).toFixed(2)} units</p>
                {e.note && (
                  <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {e.note}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
