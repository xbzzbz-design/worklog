/* ============================================================
   WorkLog — data model + workload formula engine
   (mirrors the server-side calc devs will port to Prisma/Next)
   ============================================================ */

const SETTINGS = {
  userName: 'Mai Suriya',
  dailyMax: 7,
  addOn: 0.5,
};

// Job types — rate per piece
const JOB_TYPES = {
  VARIATION_TEXT: { label: 'Variation · Text', short: 'Var · Text', rate: 0.25, color: 'var(--primary)', icon: 'type' },
  VARIATION_SWAP: { label: 'Variation · Image Swap', short: 'Var · Swap', rate: 0.5, color: 'oklch(0.55 0.13 320)', icon: 'image' },
  ADAPTATION:     { label: 'Adaptation', short: 'Adaptation', rate: 0.5, color: 'oklch(0.5 0.12 230)', icon: 'maximize-2' },
  SINGLE_BANNER:  { label: 'Single Banner', short: 'Banner', rate: 1.0, color: 'var(--good)', icon: 'rectangle-horizontal' },
  INFOGRAPHIC:    { label: 'Infographic', short: 'Infographic', rate: 2.0, color: 'var(--bad)', icon: 'bar-chart-3' },
  OTHER:          { label: 'Meeting / Other', short: 'Meeting', rate: 1.0, color: 'oklch(0.55 0.05 60)', icon: 'users', timeBased: true },
  // Quick log — a units-only placeholder logged in seconds; client / job type
  // get filled in later. Never offered in the job-type picker (quick:true).
  QUICK:          { label: 'Quick log', short: 'Quick log', rate: 1.0, color: 'oklch(0.62 0.03 280)', icon: 'zap', quick: true },
};

// kinds for the time-based "Meeting / Other" type
const OTHER_KINDS = {
  MEETING:  { label: 'Meeting', icon: 'users' },
  ADVISORY: { label: 'Advising / covering', icon: 'life-buoy' },
  ADMIN:    { label: 'Admin / coordination', icon: 'clipboard-list' },
  OTHER:    { label: 'Other', icon: 'circle-dashed' },
};

const SEVERITY = {
  MINOR:    { label: 'Minor', factor: 0.25, desc: 'Light touch-ups' },
  STANDARD: { label: 'Standard', factor: 0.5, desc: 'Partial rework' },
  MAJOR:    { label: 'Major / Redo', factor: null, desc: 'Full rate' }, // uses job rate
};

const CAUSE = {
  CLIENT_CHANGED:   { label: 'Client changed their mind', counts: true },
  BRIEF_INCOMPLETE: { label: 'Brief incomplete / late info', counts: true },
  SCOPE_CREEP:      { label: 'Scope beyond contract', counts: true, scope: true },
  OUR_MISTAKE:      { label: 'Our mistake (no credit)', counts: false },
};

const CONDITIONS = {
  conditionBriefIncomplete: 'Brief incomplete — had to source info',
  conditionAssetNotProvided: 'Sourced assets myself (client didn’t send)',
  conditionDeadlineRush: 'Rush deadline — same-day delivery',
};

