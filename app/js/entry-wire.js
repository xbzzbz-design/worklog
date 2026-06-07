/* ============================================================
   WorkLog — New Entry form wiring
   ============================================================ */

function wireEntry(root) {
  const $ = (s) => root.querySelector(s);
  const $$ = (s) => Array.from(root.querySelectorAll(s));

  /* --- STEP 1 client --- */
  const trigger = $('#clientTrigger');
  const menu = $('#clientMenu');
  trigger.addEventListener('click', () => { menu.hidden = !menu.hidden; if(!menu.hidden) $('#clientSearch').focus(); });
  // close-on-outside-click: register ONE global handler that reads live elements (avoids stale-node errors)
  if (!window._clientMenuCloser) {
    window._clientMenuCloser = (e) => {
      const sel = document.getElementById('clientSelect');
      const m = document.getElementById('clientMenu');
      if (sel && m && !sel.contains(e.target)) m.hidden = true;
    };
    document.addEventListener('click', window._clientMenuCloser);
  }
  $('#clientSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    $$('#clientList .opt').forEach(o => {
      const name = CLIENTS.find(c=>c.id===o.dataset.client).name.toLowerCase();
      o.style.display = name.includes(q) ? '' : 'none';
    });
  });
  $$('#clientList .opt').forEach(o => o.addEventListener('click', () => {
    draft.clientId = o.dataset.client;
    $('#clientTrigger .ct-val').innerHTML = `<span class="av ${avatarClass(draft.clientId)}" style="width:24px;height:24px;border-radius:7px;font-size:10px;display:inline-grid;place-items:center;vertical-align:middle;margin-right:8px">${clientInitials(draft.clientId)}</span>${clientName(draft.clientId)}`;
    $('#clientTrigger .ct-val').classList.remove('faint');
    menu.hidden = true;
    refreshIcons();
    saveDraft(); syncThreadPicker();
  }));
  $('.add-client').addEventListener('click', () => openClientCreate((client) => {
    draft.clientId = client.id;
    saveDraft();
    rerenderScreen('entry');
  }));

  const fresh = $('#draftFresh');
  if (fresh) fresh.addEventListener('click', () => { clearDraft(); draft = freshDraft(); rerenderScreen('entry'); });

  /* --- STEP 2 job type --- */
  $$('#jtGrid .jt-card').forEach(card => card.addEventListener('click', () => {
    $$('#jtGrid .jt-card').forEach(c=>c.classList.remove('on'));
    card.classList.add('on');
    draft.jobType = card.dataset.jt;
    if (isTimeBased()) draft.isRevision = false;
    syncJobMode(root);
    updateSummary();
  }));

  /* --- kind chips (meeting / advisory / admin / other) --- */
  $$('#otherKind .kind-chip').forEach(c => c.addEventListener('click', () => {
    $$('#otherKind .kind-chip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on');
    draft.otherKind = c.dataset.kind;
    updateSummary();
  }));

  /* --- STEP 3 quantity / hours --- */
  $$('#qtyStepper .step-btn').forEach(b => b.addEventListener('click', () => {
    const dir = parseInt(b.dataset.q);
    if (isTimeBased()) {
      draft.hours = Math.max(0.5, Math.round((draft.hours + dir * 0.5) * 2) / 2);
      $('#qtyVal').textContent = u(draft.hours);
    } else {
      draft.quantity = Math.max(1, draft.quantity + dir);
      $('#qtyVal').textContent = draft.quantity;
    }
    updateSummary();
  }));

  /* --- STEP 4 new/revision --- */
  $$('#revToggle .bt').forEach(b => b.addEventListener('click', () => {
    $$('#revToggle .bt').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    draft.isRevision = b.dataset.rev === '1';
    $('#revDetail').hidden = !draft.isRevision;
    if (draft.isRevision && !draft.revisionCause) draft.revisionCause = null;
    syncThreadPicker();
    syncConditions(root);
    updateSummary();
  }));
  $$('#roundRow .chip').forEach(c => c.addEventListener('click', () => {
    $$('#roundRow .chip').forEach(x=>x.classList.remove('on'));
    c.classList.add('on'); draft.revisionRound = parseInt(c.dataset.round); saveDraft();
  }));
  $$('#sevGrid .sev').forEach(s => s.addEventListener('click', () => {
    $$('#sevGrid .sev').forEach(x=>x.classList.remove('on'));
    s.classList.add('on'); draft.revisionSeverity = s.dataset.sev; updateSummary();
  }));
  $$('#causeList .cause').forEach(c => c.addEventListener('click', () => {
    $$('#causeList .cause').forEach(x=>x.classList.remove('on'));
    c.classList.add('on');
    draft.revisionCause = c.dataset.cause;
    syncCauseNote();
    syncConditions(root);
    updateSummary();
  }));

  /* --- STEP 5 motion --- */
  $$('#motionToggle .bt').forEach(b => b.addEventListener('click', () => {
    $$('#motionToggle .bt').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    draft.motionOn = b.dataset.m === '1';
    $('#motionDetail').hidden = !draft.motionOn;
    updateSummary();
  }));
  $$('#sceneStepper .step-btn').forEach(b => b.addEventListener('click', () => {
    draft.motionScenes = Math.max(1, draft.motionScenes + parseInt(b.dataset.s));
    $('#sceneVal').textContent = draft.motionScenes;
    $('#sceneAdd').textContent = u(draft.motionScenes);
    updateSummary();
  }));

  /* --- STEP 6 conditions --- */
  $$('#condChecks .check').forEach(c => c.addEventListener('click', () => {
    if (c.classList.contains('disabled')) { toast('Already counted in the revision cause', 'info'); return; }
    c.classList.toggle('on');
    draft[c.dataset.cond] = c.classList.contains('on');
    updateSummary();
  }));

  /* --- STEP 7 override --- */
  $('#overrideToggle').addEventListener('click', () => {
    const box = $('#overrideBox');
    box.hidden = !box.hidden;
    $('#overrideToggle').classList.toggle('on', !box.hidden);
    if (box.hidden) { draft.manualOverride = null; draft.manualOverrideReason=''; $('#ovVal').value=''; $('#ovReason').value=''; updateSummary(); }
  });
  $('#ovVal').addEventListener('input', (e) => {
    const v = parseFloat(e.target.value);
    draft.manualOverride = isNaN(v) ? null : v;
    updateSummary();
  });
  $('#ovReason').addEventListener('input', (e) => { draft.manualOverrideReason = e.target.value; });

  /* --- STEP 8 note --- */
  $('#noteField').addEventListener('input', (e) => { draft.note = e.target.value; saveDraft(); });

  /* --- STEP 9 evidence --- */
  $('#snapBtn').addEventListener('click', () => {
    draft.snap = 'Quick snap · 92 KB';
    showSnapPreview($, draft.snap, 'image', 'Snap captured', '600px thumbnail · 92 KB');
    saveDraft();
    toast('Snap compressed to 92 KB');
  });
  $('#uploadBtn').addEventListener('click', () => {
    draft.snap = 'Uploaded · banner_final.png';
    showSnapPreview($, draft.snap, 'file-image', 'banner_final.png', '600px thumbnail · 78 KB');
    saveDraft();
    toast('Image compressed to 78 KB');
  });
  $('#driveField').addEventListener('input', (e)=>{ draft.driveLink = e.target.value; saveDraft(); });

  /* --- STEP 10 flag / star --- */
  $('#flagBtn').addEventListener('click', () => {
    draft.isFlagged = !draft.isFlagged;
    $('#flagBtn').classList.toggle('on', draft.isFlagged);
    if (draft.isFlagged) burst($('#flagBtn'), 'flag');
    $('#flagNoteWrap').hidden = !draft.isFlagged;
    saveDraft();
  });
  $('#flagNoteField') && $('#flagNoteField').addEventListener('input', (e)=>{ draft.flagNote=e.target.value; saveDraft(); });
  $('#starBtn').addEventListener('click', () => {
    draft.isStarred = !draft.isStarred;
    $('#starBtn').classList.toggle('on', draft.isStarred);
    if (draft.isStarred) burst($('#starBtn'), 'star');
    saveDraft();
  });

  /* --- SAVE --- */
  $('#saveBtn').addEventListener('click', async () => {
    if (!draft.clientId) { toast('Pick a client first', 'info'); $('#clientTrigger').classList.add('shake'); setTimeout(()=>$('#clientTrigger').classList.remove('shake'),500); return; }
    if (!draft.jobType) { toast('Pick a job type', 'info'); return; }
    if (draft.isRevision && !draft.revisionCause) { toast('Choose a revision cause', 'info'); return; }
    if (draft.manualOverride != null && !draft.manualOverrideReason.trim()) { toast('Override needs a reason', 'info'); $('#ovReason').focus(); return; }

    const eff = Object.assign({}, draft, { motionScenes: draft.motionOn ? draft.motionScenes : 0, flagNote: draft.flagNote });
    eff.date = new Date().toISOString().slice(0, 10);
    eff._c = calcUnits(eff);
    const btn = $('#saveBtn');
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      const saved = window.WLStore && window.WLStore.saveEntry
        ? (draft.editId && window.WLStore.updateEntry
          ? await window.WLStore.updateEntry(draft.editId, eff)
          : await window.WLStore.saveEntry(eff))
        : (() => {
          if (draft.editId) {
            eff.id = draft.editId;
            const idx = ENTRIES.findIndex(e => e.id === draft.editId);
            if (idx >= 0) ENTRIES.splice(idx, 1, eff); else ENTRIES.unshift(eff);
            return eff;
          }
          eff.id = 'e' + (++_eid); ENTRIES.unshift(eff); return eff;
        })();
      if (window.NEW_ENTRY_ID !== undefined) window.NEW_ENTRY_ID = saved.id;
      eff.id = saved.id;
    } catch (err) {
      console.error(err);
      btn.disabled = false;
      btn.classList.remove('loading');
      const msg = window.WLStoreErrorText ? window.WLStoreErrorText(err) : 'check connection and try again';
      toast(`Could not save: ${msg}`, 'info');
      return;
    }

    clearDraft();
    markSynced();
    toast(savedMessage(eff._c.final));
    draft = freshDraft();
    const achieved = (window.checkMilestones ? checkMilestones() : []);
    setTimeout(()=> { go('home'); if (achieved.length) setTimeout(()=>celebrate(achieved[0]), 500); }, 650);
  });

  // restore snapshot preview + cause note + thread picker for a resumed draft
  if (draft.snap) showSnapPreview($, draft.snap, 'image', 'Attached evidence', draft.snap);
  syncCauseNote();
  syncThreadPicker();
  syncConditions(root);
  syncJobMode(root);
  updateSummary();
  refreshIcons();
}

