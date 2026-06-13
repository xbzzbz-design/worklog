/* ============================================================
   WorkLog — Home / Dashboard
   ============================================================ */

function renderHome() {
  const todayEntries = entriesOn(TODAY);
  const todayTotal = dayTotal(TODAY);
  const max = SETTINGS.dailyMax;
  const over = todayTotal > max;

  // month stats
  const todayDate = new Date(TODAY + 'T00:00:00');
  const thisYm = TODAY.slice(0, 7);
  const lastYm = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1).toISOString().slice(0, 7);
  const lastMonthName = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1).toLocaleDateString('en-US', { month: 'short' });
  const thisM = monthEntries(thisYm);
  const lastM = monthEntries(lastYm);
  const thisTotal = sum(thisM, e=>e._c.final);
  const lastTotal = sum(lastM, e=>e._c.final);
  const delta = lastTotal ? ((thisTotal - lastTotal) / lastTotal * 100) : 0;
  // supportive framing — never punish a lighter month
  const monthFrame = delta > 8
    ? { word: `A fuller month than ${lastMonthName}`, ic: 'trending-up', tone: 'calm' }
    : delta < -8
    ? { word: `Lighter than ${lastMonthName} — enjoy the breathing room`, ic: 'wind', tone: 'calm' }
    : { word: `Right on pace with ${lastMonthName}`, ic: 'equal', tone: 'calm' };

  // pieces shipped this month (feel-good volume metric) — exclude time-based meetings
  const piecesShipped = sum(thisM.filter(e=>!(JOB_TYPES[e.jobType]&&JOB_TYPES[e.jobType].timeBased)), e => e.quantity);
  const clientsServed = new Set(thisM.map(e=>e.clientId)).size;

  // my entries only (Home is a personal view)
  const MY = myEntries();

  // logging streak (consecutive days up to & including today)
  const dateSet = new Set(MY.map(e=>e.date));
  let streak = 0; let cur = new Date(TODAY);
  while (dateSet.has(cur.toISOString().slice(0,10))) { streak++; cur.setDate(cur.getDate()-1); }

  // personal best day ever
  const dayTotals = {};
  MY.forEach(e => { dayTotals[e.date] = (dayTotals[e.date]||0) + e._c.final; });
  const best = Object.entries(dayTotals).sort((a,b)=>b[1]-a[1])[0];
  const bestDate = best ? new Date(best[0]).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—';

  // scope flags this month
  const scopeCount = thisM.filter(isScope).length;

  // starred
  const starred = MY.filter(e=>e.isStarred);

  // ---- week in review (last 7 days incl. today) ----
  const weekDates = [];
  for (let i=6;i>=0;i--){ const d=new Date(TODAY); d.setDate(d.getDate()-i); weekDates.push(d.toISOString().slice(0,10)); }
  const weekEs = MY.filter(e=>weekDates.includes(e.date));
  const weekTotal = sum(weekEs, e=>e._c.final);
  const weekPieces = sum(weekEs, e=>e.quantity);
  const perDay = weekDates.map(d=>({ d, t: sum(weekEs.filter(e=>e.date===d), e=>e._c.final) }));
  const weekPeak = Math.max(max, ...perDay.map(p=>p.t), 1);
  const busiest = perDay.slice().sort((a,b)=>b.t-a.t)[0];
  const activeDays = perDay.filter(p=>p.t>0).length;
  const peakShare = weekTotal ? busiest.t/weekTotal : 0;
  let balance;
  if (weekTotal===0) balance = 'No work logged this week yet — a clean slate.';
  else if (peakShare>0.4) balance = `${new Date(busiest.d).toLocaleDateString('en-US',{weekday:'long'})} carried most of the week. Spreading heavy jobs out keeps days saner.`;
  else if (activeDays>=6) balance = 'Beautifully paced — you showed up almost every day.';
  else balance = `A balanced week across ${activeDays} working days.`;
  const weekClientIds = [...new Set(weekEs.map(e=>e.clientId))];
  const hardest = weekClientIds.map(id=>({ id, score: computeDifficulty(id).score })).sort((a,b)=>b.score-a.score)[0];

  const hour = new Date().getHours();
  const greetWord = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const encourage = over
    ? `That's a big day — ${u(todayTotal)} units logged.`
    : todayTotal > max*0.6 ? `Solid day. ${u(todayTotal)} units and counting.`
    : todayTotal > 0 ? `${u(todayTotal)} units down. Not bad at all.`
    : `A fresh page. Log your first piece.`;

  return `
  <div class="page">
    <div class="greet">
      <div class="eyebrow">${greetWord}, ${SETTINGS.userName.split(' ')[0]}</div>
      <h1><em>${encourage}</em></h1>
    </div>

    ${changesSeen()?'':`<div class="whatsnew" id="whatsNew">
      <div class="wn-top">
        <span class="wn-tag">${ic('sparkles')} What's new</span>
        <button class="wn-close" data-changes-seen aria-label="Dismiss">${ic('x')}</button>
      </div>
      <div class="wn-title">${escHtml(CHANGELOG[0].title)}</div>
      <ul class="wn-list">${CHANGELOG[0].lines.slice(0,4).map(l=>`<li>${ic('check')} ${escHtml(l)}</li>`).join('')}</ul>
      <div class="wn-actions">
        <button class="btn ghost" data-go="changelog">${ic('list')} All updates</button>
        <button class="btn wn-ok" data-changes-seen>${ic('check')} Got it</button>
      </div>
    </div>`}

    ${todayTotal===0?`<div class="nudge" id="nudge">
      <div class="nudge-ic">${ic('moon-star')}</div>
      <div class="nudge-body"><b>Nothing logged today yet</b><span>Before you wrap up — add what you worked on.</span></div>
      <button class="nudge-btn" data-go="entry">${ic('plus')} Log</button>
    </div>`:''}

    ${(()=>{ const qd = myQuickDrafts(); return qd.length?`<button class="quick-banner" data-quick-first="${qd[0].id}">
      <span class="qb-ic">${ic('zap')}</span>
      <span class="qb-body"><b>${qd.length} quick log${qd.length>1?'s':''} need${qd.length>1?'':'s'} details</b><span>Tap to add the client & job type</span></span>
      ${ic('chevron-right')}
    </button>`:''; })()}

    <!-- TODAY RING -->
    <div class="today ${over?'over':''}">
      <div class="ring">
        ${ringSVG(todayTotal, max)}
        <div class="rcenter">
          <b class="tnum" id="ringval">${u(todayTotal)}</b>
          <small>of ${u(max)}</small>
        </div>
      </div>
      <div class="meta">
        <div class="hl">Today</div>
        <div class="of">You've logged <b>${u(todayTotal)} units</b> across <b>${todayEntries.length} jobs</b>.</div>
        <div class="pill">${ic(over?'flame':'check')} ${over?`${u(todayTotal-max)} over your daily max`:`Within your daily max`}</div>
      </div>
    </div>

    <!-- TODAY ENTRIES -->
    <div class="section-h"><h2>Today's log</h2><span class="link" data-go="report">View report</span></div>
    <div class="stack" style="display:flex;flex-direction:column;gap:9px">
      ${todayEntries.map(e=>entryCard(e)).join('')}
    </div>

    <!-- WEEK IN REVIEW -->
    <div class="section-h"><h2>Your week in review</h2><span class="link">${activeDays}/7 days</span></div>
    <div class="week-card">
      <div class="wk-top">
        <div>
          <div class="wk-tot"><b class="tnum">${u(weekTotal)}</b><span> units</span></div>
          <div class="wk-sub">${weekPieces} pieces · last 7 days</div>
        </div>
        <div class="wk-spark">
          ${perDay.map(p=>`<span class="wk-col"><span class="wk-bar ${p.t>max?'over':p.t>0?'ok':'none'}" style="height:${p.t>0?Math.max(8, p.t/weekPeak*100):4}%"></span><span class="wk-dl">${new Date(p.d).toLocaleDateString('en-US',{weekday:'narrow'})}</span></span>`).join('')}
        </div>
      </div>
      <div class="wk-insight">${ic('sparkles')} ${balance}</div>
      <div class="wk-rows">
        <div class="wk-row"><span>${ic('calendar-check')} Busiest day</span><b>${busiest.t>0?`${new Date(busiest.d).toLocaleDateString('en-US',{weekday:'long'})} · ${u(busiest.t)}u`:'—'}</b></div>
        ${hardest?`<div class="wk-row"><span>${ic('flame')} Toughest client</span><b>${clientName(hardest.id)}</b></div>`:''}
      </div>
    </div>

    <!-- THIS MONTH (pride snapshot — the analytical detail lives in My stats) -->
    <div class="section-h"><h2>This month, so far</h2><span class="link" data-go="stats">Full stats →</span></div>
    <div class="month-frame solo">${ic(monthFrame.ic)} ${monthFrame.word}</div>
    <div class="stats">
      <div class="stat accent">
        <div class="lab">${ic('package-check')} Shipped</div>
        <div class="val tnum">${piecesShipped}<span class="u"> pcs</span></div>
        <div class="cap">across ${clientsServed} client${clientsServed===1?'':'s'}</div>
      </div>
      <div class="stat">
        <div class="lab">${ic('flame')} Streak</div>
        <div class="val tnum">${streak}<span class="u"> day${streak===1?'':'s'}</span></div>
        <div class="cap">${streak>=5?'On a roll ✨':'Keep it going'}</div>
      </div>
      <div class="stat">
        <div class="lab">${ic('star')} Portfolio</div>
        <div class="val tnum">${starred.length}<span class="u"> saved</span></div>
        <div class="cap">your proudest work</div>
      </div>
      <div class="stat">
        <div class="lab">${ic('award')} Best day</div>
        <div class="val tnum">${best?u(best[1]):'0'}<span class="u"> u</span></div>
        <div class="cap">${best?bestDate:'log to begin'}</div>
      </div>
    </div>

    <!-- PORTFOLIO -->
    <div class="section-h"><h2>Portfolio picks</h2><span class="link">${starred.length} starred</span></div>
    <div class="gallery">
      ${starred.map(e=>portfolioShot(e)).join('')}
    </div>

    <!-- AFFIRMATION -->
    <div class="affirm">
      <div class="affirm-q">${ic('quote')}</div>
      <p id="affirmText">${pickAffirmation()}</p>
    </div>
  </div>`;
}