/* ---- THE FORMULA ---- */
function calcUnits(e) {
  // Quick log — the units the person tapped in ARE the value; no formula runs.
  if (e.jobType === 'QUICK') {
    const units = e.manualOverride != null ? e.manualOverride : (e.quantity || 0);
    return { lines: [{ label: 'Quick log — details pending', val: units }], calculated: units, final: units, overridden: false, quick: true };
  }
  const jt = JOB_TYPES[e.jobType];
  const rate = (CUSTOM_RATES && CUSTOM_RATES[e.jobType] != null) ? CUSTOM_RATES[e.jobType] : jt.rate;

  // time-based types (meetings, advisory, admin) — quantity = hours, no revision/motion
  if (jt.timeBased) {
    const hours = Math.max(0.5, e.hours || e.quantity || 1);
    const kind = OTHER_KINDS[e.otherKind] || OTHER_KINDS.MEETING;
    const baseUnits = rate * hours;
    const lines = [{ label: `${kind.label} · ${hours}h`, val: baseUnits }];
    const calculated = baseUnits;
    const final = (e.manualOverride != null) ? e.manualOverride : calculated;
    return { lines, calculated, final, overridden: e.manualOverride != null };
  }

  const qty = Math.max(1, e.quantity || 1);
  let baseUnits = 0;
  const lines = [];

  if (!e.isRevision) {
    baseUnits = rate * qty;
    lines.push({ label: `${jt.short} × ${qty}`, val: baseUnits });
  } else {
    if (e.revisionCause === 'OUR_MISTAKE') {
      baseUnits = 0;
      lines.push({ label: `Revision (our mistake)`, val: 0, muted: true });
    } else {
      const sev = SEVERITY[e.revisionSeverity] || SEVERITY.STANDARD;
      const factor = sev.factor != null ? sev.factor : rate;
      baseUnits = factor * qty;
      lines.push({ label: `${sev.label} revision × ${qty}`, val: baseUnits });
    }
  }

  const motionUnits = (e.motionScenes || 0) * 1.0;
  if (motionUnits > 0) lines.push({ label: `Motion · ${e.motionScenes} scene${e.motionScenes>1?'s':''}`, val: motionUnits });

  const ao = SETTINGS.addOn;
  let addOnUnits = 0;
  const aoLabels = [];
  if (e.conditionBriefIncomplete) { addOnUnits += ao; aoLabels.push('Brief'); }
  if (e.conditionAssetNotProvided) { addOnUnits += ao; aoLabels.push('Assets'); }
  if (e.conditionDeadlineRush) { addOnUnits += ao; aoLabels.push('Rush'); }
  if (addOnUnits > 0) lines.push({ label: `Add-ons · ${aoLabels.join(', ')}`, val: addOnUnits });

  const calculated = baseUnits + motionUnits + addOnUnits;
  const final = (e.manualOverride != null) ? e.manualOverride : calculated;
  return { lines, calculated, final, overridden: e.manualOverride != null };
}

let CUSTOM_RATES = {};

const fmt = (n) => (Math.round(n * 100) / 100).toFixed(n % 1 === 0 ? 1 : (Math.round(n*100)%10===0?1:2)).replace(/\.00$/, '.0');
const u = (n) => fmt(n);

/* ---- mock clients ---- */
const CLIENTS = [
  { id: 'c1', name: 'Northwind Coffee', archived: false },
  { id: 'c2', name: 'Aster Cosmetics', archived: false },
  { id: 'c3', name: 'Volt Energy', archived: false },
  { id: 'c4', name: 'Maison Décor', archived: false },
  { id: 'c5', name: 'Pulse Fitness', archived: false },
  { id: 'c6', name: 'Marigold Bakery', archived: false },
  { id: 'c7', name: 'Linea Apparel', archived: true },
];
const clientName = (id) => (CLIENTS.find(c => c.id === id) || {}).name || 'Unknown';
const clientInitials = (id) => clientName(id).split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();

/* ---- mock entries (June 2026) ---- */
// helper to build entries quickly
let _eid = 0;
function E(o) { _eid++; return Object.assign({ id: 'e'+_eid, quantity: 1, isRevision: false, motionScenes: 0,
  conditionBriefIncomplete: false, conditionAssetNotProvided: false, conditionDeadlineRush: false,
  manualOverride: null, isFlagged: false, isStarred: false, note: '', driveLink: '', snap: null, parentId: null }, o); }

const TODAY = new Date().toISOString().slice(0,10);

