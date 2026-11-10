/* ==========================================================================
   build-service-pages.js
   Generates the 29 individual service pages under services/, the services/
   folder index, and sitemap.xml — all from assets/js/data.js, so the
   checklists can never drift from the pages.

   Run:  node assets/tools/build-service-pages.js
   ========================================================================== */

'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const OUT_DIR = path.join(ROOT, 'services');
const SITE = 'https://www.skylinesolutionenterprises.in';

/* ---------- read the catalogue the same way the browser does ---------- */
const sandbox = { window: {} };
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'assets', 'js', 'data.js'), 'utf8'), sandbox);
const DATA = sandbox.window.SERVICE_DATA;
const DESKS = DATA.desks;
const NAMES = Object.keys(DATA.services);
/* Offered at the desk but quoted case by case, so they carry no page. */
const EXTRAS = DATA.extras || [];

/* desk id -> ordered service names */
const BY_DESK = {};
DESKS.forEach((d) => { BY_DESK[d.id] = []; });
NAMES.forEach((n) => { BY_DESK[DATA.services[n].desk].push(n); });

const INTRO = {
  government: 'Government work is won or lost on the paperwork. We read the application the way the officer will, fill what can be filled online and stand at the counter for the rest.',
  company: 'Incorporation is the easy half. We set up the structure, the first-year compliance calendar and the certificates your clients and lenders will ask to see.',
  loans: 'One file, several lenders, compared on rate and net disbursal — not on a promise. We prepare the application the way credit teams like to read it.',
  insurance: 'We explain the exclusions before the policy, not after the claim. Cover is chosen against your family, your income and your vehicle.',
  travel: 'Vehicles, drivers, berths and itineraries confirmed in writing with a fixed rate, so nothing is negotiated on the day of the trip.'
};

/* Curated Unsplash photography, shared by the public pages and generated services. */
const BANNERS = {
  government: '1450101499163-c8848c66ca85',
  company: '1497366811353-6870744d04b2',
  loans: '1454165804606-c3d57bc86b40',
  insurance: '1511895426328-dc8714191300',
  travel: '1436491865332-7a61a109cc05',
  bus: '1570125909232-eb263c188f7e',
  tour: '1476514525535-07fb3b4ae5f1',
  property: '1560518883-ce09059eeffa',
  vehicle: '1503376780353-7e6692767b70',
  reviews: '1521791136064-7986c2920216'
};
function bannerTag(photoId) {
  const base = `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&h=820&q=82`;
  return `<img class="page-banner-image" src="${esc(base + '&w=1600')}" srcset="${esc(base + '&w=720')} 720w, ${esc(base + '&w=1200')} 1200w, ${esc(base + '&w=1600')} 1600w" sizes="100vw" alt="" width="1600" height="820" decoding="async" fetchpriority="high">`;
}
function bannerImage(category) {
  return bannerTag(BANNERS[category]);
}

