/* ============================================================
   WorkLog — Timeline (calendar + list + filters)
   ============================================================ */

let tl = { view: 'calendar', month: TODAY.slice(0, 7), clients: new Set(), types: new Set(), flagged: false, starred: false, showFilters: false };

function tlFiltered() {
  return ENTRIES.filter(e => {
    if (tl.clients.size && !tl.clients.has(e.clientId)) return false;
    if (tl.types.size && !tl.types.has(e.jobType)) return false;
    if (tl.flagged && !(e.isFlagged || isScope(e))) return false;
    if (tl.starred && !e.isStarred) return false;
    return true;
  });
}
const tlActive = () => (tl.clients.size + tl.types.size + (tl.flagged?1:0) + (tl.starred?1:0));

function renderTimeline() {
  return `
  <div class="page timeline">
    <div class="greet" style="padding-bottom:16px">
      <div class="eyebrow">Timeline</div>
      <h1><em>You showed up</em></h1>
    </div>

    <div class="tl-bar">
      <div class="bigtoggle" id="tlView" style="flex:1">
        <button class="bt ${tl.view==='calendar'?'on':''}" data-v="calendar">${ic('calendar-days')} Calendar</button>
        <button class="bt ${tl.view==='list'?'on':''}" data-v="list">${ic('list')} List</button>
      </div>
    </div>

    <div class="filter-bar">
      <button class="fchip ${tl.flagged?'on flag':''}" id="fFlag">${ic('flag')} Flagged</button>
      <button class="fchip ${tl.starred?'on star':''}" id="fStar">${ic('star')} Starred</button>
      <button class="fchip ghost ${tlActive()?'live':''}" id="fMore">${ic('sliders-horizontal')} Filters${tlActive()?` · ${tlActive()}`:''}</button>
      ${tlActive()?`<button class="fchip reset" id="fReset">${ic('x')} Reset</button>`:''}
    </div>
    <div class="filter-panel" id="filterPanel" ${tl.showFilters?'':'hidden'}>
      <div class="fp-lab">Client</div>
      <div class="fp-chips">
        ${CLIENTS.filter(c=>!c.archived).map(c=>`<button class="mchip ${tl.clients.has(c.id)?'on':''}" data-fc="${c.id}">${c.name}</button>`).join('')}
      </div>
      <div class="fp-lab">Job type</div>
      <div class="fp-chips">
        ${Object.entries(JOB_TYPES).map(([k,v])=>`<button class="mchip ${tl.types.has(k)?'on':''}" data-ft="${k}"><span class="dot" style="background:${v.color}"></span>${v.short}</button>`).join('')}
      </div>
    </div>

    <div id="tlBody">${tl.view==='calendar'?calendarView():listView()}</div>
  </div>`;
}

function monthMeta(ym) {
  const [y,m] = ym.split('-').map(Number);
  const first = new Date(y, m-1, 1);
  const days = new Date(y, m, 0).getDate();
  const lead = first.getDay();
  const label = first.toLocaleDateString('en-US',{ month:'long', year:'numeric' });
  return { y, m, days, lead, label };
}

function calendarView() {
  const mm = monthMeta(tl.month);
  const max = SETTINGS.dailyMax;
  const filtered = tlFiltered();
  const cells = [];
  for (let i=0;i<mm.lead;i++) cells.push('<div class="cal-cell empty"></div>');
  for (let d=1; d<=mm.days; d++) {
    const date = `${tl.month}-${String(d).padStart(2,'0')}`;
    const dayEs = filtered.filter(e=>e.date===date);
    const total = sum(dayEs, e=>e._c.final);
    const hasScope = dayEs.some(isScope);
    const hol = isHolidayDate(date);
    const lv = myLeaveOn(date);
    let tone = 'none';
    if (total>0) tone = total>max ? 'over' : total>=max*0.66 ? 'full' : 'light';
    const isToday = date===TODAY;
    cells.push(`<button class="cal-cell ${isToday?'today':''} ${hol?'holiday':''} ${lv?'leave':''}" data-day="${date}" ${isWeekend(date)&&total===0&&!hol&&!lv?'disabled':''}>
      <span class="cal-d">${d}</span>
      <span class="cal-mark">${total>0?`<span class="cal-dot ${tone}"></span>`:hol?`<span class="cal-hol">${ic('palmtree')}</span>`:lv?`<span class="cal-hol">${ic(LEAVE_TYPES[lv.type].icon)}</span>`:`<span class="cal-empty-dot"></span>`}</span>
      ${hasScope?`<span class="cal-scope">${ic('triangle-alert')}</span>`:''}
    </button>`);
  }
  const monthTotal = sum(filtered.filter(e=>e.date.startsWith(tl.month)), e=>e._c.final);
  return `
    <div class="cal-head">
      <button class="cal-nav" data-mn="-1">${ic('chevron-left')}</button>
      <b>${mm.label}</b>
      <button class="cal-nav" data-mn="1">${ic('chevron-right')}</button>
    </div>
    <div class="cal-dow">${['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d=>`<span>${d[0]}</span>`).join('')}</div>
    <div class="cal-grid">${cells.join('')}</div>
    <div class="cal-legend">
      <span><i class="cal-dot light"></i> Light</span>
      <span><i class="cal-dot full"></i> Full</span>
      <span><i class="cal-dot over"></i> Over max</span>
      <span class="cal-mtot tnum">${u(monthTotal)} units</span>
    </div>`;
}

