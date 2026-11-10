/* ==========================================================================
   check-consistency.js — multi-page audit
   Compares every page against assets/js/data.js, then checks structure:
   chips vs catalogue, select options, generated pages, tag balance,
   single h1, canonical, anchors, aria-controls and relative asset paths.

   Run:  node assets/tools/check-consistency.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
let problems = 0;
const fail = (msg) => { problems++; console.log('  [FAIL] ' + msg); };
const ok = (msg) => console.log('  [ok] ' + msg);

/* ---------- catalogue ---------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'js', 'data.js'), 'utf8'), sandbox);
const DATA = sandbox.window.SERVICE_DATA;
const NAMES = Object.keys(DATA.services);

const slug = (n) => n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
const unesc = (s) => s.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');

console.log('catalogue services :', NAMES.length);
console.log('desks              :', DATA.desks.length);

/* ---------- pages to audit ---------- */
const rootPages = ['index.html', 'services.html', 'process.html', 'reviews.html', 'enquire.html', 'contact.html', 'admin.html'];
const subPages = NAMES.map((n) => path.join('services', slug(n) + '.html')).concat([path.join('services', 'index.html')]);

const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/* ---------- 1. services.html chips vs catalogue ---------- */
{
  console.log('\nservices.html - chips');
  const html = read('services.html');
  const chips = [...html.matchAll(/<a class="service-chip" href="services\/([a-z0-9-]+)\.html">([^<]+)<\/a>/g)];
  ok('chips found: ' + chips.length);
  if (chips.length !== NAMES.length) fail('expected ' + NAMES.length + ' chips, found ' + chips.length);

  const slugs = new Set(NAMES.map(slug));
  chips.forEach((m) => {
    if (!slugs.has(m[1])) fail('chip href has no catalogue page: ' + m[1]);
    const name = unesc(m[2]);
    if (slug(name) !== m[1]) fail('chip label/slug mismatch: "' + name + '" -> ' + m[1]);
  });
  const listed = new Set(chips.map((m) => unesc(m[2])));
  NAMES.forEach((n) => { if (!listed.has(n)) fail('catalogue service missing a chip: ' + n); });

  DATA.desks.forEach((d) => {
    if (!html.includes('id="desk-' + d.id + '"')) fail('desk anchor missing: desk-' + d.id);
    if (!html.includes('aria-controls="panel-' + d.id + '"')) fail('desk toggle has no matching panel id: ' + d.id);
  });
}

/* ---------- 2. select options on enquire + reviews ---------- */
['enquire.html', 'reviews.html'].forEach((file) => {
  console.log('\n' + file + ' — service options');
  const html = read(file);
  const options = [...html.matchAll(/<option>([^<]+)<\/option>/g)].map((m) => unesc(m[1]));
  ok('options found: ' + options.length);
  const known = new Set(NAMES.concat(['Something else / not sure']));
  options.forEach((o) => { if (!known.has(o)) fail('option without a catalogue entry: ' + o); });
  NAMES.forEach((n) => { if (!options.includes(n)) fail('catalogue service not selectable: ' + n); });
});

/* ---------- 3. generated pages ---------- */
console.log('\nservices/ folder');
subPages.forEach((rel) => { if (!fs.existsSync(path.join(ROOT, rel))) fail('missing generated page: ' + rel); });
ok('generated pages present: ' + subPages.length);

/* ---------- 4. per-page structure ---------- */
rootPages.concat(subPages).forEach((rel) => {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) return;
  const html = read(rel);
  const label = rel.replace(/\\/g, '/');
  const local = [];

  const h1 = (html.match(/<h1[ >]/g) || []).length;
  if (html.includes('<main') && h1 !== 1) local.push('h1 count is ' + h1 + ' (expected 1)');

  if (!admin(rel) && !html.includes('<link rel="canonical"')) local.push('no canonical');
  if (!html.includes('<title>') || html.length < 200) local.push('thin page');

  ['section', 'form', 'article', 'details', 'table', 'ul', 'ol', 'li', 'div', 'aside', 'nav'].forEach((tag) => {
    const open = (html.match(new RegExp('<' + tag + '(\\s|>)', 'g')) || []).length;
    const close = (html.match(new RegExp('</' + tag + '>', 'g')) || []).length;
    if (open !== close) local.push('unbalanced <' + tag + '> open ' + open + ' close ' + close);
  });

  const ids = new Set([...html.matchAll(/id="([^"]+)"/g)].map((m) => m[1]));
  [...new Set([...html.matchAll(/href="#([^"?]+)"/g)].map((m) => m[1]))]
    .filter((f) => !ids.has(f)).forEach((f) => local.push('dead anchor #' + f));
  [...new Set([...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]))]
    .filter((f) => !ids.has(f)).forEach((f) => local.push('aria-controls without target ' + f));

  /* every relative href/src must resolve on disk */
  const dir = path.dirname(rel);
  [...html.matchAll(/(?:href|src)="((?!https?:|mailto:|tel:|#)[^"]+)"/g)].map((m) => m[1]).forEach((ref) => {
    const clean = ref.split('?')[0].split('#')[0];
    if (!clean || clean.startsWith('//')) return;
    const target = path.join(ROOT, dir, clean);
    const exists = fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html')) || fs.existsSync(target + '.html');
    if (!exists) local.push('broken local reference: ' + ref);
  });

  if (local.length) { console.log('\n' + label); local.forEach(fail); }
  else console.log('\n' + label + '  [ok]');
});

function admin(rel) { return /admin\.html$/.test(rel); }

/* ---------- 5. sitemap coverage ---------- */
console.log('\nsitemap.xml');
const map = read('sitemap.xml');
const urls = [...map.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
ok('urls: ' + urls.length);
rootPages.filter((p) => p !== 'admin.html').concat(subPages.map((p) => p.replace(/\\/g, '/'))).forEach((rel) => {
  let urlPath = rel.replace(/\\/g, '/');
  if (urlPath === 'index.html') urlPath = '';
  else if (urlPath.endsWith('index.html')) urlPath = urlPath.slice(0, -'index.html'.length);
  const want = 'https://www.skylinesolutionenterprises.in/' + urlPath;
  if (!urls.includes(want)) fail('page not in sitemap: ' + want);
});
if (urls.some((u) => /admin/.test(u))) fail('admin page must stay out of the sitemap');

console.log('\n' + (problems ? problems + ' problem(s) found' : 'all checks passed'));
process.exitCode = problems ? 1 : 0;
