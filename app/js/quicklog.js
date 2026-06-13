/* ============================================================
   WorkLog — Quick Log
   Tap how many units today's work was; fill the details later.
   ============================================================ */

const QL_MAX = 24; // sanity ceiling for a single quick entry

function qlClamp(n) {
  if (!isFinite(n) || n < 0) return 0;
  if (n > QL_MAX) return QL_MAX;
  return Math.round(n * 100) / 100;
}

// parse 'YYYY-MM-DD' as a UTC date (timezone-safe — avoids the off-by-one that
// local-time parsing + toISOString() causes in zones like UTC+7)
function qlParse(iso) { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); }

// label a date relative to today (Today / Yesterday / Tomorrow / weekday)
function qlDateLabel(iso) {
  const today = new Date().toISOString().slice(0, 10);
  if (iso === today) return 'Today';
  const diff = Math.round((qlParse(iso) - qlParse(today)) / 86400000);
  if (diff === -1) return 'Yesterday';
  if (diff === 1) return 'Tomorrow';
  return qlParse(iso).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}
function qlShiftDate(iso, days) {
  const d = qlParse(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

let _qlState = null;

function openQuickLog(presetDate) {
  _qlState = { units: 0, date: presetDate || new Date().toISOString().slice(0, 10), busy: false, clientId: null, jobType: null };
  const el = mountOverlay('quickLogSheet');
  el.innerHTML = qlMarkup();
  el.classList.add('open');
  refreshIcons();
  qlWire(el);
}
function closeQuickLog() { const el = document.getElementById('quickLogSheet'); if (el) el.classList.remove('open'); }

function qlMarkup() {
  const s = _qlState;
  return `
    <div class="dm-overlay" data-ql-close></div>
    <div class="dm-sheet ql-sheet">
      <div class="dm-grab"></div>
      <div class="ql-head">
        <div class="ql-ic">${ic('zap')}</div>
        <div><b>Quick log</b><small>Tap the units now — add the rest later</small></div>
      </div>

      <div class="ql-date">
        <button class="ql-day" id="qlPrev" aria-label="Previous day">${ic('chevron-left')}</button>
        <span class="ql-day-lab" id="qlDayLab">${qlDateLabel(s.date)}</span>
        <button class="ql-day" id="qlNext" aria-label="Next day">${ic('chevron-right')}</button>
      </div>

      <div class="ql-dial">
        <button class="ql-step minus" data-d="-1">−1</button>
        <button class="ql-step minus" data-d="-0.5">−.5</button>
        <button class="ql-step minus" data-d="-0.25">−.25</button>
      </div>
      <div class="ql-num-wrap">
        <input id="qlNum" class="ql-num" type="number" inputmode="decimal" step="0.25" min="0" value="0">
        <span class="ql-num-unit">units</span>
      </div>
      <div class="ql-dial">
        <button class="ql-step plus" data-d="0.25">+.25</button>
        <button class="ql-step plus" data-d="0.5">+.5</button>
        <button class="ql-step plus" data-d="1">+1</button>
      </div>

      <div class="ql-tag">
        <div class="ql-tag-lab">Tag it <span>optional — skip if you're rushing</span></div>
        ${(() => { const ids = topClientIds(4); return ids.length ? `<div class="ql-chips" id="qlClients">
          ${ids.map(id => { const c = CLIENTS.find(x => x.id === id); return c ? `<button class="ql-chip" data-qlclient="${id}"><span class="av ${avatarClass(id)}">${clientInitials(id)}</span>${escHtml(c.name)}</button>` : ''; }).join('')}
        </div>` : ''; })()}
        <div class="ql-chips" id="qlTypes">
          ${Object.entries(JOB_TYPES).filter(([k, v]) => !v.quick && !v.motion && !v.set && !v.timeBased).map(([k, v]) => `<button class="ql-chip" data-qltype="${k}">${escHtml(v.short)}</button>`).join('')}
        </div>
      </div>

      <button class="btn full lg ql-save" id="qlSave" disabled>${ic('zap')} Log <span id="qlSaveN">0</span> units</button>
      <button class="btn ghost full ql-details" id="qlDetails" disabled>${ic('list-plus')} Add full details</button>
    </div>`;
}

function qlSyncUI(el) {
  const s = _qlState;
  const n = el.querySelector('#qlNum');
  // show "0" (not blank) when empty so the field never looks like it vanished
  if (document.activeElement !== n) n.value = s.units ? u(s.units) : '0';
  el.querySelector('#qlDayLab').textContent = qlDateLabel(s.date);
  el.querySelector('#qlSaveN').textContent = u(s.units);
  const ok = s.units > 0 && !s.busy;
  el.querySelector('#qlSave').disabled = !ok;
  el.querySelector('#qlDetails').disabled = !ok;
}

function qlWire(el) {
  const s = _qlState;
  el.querySelector('[data-ql-close]').addEventListener('click', closeQuickLog);
  el.querySelector('#qlPrev').addEventListener('click', () => { s.date = qlShiftDate(s.date, -1); qlSyncUI(el); });
  el.querySelector('#qlNext').addEventListener('click', () => { s.date = qlShiftDate(s.date, 1); qlSyncUI(el); });

  el.querySelectorAll('.ql-step').forEach(b => b.addEventListener('click', () => {
    s.units = qlClamp(s.units + parseFloat(b.dataset.d));
    qlSyncUI(el);
    if (b.classList.contains('plus')) burst(b, 'star');
  }));

  const num = el.querySelector('#qlNum');
  num.addEventListener('input', () => { s.units = qlClamp(parseFloat(num.value)); el.querySelector('#qlSaveN').textContent = u(s.units); const ok = s.units > 0; el.querySelector('#qlSave').disabled = !ok; el.querySelector('#qlDetails').disabled = !ok; });
  num.addEventListener('blur', () => qlSyncUI(el));
  num.addEventListener('keydown', (e) => { if (e.key === 'Enter') { num.blur(); el.querySelector('#qlSave').click(); } });

  // optional tags — single-select client + job type (re-tap to clear)
  el.querySelectorAll('[data-qlclient]').forEach(b => b.addEventListener('click', () => {
    const id = b.dataset.qlclient; s.clientId = (s.clientId === id) ? null : id;
    el.querySelectorAll('[data-qlclient]').forEach(x => x.classList.toggle('on', x.dataset.qlclient === s.clientId));
  }));
  el.querySelectorAll('[data-qltype]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.qltype; s.jobType = (s.jobType === k) ? null : k;
    el.querySelectorAll('[data-qltype]').forEach(x => x.classList.toggle('on', x.dataset.qltype === s.jobType));
  }));

  el.querySelector('#qlSave').addEventListener('click', () => qlCommit(el, false));
  el.querySelector('#qlDetails').addEventListener('click', () => qlCommit(el, true));

  qlSyncUI(el); // normalise the opening state (number shows 0, buttons disabled)
}