const ENTRIES = [
  // today
  E({ clientId:'c2', date:TODAY, jobType:'INFOGRAPHIC', quantity:2, note:'Skincare routine carousel — 6 slides each', isStarred:true, snap:'Skincare carousel · 6 slides' }),
  E({ clientId:'c1', date:TODAY, jobType:'SINGLE_BANNER', quantity:2, conditionDeadlineRush:true, note:'Promo banners for weekend sale' }),
  E({ clientId:'c3', date:TODAY, jobType:'VARIATION_TEXT', quantity:5, note:'Price update across hero set' }),
  E({ clientId:'c4', date:TODAY, jobType:'ADAPTATION', quantity:1, isRevision:true, revisionRound:1, revisionSeverity:'STANDARD', revisionCause:'CLIENT_CHANGED', note:'Resize FB → IG story, moved logo' }),
  E({ clientId:'c3', date:TODAY, jobType:'OTHER', otherKind:'MEETING', hours:1.5, note:'Weekly status call + brief handover' }),

  // yesterday 06-05
  E({ clientId:'c5', date:'2026-06-05', jobType:'INFOGRAPHIC', quantity:1, motionScenes:2, note:'Animated stats reel', isStarred:true, driveLink:'https://drive.google.com/file/d/1aBcD', snap:'Animated stats reel' }),
  E({ clientId:'c2', date:'2026-06-05', jobType:'SINGLE_BANNER', quantity:3, conditionAssetNotProvided:true }),
  E({ clientId:'c6', date:'2026-06-05', jobType:'VARIATION_SWAP', quantity:4, note:'Seasonal product swaps' }),
  E({ clientId:'c4', date:'2026-06-05', jobType:'OTHER', otherKind:'ADVISORY', hours:2, note:'Walked director through deck setup he’d never done', isFlagged:true, flagNote:'Covered a task that wasn’t mine' }),

  // 06-04 — heavy / scope creep (R3 of the catalogue-cover thread below)
  E({ clientId:'c3', date:'2026-06-04', jobType:'INFOGRAPHIC', quantity:3, conditionBriefIncomplete:true, note:'Energy comparison set' }),
  E({ id:'cov-r3', parentId:'cov-root', clientId:'c4', date:'2026-06-04', jobType:'SINGLE_BANNER', quantity:2, isRevision:true, revisionRound:3, revisionSeverity:'MAJOR', revisionCause:'SCOPE_CREEP', isFlagged:true, flagNote:'4th round, new concept requested outside SOW', note:'Full redo — client wants new direction' }),
  E({ clientId:'c1', date:'2026-06-04', jobType:'ADAPTATION', quantity:2 }),

  // ---- catalogue-cover revision thread (Maison Décor) ----
  E({ id:'cov-root', clientId:'c4', date:'2026-05-30', jobType:'SINGLE_BANNER', quantity:1, note:'Spring catalogue cover — key visual', snap:'Catalogue cover v1' }),
  E({ id:'cov-r1', parentId:'cov-root', clientId:'c4', date:'2026-06-01', jobType:'SINGLE_BANNER', quantity:1, isRevision:true, revisionRound:1, revisionSeverity:'MINOR', revisionCause:'CLIENT_CHANGED', note:'Colour of headline' }),
  E({ id:'cov-r2', parentId:'cov-root', clientId:'c4', date:'2026-06-02', jobType:'SINGLE_BANNER', quantity:1, isRevision:true, revisionRound:2, revisionSeverity:'STANDARD', revisionCause:'BRIEF_INCOMPLETE', note:'Moved product, new tagline' }),
  E({ clientId:'c4', date:'2026-06-03', jobType:'SINGLE_BANNER', quantity:1, isRevision:true, revisionRound:2, revisionSeverity:'STANDARD', revisionCause:'SCOPE_CREEP', conditionDeadlineRush:true, isFlagged:true, flagNote:'Extra format added mid-project, same-day', note:'New size requested outside SOW' }),

  // 06-03
  E({ clientId:'c2', date:'2026-06-03', jobType:'SINGLE_BANNER', quantity:4, note:'Launch teaser set' }),
  E({ clientId:'c5', date:'2026-06-03', jobType:'VARIATION_TEXT', quantity:6 }),

  // 06-02
  E({ clientId:'c6', date:'2026-06-02', jobType:'INFOGRAPHIC', quantity:1, conditionDeadlineRush:true, conditionBriefIncomplete:true, note:'Nutrition facts, rushed', isStarred:true, snap:'Nutrition infographic' }),
  E({ clientId:'c3', date:'2026-06-02', jobType:'SINGLE_BANNER', quantity:3 }),
  E({ clientId:'c1', date:'2026-06-02', jobType:'VARIATION_SWAP', quantity:2, isRevision:true, revisionRound:1, revisionSeverity:'MINOR', revisionCause:'BRIEF_INCOMPLETE' }),

  // 06-01
  E({ clientId:'c4', date:'2026-06-01', jobType:'SINGLE_BANNER', quantity:5, note:'Monthly catalogue covers' }),
  E({ clientId:'c2', date:'2026-06-01', jobType:'ADAPTATION', quantity:3, isRevision:true, revisionRound:2, revisionSeverity:'STANDARD', revisionCause:'CLIENT_CHANGED' }),

  // late may for month-over-month + scope
  E({ clientId:'c5', date:'2026-05-29', jobType:'INFOGRAPHIC', quantity:2 }),
  E({ clientId:'c3', date:'2026-05-28', jobType:'SINGLE_BANNER', quantity:3, isRevision:true, revisionRound:2, revisionSeverity:'MAJOR', revisionCause:'SCOPE_CREEP', isFlagged:true, flagNote:'Added 2 extra formats mid-project' }),
  E({ clientId:'c1', date:'2026-05-27', jobType:'VARIATION_TEXT', quantity:8 }),
  E({ clientId:'c6', date:'2026-05-26', jobType:'SINGLE_BANNER', quantity:2, isRevision:true, revisionRound:1, revisionSeverity:'STANDARD', revisionCause:'OUR_MISTAKE', note:'Typo on our side — no credit' }),
  E({ clientId:'c2', date:'2026-05-22', jobType:'INFOGRAPHIC', quantity:1, motionScenes:3, isStarred:true, snap:'Brand story motion' }),
  E({ clientId:'c4', date:'2026-05-20', jobType:'SINGLE_BANNER', quantity:4, conditionAssetNotProvided:true }),
  E({ clientId:'c3', date:'2026-05-18', jobType:'ADAPTATION', quantity:6 }),
];

