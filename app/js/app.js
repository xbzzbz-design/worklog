/* ============================================================
   WorkLog — app router + shell logic
   ============================================================ */

const SCREENS = {
  home:         { render: renderHome,         wire: null,              label: 'Home' },
  entry:        { render: renderEntry,        wire: wireEntry,         label: 'New entry' },
  timeline:     { render: renderTimeline,     wire: wireTimeline,      label: 'Timeline' },
  report:       { render: renderReport,       wire: wireReport,        label: 'Report' },
  team:         { render: renderTeam,         wire: wireTeam,          label: 'Team' },
  helpboard:    { render: renderHelpBoard,    wire: wireHelpBoard,     label: 'Help board' },
  stats:        { render: renderStats,        wire: wireStats,         label: 'My stats' },
  help:         { render: renderHelp,         wire: wireHelp,          label: 'Help' },
  clients:      { render: renderClients,      wire: wireClients,       label: 'Clients' },
  clientDetail: { render: renderClientDetail, wire: wireClientDetail,  label: 'Client' },
  settings:     { render: renderSettings,     wire: wireSettings,      label: 'Settings' },
};

let currentScreen = 'home';

function mode() { return document.body.dataset.mode; }
function activeMount() {
  return mode() === 'desktop'
    ? document.getElementById('dScroll')
    : document.getElementById('mScroll');
}
// where modals/sheets/onboarding mount so they stay inside the device frame
function overlayHost() {
  return mode() === 'desktop'
    ? document.querySelector('.desktop .winbody')
    : document.querySelector('.phone .screen');
}
function mountOverlay(id) {
  let el = document.getElementById(id);
  if (!el) { el = document.createElement('div'); el.id = id; }
  overlayHost().appendChild(el);
  return el;
}

function go(name) {
  currentScreen = name;
  if (name === 'entry') draft = loadDraft();
  const mount = activeMount();
  const screen = SCREENS[name];

  // wide layout on desktop
  mount.innerHTML = `<div class="screen-pane active">${screen.render()}</div>`;
  if (mode() === 'desktop') {
    const pane = mount.querySelector('.page');
    if (pane) pane.classList.add('wide');
  }

  refreshIcons();
  if (screen.wire) screen.wire(mount);
  wireDelegation(mount);
  updateNav(name);
  mount.scrollTop = 0;

  if (name === 'report' && window.animateBars) animateBars(mount);
  if (name === 'home') {
    if (window.animateRing) animateRing(mount);
    if (window.animateSpark) animateSpark(mount);
  }
  if (name === 'clientDetail' && window.animateBars) {
    mount.querySelectorAll('.diff-fill, .df-bar div').forEach((b,i)=>{ const w=b.style.width; b.style.width='0%'; requestAnimationFrame(()=>{ setTimeout(()=>{ b.style.transition='width .8s cubic-bezier(.2,.8,.2,1)'; b.style.width=w; }, 60+i*60); }); });
  }
  if (name === 'home' && window.NEW_ENTRY_ID) {
    const card = mount.querySelector(`[data-entry="${window.NEW_ENTRY_ID}"]`);
    if (card) { card.classList.add('just-added'); }
    window.NEW_ENTRY_ID = null;
  }
}

function rerenderScreen(name) { if (currentScreen === name) go(name); }

function updateNav(name) {
  const navKey = name === 'clientDetail' ? 'clients' : name;
  document.querySelectorAll('#mNav button, #dNav button').forEach(b => {
    b.classList.toggle('on', b.dataset.nav === navKey);
  });
  // desktop url bar
  const url = document.querySelector('.winbar .url');
  if (url) url.innerHTML = `<i data-lucide="lock"></i> worklog.app/${name==='entry'?'new':name}`;
  refreshIcons();
}

function setMode(m) {
  if (mode() === m) return;
  document.body.dataset.mode = m;
  document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === m));
  go(currentScreen);
}

function runtimeMode() {
  return window.matchMedia('(min-width: 800px)').matches ? 'desktop' : 'mobile';
}

function syncRuntimeMode() {
  const next = runtimeMode();
  if (mode() !== next) {
    document.body.dataset.mode = next;
    document.querySelectorAll('#modeSeg button').forEach(b => b.classList.toggle('on', b.dataset.mode === next));
    if (currentScreen) go(currentScreen);
  }
}

