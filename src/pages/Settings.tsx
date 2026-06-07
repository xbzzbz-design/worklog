import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { AppUser, TeamSettings } from '../lib/types'
import { JOB_TYPES } from '../lib/types'

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export default function Settings() {
  const [me, setMe] = useState<AppUser | null>(null)
  const [teamSettings, setTeamSettings] = useState<TeamSettings | null>(null)
  const [loading, setLoading] = useState(true)

  const [name, setName] = useState('')
  const [dailyMax, setDailyMax] = useState('')
  const [workdays, setWorkdays] = useState<number[]>([1, 2, 3, 4, 5])
  const [holidayAddon, setHolidayAddon] = useState('1')

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingTeam, setSavingTeam] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [teamSaved, setTeamSaved] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: profile }, { data: ts }] = await Promise.all([
        supabase.from('users').select('*').eq('id', user.id).single(),
        supabase.from('team_settings').select('*').single(),
      ])
      if (profile) {
        setMe(profile)
        setName(profile.name)
        setDailyMax(String(profile.daily_max))
      }
      if (ts) {
        setTeamSettings(ts)
        setWorkdays(ts.workdays)
        setHolidayAddon(String(ts.holiday_addon))
      }
      setLoading(false)
    }
    load()
  }, [])

  async function saveProfile() {
    if (!me) return
    setSavingProfile(true)
    await supabase.from('users').update({ name: name.trim(), daily_max: parseFloat(dailyMax) || me.daily_max }).eq('id', me.id)
    setSavingProfile(false)
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  async function saveTeam() {
    setSavingTeam(true)
    if (teamSettings) {
      await supabase.from('team_settings').update({ workdays, holiday_addon: parseFloat(holidayAddon) || 1 }).eq('id', teamSettings.id)
    }
    setSavingTeam(false)
    setTeamSaved(true)
    setTimeout(() => setTeamSaved(false), 2000)
  }

  function toggleDay(d: number) {
    setWorkdays(prev => prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort())
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  if (loading) return <div style={{ padding: 24, color: 'var(--text-2)' }}>Loading…</div>

  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>Settings</h1>
      </div>

      {/* Profile */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 14 }}>Your profile</div>

          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Display name</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', marginBottom: 12 }}
          />

          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Daily capacity (units)</label>
          <input
            type="number"
            value={dailyMax}
            onChange={e => setDailyMax(e.target.value)}
            min={1}
            max={20}
            step={0.5}
            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', marginBottom: 14 }}
          />

          <button className="btn-primary" onClick={saveProfile} disabled={savingProfile}>
            {profileSaved ? 'Saved ✓' : savingProfile ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>

      {/* Team settings */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 4 }}>Team settings</div>
          <p style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 0, marginBottom: 14 }}>Shared across the whole team</p>

          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 8 }}>Working days</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
            {DAY_NAMES.map((d, i) => (
              <button
                key={i}
                onClick={() => toggleDay(i)}
                style={{
                  flex: 1,
                  padding: '8px 0',
                  borderRadius: 8,
                  border: '2px solid',
                  borderColor: workdays.includes(i) ? 'var(--primary)' : 'var(--border)',
                  background: workdays.includes(i) ? 'var(--primary-light)' : 'transparent',
                  color: workdays.includes(i) ? 'var(--primary)' : 'var(--text-3)',
                  fontWeight: 600,
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >{d}</button>
            ))}
          </div>

          <label style={{ fontSize: 13, color: 'var(--text-2)', display: 'block', marginBottom: 4 }}>Holiday add-on (units)</label>
          <input
            type="number"
            value={holidayAddon}
            onChange={e => setHolidayAddon(e.target.value)}
            min={0}
            step={0.25}
            style={{ width: '100%', borderRadius: 8, border: '1px solid var(--border)', padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', marginBottom: 14 }}
          />

          <button className="btn-primary" onClick={saveTeam} disabled={savingTeam}>
            {teamSaved ? 'Saved ✓' : savingTeam ? 'Saving…' : 'Save team settings'}
          </button>
        </div>
      </div>

      {/* Job type rates reference */}
      <div style={{ padding: '0 16px 16px' }}>
        <div className="card" style={{ padding: 16 }}>
          <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 12 }}>Job type rates</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {Object.entries(JOB_TYPES).map(([key, jt]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`jt-${key}`} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{jt.short}</span>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>
                  {jt.timeBased ? `${jt.rate} unit/hr` : `${jt.rate} unit${jt.rate !== 1 ? 's' : ''} each`}
                </span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 12, marginBottom: 0 }}>
            Rates reflect the internal workload agreement. Contact your team lead to adjust them.
          </p>
        </div>
      </div>

      {/* Sign out */}
      <div style={{ padding: '0 16px' }}>
        <button
          className="btn-secondary"
          onClick={signOut}
          style={{ color: 'var(--bad)', borderColor: 'var(--bad)', opacity: 0.8 }}
        >
          Sign out
        </button>
      </div>
    </div>
  )
}