function syncConditions(root) {
  const briefBtn = root.querySelector('#condChecks .check[data-cond="conditionBriefIncomplete"]');
  if (!briefBtn) return;
  const clash = draft.isRevision && draft.revisionCause === 'BRIEF_INCOMPLETE';
  const plus = briefBtn.querySelector('.cplus');
  if (clash) {
    draft.conditionBriefIncomplete = false;
    briefBtn.classList.remove('on');
    briefBtn.classList.add('disabled');
    if (plus) plus.textContent = 'in cause';
  } else {
    briefBtn.classList.remove('disabled');
    if (plus) plus.textContent = `+${u(SETTINGS.addOn)}`;
  }
}

function showSnapPreview($, val, icon, title, sub) {
  const p = $('#snapPreview'); if (!p) return;
  p.hidden = false;
  p.innerHTML = `<div class="snap-card"><div class="snap-thumb">${ic(icon)}</div><div><b>${title}</b><small>${sub}</small></div><button class="snap-x" id="snapX">${ic('x')}</button></div>`;
  refreshIcons();
  p.querySelector('#snapX').addEventListener('click', ()=>{ draft.snap=null; p.hidden=true; saveDraft(); });
}

function syncCauseNote() {
  const noteEl = document.getElementById('causeNote'); if (!noteEl) return;
  const meta = draft.revisionCause ? CAUSE[draft.revisionCause] : null;
  if (meta && !meta.counts) { noteEl.hidden=false; noteEl.className='cause-note muted'; noteEl.innerHTML = `${ic('info')} This revision won't count toward your workload — honest logging keeps your report credible.`; }
  else if (meta && meta.scope) { noteEl.hidden=false; noteEl.className='cause-note warn'; noteEl.innerHTML = `${ic('triangle-alert')} This will appear in your Scope Flag Log as evidence.`; }
  else { noteEl.hidden = true; }
  refreshIcons();
}

