/* ==========================================================================
   Skyline Solution Enterprises — server.js
   Zero-dependency Node server: serves the static site AND stores every
   collected enquiry / review in data/leads.json + data/reviews.json.

   Run:            node server.js            (http://localhost:3000)
   Port:           PORT=8080 node server.js
   Admin passcode: SKYLINE_ADMIN_PASSCODE="..." node server.js
                   Left unset, the first run invents one, saves it in
                   data/admin-passcode.txt and prints it once.

   API             /api/health               public
                   /api/leads, /api/reviews  POST is public and rate-limited;
                                             GET, PATCH and DELETE need an
                                             admin session
                   /api/admin/login          POST {passcode} -> HttpOnly cookie
                   /api/admin/session        GET  is the cookie still valid
                   /api/admin/logout         POST clears it

   The front-end auto-detects this API. Hosted on plain static storage
   instead? The same pages still work — leads then go to localStorage plus
   whatever URL you set as leadEndpoint in assets/js/config.js.
   ========================================================================== */

'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { URL } = require('url');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const PORT = Number(process.env.PORT || 3000);
const MAX_BODY = 64 * 1024;

/* Build tools and server source are not part of the website. Note that a URL
   like /../server.js collapses to /server.js before it reaches us, so the
   listing has to cover anything reachable at the site root.                */
const BLOCKED = ['/server.js', '/assets/tools/', '/package.json', '/package-lock.json', '/.env'];

const FILES = {
  lead: path.join(DATA_DIR, 'leads.json'),
  review: path.join(DATA_DIR, 'reviews.json')
};

/* ---------------- admin passcode ---------------- */
/* The passcode is deliberately NOT in the website source any more. A public
   repo (or anyone who can view-source) must not be able to read it, otherwise
   the dashboard and the whole lead store are open to the internet.

   Resolution order:
     1. SKYLINE_ADMIN_PASSCODE  — set this on your host
     2. data/admin-passcode.txt — untracked, created for you on first run
     3. a generated one         — written to that file and printed once
 */
const PASSCODE_FILE = path.join(DATA_DIR, 'admin-passcode.txt');
let passcodeWasGenerated = false;

function generatePasscode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(12);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('');
}

function readPasscode() {
  if (process.env.SKYLINE_ADMIN_PASSCODE) return String(process.env.SKYLINE_ADMIN_PASSCODE);
  try {
    const saved = fs.readFileSync(PASSCODE_FILE, 'utf8').trim();
    if (saved) return saved;
  } catch (e) { /* no file yet */ }
  const fresh = generatePasscode();
  passcodeWasGenerated = true;
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(PASSCODE_FILE, fresh + '\n');
  } catch (e) { /* read-only disk: keep the in-memory value */ }
  return fresh;
}
const PASSCODE = readPasscode();

/* ---------------- admin sessions ---------------- */
/* Logging in hands the browser an HttpOnly cookie. The passcode itself never
   travels to the front-end, so it cannot be read out of any delivered file.
   Sessions live in memory: a server restart asks for the passcode once more. */
const SESSION_TTL_MS = 12 * 60 * 60 * 1000;
const sessions = new Map();          // token -> expiry timestamp

function issueSession() {
  const token = crypto.randomBytes(24).toString('base64url');
  sessions.set(token, Date.now() + SESSION_TTL_MS);
  if (sessions.size > 2000) {
    const now = Date.now();
    sessions.forEach((exp, t) => { if (exp < now) sessions.delete(t); });
  }
  return token;
}

function sessionValid(token) {
  const exp = sessions.get(token);
  if (!exp) return false;
  if (exp < Date.now()) { sessions.delete(token); return false; }
  sessions.set(token, Date.now() + SESSION_TTL_MS);   // sliding, so a workday never drops
  return true;
}

function cookieOf(req, name) {
  const raw = String(req.headers.cookie || '');
  const hit = raw.split(';').map((c) => c.trim())
    .find((c) => c.indexOf(name + '=') === 0);
  return hit ? decodeURIComponent(hit.slice(name.length + 1)) : '';
}

function sessionCookie(req, token, maxAge) {
  const secure = (req.headers['x-forwarded-proto'] || '') === 'https' || req.socket.encrypted;
  return 'skyline_admin=' + encodeURIComponent(token)
    + '; Path=/; Max-Age=' + maxAge + '; HttpOnly; SameSite=Strict'
    + (secure ? '; Secure' : '');
}

/* ---------------- submission rate limit ---------------- */
const WRITE_WINDOW_MS = 10 * 60 * 1000;
const WRITE_MAX = 20;
const LOGIN_MAX = 8;
const hits = new Map();

