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
    // reset the still/motion choice when the new type doesn't offer it
    if (!(JOB_TYPES[draft.jobType] && JOB_TYPES[draft.jobType].hasMotionVariant)) draft.motionVariant = false;
    syncJobMode(root);
    updateSummary();
  }));

  /* --- still / motion variant (Variation & Adaptation) --- */
  $$('#motionVariantRow .bt').forEach(b => b.addEventListener('click', () => {
    $$('#motionVariantRow .bt').forEach(x=>x.classList.remove('on'));
    b.classList.add('on');
    draft.motionVariant = b.dataset.mv === '1';
    saveDraft();
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

  /* --- MOTION scenes (only shown when the Motion job type is selected) --- */
  const syncMotion = () => {
    const sv = $('#mSimpleVal'); if (sv) sv.textContent = draft.motionSimple || 0;
    const tv = $('#mStandardVal'); if (tv) tv.textContent = draft.motionStandard || 0;
    const rw = $('#mReasonWrap'); if (rw) rw.hidden = !((draft.motionCustom || 0) > 0);
    const mt = $('#motionTotal'); if (mt) mt.textContent = u(motionUnitsOf(draft));
    updateSummary();
  };
  $$('.mtier-step .step-btn').forEach(b => b.addEventListener('click', () => {
    const key = b.dataset.mt === 'standard' ? 'motionStandard' : 'motionSimple';
    draft[key] = Math.max(0, (draft[key] || 0) + parseInt(b.dataset.s));
    syncMotion(); saveDraft();
  }));
  const mCustom = $('#mCustomVal');
  if (mCustom) mCustom.addEventListener('input', () => { draft.motionCustom = Math.max(0, parseFloat(mCustom.value) || 0); syncMotion(); saveDraft(); });
  const mReason = $('#mCustomReason');
  if (mReason) mReason.addEventListener('input', () => { draft.motionCustomReason = mReason.value; saveDraft(); });

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
  // inject hidden file inputs once
  if (!document.getElementById('_snapInput')) {
    const cam = Object.assign(document.createElement('input'), { type:'file', id:'_snapInput', accept:'image/*', capture:'environment', style:'display:none' });
    const fil = Object.assign(document.createElement('input'), { type:'file', id:'_uploadInput', accept:'image/*', style:'display:none' });
    document.body.appendChild(cam);
    document.body.appendChild(fil);
  }

  // Pick a file → square-crop it → compress → upload. The cropper returns a
  // square blob; we then show a thumbnail with a working remove button.
  const handleImageFile = (file) => {
    if (!file) return;
    openCropper(file, async (squareBlob, previewUrl) => {
      const preview = $('#snapPreview');
      if (!preview) return;
      preview.hidden = false;
      preview.innerHTML = `<div class="snap-card"><div class="snap-thumb"><img src="${previewUrl}" style="width:100%;height:100%;object-fit:cover;border-radius:6px"></div><div><b>Uploading…</b><small>compressing</small></div></div>`;
      try {
        const blob = await compressBlob(squareBlob, 50);
        const kb = Math.round(blob.size / 1024);
        const path = await uploadSnap(blob);
        draft.snap = path;
        saveDraft();
        renderSnapPreview(previewUrl, `Attached · ${kb} KB`);
        toast(`Saved · ${kb} KB`, 'good');
      } catch (err) {
        console.error(err);
        clearSnapPreview();
        toast('Could not upload image. Try again.', 'info');
      }
    });
  };

  const snapInput = document.getElementById('_snapInput');
  const uploadInput = document.getElementById('_uploadInput');
  $('#snapBtn').addEventListener('click', () => snapInput.click());
  $('#uploadBtn').addEventListener('click', () => uploadInput.click());
  // assign (not addEventListener) so re-rendering the form never stacks duplicate uploads
  snapInput.onchange = e => { handleImageFile(e.target.files[0]); e.target.value = ''; };
  uploadInput.onchange = e => { handleImageFile(e.target.files[0]); e.target.value = ''; };

  // drag & drop an image anywhere on the evidence area (desktop)
  const evZone = root.querySelector('.evidence');
  if (evZone) {
    ['dragenter','dragover'].forEach(ev => evZone.addEventListener(ev, (e) => { e.preventDefault(); evZone.classList.add('drag'); }));
    ['dragleave','dragend'].forEach(ev => evZone.addEventListener(ev, (e) => { e.preventDefault(); if (e.target === evZone) evZone.classList.remove('drag'); }));
    evZone.addEventListener('drop', (e) => {
      e.preventDefault();
      evZone.classList.remove('drag');
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (!file) return;
      if (file.type && file.type.startsWith('image/')) handleImageFile(file);
      else toast('Please drop an image file', 'info');
    });
  }

  // paste an image straight from the clipboard (e.g. a Mac screenshot: Cmd+V)
  // → runs the same crop → compress → upload flow. A single document-level
  // listener, replaced each render so it never stacks; guarded to the form.
  if (window._wlPasteHandler) document.removeEventListener('paste', window._wlPasteHandler);
  window._wlPasteHandler = (e) => {
    if (currentScreen !== 'entry') return;
    const items = (e.clipboardData && e.clipboardData.items) || [];
    for (const it of items) {
      if (it.type && it.type.startsWith('image/')) {
        const file = it.getAsFile();
        if (file) { e.preventDefault(); toast('Image pasted — crop & save', 'info'); handleImageFile(file); return; }
      }
    }
  };
  document.addEventListener('paste', window._wlPasteHandler);

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
    if (draft.jobType === 'MOTION' && motionUnitsOf(draft) <= 0) { toast('Add at least one motion scene', 'info'); return; }
    if (draft.jobType === 'MOTION' && (draft.motionCustom||0) > 0 && !(draft.motionCustomReason||'').trim()) { toast('Complex motion needs a reason', 'info'); const r=$('#mCustomReason'); if (r) r.focus(); return; }

    const eff = Object.assign({}, draft, { flagNote: draft.flagNote });
    if (eff.jobType !== 'MOTION') { eff.motionSimple = 0; eff.motionStandard = 0; eff.motionCustom = 0; eff.motionCustomReason = ''; }
    // keep the original date when editing / completing a backdated entry; otherwise today
    eff.date = draft.date || new Date().toISOString().slice(0, 10);
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
  if (draft.snap) {
    const isUrl = draft.snap.startsWith('http') || draft.snap.startsWith('/');
    if (isUrl) renderSnapPreview(draft.snap, 'Attached evidence');
    else showSnapPreview($, draft.snap, 'image', 'Attached evidence', draft.snap);
  }
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
  p.querySelector('#snapX').addEventListener('click', ()=>{ clearSnapPreview(); });
}

/* ---- snap preview (image thumbnail) + robust remove ---- */
function clearSnapPreview() {
  const p = document.getElementById('snapPreview');
  if (p) { p.hidden = true; p.innerHTML = ''; }
  draft.snap = null;
  saveDraft();
}
function renderSnapPreview(url, label) {
  const p = document.getElementById('snapPreview');
  if (!p) return;
  p.hidden = false;
  p.innerHTML = `<div class="snap-card">
    <div class="snap-thumb"><img src="${url}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:6px"></div>
    <div><b>${label}</b><small>tap ✕ to remove</small></div>
    <button class="snap-x" id="snapX" aria-label="Remove image">${ic('x')}</button>
  </div>`;
  refreshIcons();
  p.querySelector('#snapX').addEventListener('click', clearSnapPreview);
}

/* ---- compress an already-square blob down to a size target ---- */
function compressBlob(blob, maxKb = 50, out = 600) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = out; canvas.height = out;
      canvas.getContext('2d').drawImage(img, 0, 0, out, out);
      const tryQ = (q) => canvas.toBlob(b => {
        if (!b) { reject(new Error('toBlob failed')); return; }
        if (b.size <= maxKb * 1024 || q <= 0.1) resolve(b);
        else tryQ(Math.round((q - 0.1) * 10) / 10);
      }, 'image/jpeg', q);
      tryQ(0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('image load failed')); };
    img.src = url;
  });
}

