import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Client, Entry } from '../lib/types'
import { Plus, Archive, RotateCcw } from 'lucide-react'

interface ClientStat extends Client {
  totalUnits: number
  revRate: number
  scopeFlags: number
  difficulty: number
  difficultyLabel: string
  difficultyColor: string
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

function difficultyInfo(score: number): { label: string; color: string } {
  if (score < 30) return { label: 'Easygoing', color: 'var(--good)' }
  if (score < 50) return { label: 'Steady', color: 'var(--primary)' }
  if (score < 65) return { label: 'Demanding', color: 'var(--amber)' }
  return { label: 'Tough', color: 'var(--bad)' }
}

export default function Clients() {
  const [clients, setClients] = useState<ClientStat[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [newName, setNewName] = useState('')
  const [saving, setSaving] = useState(false)

  async function load() {
    const [{ data: clientList }, { data: allEntries }] = await Promise.all([
      supabase.from('clients').select('*').order('name'),
      supabase.from('entries').select('*'),
    ])
    const es = (allEntries || []) as Entry[]
    const stats: ClientStat[] = (clientList || []).map(c => {
      const ce = es.filter(e => e.client_id === c.id)
      const totalUnits = ce.reduce((s, e) => s + (e.manual_override ?? e.calculated_units), 0)
      const revRate = ce.length > 0 ? Math.round(ce.filter(e => e.is_revision).length / ce.length * 100) : 0
      const scopeFlags = ce.filter(e => e.revision_cause === 'SCOPE_CREEP').length
      const score = calcDifficulty(ce)
      const { label, color } = difficultyInfo(score)
      return { ...c, totalUnits, revRate, scopeFlags, difficulty: score, difficultyLabel: label, difficultyColor: color }
    })
    setClients(stats)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function addClient() {
    if (!newName.trim()) return
    setSaving(true)
    await supabase.from('clients').insert({ name: newName.trim() })
    setNewName(''); setShowForm(false); setSaving(false)
    load()
  }

  async function toggleArchive(c: ClientStat) {
    await supabase.from('clients').update({ archived: !c.archived }).eq('id', c.id)
    load()
  }

  const visible = clients.filter(c => showArchived ? c.archived : !c.archived)

  if (loading) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Loading…</div>

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Clients</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>All-time difficulty based on revision patterns</p>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', gap: 8 }}>
        <button className="btn-primary" style={{ flex: 1 }} onClick={() => setShowForm(v => !v)}>
          <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Plus size={18} /> Add client
          </span>
        </button>
        <button
          className="btn-secondary"
          onClick={() => setShowArchived(v => !v)}
          style={{ whiteSpace: 'nowrap' }}
        >
          {showArchived ? 'Active' : 'Archived'}
        </button>
      </div>

      {showForm && (
        <div style={{ margin: '0 16px 16px' }} className="card">
          <div style={{ padding: 16 }}>
            <div style={{ fontWeight: 600, marginBottom: 10 }}>New client</div>
            <input
              autoFocus
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addClient()}
              placeholder="Client name…"
              style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)' }}
            />
            <button className="btn-primary" style={{ marginTop: 10 }} onClick={addClient} disabled={saving}>
              {saving ? 'Saving…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {visible.length === 0 && (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--text-2)', fontSize: 14 }}>
            {showArchived ? 'No archived clients' : 'No clients yet — add one above'}
          </div>
        )}
        {visible.map(c => (
          <div key={c.id} className="card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{c.name}</div>
                  <span style={{ fontSize: 11, borderRadius: 6, padding: '2px 8px', background: c.difficultyColor + '22', color: c.difficultyColor, fontWeight: 600 }}>
                    {c.difficultyLabel}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-2)' }}>
                  <span>{c.totalUnits.toFixed(1)} units total</span>
                  <span>{c.revRate}% revision rate</span>
                  {c.scopeFlags > 0 && (
                    <span style={{ color: 'var(--bad)' }}>⚠️ {c.scopeFlags} scope creep</span>
                  )}
                </div>
                {c.totalUnits > 0 && (
                  <div style={{ marginTop: 8, background: 'var(--surface-2)', borderRadius: 4, height: 4 }}>
                    <div style={{ height: '100%', borderRadius: 4, background: c.difficultyColor, width: `${Math.min(c.difficulty, 100)}%` }} />
                  </div>
                )}
              </div>
              <button
                onClick={() => toggleArchive(c)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '4px 0 4px 12px', flexShrink: 0 }}
                title={c.archived ? 'Restore' : 'Archive'}
              >
                {c.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
              </button>
            </div>
          </div>
        ))}
      </div>

      {!showArchived && clients.filter(c => c.archived).length > 0 && (
        <div style={{ padding: '16px 16px 0', textAlign: 'center' }}>
          <button
            onClick={() => setShowArchived(true)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', fontSize: 13 }}
          >
            {clients.filter(c => c.archived).length} archived client{clients.filter(c => c.archived).length !== 1 ? 's' : ''}
          </button>
        </div>
      )}
    </div>
  )
}