// attach computed units
ENTRIES.forEach(e => { e._c = calcUnits(e); });

/* ---- ownership ---- (personal views show only the signed-in user's work;
   Team and Client views stay team-wide. During the mock/prototype there's no
   current user, so everything counts as "mine".) */
const isMine = (e) => !window.WL_CURRENT_USER_ID || e.userId === window.WL_CURRENT_USER_ID;
const myEntries = () => ENTRIES.filter(isMine);

// quick-log entries still waiting for their client / job-type details
const needsDetail = (e) => e.jobType === 'QUICK';
const myQuickDrafts = () => myEntries().filter(needsDetail);

/* ---- aggregation helpers (personal — scoped to me) ---- */
function entriesOn(date) { return ENTRIES.filter(e => e.date === date && isMine(e)); }
function dayTotal(date) { return entriesOn(date).reduce((s,e)=> s + e._c.final, 0); }
function inRange(date, from, to) { return date >= from && date <= to; }
function rangeEntries(from, to) { return ENTRIES.filter(e => inRange(e.date, from, to) && isMine(e)); }
function monthEntries(ym) { return ENTRIES.filter(e => e.date.startsWith(ym) && isMine(e)); }
function sum(arr, f) { return arr.reduce((s,x)=>s+f(x),0); }
function isScope(e) { return e.isRevision && e.revisionCause === 'SCOPE_CREEP'; }

/* ---- revision threading ---- */
function rootOf(e) { return e.parentId ? (ENTRIES.find(x=>x.id===e.parentId) || e) : e; }
function threadOf(e) {
  const root = rootOf(e);
  const kids = ENTRIES.filter(x => x.parentId === root.id)
    .sort((a,b)=> (a.revisionRound||0)-(b.revisionRound||0) || (a.date<b.date?-1:1));
  return [root, ...kids];
}
function hasThread(e) { return threadOf(e).length > 1; }
// candidate originals to link a revision to: recent non-revision jobs for a client
function linkCandidates(clientId) {
  return ENTRIES.filter(e => e.clientId===clientId && !e.isRevision)
    .sort((a,b)=> a.date<b.date?1:-1).slice(0,8);
}

