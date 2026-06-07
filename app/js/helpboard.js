/* ============================================================
   WorkLog — Help Board (raise a hand · lend a hand)
   ============================================================ */

function renderHelpBoard() {
  const open = HELP_REQUESTS.filter(h=>h.status==='open');
  const claimed = HELP_REQUESTS.filter(h=>h.status==='claimed');
  const resolved = HELP_REQUESTS.filter(h=>h.status==='resolved');

  return `
  <div class="page helpboard">
    <div class="greet" style="padding-bottom:12px">
      <div class="eyebrow">Help board</div>
      <h1><em>We've got each other</em></h1>
      <div class="sub">When a day gets heavy, raise a hand. When you've got room, lend one. No one drowns quietly here.</div>
    </div>

    <div class="kindness">${ic('heart-handshake')} This month the team backed each other up <b>${timesHelpedThisMonth()} times</b>.</div>

    <button class="btn full lg" id="askHelp">${ic('hand')} Raise a hand</button>

    <div class="section-h"><h2>Needs a hand</h2><span class="link">${open.length} open</span></div>
    <div class="help-list" id="openList">
      ${open.length ? open.map(helpCard).join('') : emptyHelp('All clear — no one needs a hand right now.')}
    </div>

    <div class="section-h"><h2>Being handled</h2><span class="link">${claimed.length}</span></div>
    <div class="help-list">
      ${claimed.length ? claimed.map(helpCard).join('') : emptyHelp('Nothing being handled right now.')}
    </div>

    <div class="section-h"><h2>Handled together</h2><span class="link">${resolved.length}</span></div>
    <div class="help-list">
      ${resolved.length ? resolved.map(helpCard).join('') : emptyHelp('When you back each other up, it’ll show here.')}
    </div>
  </div>`;
}

function emptyHelp(msg) {
  return `<div class="help-empty">${ic('check-circle-2')}<p>${msg}</p></div>`;
}

function helpCard(h) {
  const by = teamMember(h.byId);
  const ur = URGENCY[h.urgency] || URGENCY.soon;
  const claimed = h.status === 'claimed';
  const resolved = h.status === 'resolved';
  const helper = (claimed||resolved) ? teamMember(h.helperId) : null;
  const mine = by.you;
  const iHelped = helper && helper.you;

  let foot;
  if (resolved) {
    foot = `<span class="hc-resolved">${ic('check-circle-2')} Handled together${h.loggedHours?` · ${u(h.loggedHours)}h logged`:''}</span>`;
  } else if (claimed) {
    // mine → I can mark resolved + thank; I'm the helper → I can log my time
    foot = `<span class="hc-helper">${ic('heart-handshake')} ${iHelped?'You’ve got this':helper.name+' is on it'}</span>`
      + (mine ? `<button class="hc-btn" data-resolve="${h.id}">${ic('check')} Resolve &amp; thank</button>`
              : iHelped ? `<button class="hc-btn soft" data-logtime="${h.id}">${ic('clock')} Log my time</button>` : '');
  } else {
    foot = `<span class="hc-hours">${ic('layers')} ~${u(h.hours)} units</span>`
      + (mine ? `<button class="hc-btn cancel" data-cancel="${h.id}">${ic('x')} Cancel</button>`
              : `<button class="hc-btn" data-claim="${h.id}">${ic('hand-helping')} Lend a hand</button>`);
  }

  return `<div class="help-card ${claimed?'claimed':''} ${resolved?'resolved':''}">
    <div class="hc-top">
      <span class="av ${'c'+by.colorIdx}">${by.initials}</span>
      <div class="hc-who"><b>${by.name}${mine?' <span class="you-tag">you</span>':''}</b><small>${clientName(h.clientId)}</small></div>
      ${resolved?`<span class="urg urg-good">${ic('check')} Resolved</span>`:`<span class="urg urg-${ur.tone}">${ur.label}</span>`}
    </div>
    <div class="hc-title">${h.title}</div>
    <div class="hc-need">${h.need}</div>
    ${resolved && h.thanks ? `<div class="hc-thanks">${ic('quote')} ${h.thanks}<span class="hc-thanks-to">— ${by.name} to ${helper.name}</span></div>` : ''}
    <div class="hc-foot">${foot}</div>
  </div>`;
}

