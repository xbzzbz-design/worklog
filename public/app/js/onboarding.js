/* ============================================================
   WorkLog — Onboarding (5 swipeable screens)
   ============================================================ */

const ONB_SLIDES = [
  {
    art: `<div class="onb-fair">
      <div class="onb-old">
        <span class="onb-old-tag">The usual way</span>
        <div class="onb-old-row"><span>Set of 2</span><b>1 job</b></div>
        <div class="onb-old-row"><span>Set of 8</span><b>1 job</b></div>
      </div>
      <div class="onb-fair-arrow">${ic('arrow-down')}</div>
      <div class="onb-new">
        <span class="onb-new-tag">WorkLog</span>
        <div class="onb-new-row"><span>Set of 8 infographics</span><b class="tnum">16.0</b></div>
      </div>
    </div>`,
    eyebrow: 'Fairness first',
    title: 'Volume should count',
    body: 'In a lot of studios, a set of 8 counts the same as a set of 2 — just “one job.” WorkLog counts every piece, so the big days finally earn their weight.',
  },
  {
    art: `<div class="onb-grid">
      ${Object.entries(JOB_TYPES).filter(([k,v])=>!v.timeBased && !v.quick).map(([k,v])=>`<div class="onb-jt"><span class="jt-ic sm" style="--jc:${v.color}">${ic(v.icon)}</span><b>${v.motion?'tier':u(v.rate)}</b></div>`).join('')}
    </div>
    <div class="onb-eq">Infographic × 3 <span>=</span> <b>6.0 units</b></div>`,
    eyebrow: 'Every job type',
    title: 'Every piece, its fair weight',
    body: 'Each piece type carries a per-piece rate that quantity multiplies; motion is scored per scene by complexity. Heavy work and high volume both get counted — nothing you made disappears.',
  },
  {
    art: `<div class="onb-rev">
      <div class="onb-rev-row"><b>Minor</b><span>light fixes</span><i class="tnum">0.25</i></div>
      <div class="onb-rev-row"><b>Standard</b><span>partial rework</span><i class="tnum">0.5</i></div>
      <div class="onb-rev-row"><b>Major / Redo</b><span>new direction</span><i class="tnum">full rate</i></div>
      <div class="onb-rev-row muted"><b>Our mistake</b><span>doesn't count</span><i>0</i></div>
    </div>`,
    eyebrow: 'Honest revisions',
    title: 'Revisions have levels',
    body: 'Small tweak or full redo — log it honestly. Owning your mistakes keeps the whole report credible.',
  },
  {
    art: `<div class="onb-cond">
      <div class="onb-cond-row">${ic('file-question')}<span>Brief incomplete</span><b>+0.5</b></div>
      <div class="onb-cond-row">${ic('image-off')}<span>Sourced assets yourself</span><b>+0.5</b></div>
      <div class="onb-cond-row">${ic('zap')}<span>Rush deadline</span><b>+0.5</b></div>
    </div>`,
    eyebrow: 'Hidden effort',
    title: 'Conditions add fairness',
    body: 'Chasing a brief, hunting assets, same-day rushes — the invisible work finally gets its credit.',
  },
  {
    art: `<div class="onb-cond">
      <div class="onb-cond-row">${ic('users')}<span>Meeting</span><b>1.5h</b></div>
      <div class="onb-cond-row">${ic('video')}<span>Shoot / on location</span><b>4h</b></div>
      <div class="onb-cond-row">${ic('life-buoy')}<span>Advising / covering</span><b>2h</b></div>
      <div class="onb-cond-row">${ic('clipboard-list')}<span>Admin / coordination</span><b>1h</b></div>
    </div>`,
    eyebrow: 'Honesty is the point',
    title: 'Even the invisible hours',
    body: 'Meetings, covering for someone, admin — log them by the hour too. There’s no file to prove this work, so be honest with yourself. An honest record is the one thing a bad manager can’t argue with.',
  },
  {
    art: `<div class="onb-team-art">
      <div class="onb-team-cap">
        <div class="onb-team-head"><b class="tnum">89%</b><span>of the team's week, used</span></div>
        <div class="onb-team-bar"><span style="width:89%"></span></div>
      </div>
      <div class="onb-team-rows">
        <div class="onb-team-row"><span class="tdot good"></span>You + 5 designers, one honest record</div>
        <div class="onb-team-row"><span class="tdot bad"></span>Crunch days = bad scheduling, not a lazy team</div>
      </div>
    </div>`,
    eyebrow: 'The whole squad',
    title: 'You’re not carrying it alone',
    body: 'WorkLog adds everyone up into one honest picture of the week. Every name counts, every hour is seen — and when the team sits near 100%, “you don’t work enough” simply isn’t true. The crunch was scheduling, not you.',
  },
  {
    art: `<div class="onb-help-art">
      <div class="onb-help-card raise">${ic('hand')}<div><b>Raise a hand</b><small>Heavy day? Ask the team.</small></div></div>
      <div class="onb-help-plus">${ic('plus')}</div>
      <div class="onb-help-card lend">${ic('hand-helping')}<div><b>Lend a hand</b><small>Got room? Jump in.</small></div></div>
    </div>`,
    eyebrow: 'We’ve got each other',
    title: 'Nobody gets left behind',
    body: 'Heavy day? Raise a hand on the board. Got room? Lend one. We see each other’s value here — asking isn’t weakness, it’s how a team holds together when the system above won’t. We’ve got each other’s back.',
  },
  {
    art: `<div class="onb-final">
      <div class="onb-dots">
        ${[1,1,2,1,3,2,1,2,3,1,2,1,3,1].map((s,i)=>`<span class="onb-dot ${i%9===4||i%11===3?'over':'ok'} s${s}"></span>`).join('')}
      </div>
      <div class="onb-pdf">${ic('file-down')} Workload Report.pdf</div>
    </div>`,
    eyebrow: 'Proof, together',
    title: 'Your work, finally seen',
    body: 'Every honest day adds up — into a record for you, and proof for the team. Log it, back each other, and let the numbers speak. You’re not alone in this.',
  },
];