/* ---------- helpers ---------- */
function slug(name) {
  return name.toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function clip(s, max) {
  const t = String(s).trim();
  return t.length <= max ? t : t.slice(0, t.lastIndexOf(' ', max)) + '…';
}

const HEADER = (rel) => `<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="${rel}index.html" aria-label="Skyline Solution Enterprises — home">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 32 32" role="img" focusable="false">
          <path d="M2 26h28M4 26V15h4v11M10 26V9h5v17M17 26V18h4v8M23 26V6h5v20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="brand-text"><strong>Skyline</strong><em>Solution Enterprises</em></span>
    </a>

    <nav class="main-nav" id="main-nav" aria-label="Primary">
      <button class="nav-toggle" type="button" aria-expanded="false" aria-controls="main-nav">
        <span class="nav-toggle-bar" aria-hidden="true"></span>
        <span class="sr-only">Menu</span>
      </button>
      <ul class="nav-list">
        <li><a href="${rel}index.html">Home</a></li>
        <li><a href="${rel}services.html"${ACTIVE === 'services.html' ? ' class="is-active" aria-current="page"' : ''}>Services</a></li>
        <li><a href="${rel}process.html">Process</a></li>
        <li><a href="${rel}reviews.html">Reviews</a></li>
        <li><a href="${rel}enquire.html">Enquire</a></li>
        <li><a href="${rel}contact.html">Contact</a></li>
      </ul>
      <a class="btn btn-primary btn-sm nav-cta" href="tel:+918271895469">8271895469</a>
    </nav>
  </div>
</header>`;

const FOOTER = (rel) => `<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <a class="brand" href="${rel}index.html" aria-label="Skyline Solution Enterprises — back to top">
        <span class="brand-mark" aria-hidden="true">
          <svg viewBox="0 0 32 32" role="img" focusable="false">
            <path d="M2 26h28M4 26V15h4v11M10 26V9h5v17M17 26V18h4v8M23 26V6h5v20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="brand-text"><strong>Skyline</strong><em>Solution Enterprises</em></span>
      </a>
      <p>Government services, loans, insurance and travel — under one roof in Santacruz East, Mumbai.</p>
      <p class="footer-motto">A Friend In Need Is A Friend Indeed</p>
    </div>

    <nav class="footer-nav" aria-label="Pages">
      <h4>Pages</h4>
      <ul>
        <li><a href="${rel}services.html">Services</a></li>
        <li><a href="${rel}process.html">Process</a></li>
        <li><a href="${rel}reviews.html">Reviews</a></li>
        <li><a href="${rel}enquire.html">Enquire</a></li>
        <li><a href="${rel}contact.html">Contact</a></li>
        <li><a href="${rel}services/index.html">All service pages</a></li>
      </ul>
    </nav>

    <div class="footer-contact">
      <h4>Desk</h4>
      <a href="tel:+918271895469">8271895469</a>
      <a href="tel:+918369942408">8369942408</a>
      <a href="mailto:skylinesolutionenterprises@outlook.com">skylinesolutionenterprises@outlook.com</a>
      <p>Owner — Sandeep Sharma<br>Co-Owner — Tanay Bhimra</p>
      <p class="footer-centres">Aadhaar enrolment, CSC Digital Seva Kendra and Aaple Sarkar filings are handled at the desk.</p>
    </div>
  </div>

  <div class="wrap footer-base">
    <p>© <span data-year>2026</span> Skyline Solution Enterprises. All rights reserved.</p>
    <a class="admin-link" href="${rel}admin.html">AI</a>
  </div>
</footer>

<div class="sticky-cta" role="group" aria-label="Quick contact">
  <a class="sticky-btn sticky-call" href="tel:+918271895469">Call</a>
  <a class="sticky-btn sticky-wa" data-wa href="#" rel="noopener">WhatsApp</a>
</div>

<noscript>
  <div class="wrap noscript-bar">This page — documents, timeline and contacts — is fully readable without JavaScript.</div>
</noscript>

<script src="${rel}assets/js/config.js" defer></script>
<script src="${rel}assets/js/data.js" defer></script>
<script src="${rel}assets/js/leads.js" defer></script>
<script src="${rel}assets/js/site.js" defer></script>`;

/* header/footer are built with a module-level flag for the active nav item */
let ACTIVE = 'services.html';

/* ---------- one service page ---------- */
function servicePage(name) {
  const s = DATA.services[name];
  const banner = name === 'Bus Booking' ? 'bus' : name === 'Tour Packages' ? 'tour'
    : /Home Loan|Loan Against Property/.test(name) ? 'property'
    : /Car \/ Vehicle Loan|Motor Insurance|Car Rental|Local & Outstation Travel/.test(name) ? 'vehicle' : s.desk;
  const desk = DESKS.filter((d) => d.id === s.desk)[0];
  const file = slug(name) + '.html';
  const rel = '../';
  const enquire = `${rel}enquire.html?service=${encodeURIComponent(name)}`;
  const waMessage = `Hello Skyline Solution Enterprises, I need ${name}. Please share the document checklist.`;

  const related = BY_DESK[s.desk].filter((n) => n !== name).slice(0, 4);
  const docs = s.docs.map((d) => `            <li>${esc(d)}</li>`).join('\n');
  const relatedLinks = related.map((n) =>
    `            <a href="${slug(n)}.html">${esc(n)}</a>`).join('\n');

  const shortDocs = s.docs.slice(0, 4).join('; ');
  const desc = clip(`${s.blurb} ${s.timeline} Filed from Santacruz East, Mumbai — call 8271895469.`, 300);

  const jsonLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: name,
    serviceType: desk.label,
    description: s.blurb,
    provider: { '@id': SITE + '/#business' },
    areaServed: [
      { '@type': 'City', 'name': 'Mumbai' },
      { '@type': 'AdministrativeArea', 'name': 'Thane' },
      { '@type': 'AdministrativeArea', 'name': 'Palghar' },
      { '@type': 'Country', 'name': 'India' }
    ],
    termsOfService: SITE + '/process.html',
    url: `${SITE}/services/${file}`
  }, null, 2);

  const crumbs = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Services', item: SITE + '/services.html' },
      { '@type': 'ListItem', position: 3, name: name, item: `${SITE}/services/${file}` }
    ]
  }, null, 2);

  const faqs = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: `How long does ${name} take?`,
        acceptedAnswer: { '@type': 'Answer', text: s.timeline }
      },
      {
        '@type': 'Question',
        name: `What documents are needed for ${name}?`,
        acceptedAnswer: { '@type': 'Answer', text: `${shortDocs}. The complete list is on this page — send clear photos on WhatsApp and we confirm what is usable before you travel.` }
      },
      {
        '@type': 'Question',
        name: `Can ${name} be handled if I am outside Mumbai?`,
        acceptedAnswer: { '@type': 'Answer', text: 'Yes. Documents are collected over WhatsApp or email, the filing is done on the relevant portal, and originals travel by courier. Where physical verification is required, it happens at the office nearest to you.' }
      }
    ]
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(name)} in Mumbai — Documents, Timeline &amp; Filing | Skyline Solution Enterprises</title>
<meta name="description" content="${esc(desc)}">