function listView() {
  const filtered = tlFiltered().slice().sort((a,b)=> a.date<b.date?1:a.date>b.date?-1:0);
  if (!filtered.length) return `<div class="tl-empty">${ic('search-x')}<p>No entries match these filters.</p></div>`;
  const groups = {};
  filtered.forEach(e=>{ (groups[e.date]=groups[e.date]||[]).push(e); });
  return Object.entries(groups).map(([date,es])=>`
    <div class="tl-group">
      <div class="tl-date">
        <b>${new Date(date).toLocaleDateString('en-US',{weekday:'long', day:'numeric', month:'short'})}</b>
        <span class="tnum">${u(sum(es,e=>e._c.final))} units</span>
      </div>
      <div class="stack" style="display:flex;flex-direction:column;gap:9px">${es.map(e=>entryCard(e)).join('')}</div>
    </div>`).join('');
}

function wireTimeline(root) {
  const rebody = () => { root.querySelector('#tlBody').innerHTML = tl.view==='calendar'?calendarView():listView(); refreshIcons(); bindBody(); };
  const bindBody = () => {
    root.querySelectorAll('.cal-cell[data-day]').forEach(c=>c.addEventListener('click',()=>openDaySheet(c.dataset.day)));
    root.querySelectorAll('.cal-nav').forEach(b=>b.addEventListener('click',()=>{
      const [y,m]=tl.month.split('-').map(Number); const nd=new Date(y,m-1+parseInt(b.dataset.mn),1);
      tl.month = `${nd.getFullYear()}-${String(nd.getMonth()+1).padStart(2,'0')}`; rebody();
    }));
    root.querySelectorAll('#tlBody [data-entry]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.entry)));
  };
  root.querySelectorAll('#tlView .bt').forEach(b=>b.addEventListener('click',()=>{ tl.view=b.dataset.v; rerenderScreen('timeline'); }));
  root.querySelector('#fFlag').addEventListener('click',()=>{ tl.flagged=!tl.flagged; rerenderScreen('timeline'); });
  root.querySelector('#fStar').addEventListener('click',()=>{ tl.starred=!tl.starred; rerenderScreen('timeline'); });
  root.querySelector('#fMore').addEventListener('click',()=>{ tl.showFilters=!tl.showFilters; rerenderScreen('timeline'); });
  const fr = root.querySelector('#fReset'); if (fr) fr.addEventListener('click',()=>{ tl.clients.clear(); tl.types.clear(); tl.flagged=false; tl.starred=false; rerenderScreen('timeline'); });
  root.querySelectorAll('[data-fc]').forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.fc; tl.clients.has(id)?tl.clients.delete(id):tl.clients.add(id); rerenderScreen('timeline'); }));
  root.querySelectorAll('[data-ft]').forEach(b=>b.addEventListener('click',()=>{ const id=b.dataset.ft; tl.types.has(id)?tl.types.delete(id):tl.types.add(id); rerenderScreen('timeline'); }));
  bindBody();
}