let onbIndex = 0;
function openOnboarding() {
  onbIndex = 0;
  let el = mountOverlay('onbModal');
  el.innerHTML = `
    <div class="onb-shell">
      <button class="onb-skip" id="onbSkip">Skip</button>
      <div class="onb-track" id="onbTrack">
        ${ONB_SLIDES.map((s,i)=>`<div class="onb-slide ${i===0?'active':''}">
          <div class="onb-art">${s.art}</div>
          <div class="onb-eyebrow">${s.eyebrow}</div>
          <div class="onb-title">${s.title}</div>
          <div class="onb-body">${s.body}</div>
        </div>`).join('')}
      </div>
      <div class="onb-foot">
        <div class="onb-pips">${ONB_SLIDES.map((_,i)=>`<span class="pip ${i===0?'on':''}" data-pip="${i}"></span>`).join('')}</div>
        <button class="btn lg" id="onbNext">${ic('arrow-right')}</button>
      </div>
    </div>`;
  el.classList.add('open');
  document.body.classList.add('onb-open');
  refreshIcons();

  const track = el.querySelector('#onbTrack');
  const next = el.querySelector('#onbNext');
  const update = () => {
    track.style.transform = `translateX(-${onbIndex*100}%)`;
    el.querySelectorAll('.pip').forEach((p,i)=>p.classList.toggle('on', i===onbIndex));
    // retrigger entrance animation on the slide now in view
    el.querySelectorAll('.onb-slide').forEach((sl,i)=>{
      if (i===onbIndex) { sl.classList.remove('active'); void sl.offsetWidth; sl.classList.add('active'); }
      else sl.classList.remove('active');
    });
    const last = onbIndex === ONB_SLIDES.length-1;
    next.innerHTML = last ? `${ic('check')} Get started` : ic('arrow-right');
    next.classList.toggle('final', last);
    refreshIcons();
  };
  next.addEventListener('click', ()=>{
    if (onbIndex < ONB_SLIDES.length-1) { onbIndex++; update(); }
    else closeOnboarding();
  });
  el.querySelector('#onbSkip').addEventListener('click', closeOnboarding);
  el.querySelectorAll('.pip').forEach(p=>p.addEventListener('click',()=>{ onbIndex=parseInt(p.dataset.pip); update(); }));
  // swipe
  let sx = null;
  track.addEventListener('touchstart', e=>{ sx = e.touches[0].clientX; }, {passive:true});
  track.addEventListener('touchend', e=>{
    if (sx==null) return; const dx = e.changedTouches[0].clientX - sx;
    if (dx < -40 && onbIndex < ONB_SLIDES.length-1) { onbIndex++; update(); }
    else if (dx > 40 && onbIndex > 0) { onbIndex--; update(); }
    sx = null;
  });
  update();
}
function closeOnboarding() {
  const el = document.getElementById('onbModal');
  if (el) el.classList.remove('open');
  document.body.classList.remove('onb-open');
  try { localStorage.setItem('wl_onboarded', '1'); } catch(e){}
}