<link rel="canonical" href="${SITE}/services/${file}">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="author" content="Skyline Solution Enterprises">
<meta name="theme-color" content="#eaf1f8">
<meta name="format-detection" content="telephone=no">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Skyline Solution Enterprises">
<meta property="og:title" content="${esc(name)} — documents, timeline and filing">
<meta property="og:description" content="${esc(clip(s.blurb, 200))}">
<meta property="og:url" content="${SITE}/services/${file}">
<meta property="og:image" content="${SITE}/assets/img/mumbai-daylight.jpg">
<meta property="og:image:width" content="1264">
<meta property="og:image:height" content="848">
<meta property="og:image:alt" content="Mumbai skyline and the Bandra-Worli Sea Link in soft daylight">
<meta property="og:locale" content="en_IN">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(name)} — Skyline Solution Enterprises, Mumbai">
<meta name="twitter:description" content="${esc(clip(s.timeline, 190))}">
<meta name="twitter:image" content="${SITE}/assets/img/mumbai-daylight.jpg">

<meta name="geo.region" content="IN-MH">
<meta name="geo.placename" content="Santacruz East, Mumbai">
<meta name="geo.position" content="19.0845;72.8543">
<meta name="ICBM" content="19.0845, 72.8543">

<link rel="icon" href="${rel}assets/img/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="${rel}site.webmanifest">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&amp;display=swap">
<script>(function(){try{if(localStorage.getItem('skyline-theme')==='light'){document.documentElement.removeAttribute('data-theme');}else{document.documentElement.setAttribute('data-theme','dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#0A1520');}}catch(e){}})();</script>
<link rel="stylesheet" href="${rel}assets/css/base.css">
<link rel="stylesheet" href="${rel}assets/css/sections.css">

<script type="application/ld+json">
${jsonLd}
</script>

<script type="application/ld+json">
${crumbs}
</script>

<script type="application/ld+json">
${faqs}
</script>
</head>

<body id="top">
<a class="skip-link" href="#main">Skip to main content</a>

${HEADER(rel)}

