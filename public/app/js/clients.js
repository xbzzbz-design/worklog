/* ============================================================
   WorkLog — Client management (list + detail)
   ============================================================ */

let currentClientId = null;

function clientStats(id) {
  const es = ENTRIES.filter(e=>e.clientId===id);
  const total = sum(es, e=>e._c.final);
  const newW = sum(es.filter(e=>!e.isRevision), e=>e._c.final);
  const rev = sum(es.filter(e=>e.isRevision), e=>e._c.final);
  const revCount = es.filter(e=>e.isRevision).length;
  const revRate = es.length ? Math.round(revCount/es.length*100) : 0;
  const scope = es.filter(isScope).length;
  return { es, total, newW, rev, revRate, scope, count: es.length };
}
function rateClass(r) { return r<20?'g':r<=50?'y':'r'; }

function openClientForm(existing, onDone) {
  const editing = !!existing;
  const el = mountOverlay('clientFormModal');
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet">
      <div class="dm-grab"></div>
      <div class="ask-head">${ic(editing?'pencil':'contact')}<div><b>${editing?'Edit client':'Add client'}</b><small>${editing?'Rename this client — it updates everywhere.':'Create the client once, then everyone can log against it.'}</small></div></div>
      <div class="ask-body">
        <input id="clientNameInput" class="ask-in" placeholder="Client name" autocomplete="off" value="${editing?escHtml(existing.name):''}">
      </div>
      <div class="dm-actions">
        <button class="btn ghost" id="clientCancel">Cancel</button>
        <button class="btn" id="clientSave">${ic(editing?'check':'plus')} ${editing?'Save':'Add client'}</button>
      </div>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  const close = () => el.remove();
  el.querySelector('.dm-overlay').addEventListener('click', close);
  el.querySelector('#clientCancel').addEventListener('click', close);
  const input = el.querySelector('#clientNameInput');
  setTimeout(()=>input.focus(), 50);
  el.querySelector('#clientSave').addEventListener('click', (ev) => {
    const name = input.value.trim();
    if (!name) { input.focus(); return; }
    runAction(ev.currentTarget, async () => {
      let result;
      if (editing) {
        if (window.WLStore && window.WLStore.updateClientName) await window.WLStore.updateClientName(existing.id, name);
        else existing.name = name;
        result = existing;
      } else {
        result = window.WLStore && window.WLStore.createClient
          ? await window.WLStore.createClient(name)
          : (() => { const c = { id:'c'+Date.now(), name, archived:false }; CLIENTS.push(c); return c; })();
      }
      close();
      if (onDone) onDone(result);
      else rerenderScreen(editing ? 'clientDetail' : 'clients');
      toast(editing ? 'Client updated' : 'Client added', 'good');
    }, editing ? 'Could not update client' : 'Could not add client');
  });
}
function openClientCreate(onCreated) { openClientForm(null, onCreated); }
function openClientEdit(client, onDone) { openClientForm(client, onDone); }

function confirmDeleteClient(c) {
  const el = mountOverlay('clientFormModal');
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet">
      <div class="dm-grab"></div>
      <div class="ask-head">${ic('trash-2')}<div><b>Delete ${escHtml(c.name)}?</b><small>This can't be undone. A client with logged work can't be deleted — archive it instead.</small></div></div>
      <div class="dm-actions">
        <button class="btn ghost" id="delCancel">Cancel</button>
        <button class="btn danger" id="delConfirm">${ic('trash-2')} Delete</button>
      </div>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  const close = () => el.remove();
  el.querySelector('.dm-overlay').addEventListener('click', close);
  el.querySelector('#delCancel').addEventListener('click', close);
  el.querySelector('#delConfirm').addEventListener('click', (ev)=> runAction(ev.currentTarget, async ()=>{
    if (window.WLStore && window.WLStore.deleteClient) await window.WLStore.deleteClient(c.id);
    else { const i=CLIENTS.findIndex(x=>x.id===c.id); if(i>=0) CLIENTS.splice(i,1); }
    close();
    go('clients');
    toast('Client deleted', 'info');
  }, 'Could not delete client'));
}

