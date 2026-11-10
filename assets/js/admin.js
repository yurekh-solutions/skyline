/* ==========================================================================
   Skyline Solution Enterprises — admin.js
   Passcode gate, lead & review tables, CSV / JSON export, sheet mirror.
   Depends on: config.js, data.js, leads.js
   ========================================================================== */

(function (window, document) {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var DATA = window.SERVICE_DATA || { desks: [], services: {} };
  var STORE = window.SkylineStore;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var SESSION_KEY = (CFG.storagePrefix || 'skyline.v1.') + 'admin-session';

  /* the status vocabulary each record type can hold, shared by the table
     dropdowns and the add / edit dialog */
  var LEAD_STATUS = ['new', 'contacted', 'closed', 'archived'];
  var REVIEW_STATUS = ['pending', 'approved', 'hidden'];

  var APPS_SCRIPT = [
    '/**',
    ' * Skyline Solution Enterprises — lead & review sink.',
    ' * 1. Create a Google Sheet, name it "Skyline Leads".',
    ' * 2. Extensions > Apps Script, paste this whole file, Save.',
    ' * 3. Deploy > New deployment > Web app.',
    ' *    Execute as: Me   ·   Who has access: Anyone',
    ' * 4. Copy the /exec URL into assets/js/config.js -> leadEndpoint.',
    ' * Sheets and header rows are created automatically on first post.',
    ' */',
    'var LEAD_HEADERS = ["Received","Reference","Name","Phone","Email","Service","Message","Status","Source","UTM"];',
    'var REVIEW_HEADERS = ["Received","Reference","Name","Service","Rating","Review","Status"];',
    '',
    'function doPost(e) {',
    '  var lock = LockService.getScriptLock();',
    '  lock.tryLock(20000);',
    '  try {',
    '    var body = JSON.parse(e.postData.contents);',
    '    var r = body.record || {};',
    '    var ss = SpreadsheetApp.getActiveSpreadsheet();',
    '    if (body.kind === "review") {',
    '      append_(getSheet_(ss, "Reviews", REVIEW_HEADERS), [',
    '        r.createdAt, r.id, r.name, r.service, r.rating, r.text, r.status ]);',
    '    } else {',
    '      var src = r.source || {};',
    '      append_(getSheet_(ss, "Leads", LEAD_HEADERS), [',
    '        r.createdAt, r.id, r.name, r.phone, r.email, r.service, r.message,',
    '        r.status, src.referrer || "", src.utm || "" ]);',
    '    }',
    '    return json_({ ok: true, at: new Date().toISOString() });',
    '  } catch (err) {',
    '    return json_({ ok: false, error: String(err) });',
    '  } finally {',
    '    lock.releaseLock();',
    '  }',
    '}',
    '',
    'function getSheet_(ss, name, headers) {',
    '  var sh = ss.getSheetByName(name) || ss.insertSheet(name);',
    '  if (sh.getLastRow() === 0) {',
    '    sh.appendRow(headers);',
    '    sh.getRange(1, 1, 1, headers.length).setFontWeight("bold").setBackground("#0b1424").setFontColor("#ffffff");',
    '    sh.setFrozenRows(1);',
    '  }',
    '  return sh;',
    '}',
    '',
    'function append_(sh, row) { sh.appendRow(row); }',
    'function json_(obj) {',
    '  return ContentService.createTextOutput(JSON.stringify(obj))',
    '    .setMimeType(ContentService.MimeType.JSON);',
    '}',
    ''
  ].join('\n');

  document.addEventListener('DOMContentLoaded', function () {
    if (!STORE) {
      var gateCard = $('.gate-card');
      if (gateCard) gateCard.innerHTML = '<h1>Dashboard not ready</h1><p class="gate-note">The dashboard did not load. Please reload this page.</p>';
      return;
    }
    var year = $('[data-year]');
    if (year) year.textContent = String(new Date().getFullYear());
    var code = $('[data-apps-script]');
    if (code) code.textContent = APPS_SCRIPT;

    initGate();
    initPasscodeToggle();
    initThemeToggle();
    initTabs();
    initToolbar();
    initEditor();
    initStorageActions();

    /* pull the shared server store first, then retry any queued delivery */
    STORE.pull()
      .then(function () { return STORE.flushQueue(); })
      .then(function () { renderStorageState(); refreshAll(); });
  });

  /* ------------------------------------------------------------------ */
  /* gate.
     With server.js running the passcode is verified by the server, which
     answers with an HttpOnly session cookie. The code itself is never sent
     to the browser, so view-source and a public GitHub repo cannot hand it
     to anyone — and a refresh keeps the dashboard open, because the cookie
     outlives the page.
     Hosted as plain static files there is no shared store to protect, so
     the local config.js passcode still gates the view and the unlocked flag
     is kept in localStorage (refresh-safe) instead of sessionStorage.     */
  function rememberLocal(open) {
    try {
      if (open) localStorage.setItem(SESSION_KEY, '1');
      else localStorage.removeItem(SESSION_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (e) { /* storage disabled */ }
  }

  function serverSessionState() {
    return window.fetch('/api/admin/session', { method: 'GET', credentials: 'same-origin', cache: 'no-store' })
      .then(function (res) {
        return res.status === 200 ? 'open' : (res.status === 401 ? 'closed' : 'absent');
      }, function () { return 'absent'; });
  }

  function initGate() {
    var gate = $('[data-gate]');
    var dash = $('[data-dash]');
    var form = $('[data-gate-form]');
    var err = $('[data-gate-error]');
    var note = $('[data-storage-note]');
    var submitBtn = form ? form.querySelector('button[type="submit"]') : null;

    if (note) {
      note.textContent = STORE.available
        ? 'Everything you see here is saved on the computer that runs the site, so refreshing will not lose it.'
        : 'This browser is not saving data, so records will be lost when you close the tab.';
    }

    var unlock = function () {
      if (gate) gate.setAttribute('hidden', '');
      if (dash) dash.removeAttribute('hidden');
      /* reveals the Lock control in the header — it means nothing on the gate */
      document.body.classList.add('is-unlocked');
      refreshAll();
    };

    var fail = function (message) {
      if (err) err.textContent = message;
      if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Login'; }
      var input = $('#passcode');
      if (input) { input.classList.add('is-invalid'); input.select(); input.focus(); }
    };

    /* Always intercept the submit. Without this, a return visit (session
       already unlocked) leaves the form submitting natively and the
       passcode ends up in the URL as ?passcode=... */
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = $('#passcode').value;
      if (err) err.textContent = '';
      if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Checking…'; }

      window.fetch('/api/admin/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode: value })
      }).then(function (res) {
        return res.json().catch(function () { return {}; }).then(function (data) {
          return { status: res.status, data: data };
        });
      }, function () { return { status: 0, data: {} }; }).then(function (r) {
        /* No API on this host. A refused request (0) or a CDN "not found"
           page (404/405 — Vercel, Netlify, GitHub Pages answer instead of the
           Node server) all mean static hosting, so use the local gate. */
        if (r.status === 0 || r.status === 404 || r.status === 405) {
          if (value && value === String(CFG.adminPasscode || '')) { rememberLocal(true); unlock(); }
          else if (CFG.adminPasscode) fail('Wrong passcode. Please try again.');
          else fail('The website is not running right now, so login is not available. Open the site first and try again.');
          return;
        }
        if (r.status === 200) { rememberLocal(true); unlock(); return; }
        if (r.status === 429) { fail('Too many wrong attempts. Please wait a few minutes and try again.'); return; }
        fail((r.data && r.data.error) === 'wrong passcode' ? 'Wrong passcode. Please try again.' : 'Could not reach the dashboard. Please try again.');
      });
    });

    var lock = $('[data-lock]');
    if (lock) lock.addEventListener('click', function () {
      rememberLocal(false);
      window.fetch('/api/admin/logout', { method: 'POST', credentials: 'same-origin' })
        .catch(function () { /* nothing to log out of */ })
        .then(function () { window.location.reload(); });
    });

    /* already signed in? ask the server first, so a restart that dropped the
       sessions cannot leave the dashboard open on an empty view */
    serverSessionState().then(function (state) {
      if (state === 'open') { unlock(); }
      else if (state !== 'closed' && localStorage.getItem(SESSION_KEY) === '1') { unlock(); }
      /* set only once the probe has answered, so the regression test can wait
         for the real decision instead of guessing with a timeout */
      document.body.dataset.booted = '1';
    });
  }

  /* ------------------------------------------------------------------ */
  /* show / hide the passcode. The button is type="button" so it never
     submits the gate form by accident. */
  function initPasscodeToggle() {
    var btn = $('[data-pw-toggle]');
    var input = $('#passcode');
    if (!btn || !input) return;

    btn.addEventListener('click', function () {
      var reveal = input.type === 'password';
      input.type = reveal ? 'text' : 'password';
      btn.classList.toggle('is-on', reveal);
      btn.setAttribute('aria-pressed', reveal ? 'true' : 'false');
      btn.setAttribute('aria-label', reveal ? 'Hide passcode' : 'Show passcode');
      /* keep the caret at the end so typing can carry straight on */
      try { input.setSelectionRange(input.value.length, input.value.length); } catch (e) { /* older browsers */ }
      input.focus();
    });
  }

  /* ------------------------------------------------------------------ */
  /* light / dark theme toggle. Same localStorage key ('skyline-theme') and
     the same data-theme="dark" attribute the public pages use, so a visitor's
     choice carries across the whole site. Dark is the default; light only
     when they picked it. base.css holds the palette, admin.css just maps its
     surfaces onto those tokens.                                            */
  var THEME_KEY = 'skyline-theme';
  function initThemeToggle() {
    var btn = $('[data-theme-toggle]');
    if (!btn) return;
    var root = document.documentElement;

    function sync() {
      var dark = root.getAttribute('data-theme') === 'dark';
      btn.setAttribute('aria-pressed', dark ? 'true' : 'false');
      btn.setAttribute('title', dark ? 'Switch to light theme' : 'Switch to dark theme');
      var meta = document.querySelector('meta[name="theme-color"]');
      if (meta) meta.setAttribute('content', dark ? '#0A1520' : '#eaf1f8');
    }

    btn.addEventListener('click', function () {
      var dark = root.getAttribute('data-theme') === 'dark';
      if (dark) root.removeAttribute('data-theme'); else root.setAttribute('data-theme', 'dark');
      try { localStorage.setItem(THEME_KEY, dark ? 'light' : 'dark'); } catch (e) { /* storage disabled */ }
      sync();
    });

    sync();
  }

  /* ------------------------------------------------------------------ */
  function initTabs() {
    var tabs = $$('.tab');
    tabs.forEach(function (tab) {
      tab.addEventListener('click', function () {
        var name = tab.getAttribute('data-tab');
        tabs.forEach(function (t) {
          var on = t === tab;
          t.classList.toggle('is-active', on);
          t.setAttribute('aria-selected', on ? 'true' : 'false');
        });
        $$('.pane').forEach(function (pane) {
          var on = pane.getAttribute('data-pane') === name;
          pane.hidden = !on;
        });
      });
    });
  }

  /* ------------------------------------------------------------------ */
  function initToolbar() {
    var q = $('#q'), fs = $('#f-status'), fv = $('#f-service');
    [q, fs, fv].forEach(function (el) {
      if (!el) return;
      el.addEventListener('input', renderLeads);
      el.addEventListener('change', renderLeads);
    });

    var fr = $('#f-review');
    if (fr) { fr.addEventListener('change', renderReviews); }
    var qr = $('#q-review');
    if (qr) { qr.addEventListener('input', renderReviews); qr.addEventListener('change', renderReviews); }

    bind('[data-new-lead]', function () { openEditor('lead', null); });
    bind('[data-new-review]', function () { openEditor('review', null); });

    bind('[data-export-leads-csv]', function () {
      STORE.download('skyline-leads-' + stamp() + '.csv', STORE.csv(sorted(), LEAD_FIELDS), 'text/csv;charset=utf-8');
    });
    bind('[data-export-reviews-csv]', function () {
      STORE.download('skyline-reviews-' + stamp() + '.csv', STORE.csv(STORE.reviews.all(), REVIEW_FIELDS), 'text/csv;charset=utf-8');
    });
    bind('[data-export-json]', exportBackup);
    bind('[data-export-json-2]', exportBackup);

    var file = $('[data-import-file]');
    if (file) file.addEventListener('change', function () {
      var f = file.files && file.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function () {
        var msg = $('[data-import-msg]');
        try {
          var merged = STORE.importJSON(String(reader.result));
          if (msg) { msg.className = 'field-error'; msg.textContent = 'Imported ' + merged.leads + ' new enquiries and ' + merged.reviews + ' new reviews.'; }
          refreshAll();
        } catch (e) {
          if (msg) { msg.className = 'field-error'; msg.textContent = 'That file could not be read as a Skyline backup.'; }
        }
        file.value = '';
      };
      reader.readAsText(f);
    });
  }

  function exportBackup() {
    STORE.download('skyline-backup-' + stamp() + '.json', STORE.exportJSON(), 'application/json');
    var msg = $('[data-import-msg]');
    if (msg) msg.textContent = 'Backup downloaded — store it somewhere safe.';
  }

  function bind(sel, fn) { var el = $(sel); if (el) el.addEventListener('click', fn); }

  /* ------------------------------------------------------------------ */
  /* add / edit dialog. One form serves both record types; the fields that
     belong to only one of them are tagged data-editor-group and hidden. */
  var editing = null;

  function initEditor() {
    var modal = $('[data-editor]');
    var form = $('[data-editor-form]');
    if (!modal || !form) return;

    var sel = $('#e-service');
    if (sel && sel.options.length < 2) {
      Object.keys(DATA.services).forEach(function (name) {
        var o = document.createElement('option');
        o.textContent = name;
        o.value = name;
        sel.appendChild(o);
      });
    }

    $$('[data-editor-cancel]', modal).forEach(function (btn) {
      btn.addEventListener('click', closeEditor);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !modal.hidden) closeEditor();
    });
    form.addEventListener('submit', function (e) { e.preventDefault(); saveEditor(); });
  }

  function ef(name) { return $('[data-e="' + name + '"]'); }
  function efVal(name, value) { var el = ef(name); if (el) el.value = value == null ? '' : String(value); }

  function openEditor(kind, id) {
    var modal = $('[data-editor]');
    if (!modal) return;
    var record = id ? (kind === 'review' ? STORE.reviews.get(id) : STORE.leads.get(id)) : null;
    editing = { kind: kind, id: record ? record.id : '', createdAt: record ? record.createdAt : '' };

    var title = $('[data-editor-title]');
    if (title) title.textContent = record ? (kind === 'review' ? 'Edit review' : 'Edit enquiry') : (kind === 'review' ? 'Add review' : 'Add enquiry');
    var kicker = $('[data-editor-kicker]');
    if (kicker) kicker.textContent = record ? 'Editing ' + record.id : 'New record';
    var hint = $('[data-editor-hint]');
    if (hint) {
      hint.textContent = record
        ? 'Changes are written to this device and to the shared store immediately.'
        : 'Walk-in or phone enquiry? Add it here and it sits in the same table as form leads.';
    }

    $$('[data-editor-group]').forEach(function (g) {
      g.hidden = g.getAttribute('data-editor-group') !== kind;
    });

    var status = $('#e-status');
    if (status) {
      var list = kind === 'review' ? REVIEW_STATUS : LEAD_STATUS;
      status.innerHTML = list.map(function (s) {
        return '<option value="' + s + '">' + cap(s) + '</option>';
      }).join('');
    }

    var rating = $('#e-rating');
    if (rating && rating.options.length < 2) {
      rating.innerHTML = [5, 4, 3, 2, 1].map(function (n) {
        return '<option value="' + n + '">' + n + ' star' + (n > 1 ? 's' : '') + '</option>';
      }).join('');
    }

    efVal('name', record && record.name);
    efVal('phone', record && record.phone);
    efVal('email', record && record.email);
    efVal('service', record && record.service);
    efVal('status', record ? record.status : (kind === 'review' ? 'pending' : 'new'));
    efVal('rating', record && record.rating != null ? record.rating : 5);
    efVal('message', record && record.message);
    efVal('note', record && record.note);
    efVal('text', record && record.text);

    var err = $('[data-editor-error]');
    if (err) err.textContent = '';

    modal.hidden = false;
    document.body.classList.add('is-locked');
    var first = ef('name');
    if (first) first.focus();
  }

  function closeEditor() {
    var modal = $('[data-editor]');
    if (modal) modal.hidden = true;
    document.body.classList.remove('is-locked');
    editing = null;
  }

  function saveEditor() {
    if (!editing) return;
    var err = $('[data-editor-error]');
    var nameEl = ef('name');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) {
      if (err) err.textContent = 'A name is needed before this record can be saved.';
      if (nameEl) nameEl.focus();
      return;
    }
    if (err) err.textContent = '';

    var input = {
      id: editing.id,
      name: name,
      phone: efValOf('phone'),
      email: efValOf('email'),
      service: efValOf('service'),
      message: efValOf('message'),
      note: efValOf('note'),
      status: efValOf('status'),
      rating: efValOf('rating'),
      text: efValOf('text'),
      createdAt: editing.createdAt
    };

    var saved = editing.kind === 'review' ? STORE.saveReview(input) : STORE.saveLead(input);
    var kind = editing.kind;
    closeEditor();

    var msg = $('[data-storage-msg]');
    if (msg) msg.textContent = 'Saved ' + saved.id + ' — kept on this device and sent to the shared store.';
    if (kind === 'review') {
      var fr = $('#f-review');
      if (fr) fr.value = '';
    }
    refreshAll();
  }

  function efValOf(name) { var el = ef(name); return el ? el.value : ''; }

  /* ------------------------------------------------------------------ */
  var LEAD_FIELDS = [
    { key: 'createdAt', label: 'Received', get: function (r) { return r.createdAt; } },
    { key: 'id', label: 'Reference' },
    { key: 'name', label: 'Name' },
    { key: 'phone', label: 'Phone' },
    { key: 'email', label: 'Email' },
    { key: 'service', label: 'Service' },
    { key: 'message', label: 'Message' },
    { key: 'status', label: 'Status' },
    { key: 'note', label: 'Note' },
    { key: 'source', label: 'Referrer', get: function (r) { return (r.source || {}).referrer || ''; } },
    { key: 'utm', label: 'UTM', get: function (r) { return (r.source || {}).utm || ''; } }
  ];

  var REVIEW_FIELDS = [
    { key: 'createdAt', label: 'Received' },
    { key: 'id', label: 'Reference' },
    { key: 'name', label: 'Name' },
    { key: 'service', label: 'Service' },
    { key: 'rating', label: 'Rating' },
    { key: 'text', label: 'Review' },
    { key: 'status', label: 'Status' }
  ];

  function sorted() {
    return STORE.leads.all().sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  function filteredLeads() {
    var q = ($('#q') ? $('#q').value : '').trim().toLowerCase();
    var st = $('#f-status') ? $('#f-status').value : '';
    var sv = $('#f-service') ? $('#f-service').value : '';

    return sorted().filter(function (r) {
      if (st && (r.status || 'new') !== st) return false;
      if (sv && r.service !== sv) return false;
      if (!q) return true;
      var hay = [r.name, r.phone, r.email, r.service, r.message, r.note, r.id, (r.source || {}).utm].join(' ').toLowerCase();
      return q.split(/\s+/).every(function (term) { return hay.indexOf(term) > -1; });
    });
  }

  function filteredReviews() {
    var q = ($('#q-review') ? $('#q-review').value : '').trim().toLowerCase();
    var filter = $('#f-review') ? $('#f-review').value : '';

    return STORE.reviews.all()
      .filter(function (r) { return !filter || r.status === filter; })
      .filter(function (r) {
        if (!q) return true;
        var hay = [r.name, r.service, r.text, r.id, String(r.rating)].join(' ').toLowerCase();
        return q.split(/\s+/).every(function (term) { return hay.indexOf(term) > -1; });
      })
      .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
  }

  /* ------------------------------------------------------------------ */
  function refreshAll() {
    renderStats();
    fillServiceFilter();
    renderLeads();
    renderReviews();
    renderStorageState();
  }

  function renderStats() {
    var s = STORE.stats();
    var values = {
      leads: s.leads,
      reviews: s.reviews,
      newLeads: s.newLeads,
      lastWeek: s.lastWeek,
      pendingReviews: s.pendingReviews,
      outbox: s.outbox
    };
    $$('[data-stat]').forEach(function (el) {
      var k = el.getAttribute('data-stat');
      if (values[k] != null) el.textContent = String(values[k]);
    });
  }

  function fillServiceFilter() {
    var sel = $('#f-service');
    if (!sel || sel.options.length > 1) return;
    Object.keys(DATA.services).forEach(function (name) {
      var o = document.createElement('option');
      o.textContent = name;
      o.value = name;
      sel.appendChild(o);
    });
  }

  /* ------------------------------------------------------------------ */
  function renderLeads() {
    var body = $('[data-leads-body]');
    var empty = $('[data-leads-empty]');
    if (!body) return;

    var rows = filteredLeads();
    body.innerHTML = '';

    if (empty) empty.hidden = rows.length > 0;

    rows.forEach(function (r) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td data-label="Received"><span class="when">' + when(r.createdAt) + '</span><span class="ref">' + esc(r.id) + '</span></td>' +
        '<td data-label="Name">' + esc(r.name) + (r.email ? '<span class="ref">' + esc(r.email) + '</span>' : '') + '</td>' +
        '<td data-label="Phone"><a href="tel:+91' + esc(r.phone) + '">' + esc(r.phone) + '</a></td>' +
        '<td data-label="Service">' + esc(r.service || '—') + '</td>' +
        '<td data-label="Message" class="msg">' + esc(r.message || '—') + '</td>' +
        '<td data-label="Status">' + statusCell(r) + '</td>' +
        '<td data-label="Actions">' + actionsCell(r) + '</td>';

      $$('[data-status]', tr).forEach(function (sel) {
        sel.addEventListener('change', function () {
          STORE.setLeadStatus(r.id, { status: sel.value });
          refreshAll();
        });
      });
      $$('[data-del]', tr).forEach(function (btn) {
        btn.addEventListener('click', function () {
          if (!window.confirm('Delete enquiry ' + r.id + ' for ' + r.name + '?')) return;
          STORE.deleteLead(r.id);
          refreshAll();
        });
      });
      $$('[data-edit]', tr).forEach(function (btn) {
        btn.addEventListener('click', function () { openEditor('lead', r.id); });
      });

      body.appendChild(tr);
    });
  }

  function statusCell(r) {
    var v = r.status || 'new';
    return '<select class="status-select" data-status aria-label="Status for ' + esc(r.name) + '">' +
      LEAD_STATUS.map(function (s) {
        return '<option value="' + s + '"' + (s === v ? ' selected' : '') + '>' + cap(s) + '</option>';
      }).join('') + '</select> <span class="badge badge-' + v + '">' + cap(v) + '</span>';
  }

  function actionsCell(r) {
    return '<div class="row-actions">' +
      '<button class="icon-btn" type="button" data-edit>Edit</button>' +
      '<a class="icon-btn wa" href="' + STORE.waLeadLink(r) + '" target="_blank" rel="noopener">WhatsApp</a>' +
      '<a class="icon-btn" href="mailto:' + esc(r.email || CFG.email) + '?subject=' +
        encodeURIComponent('Your enquiry — ' + (r.service || 'Skyline Solution Enterprises')) + '">Email</a>' +
      '<button class="icon-btn danger" type="button" data-del>Delete</button>' +
      '</div>';
  }

  /* ------------------------------------------------------------------ */
  function renderReviews() {
    var body = $('[data-reviews-body]');
    var empty = $('[data-reviews-empty]');
    if (!body) return;

    var rows = filteredReviews();

    body.innerHTML = '';
    if (empty) empty.hidden = rows.length > 0;

    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'review-admin';
      li.innerHTML =
        '<div class="review-head">' +
          '<span class="avatar" aria-hidden="true">' + esc(r.initials || 'SS') + '</span>' +
          '<div class="review-who"><strong>' + esc(r.name) + '</strong>' +
          '<span class="meta">' + esc(r.service || 'service not stated') + ' · ' + when(r.createdAt) + ' · ' + esc(r.id) + '</span></div>' +
        '</div>' +
        '<p class="rating" aria-label="' + r.rating + ' out of 5">' + stars(r.rating) + '</p>' +
        '<p>' + esc(r.text) + '</p>' +
        '<div class="row-actions">' +
          '<span class="badge badge-' + r.status + '">' + cap(r.status) + '</span>' +
          '<button class="icon-btn" type="button" data-edit>Edit</button>' +
          '<button class="icon-btn" type="button" data-approve>Approve</button>' +
          '<button class="icon-btn" type="button" data-hide>Hide</button>' +
          '<button class="icon-btn danger" type="button" data-del>Delete</button>' +
        '</div>';

      on('[data-approve]', li, function () { STORE.setReviewStatus(r.id, 'approved'); refreshAll(); });
      on('[data-hide]', li, function () { STORE.setReviewStatus(r.id, 'hidden'); refreshAll(); });
      on('[data-edit]', li, function () { openEditor('review', r.id); });
      on('[data-del]', li, function () {
        if (!window.confirm('Delete review ' + r.id + ' by ' + r.name + '?')) return;
        STORE.deleteReview(r.id);
        refreshAll();
      });

      body.appendChild(li);
    });
  }

  function on(sel, root, fn) { var el = $(sel, root); if (el) el.addEventListener('click', fn); }

  /* ------------------------------------------------------------------ */
  var TRANSPORT_LABEL = {
    server: 'your own host — data/leads.json',
    endpoint: 'sheet mirror (leadEndpoint)',
    none: 'this browser only',
    detecting: 'detecting…'
  };

  function renderStorageState() {
    var state = $('[data-endpoint-state]');
    if (state) state.textContent = CFG.leadEndpoint ? CFG.leadEndpoint : 'not configured';

    STORE.transport().then(function (t) {
      var el = $('[data-transport-state]');
      if (el) el.textContent = TRANSPORT_LABEL[t] || t;
    });
  }

  function initStorageActions() {
    bind('[data-pull-now]', function () {
      var msg = $('[data-storage-msg]');
      if (msg) msg.textContent = 'Reading the shared store…';
      STORE.pull().then(function (r) {
        if (msg) {
          msg.textContent = r.transport === 'server'
            ? 'Server store merged — ' + r.leadsAdded + ' new enquiry record(s) and ' + r.reviewsAdded + ' new review(s) added to this view.'
            : 'No server store on this host. Records stay in this browser' + (CFG.leadEndpoint ? ' and in your sheet mirror.' : '.');
        }
        refreshAll();
      });
    });

    bind('[data-flush-now]', function () {
      var msg = $('[data-storage-msg]');
      if (msg) msg.textContent = 'Retrying ' + STORE.outboxSize() + ' queued record(s)…';
      STORE.flushQueue().then(function (r) {
        if (msg) {
          msg.textContent = r.transport === 'none'
            ? 'Nothing queued for delivery — no host API or sheet endpoint is configured, so records live in this browser.'
            : r.sent + ' sent, ' + r.failed + ' failed, ' + r.remaining + ' still queued.';
        }
        refreshAll();
      });
    });

    bind('[data-copy-script]', function () {
      var msg = $('[data-storage-msg]');
      var done = function (ok) { if (msg) msg.textContent = ok ? 'Sheet script copied to the clipboard.' : 'Select the script text and copy it manually.'; };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(APPS_SCRIPT).then(function () { done(true); }, function () { done(false); });
      } else { done(false); }
    });

    bind('[data-clear-leads]', function () {
      var n = STORE.leads.all().length;
      if (!n) return;
      if (!window.confirm('Delete all ' + n + ' enquiries from this device? Take a backup JSON first.')) return;
      STORE.leads.clear();
      refreshAll();
    });

    bind('[data-clear-reviews]', function () {
      var n = STORE.reviews.all().length;
      if (!n) return;
      if (!window.confirm('Delete all ' + n + ' reviews from this device?')) return;
      STORE.reviews.clear();
      refreshAll();
    });
  }

  /* ------------------------------------------------------------------ */
  function cap(s) { return String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1); }
  function stamp() { return new Date().toISOString().slice(0, 10); }
  function stars(n) {
    var f = Math.max(0, Math.min(5, parseInt(n, 10) || 0));
    return '★★★★★'.slice(0, f) + '<span class="off">' + '★★★★★'.slice(f) + '</span>';
  }
  function when(iso) {
    try {
      return new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch (e) { return String(iso).slice(0, 16); }
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
})(window, document);
