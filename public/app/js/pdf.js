/* ============================================================
   WorkLog — PDF preview (paginated export document)
   ============================================================ */

function openPdfPreview() {
  const s = rangeStats(reportRange.from, reportRange.to);
  const max = SETTINGS.dailyMax;
  const peak = Math.max(max, ...s.dayList.map(d=>d[1]), 1);

  // build pages array, footer added per page
  const pages = [];

  // inline SVG so the brand mark renders in the print window (no lucide there)
  const layersSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>`;

  /* ---- PAGE 1: header + summary + chart ---- */
  pages.push(`
    <div class="pdf-head">
      <div class="ph-brand"><span class="ph-mark">${layersSvg}</span> WorkLog</div>
      <div class="ph-title">Workload Report</div>
      <div class="ph-meta">
        <div><span>Designer</span><b>${SETTINGS.userName}</b></div>
        <div><span>Period</span><b>${fmtDate(reportRange.from)} – ${fmtDate(reportRange.to)}</b></div>
        <div><span>Generated</span><b>${fmtDate(TODAY)}</b></div>
      </div>
    </div>
    <div class="pdf-kpis">
      <div class="pk"><span>Total workload</span><b class="tnum">${u(s.total)}</b><small>units</small></div>
      <div class="pk"><span>New work</span><b class="tnum">${u(s.newWork)}</b><small>units</small></div>
      <div class="pk"><span>Revision</span><b class="tnum">${u(s.revWork)}</b><small>units</small></div>
      <div class="pk ${s.scope.length?'warn':''}"><span>Scope flags</span><b class="tnum">${s.scope.length}</b><small>flagged</small></div>
    </div>
    <div class="pdf-sec-t">Daily workload across period</div>
    <div class="pdf-chart">
      <div class="pdfc-area">
        <div class="pdfc-max" style="bottom:${(max/peak)*100}%"><span>daily max ${u(max)}</span></div>
        <div class="pdfc-bars">
          ${s.dayList.map(([date,val])=>`<div class="pdfc-col">
            <div class="pdfc-bar ${val>max?'over':''}" style="height:${(val/peak)*100}%"></div>
            <div class="pdfc-x">${new Date(date).getDate()}</div>
          </div>`).join('')}
        </div>
      </div>
    </div>
  `);

  /* ---- PAGE 2: daily log ---- */
  let dailyHtml = `<div class="pdf-sec-t">Daily log</div>`;
  s.dayList.slice().reverse().forEach(([date]) => {
    const dayEs = s.es.filter(e=>e.date===date);
    const dt = sum(dayEs, e=>e._c.final);
    dailyHtml += `<div class="pdf-day">
      <div class="pdf-day-h"><b>${fmtDate(date)}</b><span class="tnum">${u(dt)} units</span></div>
      <table class="pdf-log">
        <thead><tr><th>Client</th><th>Job</th><th>Qty</th><th>Type</th><th>Add-ons</th><th class="r">Units</th></tr></thead>
        <tbody>
          ${dayEs.map(e=>{
            const c = e._c;
            const addons = [];
            if (e.conditionBriefIncomplete) addons.push('Brief');
            if (e.conditionAssetNotProvided) addons.push('Assets');
            if (e.conditionDeadlineRush) addons.push('Rush');
            if (e.motionScenes>0) addons.push(`Motion×${e.motionScenes}`);
            const scope = isScope(e);
            const _jt = JOB_TYPES[e.jobType];
            const _tb = _jt && _jt.timeBased;
            const qtyCell = _tb ? `${u(e.hours||e.quantity||1)}h` : e.quantity;
            const typeCell = _tb ? (OTHER_KINDS[e.otherKind]||OTHER_KINDS.MEETING).label : (e.isRevision?`Rev ${SEVERITY[e.revisionSeverity]?.label||''}`:'New');
            return `<tr class="${scope?'scope':''}">
              <td>${clientName(e.clientId)} ${e.isStarred?'★':''}${e.isFlagged&&!scope?' ⚑':''}</td>
              <td>${_jt.short}</td>
              <td>${qtyCell}</td>
              <td>${typeCell}${scope?' ⚠':''}</td>
              <td>${addons.join(', ')||'—'}</td>
              <td class="r tnum"><b>${u(c.final)}</b>${c.overridden?`<i class="ov-note">manual · calc ${u(c.calculated)}</i>`:''}</td>
            </tr>${e.note?`<tr class="noterow"><td colspan="6">↳ ${e.note}</td></tr>`:''}`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  });
  pages.push(dailyHtml);

  /* ---- PAGE: scope flag log (only if any) ---- */
  if (s.scope.length) {
    pages.push(`
      <div class="pdf-sec-t warn">⚠ Scope flag log</div>
      <p class="pdf-lede">Revisions caused by scope beyond the agreed contract. Logged as evidence — included regardless of report filters.</p>
      <table class="pdf-log scope-table">
        <thead><tr><th>Date</th><th>Client</th><th>Job</th><th>Severity</th><th>Note</th><th class="r">Units</th></tr></thead>
        <tbody>
          ${s.scope.map(e=>`<tr class="scope">
            <td>${fmtDate(e.date)}</td><td>${clientName(e.clientId)}</td>
            <td>${JOB_TYPES[e.jobType].short}</td><td>${SEVERITY[e.revisionSeverity]?.label||''}</td>
            <td>${e.flagNote||e.note||'—'}</td><td class="r tnum"><b>${u(e._c.final)}</b></td>
          </tr>`).join('')}
        </tbody>
      </table>
      <div class="pdf-callout">Found <b>${s.scope.length}</b> instance${s.scope.length>1?'s':''} of scope creep in this period.</div>
    `);
  }

  /* ---- PAGE: client breakdown ---- */
  pages.push(`
    <div class="pdf-sec-t">Client breakdown</div>
    <table class="pdf-log client-table">
      <thead><tr><th>Client</th><th class="r">Total</th><th class="r">New</th><th class="r">Rev</th><th class="r">Scope</th><th class="r">Rev %</th></tr></thead>
      <tbody>
        ${s.clientList.map((c,i)=>`<tr class="${i%2?'alt':''}">
          <td><b>${clientName(c.id)}</b></td>
          <td class="r tnum"><b>${u(c.total)}</b></td>
          <td class="r tnum">${u(c.newW)}</td>
          <td class="r tnum">${u(c.rev)}</td>
          <td class="r tnum">${c.scope||'—'}</td>
          <td class="r"><span class="pdf-rate ${c.revRate<20?'g':c.revRate<=50?'y':'r'}">${c.revRate}%</span></td>
        </tr>`).join('')}
      </tbody>
    </table>
  `);

  /* ---- PAGE: appendix evidence ---- */
  const evid = s.es.filter(e=>e.snap || e.driveLink);
  pages.push(`
    <div class="pdf-sec-t">Appendix — delivery evidence</div>
    <table class="pdf-log evid-table">
      <thead><tr><th>Date</th><th>Client</th><th>Job</th><th>Evidence</th></tr></thead>
      <tbody>
        ${evid.length ? evid.map(e=>`<tr>
          <td>${fmtDate(e.date)}</td><td>${clientName(e.clientId)}</td><td>${JOB_TYPES[e.jobType].short}</td>
          <td>${e.snap?`<span class="evid-thumb">▦</span> ${e.snap}`:''}${e.driveLink?`<a class="evid-link">${e.driveLink}</a>`:''}</td>
        </tr>`).join('') : `<tr><td colspan="4" class="empty">No evidence attached this period</td></tr>`}
      </tbody>
    </table>
    <p class="pdf-footnote">Quick-snap images and Google Drive links attached here are evidence of work actually delivered.</p>
  `);

  const N = pages.length;
  const docHtml = pages.map((body, i) => `
    <div class="pdf-page">
      <div class="pdf-body">${body}</div>
      <div class="pdf-foot"><span>WorkLog</span><span>${SETTINGS.userName}</span><span>Page ${i+1} of ${N}</span></div>
    </div>`).join('');

  let modal = mountOverlay('pdfModal');
  modal.innerHTML = `
    <div class="pdf-overlay"></div>
    <div class="pdf-shell">
      <div class="pdf-bar">
        <div class="pb-l">${ic('file-text')} <b>Workload Report</b> <span>${fmtDate(reportRange.from)} – ${fmtDate(reportRange.to)} · ${N} pages</span></div>
        <div class="pb-r">
          <button class="btn ghost" id="pdfDownload">${ic('download')} Download</button>
          <button class="pdf-close" id="pdfClose">${ic('x')}</button>
        </div>
      </div>
      <div class="pdf-scroll"><div class="pdf-fit"><div class="pdf-doc">${docHtml}</div></div></div>
    </div>`;
  modal.classList.add('open');
  refreshIcons();
  document.body.classList.add('pdf-open');

  // scale the fixed-width document to fit the viewport (same pro layout on mobile + desktop)
  const fitPdf = () => {
    const scroll = modal.querySelector('.pdf-scroll');
    const fit = modal.querySelector('.pdf-fit');
    const doc = modal.querySelector('.pdf-doc');
    if (!scroll || !doc) return;
    const avail = scroll.clientWidth - 28;
    const s = Math.min(1, avail / 760);
    doc.style.transform = `scale(${s})`;
    fit.style.width = (760 * s) + 'px';
    fit.style.height = (doc.offsetHeight * s) + 'px';
  };
  requestAnimationFrame(fitPdf);
  setTimeout(fitPdf, 60);
  window.addEventListener('resize', fitPdf);
  modal._fitPdf = fitPdf;

  modal.querySelector('#pdfClose').addEventListener('click', closePdf);
  modal.querySelector('.pdf-overlay').addEventListener('click', closePdf);
  modal.querySelector('#pdfDownload').addEventListener('click', () => {
    exportPdf(docHtml, `WorkLog Report · ${fmtDate(reportRange.from)} – ${fmtDate(reportRange.to)}`);
  });
}

// Open a clean print window with the styled document and trigger the browser's
// "Save as PDF". Keeps the exact mockup design (no app chrome).
function exportPdf(docHtml, title) {
  const cssBase = location.href; // resolves css/*.css relative to WorkLog.html
  const href = (f) => new URL('css/' + f, cssBase).href;
  const printCss = `
    @page { size: A4; margin: 0; }
    html, body { margin: 0; padding: 0; background: #fff; }
    .pdf-doc { width: auto; gap: 0; transform: none !important; display: block; }
    .pdf-page {
      width: 210mm; min-height: 297mm; height: auto;
      box-shadow: none; border-radius: 0; margin: 0;
      page-break-after: always; break-after: page;
    }
    .pdf-page:last-child { page-break-after: auto; break-after: auto; }
    .pdf-day, .pdf-callout, tr { page-break-inside: avoid; break-inside: avoid; }
    @media screen {
      body { background: #555; padding: 20px 0; }
      .pdf-page { margin: 0 auto 18px; box-shadow: 0 8px 30px rgba(0,0,0,.3); }
      .print-hint { position: fixed; top: 0; left: 0; right: 0; background: #1c1b1f; color: #fff;
        font: 600 13px/1.4 system-ui, sans-serif; padding: 11px 16px; display: flex; gap: 12px;
        align-items: center; justify-content: center; z-index: 9; }
      .print-hint button { background: #fff; color: #1c1b1f; border: 0; border-radius: 8px;
        padding: 7px 14px; font: inherit; font-weight: 700; cursor: pointer; }
      body { padding-top: 64px; }
    }
    @media print { .print-hint { display: none !important; } }
  `;
  const html = `<!doctype html><html data-theme="light"><head><meta charset="utf-8">
    <title>${title}</title>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link rel="stylesheet" href="${href('worklog.css')}">
    <link rel="stylesheet" href="${href('report.css')}">
    <style>${printCss}</style></head>
    <body>
      <div class="print-hint">${title} <button onclick="window.print()">Save as PDF</button></div>
      <div class="pdf-doc">${docHtml}</div>
      <script>
        window.addEventListener('load', function(){
          // give the stylesheets a tick to apply, then open the print dialog
          setTimeout(function(){ try { window.focus(); window.print(); } catch(e){} }, 350);
        });
      <\/script>
    </body></html>`;

  const w = window.open('', '_blank');
  if (!w) { toast('Allow pop-ups to export the PDF', 'info'); return; }
  w.document.open();
  w.document.write(html);
  w.document.close();
  toast('Opening print dialog — choose “Save as PDF”', 'good');
}
function closePdf() {
  const m = document.getElementById('pdfModal');
  if (m) { m.classList.remove('open'); if (m._fitPdf) window.removeEventListener('resize', m._fitPdf); }
  document.body.classList.remove('pdf-open');
}