function openDaySheet(date) {
  const es = tlFiltered().filter(e=>e.date===date);
  const total = sum(es, e=>e._c.final);
  const over = total > SETTINGS.dailyMax;
  const hol = isHolidayDate(date);
  const weekend = isWeekend(date);
  const lv = myLeaveOn(date);
  const m = mountOverlay('detailModal');
  m.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet">
      <div class="dm-grab"></div>
      <div class="dm-head">
        <div><div class="ds-date">${new Date(date).toLocaleDateString('en-US',{weekday:'long'})}${hol?` · ${holidayName(date)}`:weekend?' · weekend':lv?` · ${LEAVE_TYPES[lv.type].label}`:''}</div>
          <b style="font-family:var(--serif);font-size:24px">${new Date(date).toLocaleDateString('en-US',{day:'numeric',month:'long'})}</b></div>
        <div class="dm-units"><b class="tnum" style="color:${over?'var(--bad)':'var(--good)'}">${u(total)}</b><small>${es.length} jobs</small></div>
      </div>
      <div class="ds-list">${es.length?es.map(e=>entryCard(e)).join(''):`<div class="tl-empty" style="padding:30px 0">${ic(hol?'palmtree':lv?LEAVE_TYPES[lv.type].icon:'coffee')}<p>${hol?'Holiday — no expected workload.':lv?`On ${LEAVE_TYPES[lv.type].label.toLowerCase()} — this day won't count against you.`:'A rest day.'}</p></div>`}</div>
      ${weekend||hol?'':`<div class="ds-leave-row">
        <span class="ds-leave-label">${lv?'On leave:':'Not in today? Mark your own leave:'}</span>
        <div class="ds-leave-btns">
          <button class="ds-lv ${lv&&lv.type==='sick'?'on sick':''}" data-leave="sick">${ic('thermometer')} Sick</button>
          <button class="ds-lv ${lv&&lv.type==='vacation'?'on vacation':''}" data-leave="vacation">${ic('palmtree')} Vacation</button>
          ${lv?`<button class="ds-lv clear" data-leave="">${ic('x')} Clear</button>`:''}
        </div>
      </div>`}
      ${weekend||lv?'':`<button class="ds-holiday ${hol?'on':''}" id="dsHoliday">${ic(hol?'calendar-x':'palmtree')} ${hol?'Unmark company holiday':'Mark as company holiday'}</button>`}
    </div>`;
  m.classList.add('open');
  refreshIcons();
  m.querySelector('.dm-overlay').addEventListener('click', closeDetail);
  m.querySelectorAll('[data-entry]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.entry)));
  m.querySelectorAll('[data-leave]').forEach(b=>b.addEventListener('click', ()=> runAction(b, async ()=>{
    const t = b.dataset.leave;
    const arr = myLeave();
    const prev = arr.slice(); // snapshot for rollback
    // optimistic: update memory + close the sheet immediately (no hang)
    const i = arr.findIndex(l=>l.date===date);
    if (i>=0) arr.splice(i,1);
    if (t) arr.push({ date, type:t });
    markSyncing();
    closeDetail();
    rerenderScreen('timeline');
    try {
      if (t) { if (window.WLStore && window.WLStore.setLeave) await window.WLStore.setLeave(date, t); }
      else { if (window.WLStore && window.WLStore.clearLeave) await window.WLStore.clearLeave(date); }
      markSynced();
      toast(t?`${LEAVE_TYPES[t].label} marked — synced to the team`:'Leave cleared', t?'good':'info');
    } catch (err) {
      arr.splice(0, arr.length, ...prev); // rollback
      markSynced();
      rerenderScreen('timeline');
      throw err;
    }
  }, 'Could not save leave')));
  const hb = m.querySelector('#dsHoliday');
  if (hb) hb.addEventListener('click', ()=> runAction(hb, async ()=>{
    const prev = HOLIDAYS.slice(); // snapshot for rollback
    const removing = isHolidayDate(date);
    // optimistic
    if (removing) { const i=HOLIDAYS.findIndex(h=>h.date===date); if(i>=0) HOLIDAYS.splice(i,1); }
    else { HOLIDAYS.push({ date, name:'Day off' }); }
    markSyncing();
    closeDetail();
    rerenderScreen('timeline');
    try {
      if (removing) { if (window.WLStore && window.WLStore.deleteHoliday) await window.WLStore.deleteHoliday(date); }
      else { if (window.WLStore && window.WLStore.createHoliday) { const row = await window.WLStore.createHoliday(date, 'Day off'); const h = HOLIDAYS.find(x=>x.date===date); if (h && row && row.id) h.id = row.id; } }
      markSynced();
      toast(removing?'Holiday removed':'Marked as holiday — excluded from capacity', removing?'info':'good');
    } catch (err) {
      HOLIDAYS.splice(0, HOLIDAYS.length, ...prev); // rollback
      markSynced();
      rerenderScreen('timeline');
      throw err;
    }
  }, 'Could not save holiday'));
}
