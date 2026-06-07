/* ============================================================
   WorkLog — shared render helpers
   ============================================================ */

// lucide icon span
function ic(name, attrs='') { return `<i data-lucide="${name}" ${attrs}></i>`; }

function avatarClass(id) {
  const i = CLIENTS.findIndex(c => c.id === id);
  return 'c' + (((i % 6) + 6) % 6);
}

function jobBadge(type) {
  const jt = JOB_TYPES[type];
  return `<span class="jt"><span class="dot" style="background:${jt.color}"></span>${jt.short}</span>`;
}

function newRevBadge(e) {
  const jt = JOB_TYPES[e.jobType];
  if (jt && jt.timeBased) {
    const kind = OTHER_KINDS[e.otherKind] || OTHER_KINDS.MEETING;
    const hrs = e.hours || e.quantity || 1;
    return `<span class="tag-time" style="font-weight:700">${kind.label} · ${u(hrs)}h</span>`;
  }
  if (!e.isRevision) return `<span class="tag-new" style="font-weight:700">New</span>`;
  const sev = SEVERITY[e.revisionSeverity];
  return `<span class="tag-rev" style="font-weight:700">Rev${e.revisionRound?(' R'+e.revisionRound):''}${sev?(' · '+sev.label):''}</span>`;
}

// compact entry card
function entryCard(e, opts={}) {
  const c = e._c;
  const over = c.overridden;
  const flags = [];
  if (isScope(e)) flags.push(`<span style="color:var(--bad)">${ic('triangle-alert')}</span>`);
  if (e.isFlagged && !isScope(e)) flags.push(`<span style="color:var(--bad)">${ic('flag')}</span>`);
  if (e.isStarred) flags.push(`<span style="color:var(--warn)">${ic('star','fill="currentColor"')}</span>`);

  const subBits = [ jobBadge(e.jobType), newRevBadge(e) ];
  if (isScope(e)) subBits.push(`<span class="badge-warn">${ic('triangle-alert')} Scope</span>`);

  return `<button class="entry" data-entry="${e.id}">
    <span class="av ${avatarClass(e.clientId)}">${clientInitials(e.clientId)}</span>
    <span class="body">
      <span class="top"><span class="client">${clientName(e.clientId)}</span></span>
      <span class="sub">${subBits.join('')}</span>
    </span>
    <span class="units">
      <b class="tnum">${u(c.final)}</b>
      <small>${over ? 'override' : 'units'}</small>
    </span>
    ${flags.length ? `<span class="flags">${flags.join('')}</span>` : ''}
  </button>`;
}

function refreshIcons(root) {
  if (window.lucide && window.lucide.createIcons) {
    window.lucide.createIcons({ attrs: { 'stroke-width': 2 }, ...(root?{nameAttr:'data-lucide'}:{}) });
  }
}

// ring svg helper
function ringSVG(value, max, size=116) {
  const r = (size - 11) / 2 - 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(value / max, 1);
  const off = circ * (1 - pct);
  return `<svg viewBox="0 0 ${size} ${size}">
    <circle class="rtrack" cx="${size/2}" cy="${size/2}" r="${r}"></circle>
    <circle class="rfill" cx="${size/2}" cy="${size/2}" r="${r}"
      stroke-dasharray="${circ.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
  </svg>`;
}

// toast
function toast(msg, kind='good') {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id='toast'; }
  (window.overlayHost ? overlayHost() : document.body).appendChild(t);
  const icon = kind==='good' ? 'check-circle-2' : 'info';
  t.innerHTML = `<i data-lucide="${icon}"></i><span>${msg}</span>`;
  t.className = 'show ' + kind;
  refreshIcons();
  clearTimeout(window._tt);
  window._tt = setTimeout(()=> t.className = '', 2400);
}

// animate a number from->to into element (commits final value immediately so
// it stays correct even when rAF is throttled in a background iframe)
function countUp(el, to, dur=600) {
  const from = parseFloat(el.dataset.cur || '0');
  el.dataset.cur = to;
  el.textContent = u(to);
  if (Math.abs(to - from) < 0.001) return;
  const start = performance.now();
  function step(now) {
    const p = Math.min((now - start)/dur, 1);
    const eased = 1 - Math.pow(1-p, 3);
    el.textContent = u(from + (to - from)*eased);
    if (p < 1) requestAnimationFrame(step);
    else el.textContent = u(to);
  }
  requestAnimationFrame(step);
}

/* ---- image compression + Supabase Storage upload ---- */
function compressSnap(file, maxPx = 600, maxKb = 50) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const blobUrl = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(blobUrl);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const tryQ = (q) => {
        canvas.toBlob(blob => {
          if (!blob) { reject(new Error('Canvas toBlob failed')); return; }
          if (blob.size <= maxKb * 1024 || q <= 0.1) resolve(blob);
          else tryQ(Math.round((q - 0.1) * 10) / 10);
        }, 'image/jpeg', q);
      };
      tryQ(0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Image load failed')); };
    img.src = blobUrl;
  });
}

async function uploadSnap(blob) {
  const sb = window.WL_SB;
  const uid = window.WL_CURRENT_USER_ID;
  if (!sb || !uid) throw new Error('Not signed in');
  const path = `${uid}/${Date.now()}.jpg`;
  const { error } = await sb.storage.from('snaps').upload(path, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  const { data } = await sb.storage.from('snaps').createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  return data.signedUrl;
}

/* ---- safe async action runner ----
   Every button that writes to the DB goes through this. It:
   • blocks re-entry while the action is in flight (kills rapid double-taps)
   • disables + shows a loading state on the trigger
   • surfaces any error as a toast
   Pair it with optimistic UI (update memory + close the sheet first) so it
   never feels like a hang. Throw from fn after rolling back to show the error. */
async function runAction(trigger, fn, errMsg) {
  if (trigger && trigger._busy) return;
  if (trigger) { trigger._busy = true; trigger.disabled = true; trigger.classList && trigger.classList.add('loading'); }
  try {
    await fn();
  } catch (err) {
    console.error(err);
    const detail = window.WLStoreErrorText ? window.WLStoreErrorText(err) : '';
    toast((errMsg || 'Something went wrong') + (detail ? `: ${detail}` : ''), 'info');
  } finally {
    if (trigger) { trigger._busy = false; trigger.disabled = false; trigger.classList && trigger.classList.remove('loading'); }
  }
}
