/* ============================================================
   WorkLog — milestones & gentle celebrations
   ============================================================ */

function milestoneMetrics() {
  const pieces = sum(ENTRIES, e => e.quantity);
  const starred = ENTRIES.filter(e => e.isStarred).length;
  const mistakes = ENTRIES.filter(e => e.revisionCause === 'OUR_MISTAKE').length;
  const scopes = ENTRIES.filter(isScope).length;
  const entries = ENTRIES.length;
  // streak
  const dates = new Set(ENTRIES.map(e => e.date));
  let streak = 0, cur = new Date(TODAY);
  while (dates.has(cur.toISOString().slice(0,10))) { streak++; cur.setDate(cur.getDate()-1); }
  // best day excluding today
  const totals = {};
  ENTRIES.forEach(e => { totals[e.date] = (totals[e.date]||0) + e._c.final; });
  const todayTotal = totals[TODAY] || 0;
  const bestOther = Math.max(0, ...Object.entries(totals).filter(([d])=>d!==TODAY).map(([,v])=>v));
  return { pieces, starred, mistakes, scopes, entries, streak, todayTotal, bestOther };
}

const MILESTONES = [
  { id:'pieces_50',  icon:'package-check', when:m=>m.pieces>=50,  title:'50 pieces shipped', body:'Fifty deliverables logged. Your work is adding up.' },
  { id:'pieces_100', icon:'package-check', when:m=>m.pieces>=100, title:'100 pieces shipped', body:'A century of work, all on the record. That’s real output.' },
  { id:'pieces_250', icon:'rocket',        when:m=>m.pieces>=250, title:'250 pieces shipped', body:'Quietly prolific. Future-you will thank present-you for logging it.' },
  { id:'streak_7',   icon:'flame',         when:m=>m.streak>=7,   title:'7-day streak', body:'A full week of showing up and logging it. Lovely consistency.' },
  { id:'portfolio_10', icon:'star',        when:m=>m.starred>=10, title:'10 portfolio picks', body:'Ten pieces you’re proud of, saved in one place.' },
  { id:'honest',     icon:'shield-check',  when:m=>m.mistakes>=1, title:'Honest logger', body:'You logged a job that didn’t count. Honesty is what makes the whole report believable.' },
  { id:'scope_first',icon:'flag',          when:m=>m.scopes>=1,   title:'First scope flag', body:'Evidence, not a complaint. You’ve started building your case.' },
  { id:'best_day',   icon:'trophy',        when:m=>m.todayTotal>0 && m.todayTotal>m.bestOther, title:'New personal best', body:m=>`${u(m.todayTotal)} units today — your biggest day yet.` },
];

function getAchieved() { try { return new Set(JSON.parse(localStorage.getItem('wl_milestones')||'[]')); } catch(e){ return new Set(); } }
function setAchieved(set) { try { localStorage.setItem('wl_milestones', JSON.stringify([...set])); } catch(e){} }

// record currently-satisfied milestones silently so only NEW ones celebrate later
function initMilestones() {
  const m = milestoneMetrics();
  const have = getAchieved();
  MILESTONES.forEach(ms => { if (ms.id !== 'best_day' && ms.when(m)) have.add(ms.id); });
  setAchieved(have);
}

function checkMilestones() {
  const m = milestoneMetrics();
  const have = getAchieved();
  const fresh = [];
  MILESTONES.forEach(ms => {
    if (ms.when(m) && !have.has(ms.id)) { have.add(ms.id); fresh.push(ms); }
  });
  setAchieved(have);
  return fresh;
}

function celebrate(ms) {
  if (!ms) return;
  const el = mountOverlay('celebrateModal');
  const body = typeof ms.body === 'function' ? ms.body(milestoneMetrics()) : ms.body;
  const confetti = Array.from({length:26}, (_,i)=>{
    const c = ['var(--primary)','var(--good)','var(--warn)','var(--bad)'][i%4];
    return `<span class="cf" style="left:${Math.random()*100}%;background:${c};animation-delay:${Math.random()*0.5}s;animation-duration:${1.6+Math.random()}s"></span>`;
  }).join('');
  el.innerHTML = `
    <div class="cb-overlay"></div>
    <div class="cb-confetti">${confetti}</div>
    <div class="cb-card">
      <div class="cb-ic">${ic(ms.icon)}</div>
      <div class="cb-kicker">Milestone</div>
      <div class="cb-title">${ms.title}</div>
      <div class="cb-body">${body}</div>
      <button class="btn" id="cbOk">${ic('heart')} Nice</button>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  const close = () => el.classList.remove('open');
  el.querySelector('#cbOk').addEventListener('click', close);
  el.querySelector('.cb-overlay').addEventListener('click', close);
}
