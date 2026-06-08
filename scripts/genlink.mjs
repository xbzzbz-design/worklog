#!/usr/bin/env node
/*
  Generate a sign-in link for a teammate WITHOUT sending any email.
  (Bypasses Supabase's built-in email rate limit — you send the link yourself.)

  Usage:
    SUPABASE_SERVICE_KEY=xxxxx node scripts/genlink.mjs teammate@email.com
    SUPABASE_SERVICE_KEY=xxxxx node scripts/genlink.mjs teammate@email.com invite

  - Get SUPABASE_SERVICE_KEY from: Supabase Dashboard → Project Settings → API →
    "service_role" secret. Keep it secret — never commit it or put it in the app.
  - Use the 2nd arg "invite" for a brand-new teammate (creates the account).
    Default "magiclink" is for someone already invited.
  - Copy the printed link and send it to them (LINE, etc). They open it on the
    device they want to sign in on. Magic links expire in ~1 hour.
*/

const PROJECT = 'kfdogajhojsyoxakncpa';
const APP_URL = 'https://xbzzbz-design.github.io/worklog/';

const key = process.env.SUPABASE_SERVICE_KEY;
const email = process.argv[2];
let type = process.argv[3] || 'magiclink';

if (!key) { console.error('✗ Set SUPABASE_SERVICE_KEY (Dashboard → Settings → API → service_role)'); process.exit(1); }
if (!email) { console.error('✗ Usage: node scripts/genlink.mjs <email> [magiclink|invite]'); process.exit(1); }

async function gen(linkType) {
  const res = await fetch(`https://${PROJECT}.supabase.co/auth/v1/admin/generate_link`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: linkType, email, options: { redirect_to: APP_URL } }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

let r = await gen(type);
// if the person doesn't exist yet, fall back to an invite (creates the account)
if (!r.ok && type === 'magiclink' && /user not found|not found/i.test(JSON.stringify(r.data))) {
  console.log('• User not found — generating an invite link instead…');
  type = 'invite';
  r = await gen('invite');
}

if (!r.ok) {
  console.error(`✗ Failed (${r.status}):`, r.data.msg || r.data.error_description || JSON.stringify(r.data));
  process.exit(1);
}

const link = r.data.action_link || (r.data.properties && r.data.properties.action_link);
console.log(`\n✓ ${type} link for ${email}:\n`);
console.log(link);
console.log('\nSend this to them — they open it on the device they want to sign in on.\n');
