/* ==========================================================================
   Skyline Solution Enterprises — config.js
   Single place to change brand details, where leads are stored and the
   admin passcode. Everything here is safe to edit by hand.
   ========================================================================== */

window.SITE_CONFIG = {
  /* ---- identity --------------------------------------------------- */
  brand: 'Skyline Solution Enterprises',
  siteUrl: 'https://www.skylinesolutionenterprises.in/',
  tagline: 'Paperwork, loans & journeys. One desk.',
  /* Line carried on the visiting card, used under the brand and in the footer. */
  motto: 'A Friend In Need Is A Friend Indeed',

  /* ---- contact ---------------------------------------------------- */
  phoneDisplay: '8271895469',
  phone: '+918271895469',
  whatsapp: '918271895469',          // country code + number, no "+" or spaces
  /* Second desk line off the card. Voice only on purpose — WhatsApp stays on
     the number above, so a customer never has to guess which one to message. */
  phone2Display: '8369942408',
  phone2: '+918369942408',
  email: 'skylinesolutionenterprises@outlook.com',
  address: 'Gate No 1, Hanuman Tekdi, Near Metro Station, Santacruz East, Mumbai 400055',
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hanuman+Tekdi+Gate+No+1+Santacruz+East+Mumbai+400055',
  hours: 'Monday – Saturday, 10:00 – 20:00',

  /* ---- where leads are stored ------------------------------------- */
  /* Every enquiry and review is written into this browser's storage
     first, so nothing is ever lost on the page. Delivery then follows
     the first route that is actually reachable:

     A. your own host  — run `node server.js` (included, no packages
                         needed). Records are appended to
                         data/leads.json and data/reviews.json and the
                         admin dashboard reads and edits that shared
                         store over /api/leads and /api/reviews.
     B. leadEndpoint   — a Google Apps Script web-app URL (see the
                         copyable script in admin.js, used for the sheet
                         mirror). The Sheet is created for you on first post.
     C. neither        — records stay in this browser; admin.html can
                         still export CSV and a JSON backup.

     Anything that fails to deliver is queued and retried automatically. */
  leadEndpoint: '',

  /* localStorage keys are namespaced with this prefix */
  storagePrefix: 'skyline.v1.',

  /* ---- admin ------------------------------------------------------- */
  /* The admin passcode is NOT stored here any more. server.js checks it and
     answers with an HttpOnly session cookie, so nothing the browser
     downloads can reveal it. Pick your own with:

         SKYLINE_ADMIN_PASSCODE="your code" node server.js

     ...or let the server create data/admin-passcode.txt on first run (that
     folder is git-ignored, so it is never pushed).

     Only fill the value below if you host the site as pure static files with
     no server (or open admin.html straight from disk) — then the dashboard
     falls back to a local-only gate and the records live in this browser
     alone. When `node server.js` runs, the server verifies the passcode
     itself and this value is ignored, so keep them matching if you want the
     same code in both places (data/admin-passcode.txt).                     */
  adminPasscode: 'admin@123'
};
