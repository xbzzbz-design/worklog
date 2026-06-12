/* ============================================================
   WorkLog — New Entry form (live workload calculation)
   ============================================================ */

let draft = null;
function freshDraft() {
  // pre-fill the client you logged most recently — a "suggestion" that doesn't
  // count as an unsaved draft (prefilledClient) until you actually touch the form
  const last = (typeof lastClientId === 'function') ? lastClientId() : null;
  return {
    clientId: last, prefilledClient: !!last, jobType: null, quantity: 1, motionVariant: false, setItems: [],
    isRevision: false, revisionRound: 1, revisionSeverity: 'STANDARD', revisionCause: null,
    motionSimple: 0, motionStandard: 0, motionCustom: 0, motionCustomReason: '',
    conditionBriefIncomplete: false, conditionAssetNotProvided: false, conditionDeadlineRush: false,
    manualOverride: null, manualOverrideReason: '',
    note: '', driveLink: '', snap: null,
    isFlagged: false, flagNote: '', isStarred: false, parentId: null,
    otherKind: 'MEETING', hours: 1,
  };
}

// is the currently-selected job a time-based (meeting/other) type?
function isTimeBased() { return draft.jobType && JOB_TYPES[draft.jobType] && JOB_TYPES[draft.jobType].timeBased; }
// is the currently-selected job the Motion type?
function isMotion() { return draft.jobType && JOB_TYPES[draft.jobType] && JOB_TYPES[draft.jobType].motion; }
// is the currently-selected job a Photo set?
function isSet() { return draft.jobType && JOB_TYPES[draft.jobType] && JOB_TYPES[draft.jobType].set; }
// piece types that can go inside a set (no meeting/motion/quick/set)
function setPieceTypes() { return Object.entries(JOB_TYPES).filter(([k,v])=>!v.timeBased && !v.motion && !v.quick && !v.set); }

function draftCalc() {
  const eff = Object.assign({}, draft);
  if (eff.jobType !== 'MOTION') { eff.motionSimple = 0; eff.motionStandard = 0; eff.motionCustom = 0; }
  if (isTimeBased()) eff.hours = draft.hours;
  return calcUnits(eff);
}

// photo-set cart markup (rows of piece type × quantity)
function renderSetCart() {
  const items = draft.setItems || [];
  const opts = setPieceTypes();
  const rows = items.map((it, i) => `
    <div class="set-row">
      <select class="set-type" data-set-i="${i}">
        ${opts.map(([k,v])=>`<option value="${k}" ${it.jobType===k?'selected':''}>${v.label} · ${u(v.rate)}</option>`).join('')}
      </select>
      <div class="set-step"><button class="step-btn" data-set-i="${i}" data-sd="-1">${ic('minus')}</button><b class="tnum">${it.quantity||1}</b><button class="step-btn" data-set-i="${i}" data-sd="1">${ic('plus')}</button></div>
      <button class="set-del" data-set-del="${i}">${ic('x')}</button>
    </div>`).join('');
  const total = (draft.jobType === 'PHOTOSET') ? calcUnits(draft).final : 0;
  const qty = items.reduce((s, it) => s + (it.quantity || 1), 0);
  return `${rows || `<div class="set-empty">No pieces yet — add the first one.</div>`}
    <button class="set-add" id="setAdd">${ic('plus')} Add a piece</button>
    <div class="set-total">${qty} piece${qty===1?'':'s'} · <b class="tnum" id="setTotal">${u(total)}</b> units${draft.isRevision?' (after revision)':''}</div>`;
}

// toggle the form between piece-based, time-based and motion modes
function syncJobMode(root) {
  root = root || document;
  const tb = isTimeBased();
  const mo = isMotion();
  const st = isSet();
  const show = (id, on) => { const el = root.querySelector(id); if (el) el.hidden = !on; };
  show('#otherKind', tb);
  show('#qtyStep', !mo && !st);   // quantity (pieces) or duration (hours); motion/set use their own builders
  show('#motionVariantRow', !!(draft.jobType && JOB_TYPES[draft.jobType] && JOB_TYPES[draft.jobType].hasMotionVariant)); // still/motion choice for variation & adaptation
  show('#motionStep', mo);        // motion tier builder
  show('#setStep', st);           // photo-set cart
  show('#revStep', !tb);          // revision/edit applies to pieces, motion & sets (not meetings)
  show('#honestyNote', tb);
  const qtyLabel = root.querySelector('#qtyLabel');
  const qtyUnit = root.querySelector('#qtyUnit');
  const qtyVal = root.querySelector('#qtyVal');
  if (qtyLabel) qtyLabel.textContent = tb ? 'How long?' : 'Quantity';
  if (qtyUnit) qtyUnit.textContent = tb ? 'hours' : 'pieces';
  if (qtyVal) qtyVal.textContent = tb ? u(draft.hours) : draft.quantity;
}