<main id="main">

  <section class="page-head page-banner" data-banner="${banner}">
    ${bannerImage(banner)}
    <div class="wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ul>
          <li><a href="${rel}index.html">Home</a></li>
          <li><a href="${rel}services.html">Services</a></li>
          <li><span aria-current="page">${esc(name)}</span></li>
        </ul>
      </nav>
      <p class="eyebrow">${esc(desk.label)} · Desk ${esc(desk.index)}</p>
      <h1>${esc(name)} in Santacruz East, Mumbai</h1>
      <p class="lead">${esc(s.blurb)}</p>
      <div class="head-actions">
        <a class="btn btn-primary" href="${enquire}">Enquire about ${esc(name)}</a>
        <a class="btn btn-wa" data-wa data-wa-message="${esc(waMessage)}" href="#" rel="noopener">Ask on WhatsApp</a>
        <a class="btn btn-ghost" href="${rel}contact.html">Visit the desk</a>
      </div>
    </div>
  </section>

  <section class="section" aria-labelledby="docs-title">
    <div class="wrap">
      <header class="section-head">
        <p class="section-index">01</p>
        <div>
          <p class="eyebrow">Before you start</p>
          <h2 id="docs-title">Documents we will ask for.</h2>
          <p class="section-sub">${esc(INTRO[s.desk])}</p>
        </div>
      </header>

      <div class="spec-grid">
        <div class="glass panel spec-card">
          <h3>Checklist — ${esc(name)}</h3>
          <ul class="doc-list">
${docs}
          </ul>
          <p>Photographs on WhatsApp are enough for us to verify the set. Originals are matched at filing, or at the department where they demand your presence.</p>
        </div>

        <aside class="glass panel spec-card" aria-label="At a glance">
          <h3>At a glance</h3>
          <dl class="spec-facts">
            <div><dt>Desk</dt><dd>${esc(desk.label)}</dd></div>
            <div><dt>Typical timeline</dt><dd>${esc(clip(s.timeline.replace(/Usually |Typically |Generally /, ''), 42))}</dd></div>
            <div><dt>Started by</dt><dd>Call or WhatsApp</dd></div>
            <div><dt>Coverage</dt><dd>Mumbai · Thane · Palghar</dd></div>
            <div><dt>Documents in</dt><dd>Photos or originals</dd></div>
          </dl>
          <p class="rail-links"><a class="text-link" href="${rel}process.html">See the four-step process</a></p>
        </aside>
      </div>
    </div>
  </section>

  <section class="section section-soft" aria-labelledby="time-title">
    <div class="wrap">
      <header class="section-head">
        <p class="section-index">02</p>
        <div>
          <p class="eyebrow">Realistic timeline</p>
          <h2 id="time-title">How ${esc(name)} actually moves.</h2>
        </div>
      </header>

      <ol class="steps">
        <li class="step">
          <span class="step-num" aria-hidden="true">01</span>
          <h3>Tell us</h3>
          <p>One line about ${esc(name)} — your situation, the city, whether it is new work or a renewal.</p>
          <p class="step-note">Same day reply</p>
        </li>
        <li class="step">
          <span class="step-num" aria-hidden="true">02</span>
          <h3>Checklist</h3>
          <p>You get the list above as we will apply it to your case, with anything already in hand marked usable.</p>
          <p class="step-note">1 – 2 hours</p>
        </li>
        <li class="step">
          <span class="step-num" aria-hidden="true">03</span>
          <h3>We file</h3>
          <p>Application prepared, fee paid against a receipt, submitted, and the acknowledgement number shared with you.</p>
          <p class="step-note">Filing day confirmed</p>
        </li>
        <li class="step">
          <span class="step-num" aria-hidden="true">04</span>
          <h3>Done</h3>
          <p>${esc(s.timeline)}</p>
          <p class="step-note">Updates at every stage</p>
        </li>
      </ol>
    </div>
  </section>

  <section class="section" aria-labelledby="faq-title">
    <div class="wrap wrap-narrow">
      <header class="section-head">
        <p class="section-index">03</p>
        <div>
          <p class="eyebrow">Asked most often</p>
          <h2 id="faq-title">Three quick answers on ${esc(name)}.</h2>
        </div>
      </header>

      <div class="faqs">
        <details class="faq" open>
          <summary>How long does ${esc(name)} take?</summary>
          <p>${esc(s.timeline)}</p>
        </details>
        <details class="faq">
          <summary>What documents are needed for ${esc(name)}?</summary>
          <p>${esc(shortDocs)} — the full checklist is above, and we confirm it against your case before any fee is paid.</p>
        </details>
        <details class="faq">
          <summary>Can you handle ${esc(name)} if I am outside Mumbai?</summary>
          <p>Yes. Documents are collected over WhatsApp or email, the filing is done on the relevant portal, and originals travel by courier. Where physical verification is required, it happens at the office nearest to you.</p>
        </details>
      </div>
    </div>
  </section>

  <section class="section section-soft" aria-labelledby="related-title">
    <div class="wrap">
      <header class="section-head">
        <p class="section-index">04</p>
        <div>
          <p class="eyebrow">Same desk</p>
          <h2 id="related-title">Often taken together with ${esc(name)}.</h2>
        </div>
      </header>

      <div class="related">