/* ---- entry card / portfolio delegation ---- */
function wireDelegation(mount) {
  mount.querySelectorAll('[data-entry]').forEach(el => {
    el.addEventListener('click', () => openDetail(el.dataset.entry));
  });
  mount.querySelectorAll('[data-go]').forEach(el => {
    el.addEventListener('click', () => go(el.dataset.go));
  });
}

/* ---- entry detail modal ---- */
function openDetail(id) {
  const e = ENTRIES.find(x => x.id === id);
  if (!e) return;
  const c = e._c;
  const rows = [];
  rows.push(['Client', clientName(e.clientId)]);
  rows.push(['Job type', JOB_TYPES[e.jobType].label]);
  const _jt = JOB_TYPES[e.jobType];
  if (_jt && _jt.timeBased) {
    rows.push(['Kind', (OTHER_KINDS[e.otherKind]||OTHER_KINDS.MEETING).label]);
    rows.push(['Duration', u(e.hours || e.quantity || 1) + ' hours']);
  } else {
    rows.push(['Quantity', e.quantity + ' pieces']);
  }
  rows.push(['Date', fmtDate(e.date)]);
  if (!_jt.timeBased && e.isRevision) {
    rows.push(['Type', `Revision · round ${e.revisionRound||1}`]);
    rows.push(['Severity', SEVERITY[e.revisionSeverity]?.label || '—']);
    rows.push(['Cause', CAUSE[e.revisionCause]?.label || '—']);
  } else if (!_jt.timeBased) rows.push(['Type', 'New work']);
  if (e.motionScenes>0) rows.push(['Motion', `${e.motionScenes} scenes (+${u(e.motionScenes)})`]);
  const conds = [];
  if (e.conditionBriefIncomplete) conds.push('Brief incomplete');
  if (e.conditionAssetNotProvided) conds.push('Sourced assets');
  if (e.conditionDeadlineRush) conds.push('Rush deadline');
  if (conds.length) rows.push(['Conditions', conds.join(', ')]);

  const m = mountOverlay('detailModal');
  m.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet">
      <div class="dm-grab"></div>
      <div class="dm-head">
        <div class="dm-cli"><span class="av ${avatarClass(e.clientId)}">${clientInitials(e.clientId)}</span>
          <div><b>${clientName(e.clientId)}</b><small>${fmtDate(e.date)}</small></div>
        </div>
        <div class="dm-units"><b class="tnum">${u(c.final)}</b><small>${c.overridden?'override':'units'}</small></div>
      </div>
      ${isScope(e)?`<div class="dm-scope">${ic('triangle-alert')} Flagged as scope creep — appears in your evidence log.</div>`:''}
      <div class="dm-rows">
        ${rows.map(r=>`<div class="dm-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}
      </div>
      <div class="dm-breakdown">
        <div class="dm-bt">Workload breakdown</div>
        ${c.lines.map(l=>`<div class="dm-bl ${l.muted?'muted':''}"><span>${l.label}</span><span class="tnum">${l.val===0?'0.0':'+'+u(l.val)}</span></div>`).join('')}
        ${c.overridden?`<div class="dm-bl ov"><span>Manual override · calc was ${u(c.calculated)}</span><span class="tnum">${u(c.final)}</span></div>`:''}
        <div class="dm-bl total"><span>Total</span><span class="tnum">${u(c.final)} units</span></div>
      </div>
      ${e.note?`<div class="dm-note"><span>Note</span>${e.note}</div>`:''}
      ${hasThread(e)?`<div class="dm-thread"><div class="dm-bt">Revision thread</div>${threadOf(e).map((te,i)=>`
        <div class="dm-tr ${te.id===e.id?'cur':''}">
          <span class="dm-tr-dot ${te.isRevision?(isScope(te)?'scope':'rev'):'new'}"></span>
          <span class="dm-tr-lab">${i===0?'Original':('R'+(te.revisionRound||i))} · ${te.isRevision?(SEVERITY[te.revisionSeverity]?.label||''):JOB_TYPES[te.jobType].short}</span>
          <span class="dm-tr-date">${fmtDate(te.date)}</span>
          <span class="tnum dm-tr-u">${u(te._c.final)}</span>
        </div>`).join('')}
        <div class="dm-tr-sum">Thread total <b class="tnum">${u(sum(threadOf(e), t=>t._c.final))}</b> units across ${threadOf(e).length} jobs</div>
      </div>`:''}
      ${e.snap||e.driveLink?`<div class="dm-evid">${e.snap?(e.snap.startsWith('http')||e.snap.startsWith('/')?`<div class="dm-ev-img"><img src="${e.snap}" style="width:100%;border-radius:10px;max-height:200px;object-fit:cover;display:block"></div>`:`<div class="dm-ev"><span class="dm-ev-th">▦</span> ${e.snap}</div>`):''}${e.driveLink?`<div class="dm-ev"><span class="dm-ev-th">${ic('link')}</span> Drive link attached</div>`:''}</div>`:''}
      <div class="dm-actions">
        <button class="btn ghost" id="dmEdit">${ic('pencil')} Edit</button>
        <button class="btn ghost danger" id="dmDelete">${ic('trash-2')} Delete</button>
      </div>
    </div>`;
  m.classList.add('open');
  refreshIcons();
  m.querySelector('.dm-overlay').addEventListener('click', closeDetail);
  let detailBusy = false; // guard against rapid double-taps on edit/delete
  m.querySelector('#dmEdit').addEventListener('click', () => {
    if (detailBusy) return; detailBusy = true;
    draft = Object.assign(freshDraft(), {
      clientId: e.clientId,
      jobType: e.jobType,
      otherKind: e.otherKind || 'MEETING',
      quantity: e.quantity || 1,
      hours: e.hours || e.quantity || 1,
      isRevision: !!e.isRevision,
      revisionRound: e.revisionRound || 1,
      revisionSeverity: e.revisionSeverity || 'STANDARD',
      revisionCause: e.revisionCause || null,
      motionOn: (e.motionScenes || 0) > 0,
      motionScenes: e.motionScenes || 1,
      conditionBriefIncomplete: !!e.conditionBriefIncomplete,
      conditionAssetNotProvided: !!e.conditionAssetNotProvided,
      conditionDeadlineRush: !!e.conditionDeadlineRush,
      manualOverride: e.manualOverride,
      manualOverrideReason: e.manualOverrideReason || '',
      note: e.note || '',
      driveLink: e.driveLink || '',
      snap: e.snap || null,
      isFlagged: !!e.isFlagged,
      flagNote: e.flagNote || '',
      isStarred: !!e.isStarred,
      parentId: e.parentId || null,
      editId: e.id,
    });
    saveDraft();
    closeDetail();
    go('entry');
    toast('Entry loaded into the form', 'info');
  });
  m.querySelector('#dmDelete').addEventListener('click', async () => {
    if (detailBusy) return; detailBusy = true;
    const idx = ENTRIES.findIndex(x=>x.id===id);
    if (idx<0) { closeDetail(); return; }
    const removed = ENTRIES[idx];
    // Optimistic: remove from memory + UI right away so the sheet can't hang and
    // can't be tapped again. Roll back only if the server delete fails.
    ENTRIES.splice(idx,1);
    markSyncing();
    closeDetail();
    go(currentScreen);
    try {
      if (window.WLStore && window.WLStore.deleteEntry) await window.WLStore.deleteEntry(id);
      markSynced();
      undoToast('Entry deleted', async () => {
        try {
          const restored = window.WLStore && window.WLStore.saveEntry
            ? await window.WLStore.saveEntry(removed)
            : removed;
          if (!ENTRIES.find(x => x.id === restored.id)) ENTRIES.splice(Math.min(idx, ENTRIES.length), 0, restored);
          markSynced();
          go(currentScreen);
        } catch (err) {
          console.error(err);
          toast('Could not restore entry. Try again.', 'info');
        }
      });
    } catch (err) {
      console.error(err);
      // rollback the optimistic removal
      if (!ENTRIES.find(x => x.id === removed.id)) ENTRIES.splice(Math.min(idx, ENTRIES.length), 0, removed);
      markSynced();
      go(currentScreen);
      toast('Could not delete entry. Try again.', 'info');
    }
  });
}
function closeDetail() { const m=document.getElementById('detailModal'); if(m) m.classList.remove('open'); }

/* ---- undo toast (soft delete) ---- */
function undoToast(msg, onUndo) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; }
  overlayHost().appendChild(t);
  t.innerHTML = `${ic('trash-2')}<span>${msg}</span><button class="toast-undo" id="undoBtn">${ic('undo-2')} Undo</button>`;
  t.className = 'show info has-action';
  refreshIcons();
  clearTimeout(window._tt);
  const done = () => { t.className = ''; };
  window._tt = setTimeout(done, 5000);
  t.querySelector('#undoBtn').addEventListener('click', () => { clearTimeout(window._tt); onUndo(); done(); });
}