/* ---- square crop modal: drag to reposition, slider to zoom ---- */
function openCropper(file, onConfirm) {
  const url = URL.createObjectURL(file);
  const el = mountOverlay('cropModal');
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet" style="max-width:420px">
      <div class="dm-grab"></div>
      <div class="ask-head">${ic('crop')}<div><b>Crop to square</b><small>Drag to move · pinch or slide to zoom</small></div></div>
      <canvas class="crop-canvas" id="cropCanvas"></canvas>
      <div class="crop-zoom-row">${ic('zoom-out')}<input type="range" id="cropZoom" min="1" max="4" step="0.01" value="1">${ic('zoom-in')}</div>
      <div class="dm-actions">
        <button class="btn ghost" id="cropCancel">Cancel</button>
        <button class="btn" id="cropOk">${ic('check')} Use photo</button>
      </div>
    </div>`;
  el.classList.add('open');
  refreshIcons();

  // Canvas-based: the canvas clips by itself (no overflow) and touch-action:none
  // keeps pinch/drag on the image instead of zooming the whole page.
  const canvas = el.querySelector('#cropCanvas');
  const zoom = el.querySelector('#cropZoom');
  const ctx = canvas.getContext('2d');
  const img = new Image();
  let natW = 0, natH = 0, base = 1, scale = 1, ox = 0, oy = 0, CS = 0;
  const MAXZ = 4;

  const clamp = () => {
    const w = natW * scale, h = natH * scale;
    ox = Math.min(0, Math.max(CS - w, ox));
    oy = Math.min(0, Math.max(CS - h, oy));
  };
  const draw = () => { if (!CS) return; ctx.clearRect(0,0,CS,CS); ctx.drawImage(img, ox, oy, natW*scale, natH*scale); };
  const setZoom = (z, cx, cy) => {
    z = Math.max(1, Math.min(MAXZ, z));
    cx = cx==null ? CS/2 : cx; cy = cy==null ? CS/2 : cy;
    const wx = (cx-ox)/scale, wy = (cy-oy)/scale;
    scale = base * z;
    ox = cx - wx*scale; oy = cy - wy*scale;
    clamp(); draw();
    if (zoom.value != z) zoom.value = z;
  };

  img.onload = () => requestAnimationFrame(() => {
    CS = Math.round(canvas.clientWidth) || 300;
    canvas.width = CS; canvas.height = CS;
    natW = img.naturalWidth; natH = img.naturalHeight;
    if (!natW || !natH) return;
    base = CS / Math.min(natW, natH); // cover the square
    scale = base; ox = (CS - natW*scale)/2; oy = (CS - natH*scale)/2;
    clamp(); draw();
  });
  img.src = url;

  // pointer gestures (1 finger = pan, 2 fingers = pinch zoom)
  const pts = new Map();
  let lastDist = 0;
  const local = (e) => { const r = canvas.getBoundingClientRect(); const k = CS / (r.width||1); return { x:(e.clientX-r.left)*k, y:(e.clientY-r.top)*k }; };
  canvas.addEventListener('pointerdown', (e) => { e.preventDefault(); canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, local(e)); lastDist = 0; });
  canvas.addEventListener('pointermove', (e) => {
    if (!pts.has(e.pointerId)) return;
    e.preventDefault();
    const prev = pts.get(e.pointerId);
    const cur = local(e);
    pts.set(e.pointerId, cur);
    if (pts.size === 1) { ox += cur.x - prev.x; oy += cur.y - prev.y; clamp(); draw(); }
    else if (pts.size >= 2) {
      const a = [...pts.values()];
      const dist = Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y);
      const mid = { x:(a[0].x+a[1].x)/2, y:(a[0].y+a[1].y)/2 };
      if (lastDist) setZoom((scale*(dist/lastDist))/base, mid.x, mid.y);
      lastDist = dist;
    }
  });
  const up = (e) => { pts.delete(e.pointerId); lastDist = 0; };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);
  zoom.addEventListener('input', () => setZoom(parseFloat(zoom.value)));

  const close = () => { el.remove(); URL.revokeObjectURL(url); };
  el.querySelector('.dm-overlay').addEventListener('click', close);
  el.querySelector('#cropCancel').addEventListener('click', close);
  el.querySelector('#cropOk').addEventListener('click', () => {
    const out = 600, k = out / (CS||out);
    const o = document.createElement('canvas'); o.width = out; o.height = out;
    o.getContext('2d').drawImage(img, ox*k, oy*k, natW*scale*k, natH*scale*k);
    o.toBlob((blob) => { const previewUrl = o.toDataURL('image/jpeg', 0.85); close(); if (blob) onConfirm(blob, previewUrl); }, 'image/jpeg', 0.9);
  });
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
