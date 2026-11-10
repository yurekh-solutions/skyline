/* ==========================================================================
   Skyline Solution Enterprises — leads.js  (window.SkylineStore)

   WHERE COLLECTED DATA IS STORED — four layers, all under your control:

   1. PRIMARY   localStorage on the submitting browser
                keys: skyline.v1.leads / skyline.v1.reviews / skyline.v1.outbox
                Written synchronously on submit, so a refresh never loses a lead.

   2. SERVER    If the site is served by the included server.js (same origin),
                every enquiry and review is also POSTed to /api/leads and
                /api/reviews and appended to data/leads.json + data/reviews.json.
                This is the shared store the whole team can read in admin.html.

   3. MIRROR    If SITE_CONFIG.leadEndpoint is filled, the same record is POSTed
                to that URL too — a Google Sheet via Apps Script, or any webhook.

   4. RETRY     Anything that could not be delivered goes to the outbox and is
                re-sent on next page load, on the "online" event, when the tab
                becomes visible, or from admin.html → Storage & export.

   Transport is auto-detected: server first, then your endpoint, then local only.
   Nothing leaves the browser unless layer 2 or 3 is actually reachable.
   ========================================================================== */

(function (window, document) {
  'use strict';

  var CFG = window.SITE_CONFIG || {};
  var PREFIX = CFG.storagePrefix || 'skyline.v1.';
  var KEYS = {
    leads: PREFIX + 'leads',
    reviews: PREFIX + 'reviews',
    outbox: PREFIX + 'outbox',
    meta: PREFIX + 'meta'
  };

  /* ---------- storage, with an in-memory fallback for private mode ---------- */
  var memory = {};
  var canPersist = (function () {
    try {
      var probe = PREFIX + '__probe';
      window.localStorage.setItem(probe, '1');
      window.localStorage.removeItem(probe);
      return true;
    } catch (e) {
      return false;
    }
  })();

  function read(key, fallback) {
    try {
      var raw = canPersist ? window.localStorage.getItem(key) : memory[key];
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    var payload = JSON.stringify(value);
    if (canPersist) {
      try {
        window.localStorage.setItem(key, payload);
        return { ok: true };
      } catch (e) {
        /* quota — trim the oldest 20% of leads and retry once */
        if (key === KEYS.leads && Array.isArray(value)) {
          var trimmed = value.slice(Math.floor(value.length * 0.2));
          try {
            window.localStorage.setItem(key, JSON.stringify(trimmed));
            return { ok: true, trimmed: true };
          } catch (e2) { /* fall through */ }
        }
        memory[key] = payload;
        return { ok: false, reason: 'quota' };
      }
    }
    memory[key] = payload;
    return { ok: false, reason: 'no-storage' };
  }

  /* ---------- small helpers ---------- */
  function uid(kind) {
    return kind + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase();
  }

  function normalisePhone(value) {
    var d = String(value || '').replace(/\D+/g, '');
    if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
    if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
    return d;
  }

  function clean(value, max) {
    var s = String(value == null ? '' : value).replace(/[\u0000-\u001F<>]/g, ' ').trim();
    return max ? s.slice(0, max) : s;
  }

  function sourceInfo() {
    var out = { referrer: '', utm: '', page: '' };
    try {
      out.referrer = document.referrer || '';
      out.page = window.location.pathname + window.location.hash;
      var p = new URLSearchParams(window.location.search);
      out.utm = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
        .filter(function (k) { return p.get(k); })
        .map(function (k) { return k.replace('utm_', '') + '=' + p.get(k); })
        .join(' · ');
    } catch (e) { /* older browsers */ }
    return out;
  }

  /* ---------- transport detection ---------- */
  var transport = null;
  var probing = null;

  function detect() {
    if (transport) return Promise.resolve(transport);
    if (probing) return probing;
    probing = window.fetch('/api/health', { method: 'GET', cache: 'no-store' })
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (info) {
        transport = (info && info.service === 'skyline') ? 'server'
          : (CFG.leadEndpoint ? 'endpoint' : 'none');
        return transport;
      })
      .catch(function () {
        transport = CFG.leadEndpoint ? 'endpoint' : 'none';
        return transport;
      });
    return probing;
  }

  /* ---------- outbox ---------- */
  function outboxAll() { return read(KEYS.outbox, []); }

  function enqueue(kind, record) {
    var queue = outboxAll().filter(function (q) { return !q.record || q.record.id !== record.id; });
    queue.push({ kind: kind, record: record, attempts: 0, addedAt: new Date().toISOString() });
    write(KEYS.outbox, queue.slice(-80));
  }

  function send(kind, record) {
    return detect().then(function (t) {
      if (t === 'none') return { delivered: false, reason: 'local-only', transport: t };

      var isServer = t === 'server';
      var url = isServer
        ? (kind === 'review' ? '/api/reviews' : '/api/leads')
        : String(CFG.leadEndpoint);

      return window.fetch(url, {
        method: 'POST',
        /* submissions carry no passcode — the server rate-limits them instead */
        headers: { 'Content-Type': isServer ? 'application/json' : 'text/plain;charset=UTF-8' },
        body: JSON.stringify(isServer ? record : { kind: kind, record: record }),
        keepalive: true
      }).then(function (res) {
        return { delivered: res.ok, status: res.status, transport: t };
      }, function (err) {
        return { delivered: false, error: String(err), transport: t };
      });
    });
  }

  var flushing = false;
  function flushQueue() {
    return detect().then(function (t) {
      if (t === 'none' || flushing) {
        return { sent: 0, failed: 0, remaining: outboxAll().length, transport: t };
      }
      var queue = outboxAll();
      if (!queue.length) return { sent: 0, failed: 0, remaining: 0, transport: t };

      flushing = true;
      var sent = 0, failed = 0, keep = [];

      var step = function (i) {
        if (i >= queue.length) return Promise.resolve();
        var item = queue[i];
        return send(item.kind, item.record).then(function (r) {
          if (r.delivered) sent++; else { failed++; item.attempts++; keep.push(item); }
        }).then(function () { return step(i + 1); });
      };

      return step(0).then(function () {
        write(KEYS.outbox, keep.filter(function (k) { return k.attempts < 24; }));
        flushing = false;
        bump({ lastFlush: new Date().toISOString(), sent: sent, failed: failed });
        return { sent: sent, failed: failed, remaining: keep.length, transport: t };
      });
    });
  }

  function bump(patch) {
    var meta = read(KEYS.meta, {});
    Object.keys(patch).forEach(function (k) { meta[k] = patch[k]; });
    write(KEYS.meta, meta);
    return meta;
  }

  /* ---------- local collection CRUD ---------- */
  function collection(key) {
    return {
      all: function () { return read(key, []); },
      get: function (id) {
        return read(key, []).filter(function (r) { return r.id === id; })[0] || null;
      },
      replaceAll: function (rows) { write(key, rows); return rows; },
      remove: function (id) {
        var rows = read(key, []);
        var next = rows.filter(function (r) { return r.id !== id; });
        write(key, next);
        return rows.length !== next.length;
      },
      clear: function () { write(key, []); },
      update: function (id, patch) {
        var found = null;
        var rows = read(key, []).map(function (r) {
          if (r.id !== id) return r;
          found = Object.assign({}, r, patch, { updatedAt: new Date().toISOString() });
          return found;
        });
        write(key, rows);
        return found;
      }
    };
  }

  var leads = collection(KEYS.leads);
  var reviews = collection(KEYS.reviews);

  /* the status vocabulary each record type accepts */
  var LEAD_STATUS = ['new', 'contacted', 'closed', 'archived'];
  var REVIEW_STATUS = ['pending', 'approved', 'hidden'];

  /* Write-through for a whole record: queue it, try to deliver it now, and drop
     it from the outbox only when the host confirms. A failed post therefore
     still replays on the next load instead of living on one machine forever. */
  function deliver(kind, record) {
    enqueue(kind, record);
    return send(kind, record).then(function (r) {
      if (r.delivered) {
        write(KEYS.outbox, outboxAll().filter(function (q) { return q.record.id !== record.id; }));
      }
      bump({ lastDelivery: r.delivered ? r.transport : 'pending' });
      return r;
    });
  }

  /* ---------- server sync (layer 2) ---------- */
  /* Reads, updates and deletes ride on the HttpOnly session cookie that
     /api/admin/login sets. The passcode header is only sent when this copy
     of the site was configured with a local adminPasscode, so a public
     deployment never carries a secret in its JavaScript. */
  function adminFetch(path, options) {
    var opts = options || {};
    var headers = {};
    if (CFG.adminPasscode) headers['x-skyline-passcode'] = String(CFG.adminPasscode);
    opts.headers = Object.assign(headers, opts.headers || {});
    opts.credentials = 'same-origin';
    return window.fetch(path, opts).then(function (res) {
      return res.ok ? res.json() : Promise.reject(new Error('HTTP ' + res.status));
    });
  }

  /* server rows win on status/note; local-only rows are kept as they are */
  function mergeRows(local, remote) {
    var byId = {};
    local.forEach(function (r) { byId[r.id] = r; });
    var added = 0;
    (remote || []).forEach(function (r) {
      if (!r || !r.id) return;
      var mine = byId[r.id];
      if (!mine) { byId[r.id] = r; added++; return; }
      var newer = new Date(r.updatedAt || 0) >= new Date(mine.updatedAt || 0);
      if (newer) byId[r.id] = Object.assign({}, mine, r);
    });
    return { rows: Object.keys(byId).map(function (k) { return byId[k]; }), added: added };
  }

  /* ========================================================================= */
  var store = {
    available: canPersist,
    keys: KEYS,
    leads: leads,
    reviews: reviews,

    transport: detect,

    /* ---------- enquiry ---------- */
    addLead: function (input) {
      var phone = normalisePhone(input.phone);
      var rows = leads.all();
      var now = new Date().toISOString();

      /* the same person sending the same service twice inside 5 minutes = one lead */
      var dupe = rows.filter(function (r) {
        if (r.phone !== phone || r.service !== clean(input.service, 80)) return false;
        return (new Date(now) - new Date(r.createdAt)) < 5 * 60 * 1000;
      })[0];
      if (dupe) return { record: dupe, duplicate: true };

      var record = {
        id: uid('L'),
        type: 'enquiry',
        name: clean(input.name, 80),
        phone: phone,
        email: clean(input.email, 120).toLowerCase(),
        service: clean(input.service, 80),
        message: clean(input.message, 900),
        status: 'new',
        note: '',
        createdAt: now,
        updatedAt: now,
        source: sourceInfo(),
        ua: (navigator.userAgent || '').slice(0, 180)
      };

      write(KEYS.leads, rows.concat([record]));
      enqueue('lead', record);
      bump({ lastLeadAt: now });

      send('lead', record).then(function (r) {
        if (r.delivered) {
          var queue = outboxAll().filter(function (q) { return q.record.id !== record.id; });
          write(KEYS.outbox, queue);
        }
        bump({ lastDelivery: r.delivered ? r.transport : 'pending' });
      });

      return { record: record, duplicate: false };
    },

    /* ---------- review (pending until approved in admin) ---------- */
    addReview: function (input) {
      var rows = reviews.all();
      var rating = Math.min(5, Math.max(1, parseInt(input.rating, 10) || 5));
      var now = new Date().toISOString();
      var initials = clean(input.name, 60).split(/\s+/)
        .map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase();

      var record = {
        id: uid('R'),
        type: 'review',
        name: clean(input.name, 60),
        initials: initials || 'SS',
        service: clean(input.service, 80),
        rating: rating,
        text: clean(input.text, 600),
        status: 'pending',
        createdAt: now,
        updatedAt: now,
        source: sourceInfo()
      };

      write(KEYS.reviews, rows.concat([record]));
      enqueue('review', record);

      send('review', record).then(function (r) {
        if (r.delivered) {
          var queue = outboxAll().filter(function (q) { return q.record.id !== record.id; });
          write(KEYS.outbox, queue);
        }
        bump({ lastDelivery: r.delivered ? r.transport : 'pending' });
      });

      return { record: record };
    },

    publishedReviews: function () {
      return reviews.all()
        .filter(function (r) { return r.status === 'approved'; })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); });
    },

    /* Approved reviews held on the shared store, so every visitor sees the
       same wall — not just the browser that typed them. */
    publicReviews: function () {
      return detect().then(function (t) {
        if (t !== 'server') return [];
        return window.fetch('/api/reviews/public', { method: 'GET', cache: 'no-store' })
          .then(function (res) { return res.ok ? res.json() : { records: [] }; })
          .then(function (d) { return d.records || []; })
          .catch(function () { return []; });
      });
    },

    cachePublicReviews: function (rows) {
      var merged = mergeRows(reviews.all(), rows);
      write(KEYS.reviews, merged.rows);
      return merged.added;
    },

    /* ---------- admin-side create / edit of a whole record -------------------
       The dashboard can add a walk-in enquiry or fix a typo in a submitted one.
       Every save writes locally first (so a refresh can never lose it), then
       upserts the same id on the shared store. */
    saveLead: function (input) {
      var rows = leads.all();
      var now = new Date().toISOString();
      var id = clean(input.id, 24) || uid('L');
      var found = false;

      var record = {
        id: id,
        type: 'enquiry',
        name: clean(input.name, 80),
        phone: normalisePhone(input.phone),
        email: clean(input.email, 120).toLowerCase(),
        service: clean(input.service, 80),
        message: clean(input.message, 900),
        status: LEAD_STATUS.indexOf(input.status) > -1 ? input.status : 'new',
        note: clean(input.note, 400),
        createdAt: clean(input.createdAt, 44) || now,
        updatedAt: now,
        source: input.source || sourceInfo(),
        ua: clean(input.ua, 180) || (navigator.userAgent || '').slice(0, 180)
      };

      var next = rows.map(function (r) {
        if (r.id !== id) return r;
        found = true;
        return Object.assign({}, r, record);
      });
      if (!found) next.push(record);

      write(KEYS.leads, next);
      bump({ lastLeadAt: now });
      deliver('lead', record);
      return record;
    },

    saveReview: function (input) {
      var rows = reviews.all();
      var now = new Date().toISOString();
      var id = clean(input.id, 24) || uid('R');
      var name = clean(input.name, 60);
      var found = false;

      var record = {
        id: id,
        type: 'review',
        name: name,
        initials: clean(input.initials, 4) || name.split(/\s+/)
          .map(function (w) { return w.charAt(0); }).join('').slice(0, 2).toUpperCase() || 'SS',
        service: clean(input.service, 80),
        rating: Math.min(5, Math.max(1, parseInt(input.rating, 10) || 5)),
        text: clean(input.text, 600),
        status: REVIEW_STATUS.indexOf(input.status) > -1 ? input.status : 'pending',
        createdAt: clean(input.createdAt, 44) || now,
        updatedAt: now,
        source: input.source || sourceInfo()
      };

      var next = rows.map(function (r) {
        if (r.id !== id) return r;
        found = true;
        return Object.assign({}, r, record);
      });
      if (!found) next.push(record);

      write(KEYS.reviews, next);
      deliver('review', record);
      return record;
    },

    /* ---------- admin-side status / delete, mirrored to the server when present */
    setLeadStatus: function (id, patch) {
      var updated = leads.update(id, patch);
      if (updated) this.syncPatch('lead', id, patch);
      return updated;
    },

    setReviewStatus: function (id, status) {
      var updated = reviews.update(id, { status: status });
      if (updated) this.syncPatch('review', id, { status: status });
      return updated;
    },

    deleteLead: function (id) {
      var removed = leads.remove(id);
      this.syncDelete('lead', id);
      return removed;
    },

    deleteReview: function (id) {
      var removed = reviews.remove(id);
      this.syncDelete('review', id);
      return removed;
    },

    syncPatch: function (kind, id, patch) {
      return detect().then(function (t) {
        if (t !== 'server') return { skipped: true };
        return adminFetch('/api/' + (kind === 'review' ? 'reviews' : 'leads') + '/' + encodeURIComponent(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch)
        }).catch(function () { return { failed: true }; });
      });
    },

    syncDelete: function (kind, id) {
      return detect().then(function (t) {
        if (t !== 'server') return { skipped: true };
        return adminFetch('/api/' + (kind === 'review' ? 'reviews' : 'leads') + '/' + encodeURIComponent(id), {
          method: 'DELETE'
        }).catch(function () { return { failed: true }; });
      });
    },

    /* Pull everything the server holds and merge it into the local view. */
    pull: function () {
      return detect().then(function (t) {
        if (t !== 'server') return { transport: t, leadsAdded: 0, reviewsAdded: 0 };
        return Promise.all([
          adminFetch('/api/leads').catch(function () { return { records: [] }; }),
          adminFetch('/api/reviews').catch(function () { return { records: [] }; })
        ]).then(function (res) {
          var l = mergeRows(leads.all(), (res[0] || {}).records);
          var r = mergeRows(reviews.all(), (res[1] || {}).records);
          write(KEYS.leads, l.rows);
          write(KEYS.reviews, r.rows);
          return { transport: t, leadsAdded: l.added, reviewsAdded: r.added };
        });
      });
    },

    /* ---------- reporting ---------- */
    stats: function () {
      var l = leads.all();
      var r = reviews.all();
      var byService = {}, byStatus = {};
      l.forEach(function (row) {
        var s = row.service || '—';
        byService[s] = (byService[s] || 0) + 1;
        var st = row.status || 'new';
        byStatus[st] = (byStatus[st] || 0) + 1;
      });
      var weekAgo = Date.now() - 7 * 864e5;
      return {
        leads: l.length,
        newLeads: byStatus.new || 0,
        contacted: byStatus.contacted || 0,
        closed: byStatus.closed || 0,
        reviews: r.length,
        pendingReviews: r.filter(function (x) { return x.status === 'pending'; }).length,
        lastWeek: l.filter(function (x) { return new Date(x.createdAt).getTime() > weekAgo; }).length,
        byService: byService,
        byStatus: byStatus,
        outbox: outboxAll().length,
        endpoint: CFG.leadEndpoint || ''
      };
    },

    /* ---------- export / import ---------- */
    csv: function (rows, fields) {
      var esc = function (v) {
        var s = v == null ? '' : String(v);
        return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      };
      var head = fields.map(function (f) { return esc(f.label || f.key); }).join(',');
      var body = (rows || []).map(function (row) {
        return fields.map(function (f) {
          return esc(typeof f.get === 'function' ? f.get(row) : row[f.key]);
        }).join(',');
      });
      return '\uFEFF' + [head].concat(body).join('\r\n');
    },

    exportJSON: function () {
      return JSON.stringify({
        exportedAt: new Date().toISOString(),
        site: CFG.siteUrl || '',
        leads: leads.all(),
        reviews: reviews.all()
      }, null, 2);
    },

    /* merge is id-based, so importing the same backup twice adds nothing */
    importJSON: function (text) {
      var data = JSON.parse(text);
      var l = mergeRows(leads.all(), data.leads);
      var r = mergeRows(reviews.all(), data.reviews);
      write(KEYS.leads, l.rows);
      write(KEYS.reviews, r.rows);
      return { leads: l.added, reviews: r.added };
    },

    download: function (filename, content, mime) {
      var blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
      var url = URL.createObjectURL(blob);
      var a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { URL.revokeObjectURL(url); a.remove(); }, 400);
    },

    /* ---------- WhatsApp ---------- */
    waLink: function (message) {
      var number = String(CFG.whatsapp || '918271895469').replace(/\D+/g, '');
      return 'https://wa.me/' + number + '?text=' + encodeURIComponent(message || '');
    },

    waLeadLink: function (record) {
      return this.waLink([
        'Hi Skyline Solution Enterprises, this is ' + (record.name || 'a visitor') + '.',
        'Reference: ' + record.id,
        'Service: ' + (record.service || 'not specified'),
        'Phone: ' + (record.phone || ''),
        record.message ? 'Note: ' + record.message : ''
      ].filter(Boolean).join('\n'));
    },

    flushQueue: flushQueue,
    outboxSize: function () { return outboxAll().length; },
    meta: function () { return read(KEYS.meta, {}); }
  };

  window.SkylineStore = store;

  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') store.flushQueue();
  });
  window.addEventListener('online', function () { store.flushQueue(); });
})(window, document);