function renderClients() {
  const active = CLIENTS.filter(c=>!c.archived);
  const archived = CLIENTS.filter(c=>c.archived);
  const row = (c) => {
    const s = clientStats(c.id);
    const d = computeDifficulty(c.id);
    return `<button class="cli-row" data-client-detail="${c.id}">
      <span class="av ${avatarClass(c.id)}">${clientInitials(c.id)}</span>
      <span class="cli-body">
        <span class="cli-name">${escHtml(c.name)}${s.scope?` <span class="badge-warn">${ic('triangle-alert')}${s.scope}</span>`:''}</span>
        <span class="cli-sub">${s.count} entries · <b class="tnum">${u(s.total)}</b> units · ${s.revRate}% rev</span>
      </span>
      <span class="cli-diff diff-${d.tier.tone}"><b class="tnum">${d.score}</b><small>${d.tier.label}</small></span>
      ${ic('chevron-right')}
    </button>`;
  };
  return `
  <div class="page clients">
    <div class="greet" style="padding-bottom:8px">
      <div class="eyebrow">Clients</div>
      <h1><em>Who you work with</em></h1>
      <div class="sub">A difficulty score per client — calm, data-backed proof of where the hard work really comes from.</div>
    </div>
    <button class="btn soft full" id="addClient" style="margin:6px 0 18px">${ic('plus')} Add client</button>
    <div class="cli-list">${active.map(row).join('')}</div>
    ${archived.length?`
      <button class="arch-toggle" id="archToggle">${ic('archive')} Archived (${archived.length}) ${ic('chevron-down')}</button>
      <div class="cli-list arch" id="archList" hidden>${archived.map(row).join('')}</div>`:''}
  </div>`;
}

function wireClients(root) {
  root.querySelectorAll('[data-client-detail]').forEach(b=>b.addEventListener('click',()=>{ currentClientId=b.dataset.clientDetail; go('clientDetail'); }));
  const at = root.querySelector('#archToggle');
  if (at) at.addEventListener('click',()=>{ const l=root.querySelector('#archList'); l.hidden=!l.hidden; at.classList.toggle('open', !l.hidden); });
  const ac = root.querySelector('#addClient');
  if (ac) ac.addEventListener('click',()=> openClientCreate(()=>rerenderScreen('clients')));
}

