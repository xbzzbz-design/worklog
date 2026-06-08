/* ============================================================
   WorkLog — New Entry form (live workload calculation)
   ============================================================ */

let draft = null;
function freshDraft() {
  return {
    clientId: null, jobType: null, quantity: 1,
    isRevision: false, revisionRound: 1, revisionSeverity: 'STANDARD', revisionCause: null,
    motionOn: false, motionScenes: 1,
    conditionBriefIncomplete: false, conditionAssetNotProvided: false, conditionDeadlineRush: false,
    manualOverride: null, manualOverrideReason: '',
    note: '', driveLink: '', snap: null,
    isFlagged: false, flagNote: '', isStarred: false, parentId: null,
    otherKind: 'MEETING', hours: 1,
  };
}

// is the currently-selected job a time-based (meeting/other) type?
function isTimeBased() { return draft.jobType && JOB_TYPES[draft.jobType] && JOB_TYPES[draft.jobType].timeBased; }

function draftCalc() {
  const eff = Object.assign({}, draft, { motionScenes: draft.motionOn ? draft.motionScenes : 0 });
  if (isTimeBased()) eff.hours = draft.hours;
  return calcUnits(eff);
}

// toggle the form between piece-based and time-based modes
function syncJobMode(root) {
  root = root || document;
  const tb = isTimeBased();
  const show = (id, on) => { const el = root.querySelector(id); if (el) el.hidden = !on; };
  show('#otherKind', tb);
  show('#revStep', !tb);
  show('#motionStep', !tb);
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
  return !!(d && (d.clientId || d.jobType || d.note || d.driveLink || d.snap || d.isFlagged ||
    d.isStarred || d.isRevision || d.motionOn || d.conditionBriefIncomplete ||
    d.conditionAssetNotProvided || d.conditionDeadlineRush || (d.quantity||1) > 1 || d.manualOverride != null));
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
          <button class="jt-card ${draft.jobType===k?'on':''} ${k==='INFOGRAPHIC'?'row':''} ${v.timeBased?'tb':''}" data-jt="${k}">
            <span class="jt-ic" style="--jc:${v.color}">${ic(v.icon)}</span>
            <span class="jt-name">${v.label}</span>
            <span class="jt-rate tnum">${u(v.rate)}<small>/${v.timeBased?'hr':'pc'}</small></span>
          </button>`).join('')}
      </div>
    </div>

    <!-- STEP 3 QUANTITY / HOURS -->
    <div class="fstep" id="qtyStep">
      <div class="fstep-h"><span class="num">3</span><label id="qtyLabel">Quantity</label></div>
      <div class="other-kind" id="otherKind" hidden>
        ${Object.entries(OTHER_KINDS).map(([k,v])=>`<button class="kind-chip ${draft.otherKind===k?'on':''}" data-kind="${k}">${ic(v.icon)} ${v.label}</button>`).join('')}
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

    <!-- STEP 5 MOTION -->
    <div class="fstep" id="motionStep">
      <div class="fstep-h"><span class="num">5</span><label>Motion add-on</label><span class="opt-tag">optional</span></div>
      <div class="bigtoggle" id="motionToggle">
        <button class="bt ${!draft.motionOn?'on':''}" data-m="0">No motion</button>
        <button class="bt ${draft.motionOn?'on':''}" data-m="1">${ic('clapperboard')} Has motion</button>
      </div>
      <div id="motionDetail" ${draft.motionOn?'':'hidden'}>
        <div class="stepper sm" id="sceneStepper" style="margin-top:11px">
          <button class="step-btn" data-s="-1">${ic('minus')}</button>
          <div class="step-val"><b class="tnum" id="sceneVal">${draft.motionScenes}</b><small>scenes</small></div>
          <button class="step-btn" data-s="1">${ic('plus')}</button>
          <div class="scene-add">+<span id="sceneAdd">${u(draft.motionScenes)}</span> units</div>
        </div>
      </div>
    </div>

    <!-- STEP 6 CONDITIONS -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">6</span><label>Conditions</label><span class="opt-tag">+${u(SETTINGS.addOn)} each</span></div>
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
      <div class="fstep-h"><span class="num">7</span><label>Workload summary</label></div>
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
      <div class="fstep-h"><span class="num">8</span><label>Note</label><span class="opt-tag">optional</span></div>
      <textarea id="noteField" class="ta" placeholder="Anything worth remembering about this job…" rows="2">${draft.note||''}</textarea>
    </div>

    <!-- STEP 9 EVIDENCE -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">9</span><label>Evidence</label><span class="opt-tag">add later anytime</span></div>
      <div class="evidence">
        <button class="ev-btn mobile-only" id="snapBtn">${ic('camera')} Quick snap</button>
        <button class="ev-btn desktop-only" id="uploadBtn">${ic('upload')} Upload or drop an image</button>
        <div class="drive-row">${ic('link')}<input id="driveField" placeholder="Paste Google Drive link…" value="${draft.driveLink||''}"></div>
        <div class="snap-preview" id="snapPreview" hidden></div>
        <div class="honesty-note" id="honestyNote" hidden>${ic('shield-check')}<span><b>No file? That's fine for meetings and advisory time.</b> Log it honestly anyway — an honest record is the one weapon a bad manager can't argue with.</span></div>
      </div>
    </div>

    <!-- STEP 10 FLAG / STAR -->
    <div class="fstep">
      <div class="fstep-h"><span class="num">10</span><label>Flag &amp; star</label></div>
      <div class="flagstar">
        <button class="fs-btn ${draft.isFlagged?'on':''}" id="flagBtn">${ic('flag')} <span>Flag this job</span></button>
        <button class="fs-btn star ${draft.isStarred?'on':''}" id="starBtn">${ic('star')} <span>Add to portfolio</span></button>
      </div>
      <div id="flagNoteWrap" ${draft.isFlagged?'':'hidden'}>
        <input id="flagNoteField" class="flagnote-in" placeholder="Why are you flagging this?" value="${draft.flagNote||''}">
      </div>
    </div>

    <button class="btn full lg save-btn" id="saveBtn">${ic('check')} Save entry</button>
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
