import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser, Entry, Client } from '../lib/types'
import { JOB_TYPES } from '../lib/types'

interface ClientStat {
  client: Client
  units: number
  pct: number
  revRate: number
  scopeFlags: number
  difficulty: number
  difficultyLabel: string
  difficultyColor: string
}

function difficultyInfo(score: number): { label: string; color: string } {
  if (score < 30) return { label: 'Easygoing', color: 'var(--good)' }
  if (score < 50) return { label: 'Steady', color: 'var(--primary)' }
  if (score < 65) return { label: 'Demanding', color: 'var(--amber)' }
  return { label: 'Tough', color: 'var(--bad)' }
}

function calcDifficulty(entries: Entry[]): number {
  if (!entries.length) return 0
  const revRate = entries.filter(e => e.is_revision).length / entries.length
  const scopeRate = entries.filter(e => e.revision_cause === 'SCOPE_CREEP').length / entries.length
  const rushRate = entries.filter(e => e.condition_deadline_rush).length / entries.length
  const briefRate = entries.filter(e => e.condition_brief_incomplete).length / entries.length
  const assetRate = entries.filter(e => e.condition_asset_not_provided).length / entries.length
  const revDepth = entries.filter(e => e.revision_severity === 'MAJOR').length / Math.max(entries.filter(e => e.is_revision).length, 1)
  return Math.min(100, Math.round(
    revRate * 30 + scopeRate * 30 + rushRate * 15 + (briefRate + assetRate) / 2 * 15 + revDepth * 10
  ) * 1.8)
}

export default function Stats() {
  const [me, setMe] = useState<AppUser | null>(null)
  const [entries, setEntries] = useState<Entry[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [loading, setLoading] = useState(true)

  const ym = new Date().toISOString().slice(0, 7)
  const lastYm = new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: profile }, { data: allEntries }, { data: clientList }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('entries').select('*').eq('user_id', user.id),
        supabase.from('clients').select('*').eq('archived', false),
      ])
      setMe(profile)
      setEntries((allEntries || []) as Entry[])
      setClients((clientList || []) as Client[])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Loading…</div>

  const monthEntries = entries.filter(e => e.date.startsWith(ym))
  const lastMonthEntries = entries.filter(e => e.date.startsWith(lastYm))
  const totalUnits = monthEntries.reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)
  const allTimeUnits = entries.reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)
  const pieces = monthEntries.filter(e => e.job_type !== 'OTHER').reduce((s, e) => s + e.quantity, 0)
  const starred = entries.filter(e => e.is_starred).length

  // Streak
  let streak = 0
  const today = new Date().toISOString().slice(0, 10)
  const loggedDays = new Set(entries.map(e => e.date))
  const d = new Date(today)
  while (loggedDays.has(d.toISOString().slice(0, 10))) {
    streak++; d.setDate(d.getDate() - 1)
  }

  // "Not your fault" units
  const absorbed = monthEntries
    .filter(e => e.is_revision && (e.revision_cause === 'CLIENT_CHANGED' || e.revision_cause === 'SCOPE_CREEP'))
    .reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)

  // Per-client stats
  const clientStats: ClientStat[] = clients.map(c => {
    const ce = monthEntries.filter(e => e.client_id === c.id)
    const units = ce.reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)
    const pct = totalUnits > 0 ? Math.round((units / totalUnits) * 100) : 0
    const revRate = ce.length > 0 ? Math.round(ce.filter(e => e.is_revision).length / ce.length * 100) : 0
    const scopeFlags = ce.filter(e => e.revision_cause === 'SCOPE_CREEP').length
    const score = calcDifficulty(entries.filter(e => e.client_id === c.id))
    const { label, color } = difficultyInfo(score)
    return { client: c, units, pct, revRate, scopeFlags, difficulty: score, difficultyLabel: label, difficultyColor: color }
  }).filter(c => c.units > 0).sort((a, b) => b.units - a.units)

  // Top job types
  const jobCounts: Partial<Record<string, number>> = {}
  monthEntries.forEach(e => { jobCounts[e.job_type] = (jobCounts[e.job_type] || 0) + 1 })
  const topTypes = Object.entries(jobCounts).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 3)

  const lastMonthUnits = lastMonthEntries.reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)
  const delta = totalUnits - lastMonthUnits

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Your work,<br /><em>in full</em></h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>{me?.name}</p>
      </div>

      {/* Hero stats */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card" style={{ padding: 20, textAlign: 'center' }}>
          <div style={{ fontSize: 52, fontWeight: 700, color: 'var(--primary)', lineHeight: 1 }}>{totalUnits.toFixed(1)}</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginTop: 4 }}>units this month</div>
          {Math.abs(delta) > 0.5 && (
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
              {delta > 0 ? `+${delta.toFixed(1)} vs last month` : `${delta.toFixed(1)} vs last month — enjoy the breathing room`}
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <div><div style={{ fontWeight: 700, fontSize: 20 }}>{pieces}</div><div style={{ fontSize: 11, color: 'var(--text-2)' }}>pieces shipped</div></div>
            <div><div style={{ fontWeight: 700, fontSize: 20 }}>{streak}</div><div style={{ fontSize: 11, color: 'var(--text-2)' }}>day streak</div></div>
            <div><div style={{ fontWeight: 700, fontSize: 20 }}>{starred}</div><div style={{ fontSize: 11, color: 'var(--text-2)' }}>portfolio picks</div></div>
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12 }}>{allTimeUnits.toFixed(1)} units all-time</div>
        </div>
      </div>

      {/* What you absorbed */}
      {absorbed > 0.5 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div className="card" style={{ padding: 16, borderLeft: '3px solid var(--amber)' }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>What you absorbed for others</div>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-2)' }}>
              <strong>{absorbed.toFixed(1)} units</strong> this month went to revisions caused by client changes or scope creep — work that wasn't your fault, and that still took your time.
            </p>
          </div>
        </div>
      )}

      {/* Per-client */}
      {clientStats.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>Where your effort went</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {clientStats.map(c => (
              <div key={c.client.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <div style={{ fontWeight: 600 }}>{c.client.name}</div>
                  <span style={{ fontSize: 11, borderRadius: 6, padding: '2px 8px', background: c.difficultyColor + '22', color: c.difficultyColor, fontWeight: 600 }}>
                    {c.difficultyLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-2)' }}>
                  <span>{c.units.toFixed(1)} units</span>
                  <span>{c.pct}% of month</span>
                  <span>{c.revRate}% revision</span>
                  {c.scopeFlags > 0 && <span style={{ color: 'var(--bad)' }}>⚠️ {c.scopeFlags}</span>}
                </div>
                <div style={{ marginTop: 8, background: 'var(--surface-2)', borderRadius: 4, height: 4 }}>
                  <div style={{ height: '100%', borderRadius: 4, background: 'var(--primary)', width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top types */}
      {topTypes.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 10 }}>What you're doing most</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {topTypes.map(([jt, count]) => (
              <div key={jt} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderRadius: 10, background: 'var(--surface-2)' }}>
                <span className={`jt-${jt}`} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{JOB_TYPES[jt as keyof typeof JOB_TYPES]?.short || jt}</span>
                <span style={{ fontSize: 14, color: 'var(--text-2)' }}>{count} entries</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