function syncThreadPicker() {
  const wrap = document.getElementById('threadPick'); if (!wrap) return;
  const label = wrap.previousElementSibling;
  const show = draft.isRevision;
  wrap.style.display = show ? '' : 'none';
  if (label && label.classList.contains('sublabel')) label.style.display = show ? '' : 'none';
  if (!show) { draft.parentId = null; return; }
  if (!draft.clientId) { wrap.innerHTML = `<div class="thread-empty">Choose a client to link the original job.</div>`; return; }
  const cands = linkCandidates(draft.clientId);
  wrap.innerHTML = `<button class="thread-opt ${draft.parentId==null?'on':''}" data-parent="">${ic('circle-dashed')} <span class="to-name">Not linked</span></button>` +
    (cands.length ? cands.map(e=>{
      const revs = ENTRIES.filter(x=>x.parentId===e.id);
      const desc = e.note ? e.note : `${JOB_TYPES[e.jobType].label}`;
      return `<button class="thread-opt rich ${draft.parentId===e.id?'on':''}" data-parent="${e.id}">
        <span class="to-dot" style="background:${JOB_TYPES[e.jobType].color}"></span>
        <span class="to-main">
          <span class="to-title">${JOB_TYPES[e.jobType].short} · ×${e.quantity}<span class="to-date">${fmtDate(e.date)}</span></span>
          <span class="to-desc">${desc}</span>
        </span>
        <span class="to-meta">${revs.length?`<span class="to-revs">${ic('rotate-ccw')} ${revs.length}</span>`:''}<b class="tnum">${u(e._c.final)}</b></span>
      </button>`;
    }).join('') : `<div class="thread-empty">No earlier jobs for this client yet.</div>`);
  refreshIcons();
  wrap.querySelectorAll('[data-parent]').forEach(b=>b.addEventListener('click',()=>{
    draft.parentId = b.dataset.parent || null; saveDraft(); syncThreadPicker();
    if (draft.parentId) showThreadPreview(draft.parentId);
    else { const pv=document.getElementById('threadPreview'); if (pv) pv.remove(); }
  }));
  const pv = document.getElementById('threadPreview');
  if (pv && draft.parentId) showThreadPreview(draft.parentId);
}