/* ---- client difficulty score (0–100 composite + evidence) ---- */
const DIFF_WEIGHTS = { revRate: 0.30, scope: 0.30, rush: 0.15, gaps: 0.15, depth: 0.10 };
function computeDifficulty(id) {
  const es = ENTRIES.filter(e=>e.clientId===id);
  const n = es.length || 1;
  const revs = es.filter(e=>e.isRevision);
  const scopeCount = es.filter(isScope).length;
  const rushCount = es.filter(e=>e.conditionDeadlineRush).length;
  const gapsCount = es.filter(e=>e.conditionBriefIncomplete || e.conditionAssetNotProvided).length;
  const rounds = revs.map(e=>e.revisionRound||1);
  const avgRound = rounds.length ? sum(rounds, r=>r)/rounds.length : 0;

  const norm = {
    revRate: revs.length / n,
    scope: Math.min(scopeCount * 0.25, 1),
    rush: rushCount / n,
    gaps: gapsCount / n,
    depth: Math.min(avgRound / 4, 1),
  };
  let raw = 0;
  for (const k in DIFF_WEIGHTS) raw += norm[k] * DIFF_WEIGHTS[k]; // 0–1 composite
  // spread across the full 0–100 range with a gentle curve so a genuinely
  // demanding client lands mid-scale, not stuck in the low numbers.
  const score = Math.round(100 * Math.pow(raw, 0.62));

  const tier = score < 32 ? { label:'Easygoing', tone:'good' }
            : score < 52 ? { label:'Steady', tone:'mid' }
            : score < 70 ? { label:'Demanding', tone:'warn' }
            : { label:'Tough', tone:'bad' };

  const factors = [
    { key:'revRate', label:'Revision rate', detail:`${revs.length} of ${es.length} jobs were revisions` },
    { key:'scope', label:'Scope creep', detail:`${scopeCount} scope flag${scopeCount===1?'':'s'} on record` },
    { key:'rush', label:'Rush jobs', detail:`${rushCount} same-day rush${rushCount===1?'':'es'}` },
    { key:'gaps', label:'Briefs / assets', detail:`${gapsCount} job${gapsCount===1?'':'s'} with missing brief or assets` },
    { key:'depth', label:'Revision depth', detail:`avg ${avgRound.toFixed(1)} rounds per revision` },
  ].map(f => ({ ...f, pct: Math.round(norm[f.key]*100), weight: Math.round(DIFF_WEIGHTS[f.key]*100) }));

  return { score, tier, factors, count: es.length };
}

/* ============================================================
   TEAM, CAPACITY, HOLIDAYS  (mock — ports to a `users` table)
   ============================================================ */

// the squad (you + teammates). colorIdx maps to avatar palette c0..c5
// dailyMax is per-person — juniors carry a lower healthy ceiling than seniors.
const TEAM = [
  { id:'u1', name:'Mai Suriya',   initials:'MS', role:'Senior designer', you:true,  colorIdx:0, dailyMax:7 },
  { id:'u2', name:'Arun P.',      initials:'AP', role:'Designer',         colorIdx:1, dailyMax:7 },
  { id:'u3', name:'Nok C.',       initials:'NC', role:'Designer',         colorIdx:2, dailyMax:7 },
  { id:'u4', name:'Ploy T.',      initials:'PT', role:'Junior designer',  colorIdx:3, dailyMax:5 },
  { id:'u5', name:'Kit S.',       initials:'KS', role:'Designer',         colorIdx:4, dailyMax:7 },
  { id:'u6', name:'Fern R.',      initials:'FR', role:'Junior designer',  colorIdx:5, dailyMax:5 },
];
const teamMember = (id) => TEAM.find(m=>m.id===id) || TEAM[0];
const teamDailySum = () => sum(TEAM, m=>m.dailyMax); // total team capacity per workday

// public holidays / company days off (no expected capacity). Editable by anyone.
let HOLIDAYS = [
  { date:'2026-06-15', name:'Company day off' },
];
// shared team settings — anyone can edit, the team agrees changes together
const TEAM_SETTINGS = {
  workdays: [1,2,3,4,5],        // Mon–Fri (0=Sun … 6=Sat)
  holidayAddOn: 1.0,            // bonus units for working ON a holiday
  ratesUpdatedBy: null,         // user id of whoever last changed rates/add-on
  ratesUpdatedAt: null,         // ISO timestamp of that change
};
// personal leave — each person marks their OWN; no admin needed. Syncs to team capacity.
// keyed by member id → array of {date, type}. type: 'sick' | 'vacation'
let LEAVE = {
  u1: [{ date:'2026-06-03', type:'vacation' }],
  u4: [{ date:'2026-06-05', type:'sick' }],
};
const myId = () => window.WL_CURRENT_USER_ID || 'u1';
const myLeave = () => (LEAVE[myId()] = LEAVE[myId()] || []);
const leaveOn = (uid, d) => (LEAVE[uid]||[]).find(l=>l.date===d);
const myLeaveOn = (d) => leaveOn(myId(), d);
const LEAVE_TYPES = {
  sick:     { label:'Sick leave', icon:'thermometer', tone:'bad' },
  vacation: { label:'Vacation',   icon:'palmtree',    tone:'mid' },
};

