/* ==========================================================================
   check-theme.js — guards the light-only colour lock.

   Two defects this exists to prevent, both of which shipped to phones:

   1. A `@media (prefers-color-scheme: …)` block that re-maps SOME tokens.
      The old dark block swapped --text/--muted/--faint to near-white but left
      --glass-bg at rgba(255,255,255,.75), so a phone in dark mode got
      near-white cards carrying near-white text. Skyline ships one theme, so no
      colour-scheme query may declare anything at all.

   2. A `var(--token)` consumed somewhere but declared nowhere live.
      An unresolved custom property makes the declaration fall back to its
      initial value, so `border-bottom: 1px solid var(--border-color)` drew hard
      currentColor rules. --border-color / --border-light lived only in the dark
      block and in the dead modern-base.css bundle.

   Usage:  node assets/tools/check-theme.js
   Exit:   0 clean, 1 findings
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
/* base.css is the only bundle guaranteed on every page; admin.css and sections.css
   are the per-page halves. modern-*.css are dead files no HTML links — excluded.
   Pass paths on the command line to point the same checks at another stylesheet,
   e.g. `node assets/tools/check-theme.js assets/css/modern-base.css` to confirm the
   guard still bites (that legacy bundle does carry a partial dark block). */
const argvFiles = process.argv.slice(2)
  .filter((a) => !a.startsWith('-'))
  .map((a) => a.replace(/\\/g, '/').replace(/^\.\//, ''));
const LIVE = argvFiles.length
  ? argvFiles
  : ['assets/css/base.css', 'assets/css/sections.css', 'assets/css/admin.css'];

const text = (rel) => fs.readFileSync(path.join(ROOT, rel.split('/').join(path.sep)), 'utf8');

/* Strip comments so commented-out CSS (the explanatory blocks quote property
   names) never counts as a declaration or a token use. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* Same, but keeps every newline so line numbers still line up with the source. */
const blank = (s) => s.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));

/* ------------------------------------------------ 1. colour-scheme queries */
const schemeFindings = [];

LIVE.forEach((rel) => {
  const src = strip(text(rel));
  /* Walk @media preludes with a brace counter so nested rules are attributed to
     the outermost colour-scheme query they belong to. */
  const re = /@media([^{]*)\{/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const cond = m[1].trim();
    if (!/prefers-color-scheme/.test(cond)) continue;
    let depth = 1;
    let i = re.lastIndex;
    while (i < src.length && depth > 0) {
      if (src[i] === '{') depth++;
      else if (src[i] === '}') depth--;
      i++;
    }
    const body = src.slice(re.lastIndex, i - 1);
    /* a rule body counts only if it actually declares something */
    const decls = body.split('}').map((b) => b.split('{')[1] || '').join(';')
      .split(';').map((d) => d.trim()).filter((d) => /^[a-z-]+\s*:/i.test(d));
    if (decls.length) {
      schemeFindings.push({ where: rel, cond, count: decls.length, sample: decls.slice(0, 4) });
    }
  }
});

/* ------------------------------------------------------ 2. token coverage  */
/* Every name used through var() anywhere must be declared in some :root block
   inside a LIVE file. Declarations inside @media count too, but a token whose
   ONLY home is a colour-scheme query is exactly bug #1/#2, so track that. */
const rootDecls = new Set();
const anyDecls = new Set();
const used = new Map(); /* name -> Set of "file:line" */

LIVE.forEach((rel) => {
  const raw = blank(text(rel));
  raw.split(/\r?\n/).forEach((line, idx) => {
    for (const d of line.matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) anyDecls.add(d[1]);
    for (const u of line.matchAll(/var\(\s*(--[A-Za-z0-9_-]+)/g)) {
      if (!used.has(u[1])) used.set(u[1], new Set());
      used.get(u[1]).add(rel + ':' + (idx + 1));
    }
  });

  /* :root blocks only (not the ones nested in @media) — those are the always-on
     values every page is guaranteed to see. */
  const src = strip(raw);
  const re = /:root\s*\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    for (const d of m[1].matchAll(/(--[A-Za-z0-9_-]+)\s*:/g)) rootDecls.add(d[1]);
  }
});

const missingInRoot = [];
for (const [name, sites] of used) {
  if (rootDecls.has(name)) continue;
  missingInRoot.push({
    name,
    declaredSomewhere: anyDecls.has(name),
    sites: [...sites].slice(0, 4)
  });
}

/* ------------------------------------------------------------------ report */
console.log('live bundles: ' + LIVE.join(', '));
console.log('tokens declared in :root: ' + rootDecls.size + ', tokens used via var(): ' + used.size + '\n');

let bad = 0;

if (!schemeFindings.length) {
  console.log('  [ok] no @media (prefers-color-scheme) block declares anything — light is locked');
} else {
  bad += schemeFindings.length;
  schemeFindings.forEach((f) => {
    console.log('  [FAIL] ' + f.where + '  ' + f.cond);
    console.log('         ' + f.count + ' declaration(s), e.g. ' + f.sample.join(' | '));
  });
  console.log('         Partial token swaps are what washed out the cards on dark-mode phones.');
  console.log('         Either ship the theme fully across every surface, or keep the block empty.');
}

if (!missingInRoot.length) {
  console.log('  [ok] every var(--token) used by the live bundles resolves from :root');
} else {
  bad += missingInRoot.length;
  missingInRoot.forEach((f) => {
    console.log('  [FAIL] ' + f.name + ' used but not declared in any :root block'
      + (f.declaredSomewhere ? ' (only inside an @media/other scope)' : ' (declared nowhere live)'));
    console.log('         used at: ' + f.sites.join(', '));
  });
}

console.log('\n' + (bad ? bad + ' theme finding(s)' : 'theme checks clean'));
process.exit(bad ? 1 : 0);