async function qlCommit(el, thenDetails) {
  const s = _qlState;
  if (s.busy || s.units <= 0) return;
  s.busy = true;
  qlSyncUI(el);
  const saveBtn = el.querySelector('#qlSave');
  saveBtn.classList.add('loading');

  // tagged with BOTH client + type → a complete entry; otherwise a units-only
  // QUICK draft (keeping any client tag so "add details" is pre-filled)
  const complete = s.clientId && s.jobType;
  const jt = complete ? s.jobType : 'QUICK';
  const eff = Object.assign(freshDraft(), {
    clientId: s.clientId || null, jobType: jt, quantity: 1,
    manualOverride: s.units, manualOverrideReason: 'Quick log', date: s.date,
  });
  eff._c = calcUnits(eff);

  if (window.markSyncing) markSyncing();
  let saved = eff;
  try {
    if (window.WLStore && window.WLStore.saveEntry) {
      saved = await window.WLStore.saveEntry(eff); // adapter unshifts into ENTRIES + sets _c
    } else {
      eff.id = 'e' + (++_eid); ENTRIES.unshift(eff); saved = eff;
    }
    if (window.markSynced) markSynced();
  } catch (err) {
    console.error(err);
    s.busy = false; saveBtn.classList.remove('loading'); qlSyncUI(el);
    if (window.markSynced) markSynced();
    const msg = window.WLStoreErrorText ? window.WLStoreErrorText(err) : 'check connection and try again';
    toast(`Could not save: ${msg}`, 'info');
    return;
  }

  window.NEW_ENTRY_ID = saved.id;
  closeQuickLog();

  if (thenDetails) {
    completeQuickEntry(saved);
    return;
  }
  toast(jt === 'QUICK' ? `Logged ${u(s.units)} units — add details whenever` : `Logged ${u(s.units)} units`, 'good');
  go(currentScreen === 'entry' ? 'home' : currentScreen);
}