const isHolidayDate = (d) => HOLIDAYS.some(h=>h.date===d);
const holidayName = (d) => (HOLIDAYS.find(h=>h.date===d)||{}).name || '';
function isWeekend(d) { const w = new Date(d+'T00:00:00').getDay(); return !TEAM_SETTINGS.workdays.includes(w); }
function isWorkday(d) { return !isWeekend(d) && !isHolidayDate(d); }
function workdaysInRange(from, to) {
  let n = 0; const a = new Date(from+'T00:00:00'), b = new Date(to+'T00:00:00');
  for (let d=new Date(a); d<=b; d.setDate(d.getDate()+1)) {
    const iso = d.toISOString().slice(0,10);
    if (isWorkday(iso)) n++;
  }
  return n;
}
// count a member's leave days within a date list (workdays only)
function leaveDaysInList(uid, days) {
  return days.filter(d => leaveOn(uid, d)).length;
}

// team workload by day (units). Crafted so the week is busy (high utilisation)
// yet lumpy — crunch days blow past capacity while quiet days leave big gaps.
const TEAM_DAILY = {
  '2026-06-01': 38, // Mon
  '2026-06-02': 51, // Tue — crunch (over)
  '2026-06-03': 22, // Wed — quiet
  '2026-06-04': 56, // Thu — crunch (over)
  '2026-06-05': 19, // Fri — quiet
};
// per-member totals for the current week (sum = 186)
const TEAM_WEEK = {
  u1: 38, u2: 34, u3: 31, u4: 30, u5: 28, u6: 25,
};
// team capacity split (where the hours actually went) — mock aggregate
const TEAM_SPLIT = { newWork: 116, revision: 49, meeting: 21 }; // sum 186
const TEAM_SCOPE = 5; // scope-creep flags across the team this week

function teamCapacityPerDay() { return teamDailySum(); }

// roll-up + balance analysis for a set of dated team totals.
// capacity now = Σ(each member's dailyMax) per workday, MINUS any member's leave days.
function teamAnalysis(daily) {
  const days = Object.keys(daily).sort();
  const capPerDay = teamCapacityPerDay();
  const total = sum(days, d=>daily[d]);
  const workdays = days.length;
  // gross capacity minus capacity lost to leave (a person on leave doesn't owe units that day)
  let leaveLost = 0;
  days.forEach(d => TEAM.forEach(m => { if (leaveOn(m.id, d)) leaveLost += m.dailyMax; }));
  const capacity = capPerDay * workdays - leaveLost;
  const util = capacity ? total / capacity : 0;
  const overtime = sum(days, d=>Math.max(0, daily[d]-capPerDay));
  const idle = sum(days, d=>Math.max(0, capPerDay-daily[d]));
  const evenPerDay = workdays ? total/workdays : 0;
  const crunchDays = days.filter(d=>daily[d]>capPerDay).length;
  return { days, daily, capPerDay, total, workdays, capacity, util, overtime, idle, evenPerDay, crunchDays, leaveLost };
}
// a single member's personal capacity over a set of days (minus their leave)
function memberCapacity(uid, days) {
  const m = teamMember(uid);
  if (!m) return 0;
  return m.dailyMax * (days.length - leaveDaysInList(uid, days));
}

/* ---- team "pulse" ----
   Per-day participation model: a person-day only counts (load AND capacity)
   if that person actually logged that day. Non-logged days vanish from the
   maths entirely — no phantom zeros, no one looks idle, no witch-hunt — so
   the utilisation ratio stays meaningful even when not everyone logs. */
