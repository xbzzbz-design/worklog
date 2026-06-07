/* ============================================================
   WorkLog — Team roll-up + Balance (workload smoothing) view
   ============================================================ */

let teamScope = 'week'; // 'week' | 'today'
let balanceEven = false;

function renderTeam() {
  const a = teamAnalysis(TEAM_DAILY);
  const utilPct = Math.round(a.util * 100);
  const over100 = a.util > 1.0;
  const utilTone = over100 ? 'over' : a.util >= 0.85 ? 'good' : a.util >= 0.6 ? 'mid' : 'warn';

  // members in stable (team) order — NOT ranked by output. Each measured against their OWN capacity.
  const members = TEAM.map(m => {
    const units = TEAM_WEEK[m.id] || 0;
    const cap = memberCapacity(m.id, a.days);
    const pct = cap ? Math.round(units/cap*100) : 0;
    const onLeave = leaveDaysInList(m.id, a.days);
    return { ...m, units, cap, pct, onLeave };
  });
  const overloaded = members.filter(m=>m.pct>100).length;

  const splitTotal = TEAM_SPLIT.newWork + TEAM_SPLIT.revision + TEAM_SPLIT.meeting;
  const pct = (n)=> Math.round(n/splitTotal*100);

  return `
  <div class="page team">
    <div class="greet" style="padding-bottom:14px">
      <div class="eyebrow">Team</div>
      <h1><em>What we carried together</em></h1>
      <div class="sub">The whole squad, this week — capacity, where it went, and how everyone's holding up.</div>
    </div>

    <!-- CAPACITY ROLL-UP -->
    <div class="cap-card">
      <div class="cap-head">
        <div>
          <div class="cap-big"><b class="tnum">${u(a.total)}</b><span> / ${u(a.capacity)} units</span></div>
          <div class="cap-sub">${TEAM.length} designers · ${a.workdays} workdays · capacity set per person${a.leaveLost?` · −${u(a.leaveLost)} on leave`:''}</div>
        </div>
        <div class="cap-util util-${utilTone}"><b class="tnum">${utilPct}%</b><small>utilised</small></div>
      </div>
      <div class="cap-gauge"><div class="cap-fill util-${utilTone==='over'?'over':utilTone}" style="width:${Math.min(100,utilPct)}%"></div></div>
      <div class="cap-line">${ic(over100?'triangle-alert':'info')} ${over100
        ? `<b>Over capacity at ${utilPct}%</b> — with people on leave, the rest of the team absorbed more than a sustainable week. This is the staffing conversation, in one number.`
        : `A hard-working week at <b>${utilPct}% utilisation</b> — this is a team carrying real load, not a team with time to spare.`}</div>
    </div>

    <!-- WHERE CAPACITY WENT -->
    <div class="section-h"><h2>Where the hours went</h2></div>
    <div class="split-card">
      <div class="split-bar">
        <span class="seg-new" style="width:${pct(TEAM_SPLIT.newWork)}%"></span>
        <span class="seg-rev" style="width:${pct(TEAM_SPLIT.revision)}%"></span>
        <span class="seg-meet" style="width:${pct(TEAM_SPLIT.meeting)}%"></span>
      </div>
      <div class="split-legend">
        <span><i class="sw seg-new"></i> New work <b class="tnum">${pct(TEAM_SPLIT.newWork)}%</b></span>
        <span><i class="sw seg-rev"></i> Revisions <b class="tnum">${pct(TEAM_SPLIT.revision)}%</b></span>
        <span><i class="sw seg-meet"></i> Meetings <b class="tnum">${pct(TEAM_SPLIT.meeting)}%</b></span>
      </div>
      <div class="split-note">${ic('rotate-ccw')} <b>${pct(TEAM_SPLIT.revision)}% went to revisions</b> and ${TEAM_SCOPE} were scope-creep — capacity spent on rework the team didn't create. That's a process cost, not a productivity gap.</div>
    </div>

    <!-- HOW EVERYONE'S HOLDING UP (not a ranking) -->
    <div class="section-h"><h2>How everyone's holding up</h2>${overloaded?`<span class="link warn-link">${overloaded} over their line</span>`:`<span class="link">all in a healthy range</span>`}</div>
    <div class="mem-list">
      ${members.map(m=>{
        const tone = m.pct>100 ? 'over' : m.pct>=70 ? 'good' : m.pct>=40 ? 'mid' : 'warn';
        const capW = Math.min(100, m.pct);
        const overW = m.pct>100 ? Math.min(100, m.pct-100) : 0;
        return `<div class="mem-row ${m.pct>100?'mem-over':''}">
          <span class="av ${'c'+m.colorIdx}">${m.initials}</span>
          <div class="mem-body">
            <div class="mem-name">${m.name}${m.you?' <span class="you-tag">you</span>':''}
              ${m.onLeave?`<span class="mem-leave">${ic('palmtree')} ${m.onLeave}d leave</span>`:''}
              ${m.pct>100?`<span class="mem-help">${ic('hand')} could use a hand</span>`:''}</div>
            <div class="mem-bar"><div class="bar-fill util-${tone==='over'?'good':tone}" style="width:${capW}%"></div>${overW?`<div class="bar-over" style="width:${overW}%"></div>`:''}</div>
          </div>
          <div class="mem-units"><b class="tnum">${m.pct}%</b><small>${u(m.units)}/${u(m.cap)}</small></div>
        </div>`;
      }).join('')}
    </div>
    <div class="mem-caption">${ic('info')} Listed by name, not output — measured against each person's own healthy capacity. Over 100% means too much landed on them, not that others did less.</div>

    <!-- BALANCE / SMOOTHING -->
    <div class="section-h"><h2>Balance view</h2><span class="link" id="balToggle">${balanceEven?'Show actual':'If evenly scheduled'}</span></div>
    ${balanceChart(a)}

    ${balanceMessage(a)}
  </div>`;
}