function tallyBucket(ip, tag) { return tag + '|' + ip; }

function allowed(key, max) {
  const now = Date.now();
  const list = (hits.get(key) || []).filter((t) => now - t < WRITE_WINDOW_MS);
  if (list.length >= max) { hits.set(key, list); return false; }
  list.push(now);
  hits.set(key, list);
  if (hits.size > 5000) hits.clear();
  return true;
}

function allowedToWrite(ip) { return allowed(tallyBucket(ip, 'w'), WRITE_MAX); }
function allowedToLogin(ip) { return allowed(tallyBucket(ip, 'l'), LOGIN_MAX); }

/* ---------------- storage ---------------- */
function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  Object.keys(FILES).forEach((kind) => {
    if (!fs.existsSync(FILES[kind])) fs.writeFileSync(FILES[kind], '[]\n');
  });
}

function load(kind) {
  try {
    const rows = JSON.parse(fs.readFileSync(FILES[kind], 'utf8'));
    return Array.isArray(rows) ? rows : [];
  } catch (e) {
    return [];
  }
}

function save(kind, rows) {
  const tmp = FILES[kind] + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(rows, null, 2) + '\n');
  fs.renameSync(tmp, FILES[kind]);
}

/* ---------------- sanitising what the browser posts ---------------- */
const text = (v, max) => String(v == null ? '' : v).replace(/[\u0000-\u001F<>]/g, ' ').trim().slice(0, max);
const phone = (v) => String(v == null ? '' : v).replace(/\D+/g, '').replace(/^91(?=\d{10}$)/, '').slice(0, 15);

function buildRecord(kind, body) {
  const now = new Date().toISOString();
  const id = /^[LR][A-Z0-9]{6,20}$/.test(String(body.id || '')) ? String(body.id) : makeId(kind, now);

  if (kind === 'review') {
    const rating = Math.min(5, Math.max(1, parseInt(body.rating, 10) || 5));
    const name = text(body.name, 60);
    return {
      id,
      type: 'review',
      name,
      initials: text(body.initials, 4) || name.split(/\s+/).map((w) => w.charAt(0)).join('').slice(0, 2).toUpperCase() || 'SS',
      service: text(body.service, 80),
      rating,
      text: text(body.text, 600),
      status: body.status === 'approved' || body.status === 'hidden' ? body.status : 'pending',
      createdAt: text(body.createdAt, 44) || now,
      updatedAt: now,
      source: { referrer: text((body.source || {}).referrer, 240), utm: text((body.source || {}).utm, 160), page: text((body.source || {}).page, 120) }
    };
  }

  return {
    id,
    type: 'enquiry',
    name: text(body.name, 80),
    phone: phone(body.phone),
    email: text(body.email, 120).toLowerCase(),
    service: text(body.service, 80),
    message: text(body.message, 900),
    status: ['new', 'contacted', 'closed', 'archived'].indexOf(body.status) > -1 ? body.status : 'new',
    note: text(body.note, 400),
    createdAt: text(body.createdAt, 44) || now,
    updatedAt: now,
    source: { referrer: text((body.source || {}).referrer, 240), utm: text((body.source || {}).utm, 160), page: text((body.source || {}).page, 120) },
    ua: text(body.ua, 180)
  };
}

function makeId(kind, when) {
  const stamp = new Date(when).getTime().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return (kind === 'review' ? 'R' : 'L') + stamp + rand;
}

/* upsert so a retried outbox post never duplicates a row */
function upsert(kind, record) {
  const rows = load(kind);
  const i = rows.findIndex((r) => r.id === record.id);
  if (i === -1) rows.push(record);
  else rows[i] = Object.assign({}, rows[i], record);
  save(kind, rows);
  return i === -1 ? 'created' : 'updated';
}

/* ---------------- http helpers ---------------- */
function json(res, code, payload) {
  const body = JSON.stringify(payload);
  res.writeHead(code, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Origin': 'same-origin-only',
    'Access-Control-Allow-Headers': 'Content-Type, x-skyline-passcode',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS'
  });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > MAX_BODY) { reject(new Error('body too large')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString('utf8');
      if (!raw) return resolve({});
      try { resolve(JSON.parse(raw)); } catch (e) { reject(new Error('invalid json')); }
    });
    req.on('error', reject);
  });
}

const authorised = (req) => sessionValid(cookieOf(req, 'skyline_admin'))
  || String(req.headers['x-skyline-passcode'] || '') === PASSCODE;

/* ---------------- static files ---------------- */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.woff2': 'font/woff2'
};

