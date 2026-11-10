/* ==========================================================================
   responsive-audit.js — static check that nothing forces the layout wider
   than a small phone (360 CSS px viewport, ~326 px of usable content once
   the page gutters are taken off).

   Why static: the rules that break small screens are always the same shape —
   a fixed px width / min-width / grid track that is only safe from a certain
   viewport up but is declared outside a min-width media query.

   Usage:  node assets/tools/responsive-audit.js
   Exit:   0 clean, 1 findings to review
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
const CSS = ['assets/css/base.css', 'assets/css/sections.css', 'assets/css/admin.css'];
const HTML = ['index.html', 'services.html', 'process.html', 'reviews.html', 'enquire.html',
  'contact.html', 'admin.html', 'services/index.html', 'services/gst-registration.html'];

const PHONE = 360;          /* smallest viewport we promise to support */
const USABLE = 326;         /* after the widest gutter the site uses    */

const PROPS = /(^|;)\s*(width|min-width|flex-basis|grid-template-columns|grid-auto-columns|column-width|min-inline-size|inline-size)\s*:\s*([^;}]+)/g;

/* ---------------------------------------------------------------- media map
   Walk the file character by character so every line knows which @media (and
   which @keyframes) it sits inside. Correct nesting, no guessing.           */
function contextByLine(text) {
  const lines = text.split(/\r?\n/);
  const stack = [];
  const out = new Array(lines.length);
  let line = 0;
  let prelude = '';
  let inComment = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === '\n') { line++; continue; }
    if (inComment) { if (ch === '/' && text[i - 1] === '*') inComment = false; continue; }
    if (ch === '/' && text[i + 1] === '*') { inComment = true; i++; continue; }

    if (ch === '{') {
      const p = prelude.trim();
      prelude = '';
      if (/^@media/.test(p)) stack.push({ type: 'media', cond: p.replace(/^@media/, ''), line: line });
      else if (/^@/.test(p)) stack.push({ type: 'other', cond: p.split(/\s/)[0], line: line });
      else stack.push({ type: 'rule', cond: null, line: line });
      continue;
    }
    if (ch === '}') { stack.pop(); prelude = ''; continue; }
    if (ch === ';') { prelude = ''; continue; }
    prelude += ch;

    /* remember the stack snapshot for each line the first time we reach it */
    if (!out[line]) out[line] = snapshot(stack);
  }
  for (let l = 0; l < lines.length; l++) if (!out[l]) out[l] = snapshot(stack);
  return out;
}

function snapshot(stack) {
  return stack.map((s) => s.type + ':' + (s.cond || ''));
}

/* ------------------------------------------------------------- helpers ---- */
const px = (v) => Math.round(parseFloat(v));

function insideMedia(ctx, kind, minWidthAtLeast) {
  return ctx.some((entry) => {
    if (entry.indexOf(kind + ':') !== 0) return false;
    const min = /min-width:\s*(\d+)px/.exec(entry);
    return !min || px(min[1]) >= minWidthAtLeast;
  });
}

function inKeyframes(ctx) {
  return ctx.some((e) => e.indexOf('other:@keyframes') === 0);
}

const findings = [];

CSS.forEach(function (rel) {
  const file = path.join(ROOT, rel.split('/').join(path.sep));
  const text = fs.readFileSync(file, 'utf8');
  const lines = text.split(/\r?\n/);
  const ctxs = contextByLine(text);

  lines.forEach(function (raw, idx) {
    const clean = raw.replace(/\/\*[\s\S]*?\*\//g, '');
    if (!clean.trim()) return;
    const ctx = ctxs[idx] || [];
    if (inKeyframes(ctx)) return;

    PROPS.lastIndex = 0;
    let m;
    while ((m = PROPS.exec(clean)) !== null) {
      const prop = m[2].trim();
      const value = m[3].trim();
      const sizes = (value.match(/(\d{2,4})px/g) || []).map(px).filter((n) => n > 100);
      if (!sizes.length) continue;
      const biggest = Math.max.apply(null, sizes);
      if (biggest <= USABLE) continue;
      /* safe when the declaration is already inside a media query that only
         applies from a phone-and-up viewport                                */
      if (insideMedia(ctx, 'media', PHONE)) continue;

      findings.push({
        where: rel + ':' + (idx + 1),
        text: clean.trim().slice(0, 96),
        prop: prop,
        value: value,
        px: biggest,
        ctx: ctx.filter((c) => c.indexOf('media:') === 0).join(' + ') || 'no media query'
      });
    }
  });
});

HTML.forEach(function (rel) {
  const file = path.join(ROOT, rel.split('/').join(path.sep));
  if (!fs.existsSync(file)) return;
  fs.readFileSync(file, 'utf8').split(/\r?\n/).forEach(function (line, idx) {
    (line.match(/style="[^"]*"/g) || []).forEach(function (style) {
      const sizes = (style.match(/(?:width|min-width|flex-basis):\s*(\d{3,4})px/g) || [])
        .map((s) => px((/(\d{3,4})px/.exec(s) || [0, 0])[1]))
        .filter((n) => n > USABLE);
      if (!sizes.length) return;
      findings.push({
        where: rel + ':' + (idx + 1), text: style.slice(0, 96), prop: 'inline style',
        value: style, px: Math.max.apply(null, sizes), ctx: 'inline'
      });
    });
  });
});

