/* ==========================================================================
   test-admin-crud.js — real-browser proof for the admin dashboard.

   What it pins down, in the order the owner asked for it:
     1. the passcode is checked by the server, and a page refresh does NOT
        bounce the dashboard back to the gate
     2. an enquiry added in the dashboard survives a refresh
     3. search finds it, edit changes it, and the change survives a refresh
     4. the same record really lands in data/leads.json on disk (backend write)
     5. reviews get the same add / search / edit / refresh-safe treatment
     6. delete removes it from the table and from the disk store
     7. a wrong passcode is refused, and no delivered file contains the code

   It runs its OWN server.js on a spare port and restores data/*.json
   afterwards, so nothing you collected for real is ever touched.

   Usage:  node assets/tools/test-admin-crud.js [path-to-playwright] [--port=3015] [--shots]
   Exit:   0 all good, 1 something failed
   ========================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const argv = process.argv.slice(2);
const PW = argv.find((a) => !a.startsWith('--')) || 'playwright';
const PORT = Number((argv.find((a) => a.startsWith('--port')) || '').split('=')[1]
  || argv[argv.indexOf('--port') + 1] || 3015);
const SHOTS = argv.includes('--shots');
async function shot(page, name) {
  if (!SHOTS) return;
  const target = path.join(ROOT, 'admin-' + name + '.png');
  try {
    await page.screenshot({ path: target, fullPage: true });
    console.log('  [shot] ' + target);
  } catch (e) { console.log('  [shot skipped] ' + name + ': ' + e.message.split('\n')[0]); }
}
const BASE = 'http://localhost:' + PORT;

const FILES = { lead: path.join(ROOT, 'data', 'leads.json'), review: path.join(ROOT, 'data', 'reviews.json') };

/* the test hands the server its own throwaway code, so nothing here ever
   reads or writes your real data/admin-passcode.txt */
const TEST_PASSCODE = 'skyline-test-' + PORT;