/* ---- mobile side menu ---- */
function openMenu() {
  const el = mountOverlay('menuSheet');
  const items = [
    ['stats', 'chart-no-axes-column', 'My stats', 'Your effort, by client'],
    ['report', 'file-text', 'Report', 'Export PDF & evidence'],
    ['clients', 'contact', 'Clients', 'Difficulty & history'],
    ['settings', 'settings', 'Settings', 'Rates, capacity, team'],
    ['help', 'circle-help', 'Help', 'How the math works'],
  ];
  el.innerHTML = `
    <div class="ms-overlay"></div>
    <div class="ms-panel">
      <div class="ms-head"><span class="av">${SETTINGS.userName.split(/\s+/).map(w=>w[0]).filter(Boolean).slice(0,2).join('').toUpperCase()}</span><div><b>${SETTINGS.userName}</b><small>${u(SETTINGS.dailyMax)} units / day</small></div></div>
      <div class="ms-install">
        <img src="${window.WL_ICON||'icons/icon-192.png'}" alt="WorkLog" class="ms-app-icon">
        <div class="ms-install-txt"><b>Install WorkLog</b><small>Add to your home screen — full-screen, no browser bar</small></div>
        <button class="ms-install-btn" id="msInstall">${ic('download')}</button>
      </div>
      <div class="ms-list">
        ${items.map(it=>`<button class="ms-item" data-go="${it[0]}"><span class="ms-ic">${ic(it[1])}</span><span><b>${it[2]}</b><small>${it[3]}</small></span>${ic('chevron-right')}</button>`).join('')}
      </div>
      <button class="ms-replay" id="msReplay">${ic('play')} Replay the intro</button>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  el.querySelector('.ms-overlay').addEventListener('click', closeMenu);
  el.querySelectorAll('[data-go]').forEach(b=>b.addEventListener('click',()=>{ closeMenu(); go(b.dataset.go); }));
  el.querySelector('#msReplay').addEventListener('click', ()=>{ closeMenu(); openOnboarding(); });
  el.querySelector('#msInstall').addEventListener('click', requestInstall);
}
function closeMenu() { const el=document.getElementById('menuSheet'); if(el) el.classList.remove('open'); }

/* ---- PWA install (the prompt lives on the parent window, so we relay) ---- */
function isStandalone() {
  return window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
}
function isIOS() {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1); // iPadOS
}
function showInstallSteps(steps) {
  const el = mountOverlay('detailModal');
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet" style="max-width:420px">
      <div class="dm-grab"></div>
      <div class="ask-head">${ic('download')}<div><b>Install WorkLog</b><small>Add it to your home screen for full-screen access.</small></div></div>
      <div class="ask-body">
        <ol style="margin:0;padding-left:18px;display:flex;flex-direction:column;gap:10px;font-size:14px;line-height:1.5">
          ${steps.map(s=>`<li>${s}</li>`).join('')}
        </ol>
      </div>
      <button class="btn full lg" id="instOk">${ic('check')} Got it</button>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  const close = () => el.classList.remove('open');
  el.querySelector('.dm-overlay').addEventListener('click', close);
  el.querySelector('#instOk').addEventListener('click', close);
}
function requestInstall() {
  closeMenu();
  if (isStandalone()) { toast('WorkLog is already installed 🎉', 'good'); return; }
  if (isIOS()) {
    showInstallSteps([
      `Tap the <b>Share</b> button ${ic('upload')} in Safari's toolbar`,
      `Scroll down and choose <b>“Add to Home Screen”</b>`,
      `Tap <b>Add</b> — WorkLog appears on your home screen`,
    ]);
    return;
  }
  // Android / desktop Chrome-family: ask the parent window to fire the native prompt
  window.parent && window.parent.postMessage({ type: 'WL_INSTALL_REQUEST' }, window.location.origin);
}
window.addEventListener('message', (e) => {
  if (e.origin !== window.location.origin) return;
  const t = e.data && e.data.type;
  if (t === 'WL_INSTALL_UNAVAILABLE') {
    showInstallSteps([
      `Open your browser menu <b>⋮</b> (top-right)`,
      `Choose <b>“Install WorkLog”</b> or <b>“Add to Home screen”</b>`,
      `If you don't see it, the app may already be installed`,
    ]);
  } else if (t === 'WL_INSTALLED') {
    toast('WorkLog installed 🎉', 'good');
  }
});

