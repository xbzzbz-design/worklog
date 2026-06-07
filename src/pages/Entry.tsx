import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, Minus, Plus, Flag, Star,
  AlertTriangle, Link, Upload, CheckSquare, Square
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { calcUnits } from '../lib/formula'
import type { FormulaInput } from '../lib/formula'
import type {
  JobType, OtherKind, RevisionSeverity, RevisionCause, Client
} from '../lib/types'
import { JOB_TYPES, OTHER_KINDS } from '../lib/types'

// ── helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 10)
}

function SectionTitle({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <div style={{
        width: 24, height: 24, borderRadius: '50%',
        background: 'var(--primary)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12, fontWeight: 700, flexShrink: 0,
      }}>{n}</div>
      <h2 style={{ margin: 0, fontSize: 14, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.06em', color: 'var(--text-2)' }}>
        {label}
      </h2>
    </div>
  )
}

function Checkbox({
  label, checked, onChange, disabled, note,
}: { label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean; note?: string }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 10,
        background: 'none', border: 'none', cursor: disabled ? 'default' : 'pointer',
        padding: '6px 0', textAlign: 'left', width: '100%', fontFamily: 'inherit',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {checked
        ? <CheckSquare size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: 1 }} />
        : <Square size={18} style={{ color: 'var(--text-3)', flexShrink: 0, marginTop: 1 }} />
      }
      <span style={{ fontSize: 14, color: 'var(--text)' }}>
        {label}
        {note && <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 6 }}>{note}</span>}
      </span>
    </button>
  )
}

function Stepper({
  value, onChange, min = 1, label,
}: { value: number; onChange: (v: number) => void; min?: number; label?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
      {label && (
        <span style={{ fontSize: 13, color: 'var(--text-2)', marginRight: 12 }}>{label}</span>
      )}
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        style={{
          width: 40, height: 40, border: '1.5px solid var(--border)',
          borderRadius: '10px 0 0 10px', background: 'var(--surface-2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text)',
        }}
      >
        <Minus size={16} />
      </button>
      <div style={{
        width: 56, height: 40, border: '1.5px solid var(--border)',
        borderLeft: 'none', borderRight: 'none',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16, fontWeight: 700,
      }}>
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(value + 1)}
        style={{
          width: 40, height: 40, border: '1.5px solid var(--border)',
          borderRadius: '0 10px 10px 0', background: 'var(--surface-2)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: 'var(--text)',
        }}
      >
        <Plus size={16} />
      </button>
    </div>
  )
}

// ── main component ────────────────────────────────────────────────────────────

