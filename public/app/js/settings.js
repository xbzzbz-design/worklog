/* ============================================================
   WorkLog — Settings
   ============================================================ */

function ratesAudit() {
  const id = TEAM_SETTINGS.ratesUpdatedBy;
  const at = TEAM_SETTINGS.ratesUpdatedAt;
  if (!id || !at) return '';
  const m = (typeof TEAM !== 'undefined') ? TEAM.find(x => x.id === id) : null;
  const who = m ? (m.you ? 'you' : m.name) : 'a teammate';
  let when = '';
  try { when = new Date(at).toLocaleDateString('en-US', { day:'numeric', month:'short', year:'numeric' }); } catch(e){}
  return `<div class="set-note" style="opacity:.75">${ic('history')} Last changed by <b>${who}</b>${when?` · ${when}`:''}</div>`;
}

function renderSettings() {
  return `
  <div class="page settings">
    <div class="greet" style="padding-bottom:14px">
      <div class="eyebrow">Settings</div>
      <h1><em>Make it yours</em></h1>
    </div>

    <div class="set-sec">
      <div class="set-h">Profile</div>
      <div class="field"><label>Your name <span style="font-weight:500;color:var(--muted)">· shown on PDF reports</span></label>
        <input type="text" id="setName" value="${SETTINGS.userName}"></div>
    </div>

    <div class="set-sec">
      <div class="set-h">Workload</div>
      <div class="set-row">
        <div><b>Daily max credits</b><small>Your fair daily ceiling</small></div>
        <div class="mini-step" id="setMax">
          <button data-mx="-1">${ic('minus')}</button><b class="tnum">${u(SETTINGS.dailyMax)}</b><button data-mx="1">${ic('plus')}</button>
        </div>
      </div>
      <div class="set-row">
        <div><b>Add-on amount</b><small>Per condition (Brief, Assets, Rush) · shared with team</small></div>
        <div class="mini-step" id="setAddon">
          <button data-ao="-1">${ic('minus')}</button><b class="tnum">+${u(SETTINGS.addOn)}</b><button data-ao="1">${ic('plus')}</button>
        </div>
      </div>
    </div>

    <div class="set-sec">
      <div class="set-h">Job type rates <span class="set-shared">${ic('users-round')} shared · agree together</span></div>
      <div class="rate-list" id="rateList">
        ${Object.entries(JOB_TYPES).filter(([k,v])=>!v.quick && !v.motion && !v.set).map(([k,v])=>{
          const r = CUSTOM_RATES[k] != null ? CUSTOM_RATES[k] : v.rate;
          return `<div class="rate-row">
            <span class="jt-ic sm" style="--jc:${v.color}">${ic(v.icon)}</span>
            <span class="rate-name">${v.label}</span>
            <div class="mini-step rate" data-rk="${k}">
              <button data-r="-0.25">${ic('minus')}</button><b class="tnum">${u(r)}</b><button data-r="0.25">${ic('plus')}</button>
            </div>
          </div>`;
        }).join('')}
      </div>
      <div class="set-note">${ic('info')} Rates &amp; add-on are shared by the whole team. Changing one re-credits every log to the new scale so everyone stays comparable.</div>
      <div id="ratesAudit">${ratesAudit()}</div>
    </div>

    <div class="set-sec">
      <div class="set-h">Team settings <span class="set-shared">${ic('users-round')} shared · agree together</span></div>
      <div class="set-row">
        <div><b>Work week</b><small>Days that count toward capacity</small></div>
        <div class="dow-pick" id="dowPick">
          ${['S','M','T','W','T','F','S'].map((d,i)=>`<button class="dow ${TEAM_SETTINGS.workdays.includes(i)?'on':''}" data-dow="${i}">${d}</button>`).join('')}
        </div>
      </div>
      <div class="set-row">
        <div><b>Holiday add-on</b><small>Bonus credit for working on a day off</small></div>
        <div class="mini-step" id="setHol">
          <button data-hl="-1">${ic('minus')}</button><b class="tnum">+${u(TEAM_SETTINGS.holidayAddOn)}</b><button data-hl="1">${ic('plus')}</button>
        </div>
      </div>
      <div class="set-subhead">Company holidays</div>
      <div class="hol-list" id="holList">
        ${HOLIDAYS.length?HOLIDAYS.map(h=>`<div class="hol-item"><span>${ic('palmtree')} ${fmtDate(h.date)} · ${h.name}</span><button class="hol-x" data-holx="${h.date}">${ic('x')}</button></div>`).join(''):`<div class="hol-empty">None yet — mark days off from the Timeline calendar.</div>`}
      </div>
      <div class="set-note">${ic('shield')} No admin here. Anyone can edit these — change them together. Personal sick &amp; vacation leave is set by each person on their own calendar.</div>
    </div>

    <div class="set-sec">
      <div class="set-h">Guidance</div>
      <button class="set-link" id="setReplay">${ic('play')} <span>Replay onboarding</span> ${ic('chevron-right')}</button>
      <button class="set-link" data-go="help">${ic('circle-help')} <span>Help &amp; credit guide</span> ${ic('chevron-right')}</button>
    </div>
  </div>`;
}