${relatedLinks}
      </div>

      <p class="desks-footnote">Everything on this desk: <a class="text-link" href="${rel}services.html#desk-${s.desk}">${esc(desk.label)}</a> · All 29 services: <a class="text-link" href="${rel}services/index.html">services index</a></p>
    </div>
  </section>

  <section class="section" aria-labelledby="cta-title">
    <div class="wrap">
      <div class="cta-band">
        <div>
          <p class="eyebrow">Two minutes</p>
          <h2 id="cta-title">Start your ${esc(name)} today.</h2>
          <p>Send the requirement in one line and get the checklist, the fee and the realistic timeline back the same working day.</p>
        </div>
        <div class="btn-row">
          <a class="btn btn-primary" href="${enquire}">Start an enquiry</a>
          <a class="btn btn-ghost" href="tel:+918271895469">Call 8271895469</a>
        </div>
      </div>
    </div>
  </section>
</main>

${FOOTER(rel)}
</body>
</html>
`;
}

/* ---------- services/ folder index ---------- */
function folderIndex() {
  const rel = '../';
  const groups = DESKS.map((d) => {
    const items = BY_DESK[d.id].map((n) =>
      `          <li><a href="${slug(n)}.html">${esc(n)}</a></li>`).join('\n');
    return `      <article class="desk-card">
        <span class="tag">${esc(d.index)}</span>
        <h3>${esc(d.label)}</h3>
        <p>${esc(d.blurb)}</p>
        <ul>
${items}
        </ul>
        <p class="count">${BY_DESK[d.id].length} services</p>
      </article>`;
  }).join('\n');

  /* rendered from data.js so the shortlist and the dropdowns can never drift */
  const extraItems = EXTRAS.map((e) => `          <li>${esc(e.name)}</li>`).join('\n');
  const extrasBlock = EXTRAS.length ? `
  <section class="section" aria-labelledby="extras-h">
    <div class="wrap">
      <div class="extras-note">
        <h2 id="extras-h">Also handled at the desk</h2>
        <p>Quoted case by case, so these have no page of their own. Send the details and we confirm the fee and the timeline.</p>
        <ul class="extras-list">
${extraItems}
        </ul>
      </div>
    </div>
  </section>` : '';

  const list = DESKS.map((d) => ({
    '@type': 'ListItem',
    position: DESKS.indexOf(d) + 1,
    name: d.label,
    item: `${SITE}/services.html#desk-${d.id}`
  }));
  const itemList = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Service pages — Skyline Solution Enterprises',
    numberOfItems: NAMES.length,
    itemListElement: list
  }, null, 2);

  const crumbs = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Services', item: SITE + '/services/' }
    ]
  }, null, 2);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Service Pages — All 29 Services, One Page Each | Skyline Solution Enterprises, Mumbai</title>
<meta name="description" content="Every service page in one index: GST, Udyam MSME, Ghumasta licence, FSSAI, PAN, passport, income and domicile certificates, Gazette, driving licence, ITR, LLP and Pvt Ltd registration, ISO, loans, insurance and travel — from Santacruz East, Mumbai.">

<link rel="canonical" href="${SITE}/services/">
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1">
<meta name="theme-color" content="#eaf1f8">
<meta name="author" content="Skyline Solution Enterprises">
<meta name="format-detection" content="telephone=no">

<meta property="og:type" content="website">
<meta property="og:site_name" content="Skyline Solution Enterprises">
<meta property="og:title" content="All 29 service pages — Skyline Solution Enterprises, Mumbai">
<meta property="og:description" content="One page per service, each with the documents required and the realistic timeline.">
<meta property="og:url" content="${SITE}/services/">
<meta property="og:image" content="${SITE}/assets/img/mumbai-daylight.jpg">
<meta property="og:locale" content="en_IN">