/* ---- compact detail sheet for a quick entry (tapped from a card) ---- */
function openQuickDetail(e) {
  const m = mountOverlay('detailModal');
  const mine = isMine(e);
  m.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet">
      <div class="dm-grab"></div>
      <div class="ql-detail-head">
        <span class="av av-quick lg">${ic('zap')}</span>
        <div><b>Quick log</b><small>${fmtDate(e.date)}</small></div>
        <div class="dm-units"><b class="tnum">${u(e._c.final)}</b><small>units</small></div>
      </div>
      <div class="ql-detail-note">${ic('circle-dashed')} You jotted the units — add the client and job type so it counts properly in reports.</div>
      ${mine ? `<button class="btn full lg" id="qdDetails">${ic('list-plus')} Add details</button>
        <button class="btn ghost full danger" id="qdDelete">${ic('trash-2')} Delete</button>`
        : `<div class="dm-byline">${ic('users-round')} Logged by a teammate · view only</div>`}
    </div>`;
  m.classList.add('open');
  refreshIcons();
  m.querySelector('.dm-overlay').addEventListener('click', closeDetail);
  let busy = false;
  const dt = m.querySelector('#qdDetails');
  if (dt) dt.addEventListener('click', () => { if (busy) return; busy = true; closeDetail(); completeQuickEntry(e); });
  const del = m.querySelector('#qdDelete');
  if (del) del.addEventListener('click', async () => {
    if (busy) return; busy = true;
    const idx = ENTRIES.findIndex(x => x.id === e.id);
    if (idx < 0) { closeDetail(); return; }
    const removed = ENTRIES[idx];
    ENTRIES.splice(idx, 1);
    if (window.markSyncing) markSyncing();
    closeDetail();
    go(currentScreen);
    try {
      if (window.WLStore && window.WLStore.deleteEntry) await window.WLStore.deleteEntry(e.id);
      if (window.markSynced) markSynced();
      toast('Quick log deleted', 'info');
    } catch (err) {
      console.error(err);
      if (!ENTRIES.find(x => x.id === removed.id)) ENTRIES.splice(Math.min(idx, ENTRIES.length), 0, removed);
      if (window.markSynced) markSynced();
      go(currentScreen);
      toast('Could not delete. Try again.', 'info');
    }
  });
}

// load a quick entry into the full form to fill client / job type;
// the units the person tapped are carried over as a manual override.
function completeQuickEntry(e) {
  draft = Object.assign(freshDraft(), {
    clientId: null,
    jobType: null,
    quantity: 1,
    manualOverride: e._c.final,
    manualOverrideReason: 'Logged via Quick log',
    date: e.date,
    editId: e.id,
    fromQuick: true,
  });
  saveDraft();
  go('entry');
  toast(`Pick the client & type — your ${u(e._c.final)} units are kept`, 'info');
}
