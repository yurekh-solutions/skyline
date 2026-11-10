/* Quick HTTP smoke test against a running server.js instance.
   Usage:  node assets/tools/check-pages.js [port]           */
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const PORT = Number(process.argv[2] || 3011);
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', 'data.js'), 'utf8'), sandbox);
const NAMES = Object.keys(sandbox.window.SERVICE_DATA.services);
const slug = (n) => n.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

const urls = ['/', '/index.html', '/services.html', '/process.html', '/reviews.html', '/enquire.html',
  '/contact.html', '/admin.html', '/services/', '/services/gst-registration.html',
  '/services/local-and-outstation-travel.html', '/enquire.html?service=GST%20Registration',
  '/sitemap.xml', '/robots.txt', '/site.webmanifest', '/assets/img/mumbai-daylight.jpg',
  '/api/health', '/api/leads', '/data/leads.json', '/../server.js', '/nope.html']
  .concat(NAMES.map((n) => '/services/' + slug(n) + '.html'));

const seen = {};
let bad = 0;

function check(url, expect) {
  return new Promise((resolve) => {
    http.get({ host: '127.0.0.1', port: PORT, path: url }, (res) => {
      let bytes = 0;
      res.on('data', (c) => { bytes += c.length; });
      res.on('end', () => {
        const good = res.statusCode === expect;
        if (!good) bad++;
        console.log((good ? '  [ok]   ' : '  [FAIL] ') + String(res.statusCode).padEnd(4) +
          (bytes + 'b').padEnd(11) + url + '  (want ' + expect + ')');
        resolve();
      });
    }).on('error', (e) => { bad++; console.log('  [FAIL] ERR ' + url + ' ' + e.message); resolve(); });
  });
}

(async () => {
  const expect = (u) => u === '/api/leads' ? 401
    : u.startsWith('/data/') ? 403
    : (u === '/nope.html' || u.includes('..')) ? 404 : 200;
  for (const u of urls) {
    if (seen[u]) continue;
    seen[u] = 1;
    await check(u, expect(u));
  }
  console.log(bad ? bad + ' failing request(s)' : 'all ' + urls.length + ' urls healthy');
})();
