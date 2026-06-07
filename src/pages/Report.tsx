import { useState, useEffect } from 'react'
import { Download, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import type { Entry, AppUser } from '../lib/types'
import { JOB_TYPES } from '../lib/types'

// ── date helpers ──────────────────────────────────────────────────────────────

function isoDate(d: Date) { return d.toISOString().slice(0, 10) }

function weekRange(offset = 0) {
  const now = new Date()
  const dow = now.getDay()
  const monday = new Date(now); monday.setDate(now.getDate() - dow + 1 + offset * 7)
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6)
  return { start: isoDate(monday), end: isoDate(sunday) }
}

function monthRange(offset = 0) {
  const now = new Date()
  const d = new Date(now.getFullYear(), now.getMonth() + offset, 1)
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return { start: isoDate(d), end: isoDate(end) }
}

type Preset = 'this_week' | 'last_week' | 'this_month' | 'last_month' | 'custom'

// ── Bar chart ─────────────────────────────────────────────────────────────────

function BarChart({ entries, start, end, dailyMax }: {
  entries: Entry[]; start: string; end: string; dailyMax: number
}) {
  const days: string[] = []
  const d = new Date(start + 'T00:00:00')
  const endD = new Date(end + 'T00:00:00')
  while (d <= endD) { days.push(isoDate(d)); d.setDate(d.getDate() + 1) }

  const grouped: Record<string, number> = {}
  for (const e of entries) grouped[e.date] = (grouped[e.date] ?? 0) + e.calculated_units

  const maxVal = Math.max(dailyMax * 1.3, ...Object.values(grouped), 1)
  const chartH = 140

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, minWidth: days.length * 32, height: chartH + 24, position: 'relative', paddingTop: 8 }}>
        {/* max line */}
        <div style={{
          position: 'absolute',
          left: 0, right: 0,
          top: chartH - (dailyMax / maxVal) * chartH + 8,
          borderTop: '1.5px dashed var(--primary)',
          pointerEvents: 'none',
        }}>
          <span style={{ fontSize: 10, color: 'var(--primary)', position: 'absolute', right: 0, top: -14 }}>max {dailyMax}</span>
        </div>
        {days.map(date => {
          const u = grouped[date] ?? 0
          const h = Math.min((u / maxVal) * chartH, chartH)
          const over = u > dailyMax
          return (
            <div key={date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
              <div title={`${date}: ${u.toFixed(2)} units`} style={{
                width: '100%', minWidth: 20, height: h || 3,
                background: over ? 'var(--bad)' : 'var(--good)',
                borderRadius: '4px 4px 0 0',
                transition: 'height .3s',
                alignSelf: 'flex-end',
              }} />
              <span style={{ fontSize: 9, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.2 }}>
                {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Report() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [preset, setPreset] = useState<Preset>('this_month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [exportingPdf, setExportingPdf] = useState(false)

  function getRange() {
    switch (preset) {
      case 'this_week': return weekRange(0)
      case 'last_week': return weekRange(-1)
      case 'this_month': return monthRange(0)
      case 'last_month': return monthRange(-1)
      case 'custom': return { start: customStart, end: customEnd }
    }
  }

  const { start, end } = getRange()

  useEffect(() => {
    load()
  }, [start, end])

  async function load() {
    if (!start || !end) return
    setLoading(true)
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) return

    const [{ data: userData }, { data: entryData }] = await Promise.all([
      supabase.from('users').select('*').eq('id', authUser.id).single(),
      supabase.from('entries')
        .select('*, client:clients(*)')
        .eq('user_id', authUser.id)
        .gte('date', start)
        .lte('date', end)
        .order('date'),
    ])

    setUser(userData as AppUser)
    setEntries((entryData ?? []) as Entry[])
    setLoading(false)
  }

  const totalUnits = entries.reduce((s, e) => s + e.calculated_units, 0)
  const newUnits = entries.filter(e => !e.is_revision).reduce((s, e) => s + e.calculated_units, 0)
  const revUnits = entries.filter(e => e.is_revision).reduce((s, e) => s + e.calculated_units, 0)
  const scopeFlags = entries.filter(e => e.revision_cause === 'SCOPE_CREEP').length
  const flagged = entries.filter(e => e.is_flagged)

  // Per-client breakdown
  const clientMap: Record<string, { name: string; units: number; revisions: number; total: number; scopeFlags: number }> = {}
  for (const e of entries) {
    const cid = e.client_id ?? '__none__'
    const cname = e.client?.name ?? '—'
    if (!clientMap[cid]) clientMap[cid] = { name: cname, units: 0, revisions: 0, total: 0, scopeFlags: 0 }
    clientMap[cid].units += e.calculated_units
    clientMap[cid].total++
    if (e.is_revision) clientMap[cid].revisions++
    if (e.revision_cause === 'SCOPE_CREEP') clientMap[cid].scopeFlags++
  }
  const clientList = Object.values(clientMap).sort((a, b) => b.units - a.units)

  async function exportPdf() {
    setExportingPdf(true)
    const jsPDF = (await import('jspdf')).default
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const lm = 20, tm = 20
    let y = tm

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(22)
    doc.text('WorkLog Report', lm, y); y += 10

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(12)
    doc.text(`Period: ${start} → ${end}`, lm, y); y += 6
    doc.text(`Generated: ${new Date().toLocaleDateString()}`, lm, y); y += 12

    doc.setFontSize(14); doc.setFont('helvetica', 'bold')
    doc.text('Summary', lm, y); y += 7

    doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
    doc.text(`Total units: ${totalUnits.toFixed(2)}`, lm, y); y += 5
    doc.text(`New work: ${newUnits.toFixed(2)} units`, lm, y); y += 5
    doc.text(`Revisions: ${revUnits.toFixed(2)} units`, lm, y); y += 5
    doc.text(`Scope flags: ${scopeFlags}`, lm, y); y += 10

    if (clientList.length > 0) {
      doc.setFontSize(14); doc.setFont('helvetica', 'bold')
      doc.text('Client Breakdown', lm, y); y += 7
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
      for (const c of clientList) {
        if (y > 260) { doc.addPage(); y = tm }
        const revRate = c.total ? Math.round((c.revisions / c.total) * 100) : 0
        doc.text(`${c.name} — ${c.units.toFixed(2)} units, ${revRate}% revision rate`, lm, y); y += 5
      }
    }

    if (flagged.length > 0) {
      y += 5
      doc.setFontSize(14); doc.setFont('helvetica', 'bold')
      doc.text('Flagged Entries', lm, y); y += 7
      doc.setFont('helvetica', 'normal'); doc.setFontSize(11)
      for (const e of flagged) {
        if (y > 260) { doc.addPage(); y = tm }
        doc.text(`${e.date} · ${JOB_TYPES[e.job_type].short} · ${e.client?.name ?? '—'} · ${e.calculated_units.toFixed(2)} units`, lm, y); y += 5
      }
    }

    doc.save(`worklog-report-${start}-${end}.pdf`)
    setExportingPdf(false)
  }

  const presets: { key: Preset; label: string }[] = [
    { key: 'this_week', label: 'This week' },
    { key: 'last_week', label: 'Last week' },
    { key: 'this_month', label: 'This month' },
    { key: 'last_month', label: 'Last month' },
    { key: 'custom', label: 'Custom' },
  ]

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '7px 14px', borderRadius: 99,
    border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
    background: active ? 'var(--primary-light)' : 'var(--surface-2)',
    color: active ? 'var(--primary)' : 'var(--text-2)',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    fontFamily: 'inherit', whiteSpace: 'nowrap' as const,
  })

  return (
    <div style={{ padding: '20px 16px', maxWidth: 640, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h1 className="serif" style={{ fontSize: 24, margin: 0, fontWeight: 400 }}>Report</h1>
        <button
          type="button"
          onClick={exportPdf}
          disabled={exportingPdf || loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 14px', border: '1.5px solid var(--border)',
            borderRadius: 10, background: 'var(--surface-2)', cursor: 'pointer',
            fontSize: 13, fontWeight: 600, color: 'var(--text)', fontFamily: 'inherit',
          }}
        >
          <Download size={14} /> {exportingPdf ? 'Exporting…' : 'Export PDF'}
        </button>
      </div>

      {/* Preset picker */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
        {presets.map(p => (
          <button key={p.key} type="button" onClick={() => setPreset(p.key)} style={chipStyle(preset === p.key)}>
            {p.label}
          </button>
        ))}
      </div>

      {preset === 'custom' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
            style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
          <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
            style={{ padding: '9px 12px', border: '1.5px solid var(--border)', borderRadius: 10, fontSize: 14, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
        </div>
      )}

      {loading ? (
        <div style={{ color: 'var(--text-3)', textAlign: 'center', padding: 40, fontSize: 14 }}>Loading…</div>
      ) : (
        <>
          {/* Summary cards */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total units', value: totalUnits.toFixed(1), color: 'var(--primary)' },
              { label: 'New work', value: newUnits.toFixed(1) },
              { label: 'Revisions', value: revUnits.toFixed(1) },
              { label: 'Scope flags', value: String(scopeFlags), color: scopeFlags > 0 ? 'var(--bad)' : undefined },
            ].map(({ label, value, color }) => (
              <div key={label} className="card" style={{ padding: '14px 16px' }}>
                <p style={{ margin: '0 0 4px', fontSize: 11, color: 'var(--text-3)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>{label}</p>
                <p style={{ margin: 0, fontSize: 26, fontWeight: 700, color: color ?? 'var(--text)' }}>{value}</p>
              </div>
            ))}
          </div>

          {/* Bar chart */}
          {start && end && (
            <div className="card" style={{ padding: '16px 14px' }}>
              <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Daily workload</p>
              <BarChart entries={entries} start={start} end={end} dailyMax={user?.daily_max ?? 7} />
            </div>
          )}

          {/* Client breakdown */}
          {clientList.length > 0 && (
            <section>
              <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600 }}>By client</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {clientList.map(c => {
                  const revRate = c.total ? Math.round((c.revisions / c.total) * 100) : 0
                  return (
                    <div key={c.name} className="card" style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{c.name}</span>
                        <span style={{ fontSize: 16, fontWeight: 700 }}>{c.units.toFixed(1)}<span style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 400 }}> units</span></span>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 12, color: 'var(--text-3)' }}>
                        <span>Revision rate: <strong style={{ color: 'var(--text)' }}>{revRate}%</strong></span>
                        {c.scopeFlags > 0 && <span style={{ color: 'var(--bad)' }}>⚠️ {c.scopeFlags} scope flag{c.scopeFlags > 1 ? 's' : ''}</span>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </section>
          )}

          {/* Scope flag log */}
          {scopeFlags > 0 && (
            <section>
              <h2 style={{ margin: '0 0 10px', fontSize: 15, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                <AlertTriangle size={15} style={{ color: 'var(--bad)' }} /> Scope flags
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {entries.filter(e => e.revision_cause === 'SCOPE_CREEP').map(e => (
                  <div key={e.id} style={{
                    padding: '10px 14px', borderRadius: 10,
                    background: 'var(--bad-bg)', border: '1px solid #fca5a5',
                    fontSize: 13,
                  }}>
                    <strong>{e.client?.name ?? '—'}</strong> · {JOB_TYPES[e.job_type].short} · {e.date}
                    {e.note && <span style={{ color: 'var(--text-2)', marginLeft: 6 }}>— {e.note}</span>}
                  </div>
                ))}
              </div>
            </section>
          )}

          {entries.length === 0 && (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>
              No entries in this period.
            </div>
          )}
        </>
      )}
    </div>
  )
}