<link rel="icon" href="${rel}assets/img/favicon.svg" type="image/svg+xml">
<link rel="manifest" href="${rel}site.webmanifest">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&amp;display=swap">
<script>(function(){try{if(localStorage.getItem('skyline-theme')==='light'){document.documentElement.removeAttribute('data-theme');}else{document.documentElement.setAttribute('data-theme','dark');var m=document.querySelector('meta[name="theme-color"]');if(m)m.setAttribute('content','#0A1520');}}catch(e){}})();</script>
<link rel="stylesheet" href="${rel}assets/css/base.css">
<link rel="stylesheet" href="${rel}assets/css/sections.css">

<script type="application/ld+json">
${itemList}
</script>

<script type="application/ld+json">
${crumbs}
</script>
</head>

<body id="top">
<a class="skip-link" href="#main">Skip to main content</a>

${HEADER(rel)}

<main id="main">
  <section class="page-head page-banner" data-banner="company">
    ${bannerImage('company')}
    <div class="wrap">
      <nav class="breadcrumbs" aria-label="Breadcrumb">
        <ul>
          <li><a href="${rel}index.html">Home</a></li>
          <li><span aria-current="page">Services</span></li>
        </ul>
      </nav>
      <h1>Twenty-nine service pages, <span class="accent">one per job.</span></h1>
      <p class="lead">The index of everything handled at the desk. Each page lists the documents required, the realistic timeline and how to start it.</p>
      <div class="head-actions">
        <a class="btn btn-primary" href="${rel}enquire.html">Start an enquiry</a>
        <a class="btn btn-ghost" href="${rel}services.html">Desks with the shortlists</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="desk-cards">
${groups}
      </div>
      <p class="desks-footnote">Missing something? Call <a class="text-link" href="tel:+918271895469">8271895469</a> or <a class="text-link" href="tel:+918369942408">8369942408</a> — if it involves paperwork, we most likely handle it.</p>
    </div>
  </section>
${extrasBlock}
</main>

