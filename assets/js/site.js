/* ==========================================================================
   Skyline Solution Enterprises — site.js
   Multi-page behaviour: navigation, desk accordions, service filter,
   reviews wall, enquiry capture.
   Depends on: config.js, data.js, leads.js
   ========================================================================== */

(function (window, document) {
  'use strict';

  var STORE = window.SkylineStore;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  document.addEventListener('DOMContentLoaded', function () {
    initYear();
    initTicker();
    initNav();
    initFooterCredit();
    initReveal();
    initDesks();
    initServiceFilter();
    initWhatsAppLinks();
    initStars();
    initReviewForm();
    initEnquiryForm();
    renderReviews();
    prefillFromUrl();
    if (STORE) STORE.flushQueue();
  });

  /* ------------------------------------------------------------------ */
  /* "Designed & developed by Yurekh Solutions" — the footer markup is
     duplicated across every page, so the credit is injected once here
     instead of being hand-edited into 30+ files. Pages that already
     carry it (index.html) are left untouched. */
  function initFooterCredit() {
    var bases = $$('.footer-base');
    bases.forEach(function (base) {
      if ($('.footer-credit', base)) return;
      var credit = document.createElement('p');
      credit.className = 'footer-credit';
      credit.innerHTML =
        'Designed &amp; developed by <a href="https://yurekh.com/" target="_blank" rel="noopener">Yurekh Solutions</a>';
      var admin = $('.admin-link', base);
      if (admin) base.insertBefore(credit, admin);
      else base.appendChild(credit);
    });
  }

  /* ------------------------------------------------------------------ */
  function initYear() {
    var el = $('[data-year]');
    if (el) el.textContent = String(new Date().getFullYear());
  }

  /* duplicate the ticker row so the -50% loop has no seam */
  function initTicker() {
    var track = $('[data-ticker]');
    var row = $('[data-ticker-row]');
    if (!track || !row) return;
    var clone = row.cloneNode(true);
    clone.removeAttribute('data-ticker-row');
    clone.setAttribute('aria-hidden', 'true');
    track.appendChild(clone);
  }

  /* ------------------------------------------------------------------ */
  function initNav() {
    var header = $('.site-header');
    var nav = $('#main-nav');
    var toggle = $('.nav-toggle');

    if (toggle && nav) {
      var closeDrawer = function (focusBack) {
        nav.classList.remove('nav-open');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('is-locked');
        if (focusBack) toggle.focus();
      };
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('nav-open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
        document.body.classList.toggle('is-locked', open);
      });
      $$('#main-nav .nav-list a').forEach(function (link) {
        link.addEventListener('click', function () { closeDrawer(false); });
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && nav.classList.contains('nav-open')) closeDrawer(true);
      });
    }

    var onScroll = function () {
      if (header) header.classList.toggle('is-scrolled', window.scrollY > 12);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    markActiveLink();
  }

  /* one page per nav item now — highlight from the URL, not from scroll */
  function markActiveLink() {
    var links = $$('#main-nav .nav-list a');
    if (!links.length) return;
    var here = decodeURIComponent(window.location.pathname);
    var inServiceFolder = /\/services\/[^/]*$/.test(here);
    var file = (here.split('/').pop() || '').toLowerCase() || 'index.html';
    if (inServiceFolder) file = 'services.html';
    if (file === '' || file === '.') file = 'index.html';

    links.forEach(function (a) {
      var target = (a.getAttribute('href') || '').split('?')[0].split('#')[0].split('/').pop().toLowerCase();
      var active = target === file;
      a.classList.toggle('is-active', active);
      if (active) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    });
  }

  /* ------------------------------------------------------------------ */
  function initReveal() {
    var targets = $$('.section-head, .desk, .desk-card, .step, .contact-card, .rail-card, .faq, .review, .spec-card, .person');
    if (!('IntersectionObserver' in window) || !targets.length) return;
    targets.forEach(function (el) { el.setAttribute('data-reveal', ''); });
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-in');
          observer.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: .08 });
    targets.forEach(function (el) { observer.observe(el); });
  }

  /* ------------------------------------------------------------------ */
  /* desks — one open at a time once JS is on; all open without it */
  var deskCtl = null;

  function initDesks() {
    var desks = $$('.desk');
    if (!desks.length) return;

    var setOpen = function (desk, open) {
      var toggle = $('.desk-toggle', desk);
      var panel = $('.desk-panel', desk);
      desk.classList.toggle('is-open', open);
      if (toggle) toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      if (panel) { if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', ''); }
    };

    deskCtl = {
      desks: desks,
      setOpen: setOpen,
      openOnly: function (desk) { desks.forEach(function (d) { setOpen(d, d === desk); }); }
    };

    desks.forEach(function (desk) {
      var toggle = $('.desk-toggle', desk);
      if (!toggle) return;
      setOpen(desk, toggle.getAttribute('aria-expanded') === 'true');
      toggle.addEventListener('click', function () {
        if (desk.classList.contains('is-open')) setOpen(desk, false);
        else deskCtl.openOnly(desk);
      });
    });

    /* services.html#desk-loans — open that desk and bring it into view.
       Re-run on hashchange so desk links also work while the page is open. */
    var openFromHash = function () {
      var id = (window.location.hash || '').replace('#', '');
      if (!id) return;
      var target = desks.filter(function (d) { return d.id === id; })[0];
      if (!target) return;
      deskCtl.openOnly(target);
      window.setTimeout(function () {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    };
    openFromHash();
    window.addEventListener('hashchange', openFromHash);
  }

  /* ------------------------------------------------------------------ */
  /* live filter over the service chips on services.html */
  function initServiceFilter() {
    var input = $('[data-service-filter]');
    if (!input || !deskCtl) return;
    var count = $('[data-filter-count]');
    var desks = deskCtl.desks;
    var chips = $$('.service-chip');
    var total = chips.length;

    var showAll = function () {
      chips.forEach(function (c) { c.classList.remove('is-hidden'); });
      desks.forEach(function (d) { d.classList.remove('is-hidden', 'is-match'); });
      if (count) count.textContent = 'Showing all ' + total + ' services';
    };

    var apply = function () {
      var q = input.value.trim().toLowerCase();
      if (!q) { showAll(); return; }

      var shown = 0;
      var openTarget = null;
      desks.forEach(function (desk) {
        var title = ($('.desk-title', desk) || { textContent: '' }).textContent.toLowerCase();
        var deskHits = title.indexOf(q) > -1;
        var hits = 0;
        $$('.service-chip', desk).forEach(function (chip) {
          var match = deskHits || chip.textContent.toLowerCase().indexOf(q) > -1;
          chip.classList.toggle('is-hidden', !match);
          if (match) hits++;
        });
        desk.classList.toggle('is-hidden', hits === 0);
        desk.classList.toggle('is-match', hits > 0);
        if (hits) {
          shown += hits;
          deskCtl.setOpen(desk, true);
          if (!openTarget) openTarget = desk;
        }
      });
      if (count) {
        count.textContent = shown
          ? shown + ' service' + (shown === 1 ? '' : 's') + ' match “' + input.value.trim() + '”'
          : 'No service matches “' + input.value.trim() + '” — call 8271895469 and describe it';
      }
    };

    input.addEventListener('input', apply);
    input.addEventListener('search', apply);
    if (window.location.hash) window.setTimeout(function () { input.focus(); }, 250);
  }

  /* ------------------------------------------------------------------ */
  function initWhatsAppLinks() {
    if (!STORE || !STORE.waLink) return;
    $$('[data-wa]').forEach(function (a) {
      var msg = a.getAttribute('data-wa-message') ||
        'Hello Skyline Solution Enterprises, I would like to know more about your services.';
      a.href = STORE.waLink(msg);
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    });
  }

  /* ------------------------------------------------------------------ */
  var starsCtl = null;

  function initStars() {
    var group = $('[data-stars]');
    if (!group) return;
    var form = group.closest('form');
    var input = form ? $('input[name="rating"]', form) : null;
    var stars = $$('.star', group);

    var paint = function (value) {
      stars.forEach(function (s) {
        var v = parseInt(s.getAttribute('data-star'), 10);
        s.classList.toggle('is-on', v <= value);
        s.setAttribute('aria-checked', v === value ? 'true' : 'false');
      });
      if (input) input.value = String(value);
    };

    if (!group.getAttribute('data-bound')) {
      group.setAttribute('data-bound', '1');
      stars.forEach(function (s) {
        s.addEventListener('click', function () { paint(parseInt(s.getAttribute('data-star'), 10)); });
        s.addEventListener('keydown', function (e) {
          if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); paint(parseInt(s.getAttribute('data-star'), 10)); }
        });
      });
    }
    starsCtl = { paint: paint };
    paint(5);
  }

  /* ------------------------------------------------------------------ */
  /* validation helpers */
  function setError(form, fieldId, message) {
    var field = document.getElementById(fieldId);
    var box = $('[data-error-for="' + fieldId + '"]', form);
    if (field) {
      field.classList.toggle('is-invalid', !!message);
      field.setAttribute('aria-invalid', message ? 'true' : 'false');
    }
    if (box) box.textContent = message || '';
  }

  function validName(v) { return /^[A-Za-z][A-Za-z .'-]{1,59}$/.test(String(v || '').trim()); }
  function validPhone(v) { return /^[6-9]\d{9}$/.test(String(v || '').replace(/\D+/g, '').replace(/^91(?=\d{10}$)/, '')); }
  function validEmail(v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(String(v || '').trim()); }

  function honeypotFilled(form) {
    return $$('input[name="company_website"], input[name="fax_ref"]', form)
      .some(function (f) { return String(f.value).length > 0; });
  }

  /* ------------------------------------------------------------------ */
  function initReviewForm() {
    var form = $('[data-review-form]');
    if (!form || !STORE) return;
    var status = $('[data-review-status]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (honeypotFilled(form)) { return; }

      var name = $('#rv-name').value.trim();
      var text = $('#rv-text').value.trim();
      var ok = true;

      if (!validName(name)) { setError(form, 'rv-name', 'Please enter your name (letters only).'); ok = false; } else setError(form, 'rv-name', '');
      if (text.length < 12) { setError(form, 'rv-text', 'A little more detail helps others choose — 12 characters minimum.'); ok = false; } else setError(form, 'rv-text', '');
      if (!ok) { var badReview = $('.is-invalid', form); if (badReview) badReview.focus(); return; }

      var res = STORE.addReview({
        name: name,
        service: $('#rv-service').value.trim(),
        rating: $('input[name="rating"]', form).value,
        text: text
      });

      form.reset();
      if (starsCtl) starsCtl.paint(5); else initStars();
      renderReviews();

      if (status) {
        status.className = 'form-status is-ok';
        status.textContent = 'Thank you, ' + res.record.name.split(' ')[0] +
          '. Your review is saved as reference ' + res.record.id + ' and will appear here once approved.';
      }
    });
  }

  function renderReviews() {
    if (!STORE) return;
    var local = STORE.publishedReviews();
    paintReviews(local);

    /* then bring in whatever the shared store has approved */
    STORE.publicReviews().then(function (remote) {
      if (!remote.length) return;
      STORE.cachePublicReviews(remote);
      var byId = {};
      local.forEach(function (r) { byId[r.id] = r; });
      remote.forEach(function (r) { byId[r.id] = r; });
      paintReviews(Object.keys(byId).map(function (k) { return byId[k]; })
        .sort(function (a, b) { return new Date(b.createdAt) - new Date(a.createdAt); }));
    }).catch(function () { /* offline — local list stays */ });
  }

  function paintReviews(rows) {
    var list = $('[data-reviews-list]');
    var summary = $('[data-reviews-summary]');
    if (!list) return;

    list.innerHTML = '';

    if (!rows.length) {
      var empty = document.createElement('li');
      empty.className = 'review-empty';
      empty.innerHTML = '<h3>Share your experience</h3>' +
        '<p>Used a Skyline service? Your feedback helps the next customer. Reviews are published after verification.</p>';
      list.appendChild(empty);
      if (summary) summary.textContent = 'Be the first to leave a review.';
      return;
    }

    var total = rows.reduce(function (sum, r) { return sum + Number(r.rating || 0); }, 0);
    var avg = (total / rows.length).toFixed(1);
    if (summary) {
      summary.innerHTML = '<strong>' + avg + '</strong><span class="stars-average" aria-hidden="true">' +
        starsText(Math.round(avg)) + '</span><span>' + rows.length +
        ' approved review' + (rows.length === 1 ? '' : 's') + '</span>';
    }

    rows.forEach(function (r) {
      var li = document.createElement('li');
      li.className = 'review';
      li.innerHTML =
        '<div class="review-head">' +
          '<span class="avatar" aria-hidden="true">' + escapeHtml(r.initials || 'SS') + '</span>' +
          '<div class="review-who"><strong>' + escapeHtml(r.name) + '</strong>' +
          (r.service ? '<span>' + escapeHtml(r.service) + '</span>' : '') + '</div>' +
        '</div>' +
        '<p class="rating" aria-label="' + Number(r.rating || 0) + ' out of 5">' + starsText(Number(r.rating || 0)) + '</p>' +
        '<p>' + escapeHtml(r.text) + '</p>' +
        '<time datetime="' + escapeHtml(r.createdAt) + '">' + formatDate(r.createdAt) + '</time>';
      list.appendChild(li);
    });
  }

  function starsText(n) {
    var full = Math.max(0, Math.min(5, n));
    return '★★★★★'.slice(0, full) + '<span class="off">' + '★★★★★'.slice(full) + '</span>';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function formatDate(iso) {
    try {
      return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch (e) { return String(iso).slice(0, 10); }
  }

  /* ------------------------------------------------------------------ */
  function initEnquiryForm() {
    var form = $('[data-enquiry-form]');
    if (!form || !STORE) return;
    var status = $('[data-enquiry-status]');
    var waLink = $('.form-actions [data-wa]', form);

    var refreshWa = function () {
      if (!waLink) return;
      var service = $('#en-service').value || 'your services';
      var name = $('#en-name').value.trim();
      waLink.href = STORE.waLink(
        'Hello Skyline Solution Enterprises.' +
        (name ? ' I am ' + name + '.' : '') +
        ' I need ' + service + '.' +
        ($('#en-message').value.trim() ? ' Details: ' + $('#en-message').value.trim() : '') +
        ' My number is ' + ($('#en-phone').value.trim() || 'shared on this form') + '.'
      );
    };

    $$('#en-service, #en-name, #en-message, #en-phone', form).forEach(function (el) {
      el.addEventListener('change', refreshWa);
      el.addEventListener('input', refreshWa);
    });
    refreshWa();

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (honeypotFilled(form)) { if (status) status.textContent = ''; return; }

      var name = $('#en-name').value.trim();
      var phone = $('#en-phone').value;
      var email = $('#en-email').value.trim();
      var service = $('#en-service').value;
      var ok = true;

      if (!validName(name)) { setError(form, 'en-name', 'Please enter your full name.'); ok = false; } else setError(form, 'en-name', '');
      if (!validPhone(phone)) { setError(form, 'en-phone', 'Enter a valid 10-digit Indian mobile number.'); ok = false; } else setError(form, 'en-phone', '');
      if (email && !validEmail(email)) { setError(form, 'en-email', 'That email address looks incomplete.'); ok = false; } else setError(form, 'en-email', '');
      if (!service) { setError(form, 'en-service', 'Choose the service you need.'); ok = false; } else setError(form, 'en-service', '');

      if (!ok) { var bad = $('.is-invalid', form); if (bad) bad.focus(); return; }

      var res = STORE.addLead({
        name: name,
        phone: phone,
        email: email,
        service: service,
        message: $('#en-message').value.trim()
      });

      showSuccess(form, res.record);
      if (status) { status.className = 'form-status'; status.textContent = ''; }

      /* the record is already saved locally; this reports the delivery route */
      var line = $('[data-sync-line]', form);
      if (line) line.textContent = 'Saving to the shared lead record…';
      STORE.flushQueue().then(function (r) {
        if (!line) return;
        if (r.transport === 'none') {
          line.textContent = 'Saved on this device — use the WhatsApp button above so the desk receives it right away.';
        } else {
          line.textContent = r.failed
            ? 'Saved on this device; ' + r.remaining + ' record(s) will retry automatically.'
            : 'Saved on this device and in the shared lead record.';
        }
      });
    });
  }

  function showSuccess(form, record) {
    var existing = $('.form-success', form);
    if (existing) existing.remove();

    var box = document.createElement('div');
    box.className = 'form-success';
    box.setAttribute('role', 'status');
    box.innerHTML =
      '<h4>Enquiry recorded — reference ' + escapeHtml(record.id) + '</h4>' +
      '<p>' + escapeHtml(record.name) + ' · ' + escapeHtml(record.service) + ' · ' + escapeHtml(record.phone) +
      '. Our team calls or WhatsApps you during working hours.</p>' +
      '<a class="btn btn-primary btn-sm" href="' + STORE.waLeadLink(record) + '" target="_blank" rel="noopener">Open WhatsApp with this enquiry</a>';
    form.appendChild(box);
    form.reset();
    if (window.innerWidth < 950) box.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  /* ------------------------------------------------------------------ */
  /* enquire.html?service=GST+Registration — prefill and focus the form */
  function selectService(name) {
    var select = $('#en-service');
    if (!select) return;
    var want = String(name).toLowerCase();
    var match = $$('option', select).filter(function (o) {
      return o.value && o.value.toLowerCase() === want;
    })[0];
    if (match) {
      select.value = match.value;
      select.dispatchEvent(new Event('change'));
    }
    var panel = select.closest('form');
    if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(function () { var n = $('#en-name'); if (n) n.focus({ preventScroll: true }); }, 500);
  }

  function prefillFromUrl() {
    var service = '';
    try {
      service = new URLSearchParams(window.location.search).get('service') || '';
      if (!service) {
        var hash = window.location.hash || '';
        var q = hash.indexOf('?');
        if (q > -1) service = new URLSearchParams(hash.slice(q + 1)).get('service') || '';
      }
    } catch (e) { /* ignore */ }
    if (service) selectService(service);
  }
})(window, document);
