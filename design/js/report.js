/* ============================================================
   WorkLog — Report + PDF preview
   ============================================================ */

let reportRange = { from: '2026-06-01', to: '2026-06-30', label: 'This month' };

function rangeStats(from, to) {
  const es = rangeEntries(from, to);
  const total = sum(es, e=>e._c.final);
  const newWork = sum(es.filter(e=>!e.isRevision), e=>e._c.final);
  const revWork = sum(es.filter(e=>e.isRevision), e=>e._c.final);
  const scope = es.filter(isScope);

  // by day
  const days = {};
  es.forEach(e => { days[e.date] = (days[e.date]||0) + e._c.final; });
  const dayList = Object.entries(days).sort((a,b)=>a[0]<b[0]?-1:1);

  // by client
  const byClient = {};
  es.forEach(e => {
    const id = e.clientId;
    if (!byClient[id]) byClient[id] = { total:0, newW:0, rev:0, scope:0, count:0, revCount:0 };
    const b = byClient[id];
    b.total += e._c.final; b.count++;
    if (e.isRevision) { b.rev += e._c.final; b.revCount++; } else b.newW += e._c.final;
    if (isScope(e)) b.scope++;
  });
  const clientList = Object.entries(byClient)
    .map(([id,b])=>({ id, ...b, revRate: b.count? Math.round(b.revCount/b.count*100):0 }))
    .sort((a,b)=>b.total-a.total);

  return { es, total, newWork, revWork, scope, dayList, clientList };
}