/* ---- Tweaks bridge (driven by the React tweaks island) ---- */
const ACCENTS = {
  Indigo: 278, Plum: 322, Teal: 196, Slate: 256,
};
function applyTweaks(t) {
  const root = document.documentElement.style;
  const h = ACCENTS[t.accent] != null ? ACCENTS[t.accent] : 278;
  const c = t.accent === 'Slate' ? 0.05 : 0.125;
  root.setProperty('--primary', `oklch(0.45 ${c} ${h})`);
  root.setProperty('--primary-600', `oklch(0.4 ${c} ${h})`);
  root.setProperty('--primary-700', `oklch(0.34 ${c*0.95} ${h})`);
  root.setProperty('--primary-soft', `oklch(0.95 ${c*0.25} ${h})`);
  root.setProperty('--primary-tint', `oklch(0.965 ${c*0.16} ${h})`);

  if (t.mode) applyTheme(t.mode === 'Dark' ? 'dark' : 'light');

  if (typeof t.dailyMax === 'number' && t.dailyMax !== SETTINGS.dailyMax) {
    SETTINGS.dailyMax = t.dailyMax;
  }
  if (t.serifHeads === false) {
    root.setProperty('--serif', "'Hanken Grotesk', sans-serif");
  } else {
    root.setProperty('--serif', "'Instrument Serif', Georgia, serif");
  }
  if (currentScreen) go(currentScreen);
}

