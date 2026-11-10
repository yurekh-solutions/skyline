#!/usr/bin/env node
/**
 * Skyline Solution Enterprises - Page Generator
 * Generates all 30 pages with consistent design and SEO
 */

const fs = require('fs');
const path = require('path');

// Service data from data.js
const services = {
  // Government Services (11)
  'gst-registration': {
    title: 'GST Registration Services in Mumbai',
    desk: 'Government Services',
    icon: '📋',
    shortDesc: 'New GSTIN, amendment or cancellation with portal filing support',
    timeline: '3-7 working days',
    price: '₹2,500 onwards'
  },
  'udyam-msme': {
    title: 'Udyam MSME Registration',
    desk: 'Government Services',
    icon: '🏭',
    shortDesc: 'Micro, small or medium enterprise registration with certificate',
    timeline: 'Same day to 24 hours',
    price: '₹1,500 onwards'
  },
  'pan-card-services': {
    title: 'PAN Card Services',
    desk: 'Government Services',
    icon: '💳',
    shortDesc: 'New PAN, correction, reprint, and Aadhaar linking',
    timeline: '15-20 working days',
    price: '₹500 onwards'
  },
  'passport-services': {
    title: 'Passport Services Mumbai',
    desk: 'Government Services',
    icon: '🛂',
    shortDesc: 'Fresh, renewal, tatkal, and address change services',
    timeline: '7-45 days',
    price: '₹3,000 onwards'
  },
  'ghumasta-shop-licence': {
    title: 'Ghumasta Shop Licence Maharashtra',
    desk: 'Government Services',
    icon: '🏪',
    shortDesc: 'Shop & Establishment licence for commercial premises',
    timeline: '7-15 working days',
    price: '₹2,000 onwards'
  },
  'fssai-food-licence': {
    title: 'FSSAI Food Licence Registration',
    desk: 'Government Services',
    icon: '🍽️',
    shortDesc: 'Basic registration, state and central food licences',
    timeline: '5-60 days',
    price: '₹3,000 onwards'
  },
  'income-certificate': {
    title: 'Income Certificate Services',
    desk: 'Government Services',
    icon: '💰',
    shortDesc: 'Income certificate for scholarships and welfare schemes',
    timeline: '7-21 working days',
    price: '₹1,000 onwards'
  },
  'domicile-certificate': {
    title: 'Domicile Certificate Maharashtra',
    desk: 'Government Services',
    icon: '🏠',
    shortDesc: 'Residence proof for admission and job applications',
    timeline: '15-30 working days',
    price: '₹1,500 onwards'
  },
  'gazette': {
    title: 'Gazette Name Change Services',
    desk: 'Government Services',
    icon: '📰',
    shortDesc: 'Name correction published in official gazette',
    timeline: '25-40 days',
    price: '₹5,000 onwards'
  },
  'driving-licence': {
    title: 'Driving Licence Services Mumbai',
    desk: 'Government Services',
    icon: '🚗',
    shortDesc: 'Learner's, permanent, renewal and international permit',
    timeline: '1-30 days',
    price: '₹1,500 onwards'
  },
  'itr-filing': {
    title: 'ITR Filing Services Mumbai',
    desk: 'Government Services',
    icon: '📊',
    shortDesc: 'Income tax return filing with e-verification',
    timeline: '1-2 days',
    price: '₹1,000 onwards'
  },

  // Company Registration (3)
  'llp-registration': {
    title: 'LLP Registration Services Mumbai',
    desk: 'Company Registration',
    icon: '🤝',
    shortDesc: 'Limited Liability Partnership incorporation with FiLLiP filing',
    timeline: '12-20 working days',
    price: '₹15,000 onwards'
  },
  'pvt-ltd-company-registration': {
    title: 'Private Limited Company Registration',
    desk: 'Company Registration',
    icon: '🏢',
    shortDesc: 'Complete Pvt Ltd incorporation with SPICe+ filing',
    timeline: '10-18 working days',
    price: '₹18,000 onwards'
  },
  'iso-certificate': {
    title: 'ISO Certification Services',
    desk: 'Company Registration',
    icon: '✓',
    shortDesc: 'ISO 9001, 14001, 45001 certification and audit support',
    timeline: '20-45 days',
    price: '₹25,000 onwards'
  },

  // Loans (6)
  'personal-loan': {
    title: 'Personal Loan Services Mumbai',
    desk: 'Loans & Finance',
    icon: '💵',
    shortDesc: 'Salaried and self-employed personal loans',
    timeline: '3-7 days',
    price: 'Processing fee applicable'
  },
  'business-loan': {
    title: 'Business Loan Services',
    desk: 'Loans & Finance',
    icon: '💼',
    shortDesc: 'Unsecured and secured business loans for SMEs',
    timeline: '4-10 working days',
    price: 'Processing fee applicable'
  },
  'home-loan': {
    title: 'Home Loan Services Mumbai',
    desk: 'Loans & Finance',
    icon: '🏡',
    shortDesc: 'Purchase, construction and balance transfer home loans',
    timeline: '7-15 working days',
    price: 'Processing fee applicable'
  },
  'car-vehicle-loan': {
    title: 'Car & Vehicle Loan Services',
    desk: 'Loans & Finance',
    icon: '🚙',
    shortDesc: 'New and used car, bike and commercial vehicle finance',
    timeline: '24-72 hours',
    price: 'Processing fee applicable'
  },
  'loan-against-property': {
    title: 'Loan Against Property Mumbai',
    desk: 'Loans & Finance',
    icon: '🏠',
    shortDesc: 'Mortgage loans using residential or commercial property',
    timeline: '10-20 working days',
    price: 'Processing fee applicable'
  },
  'working-capital-loan': {
    title: 'Working Capital Loan Services',
    desk: 'Loans & Finance',
    icon: '💳',
    shortDesc: 'Cash credit, overdraft and invoice finance for businesses',
    timeline: '5-12 working days',
    price: 'Processing fee applicable'
  },

  // Insurance (2)
  'life-insurance': {
    title: 'Life Insurance Plans Mumbai',
    desk: 'Insurance',
    icon: '🛡️',
    shortDesc: 'Whole life, endowment, ULIP and money-back plans',
    timeline: '7-15 days',
    price: 'Premium based'
  },
  'health-insurance': {
    title: 'Health Insurance Plans',
    desk: 'Insurance',
    icon: '⚕️',
    shortDesc: 'Individual and family floater health covers',
    timeline: '15-30 days',
    price: 'Premium based'
  },

  // Travel (2)
  'bus-booking': {
    title: 'Bus Booking Services Mumbai',
    desk: 'Travel Services',
    icon: '🚌',
    shortDesc: 'Sleeper, seater, AC and Volvo bus routes across India',
    timeline: '30-60 minutes',
    price: 'Ticket price + ₹50'
  },
  'tour-packages': {
    title: 'Tour Packages Mumbai',
    desk: 'Travel Services',
    icon: '✈️',
    shortDesc: 'Family, group, honeymoon and pilgrimage tours',
    timeline: '24-48 hours quote',
    price: 'Package dependent'
  }
};