/* ---- draft auto-save ---- */
const DRAFT_KEY = 'wl_draft';
function isDraftDirty(d) {
  const clientDirty = d && d.clientId && !d.prefilledClient; // a pre-filled suggestion isn't a real draft
  return !!(d && (clientDirty || d.jobType || d.note || d.driveLink || d.snap || d.isFlagged ||
    d.isStarred || d.isRevision || d.motionVariant || (d.setItems&&d.setItems.length>0) || (d.motionSimple||0)>0 || (d.motionStandard||0)>0 || (d.motionCustom||0)>0 ||
    d.conditionBriefIncomplete || d.conditionAssetNotProvided || d.conditionDeadlineRush || (d.quantity||1) > 1 || d.manualOverride != null));
}
function saveDraft() {
  try {
    if (isDraftDirty(draft)) localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    else localStorage.removeItem(DRAFT_KEY);
  } catch(e){}
  if (window.markSyncing) markSyncing();
}
function loadDraft() {
  try { const s = localStorage.getItem(DRAFT_KEY); if (s) return Object.assign(freshDraft(), JSON.parse(s)); } catch(e){}
  return freshDraft();
}
function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch(e){} }

function renderEntry() {
  if (!draft) draft = freshDraft();
  const d = draft;

  const clientOpts = CLIENTS.filter(c=>!c.archived);

  return `
  <div class="page form">
    <div class="greet" style="padding-bottom:10px">
      <div class="eyebrow">${draft.date && draft.date!==TODAY ? `${ic('calendar-days')} Logging for ${new Date(draft.date+'T00:00:00').toLocaleDateString('en-US',{weekday:'short',day:'numeric',month:'short'})}` : 'New entry'}</div>
      <h1><em>Log a piece of work</em></h1>
    </div>
    ${isDraftDirty(draft)?`<div class="draft-banner" id="draftBanner">${ic('history')}<span>Picked up your unsaved draft</span><button id="draftFresh">Start fresh</button></div>`:''}

    <!-- STEP 1 CLIENT -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">1</span><label>Client</label></div>
      ${(()=>{ const ids=[]; const last=lastClientId(); if(last) ids.push(last); topClientIds(4).forEach(id=>{ if(!ids.includes(id)) ids.push(id); });
        const chips=ids.slice(0,4).map(id=>CLIENTS.find(c=>c.id===id)).filter(c=>c&&!c.archived);
        return chips.length?`<div class="quick-clients" id="quickClients">
          ${chips.map(c=>`<button class="qc-chip ${draft.clientId===c.id?'on':''}" data-client="${c.id}"><span class="av ${avatarClass(c.id)}">${clientInitials(c.id)}</span>${escHtml(c.name)}</button>`).join('')}
        </div>`:''; })()}
      <div class="client-select" id="clientSelect">
        <button class="select-trigger" id="clientTrigger">
          <span class="ct-val ${draft.clientId?'':'faint'}">${draft.clientId?`<span class="av ${avatarClass(draft.clientId)}" style="width:24px;height:24px;border-radius:7px;font-size:10px;display:inline-grid;place-items:center;vertical-align:middle;margin-right:8px">${clientInitials(draft.clientId)}</span>${clientName(draft.clientId)}`:'Select a client…'}</span>
          ${ic('chevron-down')}
        </button>
        <div class="select-menu" id="clientMenu" hidden>
          <div class="search-row">${ic('search')}<input id="clientSearch" placeholder="Search clients…"></div>
          <div class="opt-list" id="clientList">
            ${clientOpts.map(c=>`<button class="opt" data-client="${c.id}"><span class="av ${avatarClass(c.id)}" style="width:28px;height:28px;border-radius:8px;font-size:11px">${clientInitials(c.id)}</span>${c.name}</button>`).join('')}
          </div>
          <button class="opt add-client">${ic('plus')} Add new client</button>
        </div>
      </div>
    </div>

    <!-- STEP 2 JOB TYPE -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">2</span><label>Job type</label></div>
      <div class="jt-grid" id="jtGrid">
        ${Object.entries(JOB_TYPES).filter(([k,v])=>!v.quick).map(([k,v])=>`
          <button class="jt-card ${draft.jobType===k?'on':''} ${v.timeBased?'tb':''}" data-jt="${k}">
            <span class="jt-ic" style="--jc:${v.color}">${ic(v.icon)}</span>
            <span class="jt-name">${v.label}</span>
            ${v.motion || v.set ? `<span class="jt-rate">${v.set?'cart':'tiered'}</span>` : `<span class="jt-rate tnum">${u(v.rate)}<small>/${v.timeBased?'hr':'pc'}</small></span>`}
          </button>`).join('')}
      </div>
    </div>

    <!-- STEP 3 QUANTITY / HOURS -->
    <div class="fstep" id="qtyStep">
      <div class="fstep-h"><span class="num">3</span><label id="qtyLabel">Quantity</label></div>
      <div class="other-kind" id="otherKind" hidden>
        ${Object.entries(OTHER_KINDS).map(([k,v])=>`<button class="kind-chip ${draft.otherKind===k?'on':''}" data-kind="${k}">${ic(v.icon)} ${v.label}</button>`).join('')}
      </div>
      <div class="bigtoggle" id="motionVariantRow" hidden style="margin-bottom:11px">
        <button class="bt ${!draft.motionVariant?'on':''}" data-mv="0">${ic('image')} Still image</button>
        <button class="bt ${draft.motionVariant?'on':''}" data-mv="1">${ic('clapperboard')} Motion <small>×2</small></button>
      </div>
      <div class="stepper" id="qtyStepper">
        <button class="step-btn" data-q="-1">${ic('minus')}</button>
        <div class="step-val"><b class="tnum" id="qtyVal">${draft.quantity}</b><small id="qtyUnit">pieces</small></div>
        <button class="step-btn" data-q="1">${ic('plus')}</button>
      </div>
    </div>

    <!-- STEP 4 NEW / REVISION -->
    <div class="fstep" id="revStep">
      <div class="fstep-h"><span class="num">4</span><label>New work or revision</label></div>
      <div class="bigtoggle" id="revToggle">
        <button class="bt ${!draft.isRevision?'on':''}" data-rev="0">${ic('sparkles')} New work</button>
        <button class="bt ${draft.isRevision?'on':''}" data-rev="1">${ic('rotate-ccw')} Revision</button>
      </div>
      <div class="rev-detail" id="revDetail" ${draft.isRevision?'':'hidden'}>
        <div class="sublabel">Revision round</div>
        <div class="chiprow" id="roundRow">
          ${[1,2,3,'4+'].map((r)=>{const rv=typeof r==='string'?4:r;return `<button class="chip ${draft.revisionRound===rv?'on':''}" data-round="${rv}">#${r}</button>`}).join('')}
        </div>
        <div class="sublabel">Severity</div>
        <div class="sev-grid" id="sevGrid">
          ${Object.entries(SEVERITY).map(([k,v])=>`
            <button class="sev ${draft.revisionSeverity===k?'on':''}" data-sev="${k}">
              <b>${v.label}</b>
              <small>${k==='MAJOR'?'= job rate':'× '+v.factor}</small>
              <span class="sev-desc">${v.desc}</span>
            </button>`).join('')}
        </div>
        <div class="sublabel">Cause</div>
        <div class="cause-list" id="causeList">
          ${Object.entries(CAUSE).map(([k,v])=>`
            <button class="cause ${v.scope?'scope':''} ${draft.revisionCause===k?'on':''}" data-cause="${k}">
              <span class="radio"></span>
              <span class="ctxt">${v.label}${v.scope?` ${ic('triangle-alert')}`:''}</span>
              ${!v.counts?`<span class="ctag">no credit</span>`:''}
            </button>`).join('')}
        </div>
        <div class="cause-note" id="causeNote" hidden></div>
        <div class="sublabel">Revising which job?<span class="opt-tag" style="margin-left:7px">optional</span></div>
        <div id="threadPick" class="thread-pick"></div>
      </div>
    </div>

    <!-- STEP 3 (MOTION) SCENES BY TIER -->
    <div class="fstep" id="motionStep">
      <div class="fstep-h"><span class="num">3</span><label>Motion scenes</label><span class="opt-tag">by complexity</span></div>
      <div id="motionDetail">
        <div class="mtier" data-mt="simple">
          <div class="mtier-info"><b>Simple <span class="mtier-rate">+${u(MOTION_RATES.simple)}/scene</span></b><small>Still image with simple text motion</small></div>
          <div class="mtier-step"><button class="step-btn" data-mt="simple" data-s="-1">${ic('minus')}</button><b class="tnum" id="mSimpleVal">${draft.motionSimple||0}</b><button class="step-btn" data-mt="simple" data-s="1">${ic('plus')}</button></div>
        </div>
        <div class="mtier" data-mt="standard">
          <div class="mtier-info"><b>Standard <span class="mtier-rate">+${u(MOTION_RATES.standard)}/scene</span></b><small>Simple, plus AI-generated video</small></div>
          <div class="mtier-step"><button class="step-btn" data-mt="standard" data-s="-1">${ic('minus')}</button><b class="tnum" id="mStandardVal">${draft.motionStandard||0}</b><button class="step-btn" data-mt="standard" data-s="1">${ic('plus')}</button></div>
        </div>
        <div class="mtier custom">
          <div class="mtier-info"><b>Complex <span class="mtier-rate">custom</span></b><small>Heavier than the above — e.g. an animated infographic, a long clip cut with self-generated audio. You set the units.</small></div>
          <input type="number" step="0.5" min="0" id="mCustomVal" class="mtier-custom" placeholder="0" value="${draft.motionCustom||''}">
        </div>
        <div class="mtier-reason" id="mReasonWrap" ${(draft.motionCustom>0)?'':'hidden'}>
          <input type="text" id="mCustomReason" placeholder="What makes it complex? (required)" value="${escHtml(draft.motionCustomReason||'')}">
        </div>
        <div class="scene-add">+<span id="motionTotal">${u(motionUnitsOf(draft))}</span> units${draft.isRevision?' · before revision discount':''}</div>
      </div>
    </div>

    <!-- STEP 3 (PHOTO SET) CART -->
    <div class="fstep" id="setStep">
      <div class="fstep-h"><span class="num">3</span><label>What's in the set?</label><span class="opt-tag">add each piece</span></div>
      <div id="setBuilder">${renderSetCart()}</div>
    </div>

    <!-- STEP 6 CONDITIONS -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">5</span><label>Conditions</label><span class="opt-tag">+${u(SETTINGS.addOn)} each</span></div>
      <div class="checks" id="condChecks">
        ${Object.entries(CONDITIONS).map(([k,label])=>`
          <button class="check ${draft[k]?'on':''}" data-cond="${k}">
            <span class="cbox">${ic('check')}</span>
            <span class="clabel">${label}</span>
            <span class="cplus">+${u(SETTINGS.addOn)}</span>
          </button>`).join('')}
      </div>
    </div>

    <!-- STEP 7 SUMMARY -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">6</span><label>Workload summary</label></div>
      <div class="summary-card" id="summaryCard">
        <div class="sum-lines" id="sumLines"></div>
        <div class="sum-total">
          <span>Total</span>
          <span class="sum-big"><b class="tnum" id="sumTotal" data-cur="0">0.0</b> units</span>
        </div>
        <button class="override-toggle ${draft.manualOverride!=null?'on':''}" id="overrideToggle">${ic('pencil')} Override calculation</button>
        <div class="override-box" id="overrideBox" ${draft.manualOverride!=null?'':'hidden'}>
          <div class="ob-row">
            <div class="field"><label>Final units</label><input type="number" step="0.5" id="ovVal" placeholder="0.0" value="${draft.manualOverride!=null?draft.manualOverride:''}"></div>
          </div>
          <div class="field"><label>Reason for override <span class="req">required</span></label>
            <input type="text" id="ovReason" placeholder="Why are you overriding?" value="${draft.manualOverrideReason||''}"></div>
          <div class="ob-warn">${ic('info')} Overrides are shown in the exported report.</div>
        </div>
      </div>
    </div>

    <!-- STEP 8 NOTE -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">7</span><label>Note</label><span class="opt-tag">optional</span></div>
      <textarea id="noteField" class="ta" placeholder="Anything worth remembering about this job…" rows="2">${draft.note||''}</textarea>
    </div>

    <!-- STEP 9 EVIDENCE -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">8</span><label>Evidence</label><span class="opt-tag">add later anytime</span></div>
      <div class="evidence">
        <button class="ev-btn mobile-only" id="snapBtn">${ic('camera')} Quick snap</button>
        <button class="ev-btn desktop-only" id="uploadBtn">${ic('upload')} Upload, drop, or paste an image</button>
        <div class="ev-paste-hint desktop-only">${ic('clipboard')} Tip: take a screenshot, then paste it here with ⌘V</div>
        <div class="drive-row">${ic('link')}<input id="driveField" placeholder="Paste Google Drive link…" value="${draft.driveLink||''}"></div>
        <div class="snap-preview" id="snapPreview" hidden></div>
        <div class="honesty-note" id="honestyNote" hidden>${ic('shield-check')}<span><b>No file? That's fine for meetings and advisory time.</b> Log it honestly anyway — an honest record is the one weapon a bad manager can't argue with.</span></div>
      </div>
    </div>

    <!-- STEP 10 FLAG / STAR -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">9</span><label>Flag &amp; star</label></div>
      <div class="flagstar">
        <button class="fs-btn ${draft.isFlagged?'on':''}" id="flagBtn">${ic('flag')} <span>Flag this job</span></button>
        <button class="fs-btn star ${draft.isStarred?'on':''}" id="starBtn">${ic('star')} <span>Add to portfolio</span></button>
      </div>
      <div id="flagNoteWrap" ${draft.isFlagged?'':'hidden'}>
        <input id="flagNoteField" class="flagnote-in" placeholder="Why are you flagging this?" value="${draft.flagNote||''}">
      </div>
    </div>

    ${(window._setTally && window._setTally.count>0)?`<div class="set-tally" id="setTally">${ic('layers')}<span>Logged this run · <b>${window._setTally.count} piece${window._setTally.count>1?'s':''}</b> · <b class="tnum">${u(window._setTally.units)}</b> units</span><button id="setDone" class="set-done">Done</button></div>`:''}
    <button class="btn full lg save-btn" id="saveBtn">${ic('check')} Save entry</button>
    <button class="btn ghost full save-add-btn" id="saveAddBtn">${ic('plus')} Save &amp; add another</button>
  </div>`;
}

/* ---------- update the live summary ---------- */
function updateSummary() {
  const linesEl = document.getElementById('sumLines');
  const totalEl = document.getElementById('sumTotal');
  if (!linesEl || !totalEl) return;

  if (!draft.jobType) {
    linesEl.innerHTML = `<div class="sum-empty">${ic('arrow-up')} Pick a job type to see the breakdown</div>`;
    countUp(totalEl, 0);
    refreshIcons();
    document.getElementById('overrideToggle').style.display = 'none';
    saveDraft();
    return;
  }
  document.getElementById('overrideToggle').style.display = '';

  const c = draftCalc();
  linesEl.innerHTML = c.lines.map(l=>`
    <div class="sum-line ${l.muted?'muted':''}">
      <span>${l.label}</span>
      <span class="tnum">${l.val===0?'0.0':'+'+u(l.val)}</span>
    </div>`).join('');

  if (c.overridden) {
    linesEl.innerHTML += `<div class="sum-line ov"><span>${ic('pencil')} Manual override</span><span class="tnum">${u(c.final)}</span></div>`;
  }
  countUp(totalEl, c.final);

  // pulse the summary card
  const card = document.getElementById('summaryCard');
  card.classList.remove('pulse'); void card.offsetWidth; card.classList.add('pulse');
  refreshIcons();
  saveDraft();
}