function balanceChart(a) {
  const peak = Math.max(a.capPerDay, ...a.days.map(d=>a.daily[d])) * 1.08;
  return `<div class="bal-card">
    <div class="bal-chart">
      <div class="bal-capline" style="bottom:${(a.capPerDay/peak)*100}%"><span>capacity ${u(a.capPerDay)}</span></div>
      ${balanceEven?`<div class="bal-evenline" style="bottom:${(a.evenPerDay/peak)*100}%"><span>even ${u(a.evenPerDay)}</span></div>`:''}
      <div class="bal-bars">
        ${a.days.map(d=>{
          const val = balanceEven ? a.evenPerDay : a.daily[d];
          const over = val > a.capPerDay + 0.01;
          const dt = new Date(d+'T00:00:00');
          return `<div class="bal-col">
            <div class="bal-stack" style="height:${(val/peak)*100}%">
              ${over?`<div class="bal-over" style="height:${((val-a.capPerDay)/val)*100}%"></div>`:''}
              <div class="bal-base ${over?'isover':''}"></div>
            </div>
            <div class="bal-x">${dt.toLocaleDateString('en-US',{weekday:'short'})}</div>
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

function balanceMessage(a) {
  const idleWins = a.idle > a.overtime;
  return `<div class="bal-msg ${idleWins?'flip':''}">
    <div class="bal-msg-row">
      <div class="bal-stat"><span>${ic('flame')} Overtime</span><b class="tnum">${u(a.overtime)}</b><small>units over capacity</small></div>
      <div class="bal-stat"><span>${ic('wind')} Idle capacity</span><b class="tnum">${u(a.idle)}</b><small>units of unused room</small></div>
    </div>
    <p class="bal-verdict">${idleWins
      ? `Across the week the team had <b>${u(a.idle)} units of spare capacity</b> — more than the <b>${u(a.overtime)} units</b> of overtime people were pushed into. The work <b>fit comfortably</b> in a normal week. The crunch on ${a.crunchDays} day${a.crunchDays===1?'':'s'} wasn't too much work, and it wasn't too little effort — it was <b>uneven scheduling</b>. Spread the same load evenly and no one goes over.`
      : `The team ran hot — overtime outweighed idle time. That's a signal the volume itself is beyond current capacity, and worth raising as a staffing conversation.`}</p>
    <div class="bal-foot">${ic('shield-check')} This is the team's own record. Distribute work better and the busy days simply disappear.</div>
  </div>`;
}

function wireTeam(root) {
  const t = root.querySelector('#balToggle');
  if (t) t.addEventListener('click', () => { balanceEven = !balanceEven; rerenderScreen('team'); });
}
