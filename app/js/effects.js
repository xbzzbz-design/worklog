/* ============================================================
   WorkLog — micro-interactions, sync status, confetti
   ============================================================ */

window.NEW_ENTRY_ID = null;

/* ---- sync status indicator ---- */
let _syncTimer = null;
function setSync(state) {
  document.querySelectorAll('.sync-pill').forEach(p => {
    p.dataset.state = state;
    p.innerHTML = state === 'saving'
      ? `${ic('refresh-cw')}<span>Saving…</span>`
      : `${ic('cloud')}<span>Saved</span>`;
  });
  refreshIcons();
}
function markSyncing() {
  setSync('saving');
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(() => setSync('synced'), 850);
}
function markSynced() { clearTimeout(_syncTimer); setSync('synced'); }

/* ---- particle burst (stars / flags) ---- */
function burst(el, kind) {
  if (!el) return;
  el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop');
  const glyph = kind === 'star' ? '★' : kind === 'flag' ? '⚑' : '✦';
  const color = kind === 'star' ? 'var(--warn)' : kind === 'flag' ? 'var(--bad)' : 'var(--primary)';
  const host = el;
  host.style.position = host.style.position || 'relative';
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    s.className = 'particle';
    s.textContent = glyph;
    const ang = (Math.PI * 2 * i) / 7 + Math.random() * 0.5;
    const dist = 26 + Math.random() * 20;
    s.style.color = color;
    s.style.setProperty('--dx', `${Math.cos(ang) * dist}px`);
    s.style.setProperty('--dy', `${Math.sin(ang) * dist - 8}px`);
    s.style.left = '50%'; s.style.top = '50%';
    host.appendChild(s);
    setTimeout(() => s.remove(), 750);
  }
}

/* ---- tactile press on tappable controls (event delegation) ---- */
document.addEventListener('pointerdown', (e) => {
  const t = e.target.closest('.btn, .jt-card, .chip, .sev, .check, .fchip, .preset, .bt, .step-btn, .mini-step button, .entry, .cli-row, .fs-btn');
  if (!t) return;
  t.classList.add('pressed');
  const clear = () => { t.classList.remove('pressed'); };
  t.addEventListener('pointerup', clear, { once: true });
  t.addEventListener('pointerleave', clear, { once: true });
});

/* ---- reveal bars / rings when a screen mounts ---- */
function animateBars(root) {
  (root || document).querySelectorAll('.bar, .pdfc-bar').forEach((b, i) => {
    const h = b.style.height;
    b.style.height = '0%';
    requestAnimationFrame(() => { setTimeout(() => { b.style.height = h; }, 40 + i * 35); });
  });
}

/* ---- animate the Today ring drawing in ---- */
function animateRing(root) {
  const fill = (root || document).querySelector('.ring .rfill');
  if (!fill) return;
  const target = fill.getAttribute('stroke-dashoffset');
  const circ = fill.getAttribute('stroke-dasharray');
  fill.style.transition = 'none';
  fill.setAttribute('stroke-dashoffset', circ);
  void fill.getBoundingClientRect();
  setTimeout(() => {
    fill.style.transition = 'stroke-dashoffset 1.1s cubic-bezier(.2,.8,.2,1), stroke .4s';
    fill.setAttribute('stroke-dashoffset', target);
  }, 60);
}

/* ---- animate the week-in-review spark bars ---- */
function animateSpark(root) {
  (root || document).querySelectorAll('.wk-bar').forEach((b, i) => {
    const h = b.style.height;
    b.style.height = '4px';
    requestAnimationFrame(() => { setTimeout(() => { b.style.height = h; }, 60 + i * 45); });
  });
}
