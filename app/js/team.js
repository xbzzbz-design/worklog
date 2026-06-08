/* ============================================================
   WorkLog — Team roll-up + Balance (workload smoothing) view
   ============================================================ */

let teamScope = 'week'; // 'week' | 'today'
let balanceEven = false;

function renderTeam() {
  const weekStart = startOfWeek(new Date(TODAY + 'T00:00:00'));
  const weekDates = Array.from({ length: 5 }, (_, i) => isoDate(addDays(weekStart, i)));
  const weeklyEntries = ENTRIES.filter(e => weekDates.includes(e.date));
  const split = {
    newWork: sum(weeklyEntries.filter(e => !e.isRevision && e.jobType !== 'OTHER'), e => e._c.final),
    revision: sum(weeklyEntries.filter(e => e.isRevision), e => e._c.final),
    meeting: sum(weeklyEntries.filter(e => e.jobType === 'OTHER'), e => e._c.final),
  };
  const scopeCount = weeklyEntries.filter(isScope).length;

  const p = teamPulse(weekDates);
  const hasData = p.coverage.logged > 0;
  const st = loadStatus(p.maxUtil);
  const heavy = p.loggedMembers.filter(m => m.util > 1.0).length;

  const splitTotal = split.newWork + split.revision + split.meeting;
  const pct = (n) => splitTotal ? Math.round(n / splitTotal * 100) : 0;

  return `
  <div class="page team">
    <div class="greet" style="padding-bottom:14px">
      <div class="eyebrow">Team</div>
      <h1><em>What we carried together</em></h1>
      <div class="sub">How the squad is holding up this week — read as load and balance, never a scoreboard.</div>
    </div>

    <!-- TEAM PULSE (colour state, computed daily) -->
    ${hasData ? `
    <div class="pulse-card pulse-${st.key}">
      <div class="pulse-head">
        <span class="pulse-orb"></span>
        <div class="pulse-lab"><b>${st.label}</b><small>${st.sub}</small></div>
        <div class="pulse-cov">${p.coverage.missing
          ? `${p.coverage.logged}/${p.coverage.total}<small>logged</small>`
          : `all in<small>${p.coverage.total} logged</small>`}</div>
      </div>
      <div class="pulse-days">
        ${p.days.map(d => {
          const has = p.utilByDay[d + '_has'];
          const k = has ? loadStatus(p.utilByDay[d]).key : 'none';
          const dt = new Date(d + 'T00:00:00');
          const today = d === TODAY;
          return `<div class="pulse-day">
            <span class="pulse-pip pip-${k} ${today ? 'pip-today' : ''}"></span>
            <span class="pulse-dow">${dt.toLocaleDateString('en-US', { weekday: 'short' })[0]}</span>
          </div>`;
        }).join('')}
      </div>
      ${p.coverage.missing ? `<div class="pulse-note">${ic('info')} Based on the ${p.coverage.logged} who logged — ${p.coverage.missing} not in yet, and not counted against the team.</div>` : ''}
      <div class="pulse-foot">${ic('shield-check')} This is the team's own evidence. The fuller everyone logs, the stronger the case for fair staffing — your log protects the whole team, not just you.</div>
    </div>` : `
    <div class="pulse-card pulse-none">
      <div class="pulse-head"><span class="pulse-orb"></span><div class="pulse-lab"><b>No logs yet this week</b><small>the picture fills in as people log</small></div></div>
      <div class="pulse-foot">${ic('shield-check')} Log your work to start the team's record — it's how we make the case for fair load together.</div>
    </div>`}

    <!-- WHERE CAPACITY WENT -->
    <div class="section-h"><h2>Where the hours went</h2></div>
    <div class="split-card">
      <div class="split-bar">
        <span class="seg-new" style="width:${pct(split.newWork)}%"></span>
        <span class="seg-rev" style="width:${pct(split.revision)}%"></span>
        <span class="seg-meet" style="width:${pct(split.meeting)}%"></span>
      </div>
      <div class="split-legend">
        <span><i class="sw seg-new"></i> New work <b class="tnum">${pct(split.newWork)}%</b></span>
        <span><i class="sw seg-rev"></i> Revisions <b class="tnum">${pct(split.revision)}%</b></span>
        <span><i class="sw seg-meet"></i> Meetings <b class="tnum">${pct(split.meeting)}%</b></span>
      </div>
      <div class="split-note">${ic('rotate-ccw')} <b>${pct(split.revision)}% went to revisions</b> and ${scopeCount} were scope-creep — capacity spent on rework the team didn't create. That's a process cost, not a productivity gap.</div>
    </div>

    <!-- HOW EVERYONE'S HOLDING UP (status, not a ranking — no numbers) -->
    <div class="section-h"><h2>How everyone's holding up</h2>${heavy ? `<span class="link warn-link">${heavy} had a heavy week</span>` : `<span class="link">all in a healthy range</span>`}</div>
    <div class="mem-list">
      ${p.loggedMembers.map(m => {
        const ms = loadStatus(m.util);
        return `<div class="mem-row">
          <span class="av ${'c' + m.colorIdx}">${m.initials}</span>
          <div class="mem-body">
            <div class="mem-name">${m.name}${m.you ? ' <span class="you-tag">you</span>' : ''}
              ${m.onLeave ? `<span class="mem-leave">${ic('palmtree')} ${m.onLeave}d leave</span>` : ''}</div>
            <div class="mem-status st-${ms.key}"><span class="st-pip"></span>${ms.label}</div>
          </div>
        </div>`;
      }).join('')}
    </div>
    ${p.coverage.missing ? `<div class="mem-caption">${ic('users-round')} ${p.coverage.missing} teammate${p.coverage.missing > 1 ? 's' : ''} haven't logged this week — not shown here, and not held against anyone.</div>`
      : `<div class="mem-caption">${ic('info')} Status, not output — measured against each person's own healthy capacity. "Heavy week" means too much landed on them, not that others did less.</div>`}

    <!-- BALANCE / SMOOTHING -->
    ${hasData ? `<div class="section-h"><h2>Balance view</h2><span class="link" id="balToggle">${balanceEven ? 'Show actual' : 'If evenly scheduled'}</span></div>
    ${balanceChart(p)}
    ${balanceMessage(p)}` : ''}
  </div>`;
}

function balanceChart(p) {
  const peak = Math.max(p.capPerDay, ...p.days.map(d => p.loadByDay[d]), ...p.days.map(d => p.capByDay[d])) * 1.08 || 1;
  return `<div class="bal-card">
    <div class="bal-chart">
      <div class="bal-capline" style="bottom:${(p.capPerDay / peak) * 100}%"><span>avg capacity ${u(p.capPerDay)}</span></div>
      ${balanceEven ? `<div class="bal-evenline" style="bottom:${(p.evenPerDay / peak) * 100}%"><span>even ${u(p.evenPerDay)}</span></div>` : ''}
      <div class="bal-bars">
        ${p.days.map(d => {
          const val = balanceEven ? p.evenPerDay : p.loadByDay[d];
          const cap = p.capByDay[d] || p.capPerDay;
          const over = !balanceEven && val > cap + 0.01;
          const dt = new Date(d + 'T00:00:00');
          return `<div class="bal-col">
            <div class="bal-stack" style="height:${Math.min(100, (val / peak) * 100)}%">
              ${over ? `<div class="bal-over" style="height:${((val - cap) / val) * 100}%"></div>` : ''}
              <div class="bal-base ${over ? 'isover' : ''}"></div>
            </div>
            <div class="bal-x">${dt.toLocaleDateString('en-US', { weekday: 'short' })}</div>
          </div>`;
        }).join('')}
      </div>
    </div>
    <div class="bal-keys">
      <span><i class="k-base"></i> within capacity</span>
      <span><i class="k-over"></i> forced overtime</span>
      <span><i class="k-cap"></i> daily capacity</span>
    </div>
  </div>`;
}

function balanceMessage(p) {
  const idleWins = p.idle > p.overtime;
  return `<div class="bal-msg ${idleWins ? 'flip' : ''}">
    <div class="bal-msg-row">
      <div class="bal-stat"><span>${ic('flame')} Overtime</span><b class="tnum">${u(p.overtime)}</b><small>units over capacity</small></div>
      <div class="bal-stat"><span>${ic('wind')} Idle capacity</span><b class="tnum">${u(p.idle)}</b><small>units of unused room</small></div>
    </div>
    <p class="bal-verdict">${idleWins
      ? `Across the week the team had <b>${u(p.idle)} units of spare capacity</b> — more than the <b>${u(p.overtime)} units</b> of overtime people were pushed into. The work <b>fit comfortably</b> in a normal week. The crunch on ${p.crunchDays} day${p.crunchDays === 1 ? '' : 's'} wasn't too much work, and it wasn't too little effort — it was <b>uneven scheduling</b>. Spread the same load evenly and no one goes over.`
      : `The team ran hot — overtime outweighed idle time. That's a signal the volume itself is beyond current capacity, and worth raising as a staffing conversation.`}</p>
    <div class="bal-foot">${ic('shield-check')} This is the team's own record. Distribute work better and the busy days simply disappear.</div>
  </div>`;
}

function wireTeam(root) {
  const t = root.querySelector('#balToggle');
  if (t) t.addEventListener('click', () => { balanceEven = !balanceEven; rerenderScreen('team'); });
}