const AFFIRMATIONS = [
  "Your work is visible here — even on the days no one says thank you.",
  "Numbers don't argue. What you did is on the record now.",
  "A quiet log today is proof you can stand on tomorrow.",
  "You showed up and did the work. That's the whole job, and you did it.",
  "Effort that goes unnoticed still counts. You're counting it.",
  "Some days are heavy. Logging them is how you honour the weight you carried.",
  "This is your record, written in your own hand — not anyone else's opinion.",
  "Progress isn't always praised. Here, at least, it's never invisible.",
];
function pickAffirmation() {
  // rotate daily-ish so it feels fresh but stable within a session
  const seed = new Date(TODAY).getDate() + (ENTRIES.length % 3);
  return AFFIRMATIONS[seed % AFFIRMATIONS.length];
}

function portfolioShot(e) {
  const isUrl = e.snap && (e.snap.startsWith('http') || e.snap.startsWith('/'));
  return `<div class="shot" data-entry="${e.id}">
    <div class="thumb">
      ${isUrl
        ? `<img src="${e.snap}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block">`
        : e.snap
          ? `<div class="ph">${ic('image')} snap</div>`
          : `<div class="ph">${ic('link')} drive link</div>`}
      <div class="star">${ic('star','fill="currentColor"')}</div>
    </div>
    <div class="cap">
      <b>${clientName(e.clientId)}</b>
      <small>${JOB_TYPES[e.jobType].short} · ${u(e._c.final)}u</small>
    </div>
  </div>`;
}
