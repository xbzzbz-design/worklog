/* WorkLog production data adapter: replaces prototype arrays with Supabase data. */
(function () {
  const supabaseUrl = window.WL_SUPABASE_URL;
  const supabaseKey = window.WL_SUPABASE_ANON_KEY;
  const sb = window.supabase && window.supabase.createClient
    ? window.supabase.createClient(supabaseUrl, supabaseKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit' }
      })
    : null;

  window.WL_SB = sb;
  window.WL_CURRENT_USER_ID = null;

  const fromDbEntry = (r) => ({
    id: r.id,
    userId: r.user_id,
    clientId: r.client_id,
    date: r.date,
    jobType: r.job_type,
    otherKind: r.other_kind || 'MEETING',
    quantity: r.quantity || 1,
    hours: r.job_type === 'OTHER' ? (r.quantity || 1) : undefined,
    isRevision: !!r.is_revision,
    parentId: r.parent_id || null,
    revisionRound: r.revision_round,
    revisionSeverity: r.revision_severity,
    revisionCause: r.revision_cause,
    motionScenes: r.motion_scenes || 0,
    conditionBriefIncomplete: !!r.condition_brief_incomplete,
    conditionAssetNotProvided: !!r.condition_asset_not_provided,
    conditionDeadlineRush: !!r.condition_deadline_rush,
    manualOverride: r.manual_override,
    manualOverrideReason: r.manual_override_reason || '',
    note: r.note || '',
    driveLink: r.drive_link || '',
    snap: r.snap_image_path || null,
    isFlagged: !!r.is_flagged,
    flagNote: r.flag_note || '',
    isStarred: !!r.is_starred,
  });

  const toDbEntry = (e, userId) => ({
    user_id: userId,
    client_id: e.clientId,
    date: e.date,
    job_type: e.jobType,
    other_kind: e.jobType === 'OTHER' ? (e.otherKind || 'MEETING') : null,
    quantity: e.jobType === 'OTHER' ? (e.hours || e.quantity || 1) : (e.quantity || 1),
    is_revision: !!e.isRevision,
    parent_id: e.parentId || null,
    revision_round: e.isRevision ? (e.revisionRound || 1) : null,
    revision_severity: e.isRevision ? (e.revisionSeverity || 'STANDARD') : null,
    revision_cause: e.isRevision ? e.revisionCause : null,
    motion_scenes: e.motionScenes || 0,
    condition_brief_incomplete: !!e.conditionBriefIncomplete,
    condition_asset_not_provided: !!e.conditionAssetNotProvided,
    condition_deadline_rush: !!e.conditionDeadlineRush,
    calculated_units: calcUnits(e).calculated,
    manual_override: e.manualOverride == null ? null : e.manualOverride,
    manual_override_reason: e.manualOverrideReason || null,
    note: e.note || null,
    drive_link: e.driveLink || null,
    snap_image_path: e.snap || null,
    is_flagged: !!e.isFlagged,
    flag_note: e.flagNote || null,
    is_starred: !!e.isStarred,
    updated_at: new Date().toISOString(),
  });

  function replaceArray(target, rows) {
    target.splice(0, target.length, ...rows);
  }

  function initials(name) {
    return (name || 'Designer').split(/\s+/).map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();
  }

  async function bootstrap() {
    if (!sb) return;
    const { data: auth } = await sb.auth.getUser();
    const user = auth && auth.user;
    if (!user) {
      window.parent && window.parent.postMessage({ type: 'WL_SIGNED_OUT' }, window.location.origin);
      return;
    }
    window.WL_CURRENT_USER_ID = user.id;

    const [meRes, usersRes, clientsRes, entriesRes, holidaysRes, leaveRes, settingsRes, helpRes] = await Promise.all([
      sb.from('users').select('*').eq('id', user.id).single(),
      sb.from('users').select('*').order('name'),
      sb.from('clients').select('*').order('name'),
      sb.from('entries').select('*').order('date', { ascending: false }),
      sb.from('holidays').select('*').order('date'),
      sb.from('leave').select('*'),
      sb.from('team_settings').select('*').single(),
      sb.from('help_requests').select('*').order('created_at', { ascending: false }),
    ]);

    if (meRes.data) {
      SETTINGS.userName = meRes.data.name || SETTINGS.userName;
      SETTINGS.dailyMax = meRes.data.daily_max || SETTINGS.dailyMax;
    }

    if (settingsRes.data) {
      TEAM_SETTINGS.workdays.splice(0, TEAM_SETTINGS.workdays.length, ...(settingsRes.data.workdays || [1,2,3,4,5]));
      TEAM_SETTINGS.holidayAddOn = settingsRes.data.holiday_addon || TEAM_SETTINGS.holidayAddOn;
    }

    replaceArray(CLIENTS, (clientsRes.data || []).map(c => ({ id: c.id, name: c.name, archived: !!c.archived })));

    replaceArray(TEAM, (usersRes.data || []).map((u, idx) => ({
      id: u.id,
      name: u.name,
      initials: initials(u.name),
      dailyMax: u.daily_max || 7,
      color: ['av-purple','av-green','av-blue','av-pink','av-amber','av-slate'][idx % 6],
      you: u.id === user.id,
    })));

    replaceArray(HOLIDAYS, (holidaysRes.data || []).map(h => ({ id: h.id, date: h.date, name: h.name })));

    Object.keys(LEAVE).forEach(k => delete LEAVE[k]);
    (leaveRes.data || []).forEach(l => {
      if (!LEAVE[l.user_id]) LEAVE[l.user_id] = [];
      LEAVE[l.user_id].push({ id: l.id, date: l.date, type: l.type });
    });

    replaceArray(ENTRIES, (entriesRes.data || []).map(fromDbEntry));
    ENTRIES.forEach(e => { e._c = calcUnits(e); });

    replaceArray(HELP_REQUESTS, (helpRes.data || []).map(h => ({
      id: h.id,
      byId: h.author_id,
      clientId: null,
      title: h.description,
      need: h.description,
      hours: h.hours_needed || 1,
      urgency: h.urgency === 'high' ? 'today' : 'soon',
      status: h.status,
      helperId: h.handled_by,
      thanks: h.thanks_message || '',
      loggedHours: null,
    })));
  }

  async function saveEntry(entry) {
    const { data: auth } = await sb.auth.getUser();
    const user = auth && auth.user;
    if (!user) throw new Error('Not signed in');
    const payload = toDbEntry(entry, user.id);
    const { data, error } = await sb.from('entries').insert(payload).select('*').single();
    if (error) throw error;
    const saved = fromDbEntry(data);
    saved._c = calcUnits(saved);
    ENTRIES.unshift(saved);
    return saved;
  }

  async function deleteEntry(id) {
    const { error } = await sb.from('entries').delete().eq('id', id);
    if (error) throw error;
  }

  window.WLStore = { bootstrap, saveEntry, deleteEntry, supabase: sb };
})();
