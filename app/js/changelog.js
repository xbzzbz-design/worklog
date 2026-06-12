/* ============================================================
   WorkLog — What's new (changelog + unread dot)
   Add a new entry at the TOP. The red dot shows until the user
   opens this page (or dismisses the home banner).
   ============================================================ */

const CHANGELOG = [
  {
    id: '2026-06-10',
    date: 'June 10, 2026',
    title: 'Faster logging & a fairer team view',
    lines: [
      'Quick log ⚡ — jot the units now, add the client & details later',
      'Log any past or future day straight from the calendar',
      'Paste or drag a screenshot right onto a log (no saving the file first)',
      'Motion is now its own job type, scored by scene complexity (Simple / Standard / Complex)',
      'Variation & Adaptation can be marked Still or Motion — a motion version counts double',
      'New “Photo set” job type — add each piece into one cart; the set is one line on the report and one piece for difficulty, and can be revised as a whole',
      'Faster logging: a sticky Save bar (no scrolling to save), optional sections collapsed by default, the job type you use most pre-selected per client, and tap a job-type card again to +1 the quantity',
      'Client difficulty now weights revisions by severity, cause and how many rounds the same piece took (minor tweaks barely count; our mistakes don’t)',
      '“Shoot / on location” added for time-based work',
      'Team view now shows a load pulse — Healthy / Send snacks / Heavy week — instead of a scoreboard, and skips anyone who hasn’t logged so no one looks idle',
      'Help board shows a red badge when a teammate needs a hand',
      'Helpers can leave a note on how they’re helping, and you’re alerted when your request is picked up',
      'Export PDF: Google Drive links are now real, clickable links',
    ],
  },
];

function latestChangeId() { return CHANGELOG.length ? CHANGELOG[0].id : null; }
function changesSeen() {
  try { return localStorage.getItem('wl_changelog_seen') === latestChangeId(); } catch (e) { return true; }
}
function markChangesSeen() {
  try { localStorage.setItem('wl_changelog_seen', latestChangeId()); } catch (e) {}
  if (typeof updateChangelogDot === 'function') updateChangelogDot();
}

function renderChangelog() {
  return `
  <div class="page">
    <div class="greet" style="padding-bottom:14px">
      <div class="eyebrow">${ic('sparkles')} What's new</div>
      <h1><em>Every update, kept</em></h1>
      <div class="sub">New features and fixes — newest first. Come back anytime.</div>
    </div>
    ${CHANGELOG.map((c, i) => `
      <div class="cl-entry">
        <div class="cl-head">
          <b>${escHtml(c.title)}</b>
          <span class="cl-date">${i === 0 ? `${ic('circle-dot')} ` : ''}${c.date}</span>
        </div>
        <ul class="cl-list">${c.lines.map(l => `<li>${ic('check')} ${escHtml(l)}</li>`).join('')}</ul>
      </div>`).join('')}
  </div>`;
}

// opening the page marks everything read → clears the dot
function wireChangelog() { markChangesSeen(); }