function showThreadPreview(pid) {
  let pv = document.getElementById('threadPreview');
  const wrap = document.getElementById('threadPick');
  if (!wrap) return;
  if (!pv) { pv = document.createElement('div'); pv.id = 'threadPreview'; pv.className = 'thread-preview'; wrap.after(pv); }
  const root = ENTRIES.find(x=>x.id===pid); if (!root) { pv.remove(); return; }
  const revs = ENTRIES.filter(x=>x.parentId===pid).sort((a,b)=>(a.revisionRound||0)-(b.revisionRound||0));
  const chain = [root, ...revs];
  pv.innerHTML = `<div class="tp-h">${ic('git-merge')} Revision history · <b>this will be round ${revs.length+1}</b></div>
    <div class="tp-chain">
      ${chain.map((t,i)=>`<span class="tp-node ${t.isRevision?(isScope(t)?'scope':'rev'):'orig'}">${i===0?'Original':'R'+(t.revisionRound||i)}</span>`).join('<span class="tp-line"></span>')}
      <span class="tp-line"></span><span class="tp-node next">R${revs.length+1}</span>
    </div>`;
  refreshIcons();
}

const SAVE_MSGS = [
  'Logged. That’s on the record now.',
  'Saved — your effort is counted.',
  'Nice. Another piece of proof banked.',
  'Done. Future-you will thank you.',
  'Logged it. No one can argue with this.',
];
function savedMessage(units) {
  const m = SAVE_MSGS[Math.floor(Math.random() * SAVE_MSGS.length)];
  return `${m} · ${u(units)}u`;
}