/* ---- theme (light / dark) ---- */
function applyTheme(t) {
  document.body.dataset.theme = t;
  document.querySelectorAll('.ab-theme i').forEach(i => i.setAttribute('data-lucide', t==='dark'?'sun':'moon'));
  try { localStorage.setItem('wl_theme', t); } catch(e){}
  refreshIcons();
}
function toggleTheme() { applyTheme(document.body.dataset.theme==='dark'?'light':'dark'); }
function initTheme() {
  let t = 'light';
  try { t = localStorage.getItem('wl_theme') || 'light'; } catch(e){}
  applyTheme(t);
}

/* ---- init ---- */
async function init() {
  document.body.dataset.mode = runtimeMode();
  window.addEventListener('resize', syncRuntimeMode);
  if (window.WLStore && window.WLStore.bootstrap) {
    try {
      await window.WLStore.bootstrap();
    } catch (err) {
      console.error('WorkLog bootstrap failed', err);
      const msg = window.WLStoreErrorText ? window.WLStoreErrorText(err) : 'live data failed';
      toast(`Could not load live data: ${msg}`, 'info');
    }
  }
  document.querySelectorAll('#modeSeg button').forEach(b =>
    b.addEventListener('click', () => setMode(b.dataset.mode)));
  document.querySelectorAll('#mNav button, #dNav button').forEach(b =>
    b.addEventListener('click', () => go(b.dataset.nav)));
  const mm = document.getElementById('mMenu');
  if (mm) mm.addEventListener('click', openMenu);
  document.querySelectorAll('#mTheme, #dTheme').forEach(b => b.addEventListener('click', toggleTheme));
  initTheme();
  const dr = document.getElementById('dReplay');
  if (dr) dr.addEventListener('click', openOnboarding);
  document.querySelectorAll('.ab-mark').forEach(b => b.addEventListener('click', ()=>go('home')));
  if (window.initMilestones) initMilestones();
  if (window.setSync) setSync('synced');
  refreshIcons();
  go('home');
  // first-launch onboarding
  let seen = false;
  try { seen = localStorage.getItem('wl_onboarded') === '1'; } catch(e){}
  if (!seen) setTimeout(openOnboarding, 450);
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();

// expose for the React tweaks island
window.WL = { applyTweaks, go: (n)=>go(n), get screen(){ return currentScreen; } };