${FOOTER(rel)}
</body>
</html>
`;
}

/* ---------- sitemap ---------- */
function buildSitemap() {
  const today = new Date().toISOString().slice(0, 10);
  const urls = [
    { loc: SITE + '/', pri: '1.0', freq: 'weekly' },
    { loc: SITE + '/services.html', pri: '0.9', freq: 'weekly' },
    { loc: SITE + '/services/', pri: '0.9', freq: 'weekly' },
    { loc: SITE + '/process.html', pri: '0.8', freq: 'monthly' },
    { loc: SITE + '/reviews.html', pri: '0.7', freq: 'weekly' },
    { loc: SITE + '/enquire.html', pri: '0.8', freq: 'monthly' },
    { loc: SITE + '/contact.html', pri: '0.7', freq: 'yearly' }
  ].concat(NAMES.map((n) => ({ loc: `${SITE}/services/${slug(n)}.html`, pri: '0.8', freq: 'monthly' })));

  const body = urls.map((u) =>
`  <url>
    <loc>${u.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${u.freq}</changefreq>
    <priority>${u.pri}</priority>
  </url>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${body}
  <url>
    <loc>${SITE}/index.html</loc>
    <image:image>
      <image:loc>${SITE}/assets/img/mumbai-daylight.jpg</image:loc>
      <image:title>Mumbai skyline in soft daylight</image:title>
      <image:caption>Skyline Solution Enterprises — paperwork, loans and journeys, one desk in Santacruz East, Mumbai.</image:caption>
    </image:image>
  </url>
</urlset>
`;
}

/* Apply the same font, banner and phone treatment to existing root pages.
   Idempotent: running the service build never duplicates banner images. */
const ROOT_BANNERS = {
  'services.html': 'company', 'process.html': 'government',
  'reviews.html': 'reviews', 'enquire.html': 'loans',
  'contact.html': 'company', 'about.html': 'company'
};
const PHONE_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.9.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

/* Visiting-card details. The generated footer already carries them, so each
   insertion is guarded by a presence check — running the build again can never
   double a line, and the root pages (maintained by hand) get the same copy. */
const FOOTER_PHONE2 = '<a href="tel:+918369942408">8369942408</a>';
const FOOTER_MOTTO = '<p class="footer-motto">A Friend In Need Is A Friend Indeed</p>';
const FOOTER_CENTRES = '<p class="footer-centres">Aadhaar enrolment, CSC Digital Seva Kendra and Aaple Sarkar filings are handled at the desk.</p>';
function refreshDesign(html, category) {
  html = html.replace(/https:\/\/fonts.googleapis.com\/css2\?[^"\s]+/g,
    'https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&amp;display=swap');
  /* the page's own data-banner wins, so a file can never drift from its map */
  const own = (html.match(/<section class="page-head page-banner" data-banner="([a-z]+)"/) || [])[1];
  const cat = own || category;
  if (cat && !/<section class="page-head page-banner"/.test(html)) {
    html = html.replace('<section class="page-head">',
      `<section class="page-head page-banner" data-banner="${cat}">\n    ${bannerImage(cat)}`);
  }
  /* Rebuild every banner tag from the canonical map so all pages serve the same
     tall, hero-grade photography. An Unsplash id is <timestamp>-<hash>, so both
     parts of it matter when falling back to the URL already in the file. */
  html = html.replace(/<img class="page-banner-image"[^>]*>/g, (m) => {
    if (cat) return bannerTag(BANNERS[cat]);
    const id = (m.match(/photo-([0-9a-z]+-[0-9a-z]+)/) || [])[1];
    return id ? bannerTag(id) : m;
  });
  const out = html.replace(/(<a class="btn btn-primary btn-sm nav-cta"[^>]*>)8271895469/g,
    '$1' + PHONE_ICON + ' 8271895469');

  /* second desk line, straight after the primary one in .footer-contact.
     The pattern needs the bare tel anchor followed by the mailto anchor, which
     only ever describes the footer — the contact cards carry a class.
     Line endings are captured, not assumed: the root pages are a mix of CRLF
     and LF, and a hard-coded \n silently matched nothing on the CRLF files. */
  let withPhone2 = out;
  if (!out.includes('tel:+918369942408')) {
    withPhone2 = out.replace(/(<a href="tel:\+918271895469">[\s\S]{0,1400}?<\/a>)(\r?\n)([ \t]*)(<a href="mailto:)/,
      '$1$2$3' + FOOTER_PHONE2 + '$2$3$4');
  }
  const withMotto = withPhone2.includes('footer-motto') ? withPhone2
    : withPhone2.replace(/(<p>Government services, loans, insurance and travel[^\n]*<\/p>)(\r?\n)([ \t]*)/,
        '$1$2$3' + FOOTER_MOTTO + '$2$3');
  return withMotto.includes('footer-centres') ? withMotto
    : withMotto.replace(/(<p>Owner — Sandeep Sharma<br>Co-Owner — Tanay Bhimra<\/p>)(\r?\n)([ \t]*)/,
        '$1$2$3' + FOOTER_CENTRES + '$2$3');
}
['index.html', 'admin.html'].concat(Object.keys(ROOT_BANNERS)).forEach((file) => {
  const target = path.join(ROOT, file);
  const original = fs.readFileSync(target, 'utf8');
  const updated = refreshDesign(original, ROOT_BANNERS[file]);
  if (updated !== original) fs.writeFileSync(target, updated, 'utf8');
});

/* ---------- write ---------- */
ACTIVE = 'services.html';
fs.mkdirSync(OUT_DIR, { recursive: true });
NAMES.forEach((n) => {
  fs.writeFileSync(path.join(OUT_DIR, slug(n) + '.html'), refreshDesign(servicePage(n)), 'utf8');
});
fs.writeFileSync(path.join(OUT_DIR, 'index.html'), refreshDesign(folderIndex()), 'utf8');
fs.writeFileSync(path.join(ROOT, 'sitemap.xml'), buildSitemap(), 'utf8');

console.log('service pages written :', NAMES.length);
console.log('folder index          : services/index.html');
console.log('sitemap urls          :', 7 + NAMES.length + 1);
console.log('slugs                 :', NAMES.map(slug).join(', '));