// HTML Template
function generateServicePage(slug, data) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${data.title} — Skyline Solution Enterprises Mumbai</title>
<meta name="description" content="${data.shortDesc}. Expert service in ${data.timeline}. Starting from ${data.price}. Call 8271895469.">

<link rel="canonical" href="https://www.skylinesolutionenterprises.in/services/${slug}.html">
<meta name="robots" content="index, follow">
<meta name="theme-color" content="#c77a2a">

<link rel="icon" href="../assets/img/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap">
<link rel="stylesheet" href="../assets/css/base.css">
<link rel="stylesheet" href="../assets/css/sections.css">
</head>

<body id="top">
<a class="skip-link" href="#main">Skip to main content</a>

<header class="site-header">
  <div class="wrap header-inner">
    <a class="brand" href="../index.html">
      <span class="brand-mark">
        <svg viewBox="0 0 32 32">
          <path d="M2 26h28M4 26V15h4v11M10 26V9h5v17M17 26V18h4v8M23 26V6h5v20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </span>
      <span class="brand-text"><strong>Skyline</strong><em>Solution Enterprises</em></span>
    </a>

    <nav class="main-nav">
      <ul class="nav-list">
        <li><a href="../index.html">Home</a></li>
        <li><a href="../services.html" class="is-active">Services</a></li>
        <li><a href="../process.html">Process</a></li>
        <li><a href="../reviews.html">Reviews</a></li>
        <li><a href="../enquire.html">Enquire</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
      <a class="btn btn-primary btn-sm nav-cta" href="tel:+918271895469">8271895469</a>
    </nav>
  </div>
</header>