function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  if (rel === '/' || rel === '') rel = '/index.html';
  else if (rel.endsWith('/')) rel += 'index.html';
  else if (path.extname(rel) === '') rel += '.html';

  /* server source and build tools are not part of the website */
  if (BLOCKED.some((b) => rel === b || rel.startsWith(b))) return notFound(res);

  const segs = path.normalize(rel).split(path.sep);
  if (segs.some((s) => s === '..')) return notFound(res);          // no traversal, ever
  const parts = segs.filter((p) => p && p !== '.');
  const filePath = parts.length ? path.join(ROOT, ...parts) : ROOT;
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    return json(res, 403, { ok: false, error: 'forbidden' });
  }
  if (filePath.startsWith(DATA_DIR)) return json(res, 403, { ok: false, error: 'forbidden' });

  fs.stat(filePath, (err, stat) => {
    if (!err && stat.isDirectory()) return serveFile(req, res, path.join(filePath, 'index.html'));
    if (!err && stat.isFile()) return serveFile(req, res, filePath);
    serveFile(req, res, filePath);
  });
}

function serveFile(req, res, filePath) {
  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) return notFound(res);
    const ext = path.extname(filePath).toLowerCase();
    const type = MIME[ext] || 'application/octet-stream';
    /* HTML and data are never cached; css/js revalidate every visit (304 when
       unchanged) so a redesign cannot be stuck behind a week of caching; only
       images and fonts get a long max-age.                                  */
    const cache = ext === '.html' || filePath.includes('data' + path.sep)
      ? 'no-cache'
      : ext === '.css' || ext === '.js' || ext === '.svg'
        ? 'public, max-age=0, must-revalidate'
        : 'public, max-age=604800';
    const lastMod = stat.mtime.toUTCString();
    if (String(req.headers['if-modified-since'] || '') === lastMod) {
      res.writeHead(304, { 'Cache-Control': cache, 'Last-Modified': lastMod });
      return res.end();
    }
    res.writeHead(200, {
      'Content-Type': type,
      'Content-Length': stat.size,
      'Cache-Control': cache,
      'Last-Modified': lastMod
    });
    fs.createReadStream(filePath).pipe(res);
  });
}

function notFound(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<!doctype html><meta charset="utf-8"><title>Page not found</title>' +
    '<body style="font-family:system-ui,sans-serif;background:#eaf1f8;color:#0e1c2e;padding:3rem;line-height:1.6">' +
    '<h1 style="margin:0 0 .5rem;font-size:1.6rem">404 — that page is not here</h1>' +
    '<p style="margin:0 0 1.25rem;color:#46596f">The service, licence or page you asked for is not at this address.</p>' +
    '<p style="margin:0"><a href="/" style="color:#b4650f">Back to Skyline Solution Enterprises</a> · ' +
    '<a href="/services.html" style="color:#b4650f">All 29 services</a> · ' +
    '<a href="tel:+918271895469" style="color:#b4650f">Call 8271895469</a></p></body>');
}

