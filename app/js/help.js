/* ============================================================
   WorkLog — Help section (accordion guides)
   ============================================================ */

const HELP = {
  jobTypes: {
    title: 'Job type guide', icon: 'shapes',
    items: [
      { h: 'Variation · Text', rate: 0.25, d: 'Same template, only the words or colours change.', ex: 'Swap headline copy, update a price, change a button colour.' },
      { h: 'Variation · Image Swap', rate: 0.5, d: 'Same template, swap the imagery.', ex: 'Replace the product photo on an existing layout.' },
      { h: 'Adaptation', rate: 0.5, d: 'Reformat existing work to a new size or platform.', ex: 'Portrait → landscape, Facebook post → Instagram Story.' },
      { h: 'Single Banner', rate: 1.0, d: 'One fresh design piece.', ex: 'A promo banner, a social post designed from scratch.' },
      { h: 'Infographic', rate: 2.0, d: 'Complex layout that organises information.', ex: 'Step-by-step guide, data visualisation, comparison chart.' },
      { h: 'Motion', rate: 'tiered', d: 'Animation work — scored per scene by how heavy each one is, not a flat rate. Pick the tier that matches the effort.',
        list: ['Simple (+1.5/scene) — still image with simple text motion', 'Standard (+2/scene) — simple, plus AI-generated video', 'Complex (custom) — heavier, e.g. an animated infographic or a long clip cut with self-generated audio', 'Adapting/editing existing motion? Log as Motion and tick Revision — severity discounts the scenes'] },
      { h: 'Meeting / Other', rate: 1.0, d: 'Time-based, not piece-based — counts per hour (1 unit = 1 hour). For work that has no file but still eats your day.', ex: 'Meetings, briefings, covering for someone, admin & coordination.' },
    ],
  },
  revisions: {
    title: 'Revision guide', icon: 'rotate-ccw',
    items: [
      { h: 'Minor', rate: '0.25', d: 'Small fixes that don’t affect the main layout.',
        list: ['Change a font size', 'Fix a typo', 'Tweak a button or small element colour', 'Swap a single image'] },
      { h: 'Standard', rate: '0.5', d: 'Partial rework that affects composition.',
        list: ['Move a key element', 'Redo one section', 'Add or remove a block of information'] },
      { h: 'Major / Redo', rate: 'job rate', d: 'New direction — almost everything redone.',
        list: ['Change the whole concept', 'Change mood & tone', 'Rebuild the layout', 'Client changed their mind after approving'] },
      { h: 'Our mistake', rate: 'no credit', d: 'If the error was ours, it doesn’t count. Honest logging keeps the whole report credible.', list: [] },
    ],
  },
  conditions: {
    title: 'Conditions guide', icon: 'plus-circle',
    items: [
      { h: 'Brief incomplete', rate: '+0.5', d: 'You had to fill the gaps yourself.',
        list: ['Source references or content yourself', 'Guess what the client wanted', 'Waited over 2 hours for an answer'] },
      { h: 'Sourced assets yourself', rate: '+0.5', d: 'The client didn’t provide what you needed.',
        list: ['No product photos sent', 'No usable logo format', 'Found stock photos or icons yourself'] },
      { h: 'Rush deadline', rate: '+0.5', d: 'Same-day turnaround pressure.',
        list: ['Received and delivered the same day', 'Work added to your plate mid-day'] },
    ],
  },
};

function renderHelp() {
  return `
  <div class="page help">
    <div class="greet" style="padding-bottom:14px">
      <div class="eyebrow">Help</div>
      <h1><em>How the fair-credit math works</em></h1>
      <div class="sub">Different work deserves different credit. Here's the logic behind every number.</div>
    </div>

    <div class="help-hero card pad">
      ${ic('scale')}
      <div>
        <b>Fairness, not a timesheet.</b>
        <p>Eight infographics shouldn't equal one banner. WorkLog weights each piece so your report reflects what you actually did — and gives you evidence when scope creeps.</p>
      </div>
    </div>

    ${Object.entries(HELP).map(([key, sec])=>`
      <div class="help-sec">
        <div class="help-sec-h">${ic(sec.icon)} ${sec.title}</div>
        <div class="acc">
          ${sec.items.map((it,i)=>`
            <div class="acc-item" data-acc="${key}-${i}">
              <button class="acc-h">
                <span class="acc-title">${it.h}</span>
                <span class="acc-right"><span class="acc-rate">${typeof it.rate==='number'?u(it.rate):it.rate}</span>${ic('chevron-down')}</span>
              </button>
              <div class="acc-body">
                <div class="acc-inner">
                  <p class="acc-desc">${it.d}</p>
                  ${it.ex?`<div class="acc-ex"><span>Example</span>${it.ex}</div>`:''}
                  ${it.list&&it.list.length?`<ul class="acc-list">${it.list.map(l=>`<li>${ic('check')} ${l}</li>`).join('')}</ul>`:''}
                </div>
              </div>
            </div>`).join('')}
        </div>
      </div>`).join('')}

    <div class="help-sec">
      <div class="help-sec-h">${ic('calculator')} Worked examples</div>
      <p class="ex-intro">Real jobs, fully broken down — so the maths never feels like a black box.</p>
      <div class="ex-list">${EXAMPLES.map(exampleCard).join('')}</div>
    </div>

    <button class="btn ghost full" id="replayOnboard" style="margin-top:8px">${ic('play')} Replay the intro</button>
  </div>`;
}