let failures = 0;
function ok(label, condition, detail) {
  if (condition) { console.log('  [ok]  ' + label); return true; }
  failures++;
  console.log('  [FAIL] ' + label + (detail ? '  →  ' + detail : ''));
  return false;
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* "networkidle" never settles here (the page keeps a live session probe and
   remote fonts), so wait for the app's own "I know who is signed in" flag. */
async function gotoAdmin(page) {
  await page.goto(BASE + '/admin.html', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.body.dataset.booted === '1', null, { timeout: 15000 });
}

/* the POST that saves a record is fire-and-forget in the browser, so poll the
   disk instead of guessing how long the round trip takes */
async function until(fn, limit) {
  const stop = Date.now() + (limit || 5000);
  for (;;) {
    const value = await fn();
    if (value) return value;
    if (Date.now() > stop) return null;
    await wait(150);
  }
}

function readStore(kind) {
  try { return JSON.parse(fs.readFileSync(FILES[kind], 'utf8')); } catch (e) { return []; }
}

/* ------------------------------------------------------------------ */
async function main() {
  const { chromium } = require(PW);

  const backup = {};
  Object.keys(FILES).forEach((kind) => {
    backup[kind] = fs.existsSync(FILES[kind]) ? fs.readFileSync(FILES[kind], 'utf8') : '[]\n';
  });

  const server = spawn(process.execPath, [path.join(ROOT, 'server.js')], {
    env: Object.assign({}, process.env, { PORT: String(PORT), SKYLINE_ADMIN_PASSCODE: TEST_PASSCODE }),
    stdio: ['ignore', 'ignore', 'pipe']
  });
  let serverErr = '';
  server.stderr.on('data', (c) => { serverErr += c; });

  try {
    const up = await until(async () => {
      try {
        const res = await fetch(BASE + '/api/health');
        return res.ok ? (await res.json()).service === 'skyline' : false;
      } catch (e) { return false; }
    }, 8000);
    if (!up) throw new Error('server.js did not start on port ' + PORT + '\n' + serverErr);
    console.log('server.js          →  ' + BASE + ' (disposable store)');

    const browser = await chromium.launch({ channel: 'chrome', headless: true });
    /* a fresh context keeps localStorage out of your real profile */
    const context = await browser.newContext({ colorScheme: 'light', reducedMotion: 'reduce' });
    const page = await context.newPage();
    page.on('dialog', (d) => d.accept());

    const MARK = 'ZZ-CRUD-TEST';
    const leadName = MARK + ' Lead';
    const reviewName = MARK + ' Reviewer';

    /* ---------- 1. the server owns the login, and it survives a refresh ---------- */
    console.log('\ngate');
    await gotoAdmin(page);
    const delivered = await Promise.all(['/admin.html', '/assets/js/config.js', '/assets/js/admin.js', '/assets/js/leads.js']
      .map(async (p) => (await fetch(BASE + p).then((r) => r.text()).catch(() => ''))));
    ok('nothing the browser downloads carries the passcode',
      !delivered.join('').includes(TEST_PASSCODE), 'a served file leaked it');

    await page.fill('#passcode', 'definitely-not-the-code');
    await page.click('[data-gate-form] button[type="submit"]');
    await wait(700);
    ok('a wrong passcode is refused', await page.locator('[data-gate]').isVisible(),
      'the dashboard opened anyway');
    ok('the refusal explains itself',
      (await page.locator('[data-gate-error]').innerText()).trim().length > 0);

    await page.fill('#passcode', TEST_PASSCODE);
    await page.click('[data-gate-form] button[type="submit"]');
    await page.waitForSelector('[data-dash]:not([hidden])');
    ok('the right passcode opens the dashboard', true);

    const cookie = (await context.cookies(BASE + '/admin.html'))
      .find((c) => c.name === 'skyline_admin');
    ok('login set an HttpOnly session cookie', !!cookie && !!cookie.httpOnly,
      cookie ? 'httpOnly: ' + cookie.httpOnly : 'no cookie at all');

    await gotoAdmin(page);
    ok('refresh keeps the dashboard open (no passcode prompt)',
      await page.locator('[data-dash]').isVisible() && !(await page.locator('[data-gate]').isVisible()),
      'the gate came back');

    /* ---------- 2. create an enquiry ---------- */
    console.log('\nenquiries: create');
    await page.click('[data-new-lead]');
    await page.waitForSelector('[data-editor]:not([hidden])');
    await page.fill('[data-e="name"]', leadName);
    await page.fill('[data-e="phone"]', '90000' + String(Date.now()).slice(-5));
    await page.fill('[data-e="email"]', 'crud.test@skyline.local');
    await page.selectOption('[data-e="service"]', 'GST Registration');
    await page.fill('[data-e="message"]', 'Walk-in enquiry created from the dashboard.');
    await page.fill('[data-e="note"]', MARK + ' note');
    await page.selectOption('[data-e="status"]', 'contacted');
    await page.click('[data-editor-form] button[type="submit"]');
    await page.waitForSelector('[data-editor]', { state: 'hidden' });

    const row = page.locator('[data-leads-body] tr', { hasText: leadName });
    ok('new enquiry appears in the table', (await row.count()) === 1, 'rows found: ' + await row.count());
    await shot(page, 'leads');

    /* ---------- 3. it survives a refresh ---------- */
    await gotoAdmin(page);
    ok('new enquiry is still there after a refresh',
      (await page.locator('[data-leads-body] tr', { hasText: leadName }).count()) === 1);

    /* ---------- 4. search ---------- */
    console.log('\nenquiries: search');
    await page.fill('#q', leadName);
    ok('search matches the typed name',
      (await page.locator('[data-leads-body] tr').count()) === 1);

    await page.fill('#q', MARK + ' note');
    ok('search reaches the internal note field too',
      (await page.locator('[data-leads-body] tr').count()) === 1,
      'notes are not searchable');

    await page.fill('#q', leadName + ' zzz-no-such-thing');
    ok('search with a second term narrows to nothing',
      (await page.locator('[data-leads-body] tr').count()) === 0);
    await page.fill('#q', '');

    /* ---------- 5. edit ---------- */
    console.log('\nenquiries: update');
    await page.locator('[data-leads-body] tr', { hasText: leadName }).first().locator('[data-edit]').click();
    await page.waitForSelector('[data-editor]:not([hidden])');
    await shot(page, 'editor');
    ok('editor opens pre-filled', (await page.inputValue('[data-e="name"]')) === leadName,
      await page.inputValue('[data-e="name"]'));
    await page.fill('[data-e="note"]', MARK + ' edited note');
    await page.selectOption('[data-e="status"]', 'closed');
    await page.click('[data-editor-form] button[type="submit"]');
    await page.waitForSelector('[data-editor]', { state: 'hidden' });

    await gotoAdmin(page);
    const edited = page.locator('[data-leads-body] tr', { hasText: leadName }).first();
    ok('edit survives a refresh', (await edited.count()) === 1);
    ok('edited status is on the row', /Closed/.test(await edited.innerText().catch(() => '')),
      await edited.innerText().catch(() => ''));

    /* ---------- 6. the backend really stored it ---------- */
    console.log('\nbackend store (data/leads.json)');
    const onDisk = await until(async () => readStore('lead').find((r) => r.name === leadName), 6000);
    ok('enquiry was written to data/leads.json', !!onDisk);
    if (onDisk) {
      ok('server kept the edited note', onDisk.note === MARK + ' edited note', onDisk.note);
      ok('server kept the edited status', onDisk.status === 'closed', onDisk.status);
      ok('server kept the service', onDisk.service === 'GST Registration', onDisk.service);
    }

    /* ---------- 7. reviews: create, search, edit, refresh ---------- */
    console.log('\nreviews: create / search / update');
    await page.click('.tab[data-tab="reviews"]');
    await page.click('[data-new-review]');
    await page.waitForSelector('[data-editor]:not([hidden])');
    await page.fill('[data-e="name"]', reviewName);
    await page.selectOption('[data-e="service"]', 'Home Loan');
    await page.selectOption('[data-e="rating"]', '5');
    await page.fill('[data-e="text"]', MARK + ' original text');
    await page.selectOption('[data-e="status"]', 'approved');
    await page.click('[data-editor-form] button[type="submit"]');
    await page.waitForSelector('[data-editor]', { state: 'hidden' });

    const card = page.locator('[data-reviews-body] li', { hasText: reviewName });
    ok('new review appears in the list', (await card.count()) === 1, 'cards found: ' + await card.count());

    await page.fill('#q-review', 'zzz-no-such-review');
    ok('review search hides non-matches',
      (await page.locator('[data-reviews-body] li').count()) === 0);
    await page.fill('#q-review', MARK + ' original');
    ok('review search matches the review text',
      (await page.locator('[data-reviews-body] li').count()) === 1);
    await page.fill('#q-review', '');

    await page.locator('[data-reviews-body] li', { hasText: reviewName }).first().locator('[data-edit]').click();
    await page.waitForSelector('[data-editor]:not([hidden])');
    await page.fill('[data-e="text"]', MARK + ' edited text');
    await page.click('[data-editor-form] button[type="submit"]');
    await page.waitForSelector('[data-editor]', { state: 'hidden' });

    await gotoAdmin(page);
    await page.click('.tab[data-tab="reviews"]');
    ok('review edit survives a refresh',
      (await page.locator('[data-reviews-body] li', { hasText: MARK + ' edited text' }).count()) === 1);

    const onDiskReview = await until(async () => readStore('review').find((r) => r.name === reviewName), 6000);
    ok('review was written to data/reviews.json', !!onDiskReview);
    if (onDiskReview) ok('server kept the edited review text', onDiskReview.text === MARK + ' edited text', onDiskReview.text);

    /* ---------- 8. delete ---------- */
    console.log('\ndelete');
    await page.locator('[data-reviews-body] li', { hasText: reviewName }).first().locator('[data-del]').click();
    await wait(600);
    ok('review deleted from the list',
      (await page.locator('[data-reviews-body] li', { hasText: reviewName }).count()) === 0);

    await page.click('.tab[data-tab="leads"]');
    await page.locator('[data-leads-body] tr', { hasText: leadName }).first().locator('[data-del]').click();
    await wait(600);
    ok('enquiry deleted from the table',
      (await page.locator('[data-leads-body] tr', { hasText: leadName }).count()) === 0);

    const goneFromDisk = await until(async () =>
      !readStore('lead').find((r) => r.name === leadName) && !readStore('review').find((r) => r.name === reviewName), 6000);
    ok('both records removed from the disk store too', !!goneFromDisk);

    /* ---------- 9. locking the dashboard ---------- */
    console.log('\nlock');
    await page.click('[data-lock]');
    await page.waitForSelector('[data-gate]:not([hidden])');
    ok('Lock dashboard signs out and asks for the passcode again', true);

    await browser.close();
  } finally {
    server.kill();
    Object.keys(FILES).forEach((kind) => fs.writeFileSync(FILES[kind], backup[kind]));
    console.log('\ndata/ store restored to its original contents');
  }

  console.log('\nadmin CRUD checks: ' + (failures ? failures + ' FAILED' : 'all passed'));
  process.exit(failures ? 1 : 0);
}

main().catch((e) => { console.error(e.message || e); process.exit(1); });