/* ---------------- router ---------------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://' + (req.headers.host || 'localhost'));
  const parts = url.pathname.split('/').filter(Boolean);

  if (parts[0] !== 'api') return serveStatic(req, res, url.pathname);

  const resource = parts[1];          // health | leads | reviews | admin
  const id = parts[2] ? decodeURIComponent(parts[2]) : '';

  const clientIp = () => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').toString().split(',')[0];

  if (resource === 'health') {
    return json(res, 200, { ok: true, service: 'skyline', version: 2, records: load('lead').length });
  }

  /* admin auth. The passcode only ever travels from the browser to this
     server; the reply is an HttpOnly cookie, so no delivered file can
     reveal it and a refresh keeps the dashboard open.                    */
  if (resource === 'admin') {
    const action = parts[2];

    if (action === 'login' && req.method === 'POST') {
      if (!allowedToLogin(clientIp())) {
        return json(res, 429, { ok: false, error: 'too many attempts — wait a few minutes' });
      }
      return readBody(req).then((body) => {
        if (String(body.passcode || '') !== PASSCODE) {
          return json(res, 401, { ok: false, error: 'wrong passcode' });
        }
        res.setHeader('Set-Cookie', sessionCookie(req, issueSession(), SESSION_TTL_MS / 1000));
        json(res, 200, { ok: true, service: 'skyline', session: 'open' });
      }).catch((e) => json(res, 400, { ok: false, error: e.message }));
    }

    if (action === 'logout') {
      const token = cookieOf(req, 'skyline_admin');
      if (token) sessions.delete(token);
      res.setHeader('Set-Cookie', sessionCookie(req, '', 0));
      return json(res, 200, { ok: true, session: 'closed' });
    }

    if (action === 'session' && req.method === 'GET') {
      const open = authorised(req);
      return json(res, open ? 200 : 401, { ok: open, service: 'skyline', session: open ? 'open' : 'closed' });
    }

    return json(res, 404, { ok: false, error: 'unknown admin route' });
  }

  const kind = resource === 'reviews' ? 'review' : resource === 'leads' ? 'lead' : '';
  if (!kind) return json(res, 404, { ok: false, error: 'unknown resource' });

  if (req.method === 'POST') {
    const ip = clientIp();
    if (!allowedToWrite(ip)) return json(res, 429, { ok: false, error: 'too many submissions from this connection' });
    return readBody(req).then((body) => {
      const record = buildRecord(kind, body);
      const action = upsert(kind, record);
      json(res, action === 'created' ? 201 : 200, { ok: true, id: record.id, action });
    }).catch((e) => json(res, 400, { ok: false, error: e.message }));
  }

  if (req.method === 'GET') {
    /* public feed: approved reviews only, never any contact detail */
    if (kind === 'review' && id === 'public') {
      const rows = load('review')
        .filter((r) => r.status === 'approved')
        .map((r) => ({
          id: r.id, type: 'review', name: r.name, initials: r.initials, service: r.service,
          rating: r.rating, text: r.text, status: 'approved', createdAt: r.createdAt, updatedAt: r.updatedAt
        }))
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      return json(res, 200, { ok: true, records: rows });
    }

    if (!authorised(req)) return json(res, 401, { ok: false, error: 'passcode required' });
    return json(res, 200, { ok: true, records: load(kind) });
  }

  if (req.method === 'PATCH') {
    if (!authorised(req)) return json(res, 401, { ok: false, error: 'passcode required' });
    return readBody(req).then((body) => {
      const rows = load(kind);
      const i = rows.findIndex((r) => r.id === id);
      if (i === -1) return json(res, 404, { ok: false, error: 'not found' });
      /* the dashboard edits whole records, so every stored field except the
         identity and the audit timestamps is up for revision here */
      const allowed = kind === 'review'
        ? ['name', 'initials', 'service', 'rating', 'text', 'status']
        : ['name', 'phone', 'email', 'service', 'message', 'status', 'note'];
      allowed.forEach((key) => {
        if (body[key] === undefined) return;
        if (key === 'rating') { rows[i][key] = Math.min(5, Math.max(1, parseInt(body[key], 10) || 5)); return; }
        if (key === 'phone') { rows[i][key] = phone(body[key]); return; }
        if (key === 'email') { rows[i][key] = text(body[key], 120).toLowerCase(); return; }
        if (key === 'status') {
          const wanted = String(body[key]);
          const legal = kind === 'review' ? ['pending', 'approved', 'hidden'] : ['new', 'contacted', 'closed', 'archived'];
          if (legal.indexOf(wanted) > -1) rows[i][key] = wanted;
          return;
        }
        rows[i][key] = text(body[key], key === 'note' ? 400 : key === 'message' ? 900 : key === 'text' ? 600 : 120);
      });
      rows[i].updatedAt = new Date().toISOString();
      save(kind, rows);
      json(res, 200, { ok: true, record: rows[i] });
    }).catch((e) => json(res, 400, { ok: false, error: e.message }));
  }

  if (req.method === 'DELETE') {
    if (!authorised(req)) return json(res, 401, { ok: false, error: 'passcode required' });
    const rows = load(kind);
    const next = rows.filter((r) => r.id !== id);
    save(kind, next);
    return json(res, 200, { ok: true, removed: rows.length !== next.length });
  }

  res.writeHead(405, { Allow: 'GET,POST,PATCH,DELETE' });
  res.end();
});

ensureDataDir();
server.listen(PORT, () => {
  console.log('Skyline site  \u2192  http://localhost:' + PORT + '/');
  console.log('Lead API      \u2192  /api/leads \u00b7 /api/reviews \u00b7 /api/health');
  console.log('Admin API     \u2192  /api/admin/login \u00b7 /api/admin/session \u00b7 /api/admin/logout');
  console.log('Data files    \u2192  ' + DATA_DIR);
  if (process.env.SKYLINE_ADMIN_PASSCODE) {
    console.log('Admin passcode comes from SKYLINE_ADMIN_PASSCODE.');
  } else if (passcodeWasGenerated) {
    console.log('');
    console.log('First run: a new admin passcode was created \u2192 ' + PASSCODE);
    console.log('It lives in ' + PASSCODE_FILE + ' (untracked, never pushed).');
    console.log('Use it on admin.html, or set SKYLINE_ADMIN_PASSCODE to choose your own.');
  } else {
    console.log('Admin passcode lives in ' + PASSCODE_FILE + ' (untracked, never pushed).');
  }
});