function wireSettings(root) {
  let profileTimer = null;
  const saveProfile = () => {
    clearTimeout(profileTimer);
    profileTimer = setTimeout(async () => {
      try {
        if (window.WLStore && window.WLStore.updateProfile) {
          await window.WLStore.updateProfile({ name: SETTINGS.userName, dailyMax: SETTINGS.dailyMax });
          markSynced();
        }
      } catch (err) {
        console.error(err);
        toast('Could not save profile settings.', 'info');
      }
    }, 500);
    markSyncing();
  };
  const saveTeam = async () => {
    try {
      if (window.WLStore && window.WLStore.updateTeamSettings) await window.WLStore.updateTeamSettings();
      markSynced();
    } catch (err) {
      console.error(err);
      toast('Could not save team settings.', 'info');
    }
  };
  let ratesTimer = null;
  const saveRates = () => {
    clearTimeout(ratesTimer);
    markSyncing();
    ratesTimer = setTimeout(async () => {
      try {
        if (window.WLStore && window.WLStore.updateRates) {
          await window.WLStore.updateRates();
          markSynced();
          // refresh the "last changed by" line in place (no scroll/focus disruption)
          const auditEl = root.querySelector('#ratesAudit');
          if (auditEl) { auditEl.innerHTML = ratesAudit(); refreshIcons(); }
        }
      } catch (err) {
        console.error(err);
        toast('Could not save rates.', 'info');
      }
    }, 600);
  };
  root.querySelector('#setName').addEventListener('input', e=>{ SETTINGS.userName = e.target.value || 'Designer'; saveProfile(); });
  root.querySelectorAll('#setMax button').forEach(b=>b.addEventListener('click',()=>{
    SETTINGS.dailyMax = Math.max(1, SETTINGS.dailyMax + parseFloat(b.dataset.mx));
    root.querySelector('#setMax b').textContent = u(SETTINGS.dailyMax);
    saveProfile();
  }));
  root.querySelectorAll('#setAddon button').forEach(b=>b.addEventListener('click',()=>{
    SETTINGS.addOn = Math.max(0, Math.round((SETTINGS.addOn + parseFloat(b.dataset.ao)*0.25)*100)/100);
    root.querySelector('#setAddon b').textContent = '+' + u(SETTINGS.addOn);
    saveRates();
  }));
  root.querySelectorAll('.mini-step.rate').forEach(step=>{
    const k = step.dataset.rk;
    step.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{
      const base = CUSTOM_RATES[k] != null ? CUSTOM_RATES[k] : JOB_TYPES[k].rate;
      CUSTOM_RATES[k] = Math.max(0.25, Math.round((base + parseFloat(b.dataset.r))*100)/100);
      step.querySelector('b').textContent = u(CUSTOM_RATES[k]);
      saveRates();
    }));
  });
  root.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
  root.querySelector('#setReplay').addEventListener('click', openOnboarding);

  // team settings
  root.querySelectorAll('#dowPick .dow').forEach(b=>b.addEventListener('click',async ()=>{
    const d = parseInt(b.dataset.dow);
    const i = TEAM_SETTINGS.workdays.indexOf(d);
    if (i>=0) TEAM_SETTINGS.workdays.splice(i,1); else TEAM_SETTINGS.workdays.push(d);
    b.classList.toggle('on');
    markSyncing();
    await saveTeam();
  }));
  root.querySelectorAll('#setHol button').forEach(b=>b.addEventListener('click',async ()=>{
    TEAM_SETTINGS.holidayAddOn = Math.max(0, Math.round((TEAM_SETTINGS.holidayAddOn + parseFloat(b.dataset.hl)*0.5)*100)/100);
    root.querySelector('#setHol b').textContent = '+' + u(TEAM_SETTINGS.holidayAddOn);
    markSyncing();
    await saveTeam();
  }));
  root.querySelectorAll('[data-holx]').forEach(b=>b.addEventListener('click',()=> runAction(b, async ()=>{
    const i = HOLIDAYS.findIndex(h=>h.date===b.dataset.holx);
    if (i<0) return;
    const removed = HOLIDAYS[i];
    HOLIDAYS.splice(i,1); // optimistic
    markSyncing();
    rerenderScreen('settings');
    try {
      if (window.WLStore && window.WLStore.deleteHoliday) await window.WLStore.deleteHoliday(removed.date);
      markSynced();
    } catch (err) {
      HOLIDAYS.splice(Math.min(i, HOLIDAYS.length), 0, removed); // rollback
      rerenderScreen('settings');
      throw err;
    }
  }, 'Could not delete holiday')));
}