function renderClientDetail() {
  const c = CLIENTS.find(x=>x.id===currentClientId);
  if (!c) return `<div class="page">Client not found</div>`;
  const s = clientStats(c.id);
  const history = s.es.slice().sort((a,b)=>a.date<b.date?1:-1);
  return `
  <div class="page client-detail">
    <button class="back-btn" data-go="clients">${ic('chevron-left')} Clients</button>
    <div class="cd-hero">
      <span class="av ${avatarClass(c.id)}" style="width:60px;height:60px;border-radius:18px;font-size:22px">${clientInitials(c.id)}</span>
      <div>
        <h1 style="font-family:var(--serif);font-weight:400;font-size:28px;line-height:1.05">${escHtml(c.name)}</h1>
        <div class="cd-rate"><span class="revrate ${rateClass(s.revRate)}">${s.revRate}% revision rate</span>${s.scope?`<span class="badge-warn">${ic('triangle-alert')} ${s.scope} scope flag${s.scope>1?'s':''}</span>`:''}</div>
      </div>
    </div>
    <div class="stats" style="margin-top:18px">
      <div class="stat accent"><div class="lab">${ic('layers')} Total</div><div class="val tnum">${u(s.total)}</div><div class="cap">units logged</div></div>
      <div class="stat"><div class="lab">${ic('sparkles')} New work</div><div class="val tnum">${u(s.newW)}</div><div class="cap">${s.count} entries</div></div>
      <div class="stat"><div class="lab">${ic('rotate-ccw')} Revision</div><div class="val tnum">${u(s.rev)}</div><div class="cap">${Math.round(s.total?s.rev/s.total*100:0)}% of work</div></div>
      <div class="stat ${s.scope?'warnbg':''}"><div class="lab">${ic('triangle-alert')} Scope flags</div><div class="val tnum">${s.scope}</div><div class="cap">${s.scope?'difficulty evidence':'smooth sailing'}</div></div>
    </div>
    <div class="cd-actions">
      <button class="btn ghost" data-edit-client="${c.id}">${ic('pencil')} Rename</button>
      <button class="btn ghost" data-archive="${c.id}">${ic(c.archived?'archive-restore':'archive')} ${c.archived?'Unarchive':'Archive'}</button>
      <button class="btn ghost danger" data-delete-client="${c.id}">${ic('trash-2')} Delete</button>
    </div>

    <div class="section-h"><h2>Client difficulty</h2></div>
    ${(() => { const d = computeDifficulty(c.id); return `
    <div class="diff-card">
      <div class="diff-top">
        <div class="diff-score diff-${d.tier.tone}"><b class="tnum">${d.score}</b><span>/ 100</span></div>
        <div class="diff-tier diff-${d.tier.tone}">${d.tier.label}</div>
      </div>
      <div class="diff-gauge"><div class="diff-fill diff-${d.tier.tone}" style="width:${d.score}%"></div></div>
      <div class="diff-factors">
        ${d.factors.map(f=>`<div class="diff-f">
          <div class="df-h"><span>${f.label}</span><b class="tnum">${f.pct}<small>%</small></b></div>
          <div class="df-bar"><div class="diff-${d.tier.tone}" style="width:${f.pct}%"></div></div>
          <small class="df-d">${f.detail} · weighted ${f.weight}%</small>
        </div>`).join('')}
      </div>
      <div class="diff-note">${ic('info')} Weighted by how heavy each revision was, who caused it, and how many rounds the same piece went through — plus scope creep, rush jobs and missing briefs. Minor tweaks barely move it; our own mistakes don't count. Your evidence when talking capacity with a lead.</div>
    </div>`; })()}

    <div class="section-h"><h2>History</h2><span class="link">${history.length} entries</span></div>
    <div class="stack" style="display:flex;flex-direction:column;gap:9px">${history.map(e=>entryCard(e)).join('')}</div>
  </div>`;
}

function wireClientDetail(root) {
  root.querySelectorAll('[data-entry]').forEach(el=>el.addEventListener('click',()=>openDetail(el.dataset.entry)));
  root.querySelectorAll('[data-go]').forEach(el=>el.addEventListener('click',()=>go(el.dataset.go)));
  const ab = root.querySelector('[data-archive]');
  if (ab) ab.addEventListener('click', ()=> runAction(ab, async ()=>{
    const c=CLIENTS.find(x=>x.id===ab.dataset.archive);
    if (!c) return;
    const next = !c.archived;
    // optimistic flip + redraw, roll back if the server rejects
    c.archived = next;
    go('clientDetail');
    try {
      if (window.WLStore && window.WLStore.setClientArchived) await window.WLStore.setClientArchived(c.id, next);
      toast(next?'Client archived':'Client restored','info');
    } catch (err) {
      c.archived = !next;
      go('clientDetail');
      throw err;
    }
  }, 'Could not update client'));
  const eb = root.querySelector('[data-edit-client]');
  if (eb) eb.addEventListener('click', ()=>{
    const c=CLIENTS.find(x=>x.id===eb.dataset.editClient);
    if (c) openClientEdit(c, ()=>go('clientDetail'));
  });
  const db = root.querySelector('[data-delete-client]');
  if (db) db.addEventListener('click', ()=>{
    const c=CLIENTS.find(x=>x.id===db.dataset.deleteClient);
    if (c) confirmDeleteClient(c);
  });
}