function wireHelpBoard(root) {
  root.querySelectorAll('[data-claim]').forEach(b=>b.addEventListener('click', async ()=>{
    const h = HELP_REQUESTS.find(x=>x.id===b.dataset.claim);
    if (!h) return;
    try {
      if (window.WLStore && window.WLStore.claimHelpRequest) await window.WLStore.claimHelpRequest(h.id);
      else { h.status='claimed'; h.helperId=window.WL_CURRENT_USER_ID; }
      markSyncing();
      rerenderScreen('helpboard');
      toast('Thank you — they’ll feel that', 'good');
    } catch (err) {
      console.error(err);
      toast('Could not claim this request. Try again.', 'info');
    }
  }));
  root.querySelectorAll('[data-cancel]').forEach(b=>b.addEventListener('click', async ()=>{
    const i = HELP_REQUESTS.findIndex(x=>x.id===b.dataset.cancel);
    if (i<0) return;
    try {
      if (window.WLStore && window.WLStore.deleteHelpRequest) await window.WLStore.deleteHelpRequest(HELP_REQUESTS[i].id);
      else HELP_REQUESTS.splice(i,1);
      rerenderScreen('helpboard');
      toast('Request removed', 'info');
    } catch (err) {
      console.error(err);
      toast('Could not remove request. Try again.', 'info');
    }
  }));
  root.querySelectorAll('[data-logtime]').forEach(b=>b.addEventListener('click',()=>{
    const h = HELP_REQUESTS.find(x=>x.id===b.dataset.logtime);
    if (!h) return;
    // helping is real work — log it as a normal entry, pre-filled. counts like anything else.
    draft = freshDraft();
    draft.clientId = h.clientId;
    draft.jobType = 'OTHER';
    draft.otherKind = 'ADVISORY';
    draft.hours = h.hours;
    draft.note = `Helped ${teamMember(h.byId).name} — ${h.title}`;
    saveDraft();
    h.loggedHours = h.hours;
    go('entry');
    toast('Pre-filled — helping counts as your work too', 'good');
  }));
  root.querySelectorAll('[data-resolve]').forEach(b=>b.addEventListener('click',()=>{
    openResolve(b.dataset.resolve);
  }));
  const ask = root.querySelector('#askHelp');
  if (ask) ask.addEventListener('click', openAskHelp);
}

function openResolve(id) {
  const h = HELP_REQUESTS.find(x=>x.id===id); if (!h) return;
  const helper = teamMember(h.helperId);
  const el = mountOverlay('detailModal');
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet" style="max-width:440px">
      <div class="dm-grab"></div>
      <div class="ask-head">${ic('heart-handshake')}<div><b>Resolve &amp; thank ${helper.name}</b><small>A private thank-you — only they’ll see it. No scores, no ranking.</small></div></div>
      <div class="ask-body">
        <div class="field"><label>Say thanks (just to them)</label>
          <textarea id="thxText" class="ask-in" rows="2" placeholder="That saved my Tuesday — really appreciate you.">Thank you — that genuinely helped.</textarea></div>
      </div>
      <button class="btn full lg" id="thxSend">${ic('send')} Send thanks &amp; resolve</button>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  el.querySelector('.dm-overlay').addEventListener('click', closeDetail);
  el.querySelector('#thxSend').addEventListener('click', async ()=>{
    const thanks = el.querySelector('#thxText').value.trim() || 'Thank you.';
    try {
      if (window.WLStore && window.WLStore.resolveHelpRequest) await window.WLStore.resolveHelpRequest(h.id, thanks);
      else { h.status='resolved'; h.thanks = thanks; }
      markSyncing();
      closeDetail();
      rerenderScreen('helpboard');
      toast('Thanks sent — handled together', 'good');
    } catch (err) {
      console.error(err);
      toast('Could not resolve request. Try again.', 'info');
    }
  });
}

function openAskHelp() {
  const el = mountOverlay('detailModal');
  const clientOpts = CLIENTS.filter(c=>!c.archived);
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet" style="max-width:440px">
      <div class="dm-grab"></div>
      <div class="ask-head">${ic('hand')}<div><b>Raise a hand</b><small>It posts to the team board — asking isn’t weakness, it’s how a team holds.</small></div></div>
      <div class="ask-body">
        <div class="field"><label>Client</label>
          <select id="askClient" class="ask-in">${clientOpts.map(c=>`<option value="${c.id}">${c.name}</option>`).join('')}</select></div>
        <div class="field"><label>What do you need?</label>
          <input id="askTitle" class="ask-in" placeholder="e.g. 6-banner set for the launch"></div>
        <div class="field"><label>A little more</label>
          <input id="askNeed" class="ask-in" placeholder="e.g. another pair of hands on 3 sizes"></div>
        <div class="ask-row">
          <div class="field" style="flex:1"><label>Units needed</label>
            <input id="askHours" class="ask-in" type="number" step="0.25" value="1" min="0.25"></div>
          <div class="field" style="flex:1"><label>Urgency</label>
            <select id="askUrg" class="ask-in"><option value="today">Needed today</option><option value="soon">When you can</option></select></div>
        </div>
      </div>
      <button class="btn full lg" id="askPost">${ic('send')} Post to board</button>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  el.querySelector('.dm-overlay').addEventListener('click', closeDetail);
  el.querySelector('#askPost').addEventListener('click', async ()=>{
    const title = el.querySelector('#askTitle').value.trim();
    if (!title) { toast('Add a short title', 'info'); el.querySelector('#askTitle').focus(); return; }
    const payload = {
      byId: window.WL_CURRENT_USER_ID,
      clientId: el.querySelector('#askClient').value || null,
      title,
      need: el.querySelector('#askNeed').value.trim() || 'Could use a hand on this',
      hours: parseFloat(el.querySelector('#askHours').value)||1,
      urgency: el.querySelector('#askUrg').value,
    };
    try {
      if (window.WLStore && window.WLStore.createHelpRequest) await window.WLStore.createHelpRequest(payload);
      else HELP_REQUESTS.unshift(H(payload));
      markSyncing();
      closeDetail();
      rerenderScreen('helpboard');
      toast('Posted — your team can see it now', 'good');
    } catch (err) {
      console.error(err);
      toast('Could not post request. Try again.', 'info');
    }
  });
}
