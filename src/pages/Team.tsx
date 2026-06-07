import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser, Entry } from '../lib/types'

interface MemberStat {
  user: AppUser
  units: number
  utilPct: number
  entryCount: number
}

function getWeekRange() {
  const now = new Date()
  const day = now.getDay()
  const mon = new Date(now)
  mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1))
  const fri = new Date(mon)
  fri.setDate(mon.getDate() + 4)
  return {
    from: mon.toISOString().slice(0, 10),
    to: fri.toISOString().slice(0, 10),
    workdays: 5,
  }
}

export default function Team() {
  const [members, setMembers] = useState<MemberStat[]>([])
  const [teamCap, setTeamCap] = useState(0)
  const [teamUnits, setTeamUnits] = useState(0)
  const [dailyData, setDailyData] = useState<{ date: string; units: number }[]>([])
  const [loading, setLoading] = useState(true)
  const { from, to, workdays } = getWeekRange()

  useEffect(() => {
    async function load() {
      const [{ data: users }, { data: entries }] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('entries').select('*').gte('date', from).lte('date', to),
      ])
      if (!users || !entries) return

      const stats: MemberStat[] = users.map(u => {
        const ue = (entries as Entry[]).filter(e => e.user_id === u.id)
        const units = ue.reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)
        const cap = u.daily_max * workdays
        return { user: u, units, utilPct: cap > 0 ? (units / cap) * 100 : 0, entryCount: ue.length }
      }).sort((a, b) => a.user.name.localeCompare(b.user.name))

      const totalCap = users.reduce((s, u) => s + u.daily_max * workdays, 0)
      const totalUnits = (entries as Entry[]).reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)

      // Build daily data for balance chart
      const byDate: Record<string, number> = {}
      ;(entries as Entry[]).forEach(e => { byDate[e.date] = (byDate[e.date] || 0) + (e.manual_override ?? e.calculated_units) })
      const teamDailyMax = users.reduce((s, u) => s + u.daily_max, 0)
      const days: { date: string; units: number }[] = []
      const cur = new Date(from + 'T00:00:00')
      const end = new Date(to + 'T00:00:00')
      while (cur <= end) {
        const d = cur.toISOString().slice(0, 10)
        days.push({ date: d, units: byDate[d] || 0 })
        cur.setDate(cur.getDate() + 1)
      }

      setMembers(stats)
      setTeamCap(totalCap)
      setTeamUnits(totalUnits)
      setDailyData(days)
      setLoading(false)
      void teamDailyMax
    }
    load()
  }, [from, to, workdays])

  const utilPct = teamCap > 0 ? Math.round((teamUnits / teamCap) * 100) : 0
  const overCap = utilPct > 100
  const teamDailyMax = members.reduce((s, m) => s + m.user.daily_max, 0)
  const barMax = Math.max(...dailyData.map(d => d.units), teamDailyMax, 1)

  const spareCap = dailyData.reduce((s, d) => s + Math.max(0, teamDailyMax - d.units), 0)
  const overtime = dailyData.reduce((s, d) => s + Math.max(0, d.units - teamDailyMax), 0)

  if (loading) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Loading team…</div>

  return (
    <div style={{ padding: '0 0 100px' }}>
      {/* Header */}
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0, lineHeight: 1.1 }}>
          What we<br /><em>carried together</em>
        </h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>This week · {from} – {to}</p>
      </div>

      {/* Capacity card */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card" style={{ padding: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 4 }}>Team capacity this week</div>
              <div style={{ fontSize: 32, fontWeight: 700, color: overCap ? 'var(--bad)' : 'var(--good)' }}>
                {utilPct}%
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-2)' }}>{teamUnits.toFixed(1)} / {teamCap.toFixed(0)} units</div>
            </div>
            <div style={{
              background: overCap ? 'var(--bad-bg)' : 'var(--good-bg)',
              color: overCap ? 'var(--bad)' : 'var(--good)',
              borderRadius: 8, padding: '6px 12px', fontSize: 13, fontWeight: 600,
            }}>
              {overCap ? 'Over capacity' : 'Within capacity'}
            </div>
          </div>
          <div style={{ marginTop: 12, background: 'var(--surface-2)', borderRadius: 6, height: 8, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 6,
              background: overCap ? 'var(--bad)' : 'var(--good)',
              width: `${Math.min(utilPct, 100)}%`,
            }} />
          </div>
          {overCap && (
            <p style={{ marginTop: 10, fontSize: 13, color: 'var(--text-2)' }}>
              The team went past capacity this week. This is a scheduling signal — not a team failure.
            </p>
          )}
        </div>
      </div>

      {/* Member list */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <div style={{ fontSize: 15, fontWeight: 600 }}>How everyone's holding up</div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 12, marginTop: 0 }}>
          Measured against each person's own capacity. This is not a scoreboard — it shows who might need support.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {members.map(m => {
            const pct = Math.min(m.utilPct, 100)
            const over = m.utilPct > 100
            const overPct = over ? Math.min(m.utilPct - 100, 50) : 0
            return (
              <div key={m.user.id} className="card" style={{ padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{m.user.name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {over && (
                      <span style={{ fontSize: 11, background: 'var(--bad-bg)', color: 'var(--bad)', borderRadius: 6, padding: '2px 8px' }}>
                        could use a hand
                      </span>
                    )}
                    <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{m.units.toFixed(1)} units</span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 2, height: 8 }}>
                  <div style={{ flex: pct / 100, background: over ? 'var(--bad)' : 'var(--primary)', borderRadius: '4px 0 0 4px', minWidth: 2 }} />
                  {over && <div style={{ flex: overPct / 100, background: 'var(--bad)', opacity: 0.4, borderRadius: '0 4px 4px 0' }} />}
                  <div style={{ flex: Math.max(0, (100 - pct - overPct) / 100), background: 'var(--surface-2)', borderRadius: 4 }} />
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 4 }}>
                  {Math.round(m.utilPct)}% of {m.user.daily_max * workdays} unit capacity
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Balance view */}
      <div style={{ padding: '0 16px' }}>
        <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8 }}>Daily balance this week</div>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 80, marginBottom: 8 }}>
            {dailyData.map(d => {
              const h = Math.round((d.units / barMax) * 72)
              const over = d.units > teamDailyMax
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                  <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'flex-end', height: 72 }}>
                    <div style={{
                      width: '100%', height: h, borderRadius: '4px 4px 0 0',
                      background: over ? 'var(--bad)' : 'var(--primary)',
                    }} />
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--text-3)' }}>{d.date.slice(5)}</div>
                </div>
              )
            })}
          </div>
          {overtime > 0 && spareCap > overtime && (
            <p style={{ fontSize: 13, color: 'var(--text-2)', margin: 0, padding: '10px 0 0', borderTop: '1px solid var(--border)' }}>
              The team had <strong>{spareCap.toFixed(1)} units of spare capacity</strong> this week — more than the {overtime.toFixed(1)} units of overtime. The work fit. The scheduling didn't.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