<main id="main">
  <section class="page-head">
    <div class="wrap">
      <nav class="breadcrumbs">
        <ul>
          <li><a href="../index.html">Home</a></li>
          <li><a href="../services.html">Services</a></li>
          <li><span aria-current="page">${data.title}</span></li>
        </ul>
      </nav>
      <h1>${data.icon} ${data.title}</h1>
      <p class="lead">${data.shortDesc}</p>
      <div class="head-actions">
        <a class="btn btn-primary" href="../enquire.html?service=${encodeURIComponent(data.title)}">Start Enquiry</a>
        <a class="btn btn-ghost" href="tel:+918271895469">Call 8271895469</a>
      </div>
    </div>
  </section>

  <section class="section">
    <div class="wrap">
      <div class="spec-grid">
        <div>
          <div class="panel spec-card">
            <h2>Service Overview</h2>
            <p>${data.shortDesc}</p>
            
            <h3 style="margin-top: 2rem; margin-bottom: 1rem;">What We Handle</h3>
            <ul class="bullets">
              <li>Complete documentation support</li>
              <li>Application preparation and filing</li>
              <li>Government/bank coordination</li>
              <li>Status tracking and updates</li>
              <li>Final delivery of certificates/approvals</li>
            </ul>

            <div style="margin-top: 2rem;">
              <a class="btn btn-primary btn-block" href="../enquire.html?service=${encodeURIComponent(data.title)}">Get Started</a>
            </div>
          </div>
        </div>

        <div>
          <div class="panel spec-card">
            <h3>Quick Facts</h3>
            <dl class="spec-facts">
              <div><dt>Desk</dt><dd>${data.desk}</dd></div>
              <div><dt>Timeline</dt><dd>${data.timeline}</dd></div>
              <div><dt>Starting Price</dt><dd>${data.price}</dd></div>
              <div><dt>Working Hours</dt><dd>Mon-Sat, 10 AM - 8 PM</dd></div>
            </dl>
          </div>

          <div class="panel spec-card" style="margin-top: 1rem;">
            <h3>Need Help?</h3>
            <p style="margin-bottom: 1rem; font-size: .9rem;">Our team is ready to assist you</p>
            <a href="tel:+918271895469" class="btn btn-ghost btn-block">Call Now</a>
            <a href="https://wa.me/918271895469" class="btn btn-ghost btn-block" style="margin-top: .5rem;">WhatsApp</a>
          </div>
        </div>
      </div>
    </div>
  </section>
</main>

<footer class="site-footer">
  <div class="wrap footer-grid">
    <div class="footer-brand">
      <a class="brand" href="../index.html">
        <span class="brand-mark">
          <svg viewBox="0 0 32 32">
            <path d="M2 26h28M4 26V15h4v11M10 26V9h5v17M17 26V18h4v8M23 26V6h5v20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
          </svg>
        </span>
        <span class="brand-text"><strong>Skyline</strong><em>Solution Enterprises</em></span>
      </a>
      <p>Government services, loans, insurance and travel — under one roof in Santacruz East, Mumbai.</p>
    </div>

    <nav class="footer-nav">
      <h4>Pages</h4>
      <ul>
        <li><a href="../about.html">About Us</a></li>
        <li><a href="../services.html">Services</a></li>
        <li><a href="../enquire.html">Enquire</a></li>
        <li><a href="../contact.html">Contact</a></li>
      </ul>
    </nav>

    <div class="footer-contact">
      <h4>Contact</h4>
      <a href="tel:+918271895469">8271895469</a>
      <a href="mailto:skylinesolutionenterprises@outlook.com">skylinesolutionenterprises@outlook.com</a>
    </div>
  </div>

  <div class="wrap footer-base">
    <p>© 2026 Skyline Solution Enterprises. All rights reserved.</p>
  </div>
</footer>

<div class="sticky-cta">
  <a class="sticky-btn sticky-call" href="tel:+918271895469">Call</a>
  <a class="sticky-btn sticky-wa" href="https://wa.me/918271895469">WhatsApp</a>
</div>

<script src="../assets/js/site.js" defer></script>
</body>
</html>`;
}

// Generate all service pages
console.log('🚀 Generating all service pages...\n');

let count = 0;
for (const [slug, data] of Object.entries(services)) {
  const html = generateServicePage(slug, data);
  const filepath = path.join(__dirname, 'services', `${slug}.html`);
  
  fs.writeFileSync(filepath, html, 'utf8');
  count++;
  console.log(`✓ Created: services/${slug}.html`);
}

console.log(`\n✅ Generated ${count} service pages successfully!`);
console.log('\n📋 Page count:');
console.log('   - Core pages: 6 (index, about, services, contact, enquire, reviews)');
console.log(`   - Service pages: ${count}`);
console.log(`   - Total: ${6 + count} pages`);
