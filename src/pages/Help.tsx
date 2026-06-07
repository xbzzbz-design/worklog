import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { JOB_TYPES } from '../lib/types'

interface Section {
  title: string
  body: React.ReactNode
}

function Accordion({ title, body }: Section) {
  const [open, setOpen] = useState(false)
  return (
    <div className="card" style={{ overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
          color: 'var(--text)', fontFamily: 'inherit', fontSize: 14, fontWeight: 600, textAlign: 'left',
        }}
      >
        {title}
        <ChevronDown size={18} style={{ color: 'var(--text-3)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
      </button>
      {open && (
        <div style={{ padding: '0 16px 16px', fontSize: 14, color: 'var(--text-2)', lineHeight: 1.6 }}>
          {body}
        </div>
      )}
    </div>
  )
}


export default function Help() {
  return (
    <div style={{ padding: '0 0 100px' }}>
      <div style={{ padding: '24px 20px 16px' }}>
        <h1 className="serif" style={{ fontSize: 28, margin: 0 }}>How it works</h1>
        <p style={{ color: 'var(--text-2)', fontSize: 14, marginTop: 6 }}>
          Understand the formula, log smarter, build your case.
        </p>
      </div>

      <div style={{ padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

        <Accordion title="What is a unit?" body={
          <>
            <p style={{ margin: '0 0 8px' }}>A <strong>unit</strong> is our internal measure of workload — not hours, not pieces, but complexity-weighted effort.</p>
            <p style={{ margin: '0 0 8px' }}>Each job type starts at a base rate. Extra complexity from conditions and motion stacks on top. The final number is what counts toward your capacity.</p>
            <p style={{ margin: 0 }}>This matters because "I made 40 banners" and "I made 2 infographics" can represent the same actual effort — units make that visible.</p>
          </>
        } />

        <Accordion title="Job type rates" body={
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ margin: '0 0 4px' }}>Every job starts here:</p>
            {Object.entries(JOB_TYPES).map(([key, jt]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className={`jt-${key}`} style={{ fontSize: 12, padding: '3px 8px', borderRadius: 6, fontWeight: 600 }}>{jt.short}</span>
                <span style={{ color: 'var(--text)', fontWeight: 600 }}>{jt.timeBased ? `${jt.rate}/hr` : `${jt.rate} × qty`}</span>
              </div>
            ))}
          </div>
        } />

        <Accordion title="Condition add-ons (+0.5 each)" body={
          <>
            <p style={{ margin: '0 0 10px' }}>Each condition represents real extra work caused by something outside your control:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[
                ['Brief incomplete', 'The brief arrived with missing information, so you had to fill in gaps, guess, or wait for clarification.'],
                ['Assets not provided', 'You had to source, request, or adapt assets that should have been given to you.'],
                ['Deadline rush', 'You were pushed to produce faster than standard, adding stress and limiting your ability to do your best work.'],
              ].map(([name, desc]) => (
                <div key={name} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>+0.5 — {name}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
          </>
        } />

        <Accordion title="Motion add-on (+1.0/scene)" body={
          <>
            <p style={{ margin: '0 0 8px' }}>Animation or motion work adds <strong>+1.0 unit per scene</strong> on top of the base rate.</p>
            <p style={{ margin: 0 }}>A "scene" is one discrete animated element or sequence — a looping social card, a slide transition, a product zoom. If the whole piece is animated, each distinct animated section counts.</p>
          </>
        } />

        <Accordion title="How revisions are counted" body={
          <>
            <p style={{ margin: '0 0 10px' }}>When logging a revision, you choose severity <em>and</em> cause:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
              {[
                ['Our mistake', '0 units — corrections to our own errors don\'t count as output.'],
                ['Minor revision', '0.25 × qty — small tweaks, quick passes.'],
                ['Standard revision', '0.50 × qty — normal round of changes.'],
                ['Major revision', 'Full rate × qty — essentially re-doing the work.'],
              ].map(([name, desc]) => (
                <div key={name} style={{ padding: '10px 12px', background: 'var(--surface-2)', borderRadius: 8 }}>
                  <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{name}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{desc}</div>
                </div>
              ))}
            </div>
            <p style={{ margin: '0 0 8px' }}><strong>Cause</strong> is for your records — it shapes your client difficulty score and the "what you absorbed" number in Stats.</p>
            <p style={{ margin: 0 }}>If the cause was <em>Brief Incomplete</em>, that condition add-on is automatically disabled to prevent double-counting.</p>
          </>
        } />

        <Accordion title="Worked example" body={
          <>
            <p style={{ margin: '0 0 10px' }}>You make <strong>3 single banners</strong> in a rush with missing assets, then 1 is sent back for a standard revision (client changed their mind):</p>
            <div style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--surface-2)', borderRadius: 8, padding: 12, marginBottom: 12 }}>
              <div>Base: 1.0 × 3 = 3.0</div>
              <div>Deadline rush: +0.5</div>
              <div>Assets not provided: +0.5</div>
              <div style={{ fontWeight: 700, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>Original entry: 4.0 units</div>
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: 13, background: 'var(--surface-2)', borderRadius: 8, padding: 12 }}>
              <div>Revision: standard × 1 = 0.5</div>
              <div>Cause: client changed mind</div>
              <div style={{ fontWeight: 700, marginTop: 4, borderTop: '1px solid var(--border)', paddingTop: 4 }}>Revision entry: 0.5 units</div>
              <div style={{ fontWeight: 700 }}>Total day: 4.5 units</div>
            </div>
          </>
        } />

        <Accordion title="What is the manual override?" body={
          <>
            <p style={{ margin: '0 0 8px' }}>Sometimes the formula doesn't fit — a job was genuinely more complex than any condition covers, or you negotiated a specific rate.</p>
            <p style={{ margin: '0 0 8px' }}>Use the manual override to set the actual unit value. You're required to write a reason, and the original calculated value is always preserved so you can compare later.</p>
            <p style={{ margin: 0 }}>Don't override to inflate numbers — this log is yours and your integrity is the point.</p>
          </>
        } />

        <Accordion title="Flagging an entry" body={
          <p style={{ margin: 0 }}>Flag an entry when something happened that shouldn't have — unrealistic deadline, missing briefing, last-minute scope change, anything that affected your output quality. Flags are private to you and are the foundation for a scope/revision report if you ever need to make your case formally.</p>
        } />

        <Accordion title="Starring an entry" body={
          <p style={{ margin: 0 }}>Star work you're proud of. Starred entries become your portfolio picks — they show up in your Stats as potential showcase pieces. Use it as a reminder of your best output, especially during busy periods when you lose track of what you made.</p>
        } />

        <Accordion title="Generating a report" body={
          <>
            <p style={{ margin: '0 0 8px' }}>Go to <strong>Report</strong>, pick a date range, and export a PDF. The PDF shows:</p>
            <ul style={{ margin: '0 0 8px', paddingLeft: 18 }}>
              <li>Total units and pieces over the period</li>
              <li>Day-by-day breakdown chart</li>
              <li>Client breakdown with revision and scope flags</li>
              <li>All flagged entries with their notes</li>
            </ul>
            <p style={{ margin: 0 }}>This is your evidence document. Keep it factual and specific — units don't lie.</p>
          </>
        } />

        <Accordion title="The Help Board" body={
          <p style={{ margin: 0 }}>When you're overwhelmed, raise a hand. When someone else is struggling, lend one. The board is not a weakness tracker — it's a coordination tool. Resolved requests show as "handled together" because that's what it is.</p>
        } />

        <Accordion title="Client difficulty scores" body={
          <>
            <p style={{ margin: '0 0 8px' }}>Each client gets a <strong>difficulty score</strong> based on all your entries with them — not a single month.</p>
            <p style={{ margin: '0 0 8px' }}>The score combines: revision rate (30%), scope creep rate (30%), rush rate (15%), brief/asset issues (15%), major revision depth (10%).</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {[
                ['Easygoing', 'under 30', 'var(--good)'],
                ['Steady', '30–50', 'var(--primary)'],
                ['Demanding', '50–65', 'var(--amber)'],
                ['Tough', '65+', 'var(--bad)'],
              ].map(([label, range, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 10px', borderRadius: 6, background: color + '18' }}>
                  <span style={{ fontWeight: 600, color, fontSize: 13 }}>{label}</span>
                  <span style={{ fontSize: 13 }}>score {range}</span>
                </div>
              ))}
            </div>
          </>
        } />

        <div style={{ padding: '16px 0 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--text-3)', margin: 0 }}>
            Your data lives in Supabase and belongs to you.
          </p>
        </div>
      </div>
    </div>
  )
}