/* Optional real-browser regression pass. No project dependency is added:
   node assets/tools/responsive-audit.js --browser [path-to-playwright]
   Uses installed Chrome, tests public pages, never submits a form. */
async function browserAudit() {
  const { chromium } = require(process.argv[3] || 'playwright');
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
  if (process.argv.includes('--empty-reviews')) {
    /* Simulate the empty wall in this disposable browser only; stored reviews stay untouched. */
    await context.route('**/api/reviews/public', route => route.fulfill({
      status: 200, contentType: 'application/json', body: '{"records":[]}'
    }));
  }
  const page = await context.newPage();
  const pages = ['index.html', 'services.html', 'process.html', 'reviews.html',
    'enquire.html', 'contact.html', 'about.html'].concat(
      fs.readdirSync(path.join(ROOT, 'services')).filter(f => f.endsWith('.html')).map(f => 'services/' + f));
  const widths = [320, 390, 768, 1024, 1440, 1920];
  const shots = new Set(['index.html:390', 'index.html:1440', 'reviews.html:1440',
    'process.html:1440', 'contact.html:1440', 'services/gst-registration.html:390']);
  const images = new Set();
  let errors = 0;
  try {
    for (const width of widths) {
      await page.setViewportSize({ width, height: width < 700 ? 844 : 960 });
      for (const file of pages) {
        await page.goto('http://localhost:3000/' + file, { waitUntil: 'networkidle', timeout: 30000 });
        await page.evaluate(() => document.fonts.ready);
        const state = await page.evaluate(() => {
          const w = innerWidth;
          const outside = [...document.querySelectorAll('body *')].filter(el => {
            const r = el.getBoundingClientRect();
            if (!r.width || !r.height || !el.getClientRects().length) return false;
            if (el.closest('.hp, .ticker, .hero-photo, .table-scroll') || el.classList.contains('page-banner-image')) return false;
            return r.right > w + 2 || r.left < -2;
          }).map(el => el.tagName.toLowerCase() + '.' + el.className).slice(0, 6);
          const header = document.querySelector('.header-inner').getBoundingClientRect();
          const brand = document.querySelector('.site-header .brand').getBoundingClientRect();
          const nav = document.querySelector('.site-header .main-nav').getBoundingClientRect();
          const empty = document.querySelector('.review-empty');
          const list = document.querySelector('.reviews-list');
          const eyebrow = document.querySelector('.hero-copy .eyebrow');
          const banner = document.querySelector('.page-banner-image');
          const band = document.querySelector('.page-banner');
          const bandCopy = band ? band.querySelector('.wrap') : null;
          return {
            outside, headerLeft: brand.left - header.left, headerRight: header.right - nav.right,
            heroGap: eyebrow ? eyebrow.getBoundingClientRect().top - header.bottom : null,
            underline: !!document.querySelector('.hero-underline'),
            fontLoaded: document.fonts.check('400 16px Poppins'),
            emptyFullWidth: !empty || empty.getBoundingClientRect().width >= list.getBoundingClientRect().width - 2,
            banner: banner ? { src: banner.src, loaded: banner.complete && banner.naturalWidth > 0 } : null,
            /* the sub-page band must start at the very top of the page (behind the
               floating navbar) and its copy must sit clear of the navbar pill */
            bandTop: band ? band.getBoundingClientRect().top : null,
            bandCopyTop: bandCopy ? bandCopy.getBoundingClientRect().top : null,
            headerBottom: header.bottom,
            /* no green blob may sit over the photography */
            bandWedge: band ? getComputedStyle(band, '::before').content !== 'none'
              && getComputedStyle(band, '::before').backgroundImage !== 'none' : null,
            cards: document.querySelectorAll('[aria-labelledby="promise-title"] .desk-card').length
          };
        });
        const problems = [];
        if (state.outside.length) problems.push('overflow: ' + state.outside.join(', '));
        if (state.headerLeft < 8 || state.headerRight < 8) problems.push('navbar edge padding');
        if (state.heroGap !== null && state.heroGap < 16) problems.push('hero/header gap');
        if (state.underline) problems.push('hero underline still present');
        if (!state.fontLoaded) problems.push('Poppins not loaded');
        if (!state.emptyFullWidth) problems.push('review empty state not full width');
        if (file !== 'index.html' && (!state.banner || !state.banner.loaded)) problems.push('banner not loaded');
        if (file !== 'index.html' && state.bandTop !== null) {
          if (state.bandTop > 1) problems.push('page band does not start at the top (' + Math.round(state.bandTop) + 'px)');
          if (state.bandCopyTop !== null && state.bandCopyTop < state.headerBottom) problems.push('page band copy sits under the navbar');
          if (state.bandWedge) problems.push('page band has a green blob over the photo');
        }
        if (file === 'process.html' && state.cards !== 6) problems.push('expected six commitment cards');
        if (state.banner) images.add(state.banner.src);
        if (problems.length) { errors++; console.log('[FAIL]', width, file, problems.join('; ')); }
        if (shots.has(file + ':' + width)) {
          const target = path.join(ROOT, 'design-' + file.replace(/[/.]/g, '-') + '-' + width + '.png');
          try {
            await page.screenshot({ path: target, fullPage: file !== 'index.html', animations: 'disabled', timeout: 60000 });
            console.log('Screenshot:', target);
          } catch (e) {
            /* remote banner photography can stall the capture; the checks above already ran */
            console.log('Screenshot skipped (' + file + ' @ ' + width + '):', e.message.split('\n')[0]);
          }
        }
      }
      await page.goto('http://localhost:3000/index.html', { waitUntil: 'networkidle' });
      if (width < 950) {
        await page.locator('.nav-toggle').click();
        const menu = await page.locator('.nav-list').boundingBox();
        const header = await page.locator('.header-inner').boundingBox();
        if (!menu || menu.y < header.y + header.height || menu.x < -1 || menu.x + menu.width > width + 1) {
          errors++; console.log('[FAIL]', width, 'mobile menu overlaps header or leaves viewport');
        }
        await page.locator('.nav-toggle').click();
      }
      console.log('Completed viewport:', width, '(' + pages.length + ' public pages)');
    }
    console.log('Browser checks:', pages.length * widths.length, 'pages/viewports,', images.size, 'banner URLs,', errors, 'failures', process.argv.includes('--empty-reviews') ? '(empty reviews)' : '(live reviews)');
    process.exitCode = errors ? 1 : 0;
  } finally { await browser.close(); }
}

/* ------------------------------------------------------------------ report */
if (process.argv[2] === '--browser') {
  browserAudit().catch(e => { console.error(e); process.exitCode = 1; });
} else {
console.log('smallest supported viewport: ' + PHONE + 'px, usable content: ' + USABLE + 'px');
console.log('scanned: ' + CSS.join(', ') + ' + ' + HTML.length + ' html template(s)\n');

if (!findings.length) {
  console.log('  [ok] nothing forces a width above ' + USABLE + 'px outside a min-width media query');
  console.log('\nresponsive audit clean');
  process.exit(0);
}

findings.forEach(function (f) {
  console.log('  [check] ' + f.where);
  console.log('          ' + f.prop + ': ' + f.value + '  (' + f.px + 'px, ' + f.ctx + ')');
  console.log('          ' + f.text);
});
console.log('\n' + findings.length + ' declaration(s) to review for small screens');
process.exit(1);
}