export default function Entry() {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()

  // form state
  const [date, setDate] = useState(today())
  const [clients, setClients] = useState<Client[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [showClientDrop, setShowClientDrop] = useState(false)
  const [newClientName, setNewClientName] = useState('')
  const [addingClient, setAddingClient] = useState(false)

  const [jobType, setJobType] = useState<JobType>('SINGLE_BANNER')
  const [otherKind, setOtherKind] = useState<OtherKind>('MEETING')
  const [quantity, setQuantity] = useState(1)

  const [isRevision, setIsRevision] = useState(false)
  const [revRound, setRevRound] = useState(1)
  const [revSeverity, setRevSeverity] = useState<RevisionSeverity>('STANDARD')
  const [revCause, setRevCause] = useState<RevisionCause>('CLIENT_CHANGED')

  const [hasMotion, setHasMotion] = useState(false)
  const [motionScenes, setMotionScenes] = useState(1)

  const [condBrief, setCondBrief] = useState(false)
  const [condAsset, setCondAsset] = useState(false)
  const [condRush, setCondRush] = useState(false)

  const [overrideOpen, setOverrideOpen] = useState(false)
  const [overrideVal, setOverrideVal] = useState('')
  const [overrideReason, setOverrideReason] = useState('')

  const [note, setNote] = useState('')
  const [driveLink, setDriveLink] = useState('')
  const [snapFile, setSnapFile] = useState<File | null>(null)
  const [snapPath, setSnapPath] = useState('')

  const [isFlagged, setIsFlagged] = useState(false)
  const [isStarred, setIsStarred] = useState(false)

  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState('')
  const [addOnAmount, setAddOnAmount] = useState(0.5)

  // load settings + clients + existing entry
  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: userData }, { data: clientData }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('clients').select('*').eq('archived', false).order('name'),
      ])

      if (userData && (userData as any).addon_amount) setAddOnAmount((userData as any).addon_amount)
      setClients((clientData ?? []) as Client[])

      if (id) {
        const { data: entry } = await supabase
          .from('entries')
          .select('*')
          .eq('id', id)
          .single()
        if (entry) {
          setDate(entry.date)
          setClientId(entry.client_id ?? '')
          setJobType(entry.job_type as JobType)
          setOtherKind((entry.other_kind as OtherKind) ?? 'MEETING')
          setQuantity(entry.quantity)
          setIsRevision(entry.is_revision)
          setRevRound(entry.revision_round ?? 1)
          setRevSeverity((entry.revision_severity as RevisionSeverity) ?? 'STANDARD')
          setRevCause((entry.revision_cause as RevisionCause) ?? 'CLIENT_CHANGED')
          setHasMotion(entry.motion_scenes > 0)
          setMotionScenes(entry.motion_scenes || 1)
          setCondBrief(entry.condition_brief_incomplete)
          setCondAsset(entry.condition_asset_not_provided)
          setCondRush(entry.condition_deadline_rush)
          setOverrideVal(entry.manual_override ? String(entry.manual_override) : '')
          setOverrideReason(entry.manual_override_reason ?? '')
          if (entry.manual_override != null) setOverrideOpen(true)
          setNote(entry.note ?? '')
          setDriveLink(entry.drive_link ?? '')
          setSnapPath(entry.snap_image_path ?? '')
          setIsFlagged(entry.is_flagged)
          setIsStarred(entry.is_starred)
          // find client name
          const cl = (clientData ?? []).find((c: any) => c.id === entry.client_id)
          if (cl) setClientSearch((cl as any).name)
        }
      }
    }
    load()
  }, [id])

  // live formula
  const formulaInput: FormulaInput = {
    jobType,
    quantity,
    isRevision,
    revisionSeverity: isRevision ? revSeverity : null,
    revisionCause: isRevision ? revCause : null,
    motionScenes: hasMotion ? motionScenes : 0,
    conditionBriefIncomplete: condBrief,
    conditionAssetNotProvided: condAsset,
    conditionDeadlineRush: condRush,
    addOnAmount,
  }
  const result = calcUnits(formulaInput)
  const displayUnits = overrideVal !== '' && !isNaN(Number(overrideVal))
    ? Number(overrideVal)
    : result.total

  // add new client
  async function handleAddClient() {
    if (!newClientName.trim()) return
    const { data } = await supabase.from('clients')
      .insert({ name: newClientName.trim(), archived: false })
      .select().single()
    if (data) {
      setClients(prev => [...prev, data as Client].sort((a, b) => a.name.localeCompare(b.name)))
      setClientId((data as Client).id)
      setClientSearch((data as Client).name)
      setNewClientName('')
      setAddingClient(false)
      setShowClientDrop(false)
    }
  }

  // compress image via canvas
  async function compressImage(file: File, targetKB = 100): Promise<Blob> {
    return new Promise(resolve => {
      const img = new Image()
      const url = URL.createObjectURL(file)
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement('canvas')
        let w = img.width, h = img.height
        const maxDim = 1200
        if (w > maxDim || h > maxDim) {
          if (w > h) { h = Math.round(h * maxDim / w); w = maxDim }
          else { w = Math.round(w * maxDim / h); h = maxDim }
        }
        canvas.width = w; canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        let quality = 0.8
        const tryEncode = () => {
          canvas.toBlob(blob => {
            if (!blob) { resolve(new Blob()); return }
            if (blob.size > targetKB * 1024 && quality > 0.1) {
              quality -= 0.1
              tryEncode()
            } else {
              resolve(blob)
            }
          }, 'image/jpeg', quality)
        }
        tryEncode()
      }
      img.src = url
    })
  }

  async function handleSave() {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    let imagePath = snapPath
    if (snapFile) {
      const compressed = await compressImage(snapFile)
      const ext = 'jpg'
      const path = `${user.id}/${Date.now()}.${ext}`
      const { data: upload } = await supabase.storage
        .from('entry-snaps')
        .upload(path, compressed, { contentType: 'image/jpeg', upsert: false })
      if (upload) imagePath = upload.path
    }

    const units = overrideVal !== '' && !isNaN(Number(overrideVal))
      ? Number(overrideVal) : result.total

    const payload = {
      user_id: user.id,
      client_id: clientId || null,
      date,
      job_type: jobType,
      other_kind: jobType === 'OTHER' ? otherKind : null,
      quantity,
      is_revision: isRevision,
      revision_round: isRevision ? revRound : null,
      revision_severity: isRevision ? revSeverity : null,
      revision_cause: isRevision ? revCause : null,
      motion_scenes: hasMotion ? motionScenes : 0,
      condition_brief_incomplete: condBrief,
      condition_asset_not_provided: condAsset,
      condition_deadline_rush: condRush,
      calculated_units: units,
      manual_override: overrideVal !== '' && !isNaN(Number(overrideVal)) ? Number(overrideVal) : null,
      manual_override_reason: overrideReason || null,
      note: note || null,
      drive_link: driveLink || null,
      snap_image_path: imagePath || null,
      is_flagged: isFlagged,
      flag_note: null,
      is_starred: isStarred,
      updated_at: new Date().toISOString(),
    }

    if (id) {
      await supabase.from('entries').update(payload).eq('id', id)
    } else {
      await supabase.from('entries').insert({ ...payload, created_at: new Date().toISOString() })
    }

    setSaving(false)
    setToast('Saved ✓')
    setTimeout(() => { setToast(''); navigate('/home') }, 1200)
  }

  const filteredClients = clients.filter(c =>
    c.name.toLowerCase().includes(clientSearch.toLowerCase())
  )

  const jobTypeButtons: { type: JobType; fullWidth?: boolean }[] = [
    { type: 'VARIATION_TEXT' }, { type: 'VARIATION_SWAP' },
    { type: 'ADAPTATION' }, { type: 'SINGLE_BANNER' },
    { type: 'INFOGRAPHIC', fullWidth: true },
    { type: 'OTHER', fullWidth: true },
  ]

  return (
    <div style={{ padding: '0 16px', maxWidth: 600, margin: '0 auto', paddingBottom: 100 }}>
      <div style={{ padding: '24px 0 20px' }}>
        <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 500, color: 'var(--primary)' }}>{id ? 'Edit entry' : 'New entry'}</p>
        <h1 className="serif" style={{ fontSize: 28, margin: 0, fontWeight: 400 }}><em>{id ? 'Update this job' : 'Log a piece of work'}</em></h1>
      </div>

      {/* 1 — DATE */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={1} label="Date" />
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          style={{
            width: '100%', padding: '10px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 10, fontSize: 15,
            background: 'var(--surface)',
            color: 'var(--text)', fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* 2 — CLIENT */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={2} label="Client" />
        <div style={{ position: 'relative' }}>
          <input
            value={clientSearch}
            onChange={e => {
              setClientSearch(e.target.value)
              setClientId('')
              setShowClientDrop(true)
            }}
            onFocus={() => setShowClientDrop(true)}
            placeholder="Search or select a client…"
            style={{
              width: '100%', padding: '10px 12px',
              border: '1.5px solid var(--border)',
              borderRadius: 10, fontSize: 14,
              background: 'var(--surface)', color: 'var(--text)',
              fontFamily: 'inherit', boxSizing: 'border-box',
            }}
          />
          {showClientDrop && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0,
              background: 'var(--surface)', border: '1.5px solid var(--border)',
              borderRadius: 10, zIndex: 20, marginTop: 4,
              maxHeight: 200, overflowY: 'auto',
              boxShadow: 'var(--shadow)',
            }}>
              {filteredClients.map(c => (
                <button key={c.id} type="button"
                  onClick={() => {
                    setClientId(c.id)
                    setClientSearch(c.name)
                    setShowClientDrop(false)
                  }}
                  style={{
                    display: 'block', width: '100%', textAlign: 'left',
                    padding: '10px 14px', background: 'none', border: 'none',
                    cursor: 'pointer', fontSize: 14, color: 'var(--text)',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  {c.name}
                </button>
              ))}
              <button type="button"
                onClick={() => { setAddingClient(true); setShowClientDrop(false) }}
                style={{
                  display: 'block', width: '100%', textAlign: 'left',
                  padding: '10px 14px', background: 'none', border: 'none',
                  borderTop: '1px solid var(--border)',
                  cursor: 'pointer', fontSize: 13, color: 'var(--primary)',
                  fontWeight: 600, fontFamily: 'inherit',
                }}
              >
                + Add new client
              </button>
            </div>
          )}
        </div>
        {addingClient && (
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              value={newClientName}
              onChange={e => setNewClientName(e.target.value)}
              placeholder="Client name"
              style={{
                flex: 1, padding: '9px 12px',
                border: '1.5px solid var(--primary)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                background: 'var(--surface)', color: 'var(--text)',
              }}
              autoFocus
              onKeyDown={e => e.key === 'Enter' && handleAddClient()}
            />
            <button type="button" onClick={handleAddClient} className="btn-secondary"
              style={{ width: 'auto', padding: '9px 16px' }}>Save</button>
            <button type="button" onClick={() => setAddingClient(false)} className="btn-secondary"
              style={{ width: 'auto', padding: '9px 12px' }}>✕</button>
          </div>
        )}
      </div>

      {/* 3 — JOB TYPE */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={3} label="Job Type" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {jobTypeButtons.map(({ type, fullWidth }) => {
            const jt = JOB_TYPES[type]
            const active = jobType === type
            return (
              <button
                key={type}
                type="button"
                onClick={() => setJobType(type)}
                style={{
                  gridColumn: fullWidth ? '1 / -1' : undefined,
                  padding: '12px 14px',
                  border: `1.5px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 10,
                  background: active ? 'var(--primary-light)' : 'var(--surface-2)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  transition: 'border-color .15s, background .15s',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: active ? 'var(--primary)' : 'var(--text)' }}>
                    {jt.label}
                  </span>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                    background: active ? 'var(--primary)' : 'var(--border)',
                    color: active ? 'white' : 'var(--text-2)',
                  }}>
                    {jt.timeBased ? `${jt.rate}/hr` : `×${jt.rate}`}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
        {jobType === 'OTHER' && (
          <div style={{ marginTop: 10 }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: 'var(--text-2)', fontWeight: 600 }}>Kind</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {(Object.keys(OTHER_KINDS) as OtherKind[]).map(k => (
                <button key={k} type="button" onClick={() => setOtherKind(k)}
                  style={{
                    padding: '7px 14px', borderRadius: 99,
                    border: `1.5px solid ${otherKind === k ? 'var(--primary)' : 'var(--border)'}`,
                    background: otherKind === k ? 'var(--primary-light)' : 'var(--surface-2)',
                    color: otherKind === k ? 'var(--primary)' : 'var(--text)',
                    cursor: 'pointer', fontSize: 13, fontWeight: 500, fontFamily: 'inherit',
                  }}
                >
                  {OTHER_KINDS[k].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4 — QUANTITY */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={4} label={jobType === 'OTHER' ? 'Hours' : 'Quantity'} />
        <Stepper value={quantity} onChange={setQuantity} min={1} />
      </div>

      {/* 5 — NEW / REVISION */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={5} label="Type" />
        <div style={{ display: 'flex', gap: 8, marginBottom: isRevision ? 16 : 0 }}>
          {(['new', 'revision'] as const).map(v => (
            <button key={v} type="button"
              onClick={() => setIsRevision(v === 'revision')}
              style={{
                flex: 1, padding: '10px 0',
                border: `1.5px solid ${(v === 'revision') === isRevision ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 10,
                background: (v === 'revision') === isRevision ? 'var(--primary-light)' : 'var(--surface-2)',
                color: (v === 'revision') === isRevision ? 'var(--primary)' : 'var(--text)',
                cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              }}
            >
              {v === 'new' ? 'New work' : 'Revision'}
            </button>
          ))}
        </div>

        {isRevision && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Round */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Round</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4].map(r => (
                  <button key={r} type="button" onClick={() => setRevRound(r)}
                    style={{
                      width: 40, height: 40, borderRadius: 10,
                      border: `1.5px solid ${revRound === r ? 'var(--primary)' : 'var(--border)'}`,
                      background: revRound === r ? 'var(--primary)' : 'var(--surface-2)',
                      color: revRound === r ? 'white' : 'var(--text)',
                      cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                    }}
                  >{r === 4 ? '4+' : r}</button>
                ))}
              </div>
            </div>

            {/* Severity */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Severity</p>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['MINOR', 'STANDARD', 'MAJOR'] as RevisionSeverity[]).map(s => (
                  <button key={s} type="button" onClick={() => setRevSeverity(s)}
                    style={{
                      flex: 1, padding: '9px 0',
                      border: `1.5px solid ${revSeverity === s ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 10,
                      background: revSeverity === s ? 'var(--primary-light)' : 'var(--surface-2)',
                      color: revSeverity === s ? 'var(--primary)' : 'var(--text)',
                      cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit',
                    }}
                  >
                    {s[0] + s.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Cause */}
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>Cause</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { v: 'CLIENT_CHANGED', label: 'Client changed their mind' },
                  { v: 'BRIEF_INCOMPLETE', label: 'Brief was incomplete' },
                  { v: 'SCOPE_CREEP', label: 'Scope creep', warn: true },
                  { v: 'OUR_MISTAKE', label: 'Our mistake — 0 units' },
                ] as { v: RevisionCause; label: string; warn?: boolean }[]).map(({ v, label, warn }) => (
                  <button key={v} type="button" onClick={() => setRevCause(v)}
                    style={{
                      padding: '10px 14px',
                      border: `1.5px solid ${revCause === v ? 'var(--primary)' : 'var(--border)'}`,
                      borderRadius: 10,
                      background: revCause === v ? 'var(--primary-light)' : 'var(--surface-2)',
                      color: revCause === v ? 'var(--primary)' : 'var(--text)',
                      cursor: 'pointer', fontSize: 13, fontWeight: 500,
                      display: 'flex', alignItems: 'center', gap: 8,
                      fontFamily: 'inherit', textAlign: 'left',
                    }}
                  >
                    {warn && <AlertTriangle size={14} style={{ color: 'var(--amber)', flexShrink: 0 }} />}
                    {label}
                    {v === 'OUR_MISTAKE' && revCause === v && (
                      <span style={{ fontSize: 11, color: 'var(--text-3)', marginLeft: 'auto' }}>0.00 units</span>
                    )}
                    {v === 'SCOPE_CREEP' && revCause === v && (
                      <span style={{ fontSize: 11, color: 'var(--amber)', marginLeft: 'auto' }}>⚠️ Flag it</span>
                    )}
                  </button>
                ))}
              </div>
              {revCause === 'OUR_MISTAKE' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-3)', padding: '8px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  Thanks for being honest — this entry records 0 units so workload stays fair.
                </p>
              )}
              {revCause === 'SCOPE_CREEP' && (
                <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--amber)', padding: '8px 12px', background: 'var(--amber-bg)', borderRadius: 8, display: 'flex', gap: 6 }}>
                  <AlertTriangle size={13} style={{ flexShrink: 0, marginTop: 1 }} />
                  Scope creep flagged — this helps your team see recurring patterns.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 6 — MOTION */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={6} label="Motion Add-on" />
        <div style={{ display: 'flex', gap: 8, marginBottom: hasMotion ? 14 : 0 }}>
          {(['no', 'yes'] as const).map(v => (
            <button key={v} type="button" onClick={() => setHasMotion(v === 'yes')}
              style={{
                flex: 1, padding: '10px 0',
                border: `1.5px solid ${(v === 'yes') === hasMotion ? 'var(--primary)' : 'var(--border)'}`,
                borderRadius: 10,
                background: (v === 'yes') === hasMotion ? 'var(--primary-light)' : 'var(--surface-2)',
                color: (v === 'yes') === hasMotion ? 'var(--primary)' : 'var(--text)',
                cursor: 'pointer', fontWeight: 600, fontSize: 14, fontFamily: 'inherit',
              }}
            >
              {v === 'no' ? 'No motion' : 'Add motion'}
            </button>
          ))}
        </div>
        {hasMotion && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Scenes</span>
            <Stepper value={motionScenes} onChange={setMotionScenes} min={1} />
            <span style={{ fontSize: 13, color: 'var(--text-3)' }}>= +{motionScenes.toFixed(1)} units</span>
          </div>
        )}
      </div>

      {/* 7 — CONDITIONS */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={7} label="Conditions" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Checkbox
            label="Brief incomplete"
            checked={condBrief}
            onChange={setCondBrief}
            disabled={isRevision && revCause === 'BRIEF_INCOMPLETE'}
            note={isRevision && revCause === 'BRIEF_INCOMPLETE' ? '(already in cause)' : undefined}
          />
          <Checkbox label="Asset not provided" checked={condAsset} onChange={setCondAsset} />
          <Checkbox label="Deadline rush" checked={condRush} onChange={setCondRush} />
        </div>
        {(condBrief || condAsset || condRush) && (
          <p style={{ margin: '8px 0 0', fontSize: 12, color: 'var(--text-3)' }}>
            Each condition adds +{addOnAmount} units
          </p>
        )}
      </div>

      {/* 8 — LIVE SUMMARY */}
      <div style={{
        padding: '16px 18px',
        background: 'var(--primary-light)',
        border: '1.5px solid var(--primary)',
        borderRadius: 'var(--radius)',
        marginBottom: 12,
      }}>
        <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.08em' }}>
          Live calculation
        </p>
        {result.breakdown && (
          <p style={{ margin: '0 0 6px', fontSize: 13, color: 'var(--primary)', fontFamily: 'monospace' }}>
            {result.breakdown}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
          <span className="serif" style={{ fontSize: 32, color: 'var(--primary)', lineHeight: 1 }}>
            {displayUnits.toFixed(2)}
          </span>
          <span style={{ fontSize: 14, color: 'var(--primary)' }}>units</span>
          {overrideVal !== '' && !isNaN(Number(overrideVal)) && (
            <span style={{ fontSize: 12, color: 'var(--amber)', marginLeft: 4 }}>overridden</span>
          )}
        </div>
      </div>

      {/* 9 — OVERRIDE */}
      <div className="card" style={{ marginBottom: 12 }}>
        <button
          type="button"
          onClick={() => setOverrideOpen(o => !o)}
          style={{
            width: '100%', padding: '14px 18px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-2)' }}>Override units</span>
          {overrideOpen ? <ChevronUp size={16} style={{ color: 'var(--text-3)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />}
        </button>
        {overrideOpen && (
          <div style={{ padding: '0 18px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <input
              type="number"
              value={overrideVal}
              onChange={e => setOverrideVal(e.target.value)}
              placeholder="e.g. 3.5"
              step={0.25}
              min={0}
              style={{
                padding: '10px 12px', border: '1.5px solid var(--border)',
                borderRadius: 10, fontSize: 15, fontFamily: 'inherit',
                background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box',
              }}
            />
            <input
              value={overrideReason}
              onChange={e => setOverrideReason(e.target.value)}
              placeholder="Reason for override…"
              style={{
                padding: '10px 12px', border: '1.5px solid var(--border)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                background: 'var(--surface)', color: 'var(--text)', width: '100%', boxSizing: 'border-box',
              }}
            />
          </div>
        )}
      </div>

      {/* 10 — NOTE */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={9} label="Note (optional)" />
        <textarea
          value={note}
          onChange={e => setNote(e.target.value)}
          placeholder="Anything worth remembering about this piece…"
          rows={3}
          style={{
            width: '100%', padding: '10px 12px',
            border: '1.5px solid var(--border)',
            borderRadius: 10, fontSize: 14, resize: 'vertical',
            background: 'var(--surface)', color: 'var(--text)',
            fontFamily: 'inherit', boxSizing: 'border-box', lineHeight: 1.5,
          }}
        />
      </div>

      {/* 11 — EVIDENCE */}
      <div className="card" style={{ padding: '16px 18px', marginBottom: 12 }}>
        <SectionTitle n={10} label="Evidence" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Link size={15} style={{
              position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-3)',
            }} />
            <input
              value={driveLink}
              onChange={e => setDriveLink(e.target.value)}
              placeholder="Drive or Figma link…"
              style={{
                width: '100%', padding: '10px 12px 10px 34px',
                border: '1.5px solid var(--border)',
                borderRadius: 10, fontSize: 14, fontFamily: 'inherit',
                background: 'var(--surface)', color: 'var(--text)', boxSizing: 'border-box',
              }}
            />
          </div>
          <label style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '10px 14px', border: '1.5px dashed var(--border)',
            borderRadius: 10, cursor: 'pointer', fontSize: 13, color: 'var(--text-2)',
          }}>
            <Upload size={16} />
            {snapFile ? snapFile.name : snapPath ? 'Replace snap' : 'Upload snap (~100 KB)'}
            <input
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => setSnapFile(e.target.files?.[0] ?? null)}
            />
          </label>
        </div>
      </div>

      {/* 12 — FLAG / STAR */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <button
          type="button"
          onClick={() => setIsFlagged(f => !f)}
          style={{
            flex: 1, padding: '12px 0',
            border: `1.5px solid ${isFlagged ? 'var(--bad)' : 'var(--border)'}`,
            borderRadius: 10,
            background: isFlagged ? 'var(--bad-bg)' : 'var(--surface-2)',
            color: isFlagged ? 'var(--bad)' : 'var(--text-2)',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <Flag size={16} /> {isFlagged ? 'Flagged' : 'Flag 🚩'}
        </button>
        <button
          type="button"
          onClick={() => setIsStarred(s => !s)}
          style={{
            flex: 1, padding: '12px 0',
            border: `1.5px solid ${isStarred ? 'var(--amber)' : 'var(--border)'}`,
            borderRadius: 10,
            background: isStarred ? 'var(--amber-bg)' : 'var(--surface-2)',
            color: isStarred ? 'var(--amber)' : 'var(--text-2)',
            cursor: 'pointer', fontWeight: 600, fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: 'inherit',
          }}
        >
          <Star size={16} /> {isStarred ? 'Starred' : 'Star ⭐'}
        </button>
      </div>

      {/* Save */}
      <button
        type="button"
        className="btn-primary"
        onClick={handleSave}
        disabled={saving}
        style={{ fontSize: 16, fontWeight: 700 }}
      >
        {saving ? 'Saving…' : id ? 'Save changes' : 'Save entry'}
      </button>

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 90, left: '50%', transform: 'translateX(-50%)',
          background: 'var(--good)', color: 'white',
          padding: '12px 24px', borderRadius: 99,
          fontSize: 15, fontWeight: 600,
          boxShadow: '0 4px 14px rgba(0,0,0,.2)',
          zIndex: 100, whiteSpace: 'nowrap',
        }}>
          {toast}
        </div>
      )}
    </div>
  )
}