const EXAMPLES = [
  { icon:'rectangle-horizontal', title:'A single banner', desc:'One ad banner designed from scratch.', e:{ jobType:'SINGLE_BANNER', quantity:1 } },
  { icon:'images', title:'A photo-swap set', desc:'Same layout, 8 product photos swapped in.', e:{ jobType:'VARIATION_SWAP', quantity:8 } },
  { icon:'bar-chart-3', title:'A set of infographics', desc:'6 data-heavy infographic slides.', e:{ jobType:'INFOGRAPHIC', quantity:6 } },
  { icon:'clapperboard', title:'Motion · 2 simple scenes', desc:'Two still-image, text-motion scenes.', e:{ jobType:'MOTION', motionSimple:2 } },
  { icon:'film', title:'Motion · 2 AI-video scenes', desc:'Two AI-generated video scenes.', e:{ jobType:'MOTION', motionStandard:2 } },
  { icon:'flame', title:'A hard-time client', desc:'2 infographics — no brief, you sourced assets, same-day rush.', e:{ jobType:'INFOGRAPHIC', quantity:2, conditionBriefIncomplete:true, conditionAssetNotProvided:true, conditionDeadlineRush:true } },
  { icon:'rotate-ccw', title:'A scope-creep redo', desc:'New direction after approval — full banner redo ×2.', e:{ jobType:'SINGLE_BANNER', quantity:2, isRevision:true, revisionRound:3, revisionSeverity:'MAJOR', revisionCause:'SCOPE_CREEP' } },
  { icon:'shield-check', title:'Our own mistake', desc:'We shipped a typo — re-export ×3. Honest = no credit.', e:{ jobType:'SINGLE_BANNER', quantity:3, isRevision:true, revisionSeverity:'STANDARD', revisionCause:'OUR_MISTAKE' } },
  { icon:'life-buoy', title:'Covering for your director', desc:'2 hours walking him through something he should know.', e:{ jobType:'OTHER', otherKind:'ADVISORY', hours:2 } },
];

function exampleCard(x) {
  const base = { quantity:1, isRevision:false, motionScenes:0, conditionBriefIncomplete:false, conditionAssetNotProvided:false, conditionDeadlineRush:false, manualOverride:null };
  const c = calcUnits(Object.assign({}, base, x.e));
  return `<div class="ex-card">
    <div class="ex-h">
      <span class="ex-ic">${ic(x.icon)}</span>
      <div class="ex-meta"><b>${x.title}</b><small>${x.desc}</small></div>
      <span class="ex-total"><b class="tnum">${u(c.final)}</b><small>units</small></span>
    </div>
    <div class="ex-lines">
      ${c.lines.map(l=>`<div class="ex-line ${l.muted?'muted':''}"><span>${l.label}</span><span class="tnum">${l.val===0?'0.0':'+'+u(l.val)}</span></div>`).join('')}
    </div>
  </div>`;
}

function wireHelp(root) {
  root.querySelectorAll('.acc-item').forEach(item => {
    const h = item.querySelector('.acc-h');
    h.addEventListener('click', () => {
      const open = item.classList.contains('open');
      // close siblings in same accordion
      item.closest('.acc').querySelectorAll('.acc-item.open').forEach(x=>{ if(x!==item){ x.classList.remove('open'); x.querySelector('.acc-body').style.maxHeight=null; }});
      item.classList.toggle('open', !open);
      const body = item.querySelector('.acc-body');
      body.style.maxHeight = open ? null : body.querySelector('.acc-inner').scrollHeight + 'px';
    });
  });
  const rb = root.querySelector('#replayOnboard');
  if (rb) rb.addEventListener('click', openOnboarding);
}
