/* ============================================================
   WorkLog — My Stats (personal insights, self-value, per-client effort)
   ============================================================ */

function renderStats() {
  const todayDate = new Date(TODAY + 'T00:00:00');
  const thisYm = TODAY.slice(0, 7);
  const lastYm = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1).toISOString().slice(0, 7);
  const lastMonthName = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1).toLocaleDateString('en-US', { month:'short' });
  const thisM = monthEntries(thisYm);
  const lastM = monthEntries(lastYm);
  const thisTotal = sum(thisM, e=>e._c.final);
  const lastTotal = sum(lastM, e=>e._c.final);

  // my entries only (My stats is a personal view)
  const MY = myEntries();
  // all-time
  const allTotal = sum(MY, e=>e._c.final);
  const piecesShipped = sum(thisM.filter(e=>!(JOB_TYPES[e.jobType]&&JOB_TYPES[e.jobType].timeBased)), e=>e.quantity);
  const starred = MY.filter(e=>e.isStarred).length;

  // streak + best day (reuse milestone metrics if present)
  const totals = {};
  MY.forEach(e => { totals[e.date] = (totals[e.date]||0) + e._c.final; });
  const best = Object.entries(totals).sort((a,b)=>b[1]-a[1])[0];
  const bestDate = best ? new Date(best[0]).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';
  const dates = new Set(MY.map(e=>e.date));
  let streak=0, cur=new Date(TODAY);
  while (dates.has(cur.toISOString().slice(0,10))) { streak++; cur.setDate(cur.getDate()-1); }

  // ---- per-client effort (the "is this client worth it?" lens) ----
  const byClient = {};
  thisM.forEach(e => {
    const id = e.clientId;
    if (!byClient[id]) byClient[id] = { units:0, rev:0, count:0, revCount:0, scope:0 };
    const b = byClient[id];
    b.units += e._c.final; b.count++;
    if (e.isRevision) { b.rev += e._c.final; b.revCount++; }
    if (isScope(e)) b.scope++;
  });
  const clients = Object.entries(byClient)
    .map(([id,b])=>({ id, ...b, share: thisTotal? b.units/thisTotal:0, revRate: b.count?Math.round(b.revCount/b.count*100):0, diff: computeDifficulty(id).score }))
    .sort((a,b)=>b.units-a.units);

  // what you absorbed for others (revision + scope not your fault)
  const revAbsorbed = sum(thisM.filter(e=>e.isRevision && e.revisionCause!=='OUR_MISTAKE'), e=>e._c.final);
  const scopeAbsorbed = sum(thisM.filter(isScope), e=>e._c.final);
  const absorbPct = thisTotal ? Math.round(revAbsorbed/thisTotal*100) : 0;

  return `
  <div class="page mystats">
    <div class="greet" style="padding-bottom:14px">
      <div class="eyebrow">My stats</div>
      <h1><em>Your work, in full</em></h1>
      <div class="sub">Proof of what you carried — and a clear look at where your effort actually goes.</div>
    </div>

    <!-- VALUED -->
    <div class="stats-hero">
      <div class="sh-main">
        <div class="sh-num tnum">${u(thisTotal)}</div>
        <div class="sh-lab">units this month${lastTotal?` · ${thisTotal>=lastTotal?'+':''}${Math.round((thisTotal-lastTotal)/lastTotal*100)}% vs ${lastMonthName}`:''}</div>
      </div>
      <div class="sh-grid">
        <div class="sh-cell"><b class="tnum">${piecesShipped}</b><small>pieces shipped</small></div>
        <div class="sh-cell"><b class="tnum">${u(allTotal)}</b><small>units all-time</small></div>
        <div class="sh-cell"><b class="tnum">${streak}</b><small>day streak</small></div>
        <div class="sh-cell"><b class="tnum">${starred}</b><small>portfolio picks</small></div>
      </div>
    </div>

    <!-- WHERE YOUR EFFORT GOES -->
    <div class="section-h"><h2>Where your effort goes</h2><span class="link">by client</span></div>
    <div class="effort-note">${ic('scale')} Use this when a client pays little but demands a lot. High share + high revisions = a client worth re-pricing or pushing back on.</div>
    <div class="effort-list">
      ${clients.map(c=>{
        const dt = c.diff>=70?'bad':c.diff>=52?'warn':c.diff>=32?'mid':'good';
        return `<div class="effort-row">
          <div class="ef-top">
            <span class="av ${avatarClass(c.id)}">${clientInitials(c.id)}</span>
            <div class="ef-who"><b>${clientName(c.id)}</b><small>${u(c.units)} units · ${c.count} jobs</small></div>
            <div class="ef-share"><b class="tnum">${Math.round(c.share*100)}%</b><small>of your month</small></div>
          </div>
          <div class="ef-bar"><div style="width:${Math.round(c.share*100)}%"></div></div>
          <div class="ef-tags">
            <span class="ef-tag ${c.revRate<20?'g':c.revRate<=50?'y':'r'}">${ic('rotate-ccw')} ${c.revRate}% revisions</span>
            ${c.scope?`<span class="ef-tag r">${ic('triangle-alert')} ${c.scope} scope</span>`:''}
            <span class="ef-tag diff-tag t-${dt}">${ic('flame')} difficulty ${c.diff}</span>
          </div>
        </div>`;
      }).join('')}
    </div>

    <!-- WHAT YOU ABSORBED -->
    <div class="section-h"><h2>What you absorbed for others</h2></div>
    <div class="absorb-card">
      <div class="absorb-row">
        <div class="absorb-stat"><b class="tnum">${u(revAbsorbed)}</b><small>units of revisions</small></div>
        <div class="absorb-stat"><b class="tnum">${u(scopeAbsorbed)}</b><small>units of scope creep</small></div>
        <div class="absorb-stat"><b class="tnum">${absorbPct}%</b><small>of your month</small></div>
      </div>
      <p class="absorb-note">${ic('shield-check')} ${absorbPct}% of your effort went to changes and scope you didn't create. That's not lost productivity — it's work others' decisions put on you, and it's on the record now.</p>
    </div>

    <div class="affirm" style="margin-top:24px">
      <div class="affirm-q">${ic('quote')}</div>
      <p>${pickAffirmation()}</p>
    </div>
  </div>`;
}

function wireStats() {}