function renderReport() {
  const s = rangeStats(reportRange.from, reportRange.to);
  const max = SETTINGS.dailyMax;
  const peak = Math.max(max, ...s.dayList.map(d=>d[1]), 1);

  // previous equivalent period (for comparison)
  const isoD = (d) => d.toISOString().slice(0,10);
  const dFrom = new Date(reportRange.from), dTo = new Date(reportRange.to);
  const lenDays = Math.round((dTo - dFrom)/86400000) + 1;
  const pTo = new Date(dFrom); pTo.setDate(pTo.getDate()-1);
  const pFrom = new Date(pTo); pFrom.setDate(pFrom.getDate()-(lenDays-1));
  const prev = rangeStats(isoD(pFrom), isoD(pTo));
  const dPct = (cur, prv) => prv ? Math.round((cur-prv)/prv*100) : (cur>0?100:0);
  const deltaTag = (cur, prv, goodUp=true) => {
    const p = dPct(cur, prv);
    if ((prv===0 && cur===0) || p===0) return `<div class="delta flat">${ic('minus')} 0%</div>`;
    const up = p >= 0;
    const good = goodUp ? up : !up;
    return `<div class="delta ${good?'up':'down'}">${ic(up?'arrow-up-right':'arrow-down-right')} ${Math.abs(p)}%</div>`;
  };

  const presets = [
    ['This week','2026-06-01','2026-06-07'],
    ['Last week','2026-05-25','2026-05-31'],
    ['This month','2026-06-01','2026-06-30'],
    ['Last month','2026-05-01','2026-05-31'],
    ['Custom','',''],
  ];

  return `
  <div class="page report">
    <div class="greet" style="padding-bottom:12px">
      <div class="eyebrow">Report</div>
      <h1><em>Your workload, on the record</em></h1>
      <div class="sub">Generate a clean PDF as evidence of what you actually did.</div>
    </div>

    <div class="preset-row">
      ${presets.map(p=>`<button class="preset ${p[0]===reportRange.label?'on':''}" data-preset="${p[0]}" data-from="${p[1]}" data-to="${p[2]}">${p[0]}</button>`).join('')}
    </div>
    <div class="custom-range" id="customRange" ${reportRange.label==='Custom'?'':'hidden'}>
      <div class="cr-field"><label>From</label><input type="date" id="crFrom" value="${reportRange.from}"></div>
      <div class="cr-field"><label>To</label><input type="date" id="crTo" value="${reportRange.to}"></div>
      <button class="btn soft" id="crApply">${ic('check')} Apply</button>
    </div>
    <div class="range-display">${ic('calendar')} ${fmtDate(reportRange.from)} → ${fmtDate(reportRange.to)} <span class="cmp-note">vs ${fmtDate(isoD(pFrom))} – ${fmtDate(isoD(pTo))}</span></div>

    <!-- summary cards -->
    <div class="rep-stats">
      <div class="stat accent"><div class="lab">${ic('layers')} Total</div><div class="val tnum">${u(s.total)}</div>${deltaTag(s.total, prev.total)}</div>
      <div class="stat"><div class="lab">${ic('sparkles')} New work</div><div class="val tnum">${u(s.newWork)}</div>${deltaTag(s.newWork, prev.newWork)}</div>
      <div class="stat"><div class="lab">${ic('rotate-ccw')} Revision</div><div class="val tnum">${u(s.revWork)}</div>${deltaTag(s.revWork, prev.revWork, false)}</div>
      <div class="stat ${s.scope.length?'warnbg':''}"><div class="lab">${ic('triangle-alert')} Scope flags</div><div class="val tnum">${s.scope.length}</div>${deltaTag(s.scope.length, prev.scope.length, false)}</div>
    </div>

    <!-- bar chart -->
    <div class="section-h"><h2>Daily workload</h2></div>
    <div class="chart card pad">
      <div class="chart-area">
        <div class="maxline" style="bottom:${(max/peak)*100}%"><span>max ${u(max)}</span></div>
        <div class="bars">
          ${s.dayList.map(([date,val])=>{
            const over = val > max;
            return `<div class="barcol">
              <div class="bar ${over?'over':''}" style="height:${(val/peak)*100}%" title="${u(val)}"><span class="bval tnum">${u(val)}</span></div>
              <div class="bx">${new Date(date).getDate()}</div>
            </div>`;
          }).join('')}
        </div>
      </div>
    </div>

    <!-- client breakdown -->
    <div class="section-h"><h2>By client</h2></div>
    <div class="cbreak">
      ${s.clientList.map(c=>`<div class="cb-row">
        <span class="av ${avatarClass(c.id)}">${clientInitials(c.id)}</span>
        <div class="cb-body">
          <div class="cb-name">${clientName(c.id)}${c.scope?` <span class="badge-warn">${ic('triangle-alert')}${c.scope}</span>`:''}</div>
          <div class="cb-sub">New <b class="tnum">${u(c.newW)}</b> · Rev <b class="tnum">${u(c.rev)}</b></div>
        </div>
        <div class="cb-right">
          <div class="cb-units tnum">${u(c.total)}<small>units</small></div>
          <span class="revrate ${c.revRate<20?'g':c.revRate<=50?'y':'r'}">${c.revRate}% rev</span>
        </div>
      </div>`).join('')}
    </div>

    ${s.scope.length ? `
    <div class="section-h"><h2 style="color:var(--bad-ink)">${ic('triangle-alert')} Scope flag log</h2></div>
    <div class="scope-list">
      ${s.scope.map(e=>`<div class="scope-item">
        <div class="si-top"><b>${clientName(e.clientId)}</b><span class="tnum">${u(e._c.final)}u</span></div>
        <div class="si-mid">${fmtDate(e.date)} · ${JOB_TYPES[e.jobType].short} · ${SEVERITY[e.revisionSeverity]?.label||''}</div>
        ${e.flagNote||e.note?`<div class="si-note">"${e.flagNote||e.note}"</div>`:''}
      </div>`).join('')}
    </div>` : ''}

    <div class="report-actions">
      <button class="btn lg" id="exportPdf">${ic('file-down')} Export PDF</button>
      <button class="btn ghost lg" id="shareLink">${ic('link-2')} Share link</button>
    </div>
    <div class="export-hint">A multi-page report with daily log, scope evidence &amp; appendix — or a read-only link your lead can open in the browser.</div>
  </div>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US',{ day:'numeric', month:'short', year:'numeric' });
}

function wireReport(root) {
  root.querySelectorAll('.preset').forEach(p => p.addEventListener('click', () => {
    if (p.dataset.preset === 'Custom') {
      reportRange = Object.assign({}, reportRange, { label: 'Custom' });
      rerenderScreen('report');
      return;
    }
    reportRange = { from: p.dataset.from, to: p.dataset.to, label: p.dataset.preset };
    rerenderScreen('report');
  }));
  const apply = root.querySelector('#crApply');
  if (apply) apply.addEventListener('click', () => {
    const f = root.querySelector('#crFrom').value, t = root.querySelector('#crTo').value;
    if (!f || !t) { toast('Pick both dates', 'info'); return; }
    if (f > t) { toast('From date is after To date', 'info'); return; }
    reportRange = { from: f, to: t, label: 'Custom' };
    rerenderScreen('report');
    toast('Custom range applied');
  });
  const ex = root.querySelector('#exportPdf');
  if (ex) ex.addEventListener('click', () => openPdfPreview());
  const sh = root.querySelector('#shareLink');
  if (sh) sh.addEventListener('click', () => openShareModal());
}

function openShareModal() {
  const link = `worklog.app/r/${Math.random().toString(36).slice(2,9)}`;
  const el = mountOverlay('detailModal');
  el.innerHTML = `
    <div class="dm-overlay"></div>
    <div class="dm-sheet" style="max-width:440px">
      <div class="dm-grab"></div>
      <div class="share-head">${ic('link-2')}<div><b>Read-only report link</b><small>Anyone with the link can view — not edit.</small></div></div>
      <div class="share-link"><span class="tnum">${link}</span><button class="btn soft" id="copyLink">${ic('copy')} Copy</button></div>
      <div class="share-opts">
        <label class="share-opt"><span>${ic('eye-off')} Hide client names</span><span class="mini-switch"></span></label>
        <label class="share-opt"><span>${ic('clock')} Expires in 30 days</span><span class="mini-switch on"></span></label>
      </div>
      <div class="share-note">${ic('info')} In production this generates a static, signed link (no login needed). For now it's a stub — the PDF export is fully working.</div>
    </div>`;
  el.classList.add('open');
  refreshIcons();
  el.querySelector('.dm-overlay').addEventListener('click', closeDetail);
  el.querySelector('#copyLink').addEventListener('click', () => {
    try { navigator.clipboard && navigator.clipboard.writeText(link); } catch(e){}
    toast('Link copied to clipboard');
  });
}