function teamPulse(days) {
  const loadByDay = {}, capByDay = {}, utilByDay = {};
  days.forEach(d => {
    const es = ENTRIES.filter(e => e.date === d);
    const loggers = new Set(es.map(e => e.userId));
    let cap = 0;
    loggers.forEach(uid => { const m = teamMember(uid); if (m && !leaveOn(uid, d)) cap += m.dailyMax; });
    loadByDay[d] = sum(es, e => e._c.final);
    capByDay[d] = cap;
    utilByDay[d] = cap ? loadByDay[d] / cap : 0;        // 0 also means "no data" that day
    utilByDay[d + '_has'] = loggers.size > 0;
  });
  const total = sum(days, d => loadByDay[d]);
  const capacity = sum(days, d => capByDay[d]);
  const util = capacity ? total / capacity : 0;
  const overtime = sum(days, d => Math.max(0, loadByDay[d] - capByDay[d]));
  const idle = sum(days, d => Math.max(0, capByDay[d] - loadByDay[d]));
  const crunchDays = days.filter(d => loadByDay[d] > capByDay[d] + 0.01).length;
  // worst single day drives the team light — so a heavy Monday shows red on
  // Monday, instead of waiting for the weekly average to catch up days later
  const maxUtil = Math.max(0, ...days.filter(d => utilByDay[d + '_has']).map(d => utilByDay[d]));

  // per-member status — measured over the days THEY logged, against THEIR capacity
  const members = TEAM.map(m => {
    const myDays = days.filter(d => ENTRIES.some(e => e.userId === m.id && e.date === d));
    const load = sum(myDays, d => sum(ENTRIES.filter(e => e.userId === m.id && e.date === d), e => e._c.final));
    let cap = 0; myDays.forEach(d => { if (!leaveOn(m.id, d)) cap += m.dailyMax; });
    return { ...m, logged: myDays.length > 0, util: cap ? load / cap : 0, onLeave: leaveDaysInList(m.id, days) };
  });
  const loggedMembers = members.filter(m => m.logged);
  const capPerDay = days.length ? capacity / days.length : 0;
  return {
    days, loadByDay, capByDay, utilByDay, total, capacity, util, overtime, idle, crunchDays, maxUtil,
    members, loggedMembers, capPerDay, evenPerDay: days.length ? total / days.length : 0,
    coverage: { logged: loggedMembers.length, total: TEAM.length, missing: TEAM.length - loggedMembers.length },
  };
}

// map a utilisation ratio to a load state — colour + agency-humour label + plain subtitle
function loadStatus(util) {
  if (util > 1.0)   return { key: 'red',    tone: 'over', label: 'Heavy week',  sub: 'over a sustainable load' };
  if (util >= 0.75) return { key: 'yellow', tone: 'warn', label: 'Send snacks', sub: 'filling up' };
  return { key: 'green', tone: 'good', label: 'Healthy', sub: 'within a healthy load' };
}

/* ============================================================
   HELP BOARD  (raise a hand · lend a hand)
   ============================================================ */
let _hid = 0;
function H(o){ _hid++; return Object.assign({ id:'h'+_hid, status:'open', helperId:null, thanks:'', loggedHours:null }, o); }
const HELP_REQUESTS = [
  H({ byId:'u2', clientId:'c3', title:'6-banner set for the launch', need:'Another pair of hands on 3 of the sizes', hours:2, urgency:'today' }),
  H({ byId:'u4', clientId:'c6', title:'Resize 12 formats, FB → IG', need:'Anyone free to split the batch?', hours:1.5, urgency:'today' }),
  H({ byId:'u3', clientId:'c2', title:'Infographic data check', need:'Second eye on the numbers before it ships', hours:0.5, urgency:'soon', status:'claimed', helperId:'u1' }),
  H({ byId:'u5', clientId:'c1', title:'Motion storyboard feedback', need:'Quick gut-check on scene order', hours:0.5, urgency:'soon' }),
  H({ byId:'u6', clientId:'c4', title:'Catalogue cover polish', need:'Final once-over before sending', hours:1, urgency:'soon', status:'resolved', helperId:'u1', thanks:'Saved my evening — thank you 🙏', loggedHours:1 }),
];
const URGENCY = {
  today: { label:'Needed today', tone:'bad' },
  soon:  { label:'When you can', tone:'mid' },
};
// team-level kindness count (collective, never per-person ranked)
function timesHelpedThisMonth() { return HELP_REQUESTS.filter(h=>h.status==='resolved').length; }

if (!window.WL_ALLOW_PROTOTYPE_DATA) {
  CLIENTS.splice(0, CLIENTS.length);
  ENTRIES.splice(0, ENTRIES.length);
  TEAM.splice(0, TEAM.length);
  HOLIDAYS.splice(0, HOLIDAYS.length);
  HELP_REQUESTS.splice(0, HELP_REQUESTS.length);
  Object.keys(LEAVE).forEach(k => delete LEAVE[k]);
  Object.keys(TEAM_DAILY).forEach(k => delete TEAM_DAILY[k]);
  Object.keys(TEAM_WEEK).forEach(k => delete TEAM_WEEK[k]);
  TEAM_SPLIT.newWork = 0;
  TEAM_SPLIT.revision = 0;
  TEAM_SPLIT.meeting = 0;
}
