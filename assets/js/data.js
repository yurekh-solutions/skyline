/* ==========================================================================
   Skyline Solution Enterprises — data.js
   The 29 services, grouped into 5 desks, each with the document checklist
   shown in the tap-through modal and the typical filing timeline, plus the
   5 extras under `extras` that are handled at the desk without a page.
   ========================================================================== */

window.SERVICE_DATA = {
  desks: [
    { id: 'government', label: 'Government Services', index: '01 / 05', blurb: 'Registrations, licences and certificates — filed right the first time.' },
    { id: 'company', label: 'Company Registration', index: '02 / 05', blurb: 'Start your business the right way — registered, certified and compliant.' },
    { id: 'loans', label: 'Loan & Finance', index: '03 / 05', blurb: 'The right lender, the right rate, with paperwork handled for you.' },
    { id: 'insurance', label: 'Insurance', index: '04 / 05', blurb: "Cover for the people and things you can't replace." },
    { id: 'travel', label: 'Travel Services', index: '05 / 05', blurb: 'From a city ride to a full tour — booked, planned and on time.' }
  ],

  /* Carried on the visiting card and handled at the desk, but quoted case by
     case — so they appear in the shortlists and the enquiry dropdowns without
     a page of their own. Kept out of `services` for that reason, which is why
     the count of service pages stays 29. */
  extras: [
    { name: 'Senior Citizen Card', desk: 'government' },
    { name: 'Aadhaar Service', desk: 'government' },
    { name: 'RD & FD Deposit', desk: 'loans' },
    { name: 'Website Development', desk: 'company' },
    { name: 'App Development (Android / iOS)', desk: 'company' }
  ],

  services: {
    /* ---------------- Government Services ---------------- */
    'GST Registration': {
      desk: 'government',
      blurb: 'New GSTIN, amendment or cancellation — portal filing, class-3 verification support and the first return set-up.',
      timeline: 'Registration is usually granted in 3–7 working days after the application is submitted.',
      docs: [
        'PAN of the business or proprietor',
        'Aadhaar of the proprietor / all partners or directors',
        'Proof of place of business — electricity bill, rent agreement with NOC, or consent letter',
        'Business constitution proof — partnership deed, COI or registration certificate',
        'Bank account proof — cancelled cheque or first-page passbook with account number',
        'Passport-size photograph of the proprietor / partners',
        'Email ID and mobile number linked to Aadhaar for OTP verification'
      ]
    },
    'Udyam MSME': {
      desk: 'government',
      blurb: 'Micro, small or medium enterprise registration with classification, activity codes and certificate in hand.',
      timeline: 'Same-day filing; the Udyam certificate usually arrives within 24 hours.',
      docs: [
        'Aadhaar of the proprietor / partner / director',
        'PAN of the business',
        'Mobile number and email ID',
        'Name, type and location of the enterprise',
        'Nature of business — manufacturing or services, with NIC code',
        'Investment in plant, machinery or equipment',
        'Number of employees'
      ]
    },
    'Ghumasta Shop Licence': {
      desk: 'government',
      blurb: 'Shop & Establishment (Ghumasta) licence for shops, offices and commercial establishments in Maharashtra.',
      timeline: 'Typically issued in 7–15 working days after the local body or labour office filing.',
      docs: [
        'Aadhaar and PAN of the owner',
        'Proof of business premises — rent agreement, ownership paper or NOC',
        'Business name, address and nature of activity',
        'Number of employees working in the establishment',
        'Passport-size photographs',
        'Partnership deed or incorporation proof, where applicable',
        'Previous licence copy for renewal'
      ]
    },
    'FSSAI / Food Licence': {
      desk: 'government',
      blurb: 'Basic registration, state licence or central licence for manufacturers, traders, restaurants and cloud kitchens.',
      timeline: 'Basic registration in 5–7 days; state and central licences in 30–60 days including inspection.',
      docs: [
        'Form B with food category details',
        'PAN and Aadhaar of the proprietor / directors',
        'Incorporation, partnership or shop licence proof',
        'Layout plan of the kitchen or manufacturing unit',
        'List of food items to be handled',
        'Water test report for manufacturing units',
        'Food safety management plan and hygiene SOP',
        'Name and address of the processor / supplier, if repackaging'
      ]
    },
    'PAN Card Services': {
      desk: 'government',
      blurb: 'New PAN, correction, reprint, addition of partner or director, and PAN–Aadhaar linking.',
      timeline: 'Usually 15–20 working days from application to card / e-PAN.',
      docs: [
        'Aadhaar or other valid identity proof',
        'Proof of address and date of birth',
        'Two passport-size photographs',
        'For companies: Form 49, COI, MOA / AOA and common address proof',
        'Designation and signature of the authorised signatory',
        'For correction: existing PAN card copy and supporting proof'
      ]
    },
    'Passport Services': {
      desk: 'government',
      blurb: 'Fresh passport, renewal, tatkal, address or personal particulars change, and police verification follow-up.',
      timeline: 'Normal 30–45 days; tatkal 7–14 days after police verification clears.',
      docs: [
        'Birth certificate, 10th mark sheet or Aadhaar as date-of-birth proof',
        'Address proof — rent agreement, electricity bill, water bill or bank passbook',
        'Aadhaar linked to mobile number',
        'Self-attested copies of all documents',
        'Passport photographs as per specification',
        'For minors: both parents\' passports and consent',
        'For renewal: old passport details page'
      ]
    },
    'Income Certificate': {
      desk: 'government',
      blurb: 'Income certificate for scholarships, EWS benefit, tender and welfare-scheme applications.',
      timeline: 'Generally 7–21 working days depending on the taluka or ward office.',
      docs: [
        'Aadhaar of the applicant',
        'PAN and latest ITR or Form 16',
        'Salary slips for the last 3 months (salaried)',
        'Bank statement for the last 6 months',
        'Ration card or residence proof',
        'Employer / ward-office certificate of income',
        'Passport-size photographs'
      ]
    },
    'Domicile Certificate': {
      desk: 'government',
      blurb: 'Residence and domicile proof for admission, job, and state-scheme eligibility.',
      timeline: 'Usually 15–30 working days from the competent authority.',
      docs: [
        'Aadhaar of the applicant',
        'Proof of residence for the last 10 years — electricity bill, lease or rent records',
        'School leaving certificate or education records',
        "Parent's domicile certificate, where applicable",
        'Ration card with family details',
        'Birth certificate',
        'Affidavit and passport-size photographs'
      ]
    },
    'Gazette': {
      desk: 'government',
      blurb: 'Name, surname, spelling, date-of-birth or father-name correction published in the Union or State Gazette.',
      timeline: 'Publication typically 25–40 days after the notice and affidavit are in order.',
      docs: [
        'Aadhaar and PAN',
        'Birth certificate or school leaving certificate',
        'Notarised affidavit in the prescribed format',
        'Newspaper public notice clipping — one Marathi and one English daily',
        'Two witnesses with identity proof',
        'Gazette application fee receipt / court fee stamp',
        'Supporting proof for the reason of change'
      ]
    },
    'Driving Licence': {
      desk: 'government',
      blurb: 'Learner\'s licence, permanent licence, renewal, international permit and address or class change.',
      timeline: 'LL same week; permanent licence after the 180-day window and slot test.',
      docs: [
        'Learner\'s Licence number',
        'Aadhaar and PAN',
        'Age proof — birth certificate or 8th standard mark sheet',
        'Address proof',
        'Form 4 and Form 1A medical certificate for transport class',
        'Blood group certificate',
        'Passport-size photographs and test slot confirmation'
      ]
    },
    'ITR Filing': {
      desk: 'government',
      blurb: 'Salary, business, capital-gains, rental and revised returns, with e-verification and intimation tracking.',
      timeline: 'Return filed in 1–2 days once documents are ready; acknowledgement instantly on e-verification.',
      docs: [
        'PAN and Aadhaar',
        'Form 16 from every employer',
        'Bank statement and interest certificates',
        'Investment proofs under 80C, 80D, 80G',
        'Capital-gains and mutual-fund statements',
        'Form 26AS and AIS / ITR summary download',
        'Previous year ITR-V',
        'Digital signature, where audit applies'
      ]
    },

    /* ---------------- Company Registration ---------------- */
    'LLP Registration': {
      desk: 'company',
      blurb: 'Name reservation, FiLLiP filing, partnership deed and LLPIN — with first-year compliance calendar.',
      timeline: 'Usually 12–20 working days from name approval to LLPIN.',
      docs: [
        'DSC of all designated partners',
        'DIN application or existing DIN',
        'PAN and Aadhaar of designated partners',
        'Proof of registered office with NOC and utility bill',
        'Draft LLP agreement for Form 3',
        'Name options for RUN-LLP (Form 1)',
        'Passport-size photographs and business address proof'
      ]
    },
    'Pvt Ltd Company Registration': {
      desk: 'company',
      blurb: 'SPICe+ incorporation with AGILE-PRO-S, MoA and AoA, PAN, TAN, GST and EPFO / ESIC enablement in one run.',
      timeline: 'Typically 10–18 working days from name approval to the Certificate of Incorporation.',
      docs: [
        'DSC of subscribers and directors',
        'PAN and Aadhaar of all directors and shareholders',
        'Address and identity proof, and mobile number for OTP',
        'Registered office proof with utility bill and NOC',
        'Draft MoA and AoA (INC-15)',
        'Name options through RUN or SPICe+ Part A',
        'Auditor consent, director declarations and board resolution',
        'Business activity description with NIC codes'
      ]
    },
    'ISO Certificate': {
      desk: 'company',
      blurb: 'ISO 9001, 14001, 45001, 22000 and 27001 — documentation, internal audit, certification audit and surveillance support.',
      timeline: 'Generally 20–45 days from gap analysis to certificate issue.',
      docs: [
        'COI, partnership deed, shop licence or GST certificate',
        'Quality manual and process list',
        'Legal and statutory compliance register',
        'Internal audit and management review records',
        'Calibration, machinery and infrastructure list',
        'Vendor and customer lists',
        'Trained personnel list and organisation chart',
        'Previous certificate, in case of renewal or surveillance'
      ]
    },

    /* ---------------- Loan & Finance ---------------- */
    'Personal Loan': {
      desk: 'loans',
      blurb: 'Salaried and self-employed personal loans across banks and NBFCs, matched to your eligibility and rate band.',
      timeline: 'In-principle approval in 24–72 hours; disbursal in 3–7 days.',
      docs: [
        'PAN and Aadhaar',
        'Salary slips for the last 3 months',
        'Form 16 or ITR for the last 2 years',
        'Salary account statement for the last 6 months',
        'Address proof and employer ID card',
        'Recent passport-size photographs',
        'Credit report consent for verification'
      ]
    },
    'Business Loan': {
      desk: 'loans',
      blurb: 'Unsecured and secured business loans, term loans and equipment finance with lender-ready projections.',
      timeline: 'Approval in 4–10 working days once the financial file is complete.',
      docs: [
        'PAN and GST registration of the business',
        'Incorporation, partnership or shop licence documents',
        'Audited financials or ITR for the last 2–3 years',
        'Current account statement for the last 12 months',
        'GST returns summary (GSTR-1 and GSTR-3B)',
        'Business address proof and KYC of directors or proprietors',
        'Projected cash flow and utilisation statement',
        'Security or collateral documents, where applicable'
      ]
    },
    'Home Loan': {
      desk: 'loans',
      blurb: 'Purchase, construction, balance-transfer and top-up loans, with property legal check handled alongside the bank.',
      timeline: 'Sanction in 7–15 working days after technical and legal clearance.',
      docs: [
        'PAN, Aadhaar and address proof',
        'Salary slips for 3 months and Form 16 / ITR for 2–3 years',
        'Salary and current account statements',
        'Allotment letter, agreement to sale and cost estimate',
        'Title deeds and past ownership chain',
        'Approved plan, completion certificate and OC / CC',
        'Encumbrance certificate and property tax receipts',
        'Insurance and valuation reports as the lender requires'
      ]
    },
    'Car / Vehicle Loan': {
      desk: 'loans',
      blurb: 'New and used car, bike and commercial vehicle finance with dealer coordination and readiness tracking.',
      timeline: 'Approval in 24–72 hours; disbursal to the dealer on vehicle readiness.',
      docs: [
        'PAN and Aadhaar',
        'Address proof and driving licence',
        'Salary slips, Form 16 or ITR',
        'Bank statement for the last 6 months',
        'Proforma invoice or quotation from the dealer',
        'Vehicle registration and insurance details for used vehicles',
        'Passport-size photographs'
      ]
    },
    'Loan Against Property': {
      desk: 'loans',
      blurb: 'Mortgage loans for business expansion, debt consolidation or large expenses, using residential or commercial property.',
      timeline: 'Sanction usually in 10–20 working days including valuation and legal scrutiny.',
      docs: [
        'PAN, Aadhaar and address proof',
        'Property title deeds and approved plan',
        'Property tax receipts and encumbrance certificate',
        'Income proof — salary slips, ITR or business financials',
        'Bank statements for the last 12 months',
        'GST returns and business vintage proof, for self-employed',
        'Valuation report and NOC from existing lender, if any',
        'Rental income details, where applicable'
      ]
    },
    'Working Capital Loan': {
      desk: 'loans',
      blurb: 'Cash credit, overdraft, bill discounting and invoice-based finance to keep the order book moving.',
      timeline: 'Sanction in 5–12 working days after the limit is assessed.',
      docs: [
        'PAN and GST certificate',
        'Audited financials for the last 2 years',
        'Stock and book-debts statements',
        'Current account statement for the last 12 months',
        'Sales bills, order book and supplier details',
        'Projected turnover and fund requirement',
        'KYC of proprietors, partners or directors',
        'Hypothecation and security documents'
      ]
    },

    /* ---------------- Insurance ---------------- */
    'Life Insurance': {
      desk: 'insurance',
      blurb: 'Whole life, endowment, ULIP and money-back plans compared on maturity value, not just premium.',
      timeline: 'Policy issued in 7–15 days after medicals and proposal review.',
      docs: [
        'Filled proposal form',
        'PAN and Aadhaar',
        'Address proof and recent photographs',
        'Nominee identity proof and photograph',
        'Income proof for higher sum assured',
        'Medical records and BMI details where required',
        'Bank details for premium mandate'
      ]
    },
    'Health Insurance': {
      desk: 'insurance',
      blurb: 'Individual and family-floater covers with room-rent, co-pay and pre-existing-disease terms explained upfront.',
      timeline: 'Cover usually starts 15–30 days after proposal acceptance.',
      docs: [
        'Filled proposal form for each member',
        'Age and identity proof — Aadhaar or PAN',
        'Address proof',
        'Records of pre-existing illnesses and old prescriptions',
        'Health declaration and medical check reports, if asked',
        'Previous policy copy for portability',
        'Bank details for premium mandate'
      ]
    },
    'Motor Insurance': {
      desk: 'insurance',
      blurb: 'Comprehensive, standalone OD, third-party and zero-depreciation covers for cars, bikes and commercial vehicles.',
      timeline: 'Policy issued the same day once RC and details are shared.',
      docs: [
        'Registration certificate (RC book)',
        'Previous policy copy and NCB certificate',
        'Driving licence of the owner or regular driver',
        'ID and address proof',
        'Invoice for a new vehicle',
        'Vehicle inspection photographs, where required'
      ]
    },
    'Term Insurance': {
      desk: 'insurance',
      blurb: 'High-cover, low-premium term plans with rider comparison, and honest guidance on claim-settlement records.',
      timeline: 'Policy issued in 7–12 days after medical underwriting.',
      docs: [
        'Filled proposal form',
        'PAN and Aadhaar',
        'Address proof and photographs',
        'Income proof for the sum assured applied',
        'Medical tests and BMI details as the insurer requires',
        'Nominee details with identity proof'
      ]
    },

    /* ---------------- Travel Services ---------------- */
    'Bus Booking': {
      desk: 'travel',
      blurb: 'Sleeper, seater, AC and Volvo routes across Maharashtra and pan-India, with seat preference confirmed.',
      timeline: 'Confirmation usually within 30–60 minutes of the enquiry.',
      docs: [
        'Passenger names and age as per ID',
        'ID proof for each traveller — Aadhaar, PAN or licence',
        'Travel date, boarding point and drop point',
        'Contact number and email for the ticket',
        'Preferred bus type and berth choice',
        'Return journey details, if booked together'
      ]
    },
    'Car Rental': {
      desk: 'travel',
      blurb: 'Self-drive and chauffeur-driven city, outstation and airport transfers with clear per-km billing.',
      timeline: 'Vehicle confirmed within an hour for most dates.',
      docs: [
        'Valid driving licence for self-drive',
        'ID and address proof of the primary renter',
        'Trip dates, pickup and drop locations',
        'Itinerary for outstation routes',
        'Alternate local contact number',
        'Security deposit or ID verification as per policy'
      ]
    },
    'Local & Outstation Travel': {
      desk: 'travel',
      blurb: 'Point-to-point city rides, temple tours, family functions and outstation runs with fixed-rate clarity.',
      timeline: 'Quote the same day; booking confirmed on driver and vehicle availability.',
      docs: [
        'Passenger count and luggage details',
        'Pickup and drop addresses with timings',
        'ID proof of the lead traveller',
        'Route or list of stops for multi-point trips',
        'Meal or halt preferences, if any',
        'Contact number reachable during the journey'
      ]
    },
    'Corporate Travel': {
      desk: 'travel',
      blurb: 'Employee and guest movement, monthly vendor billing, GST invoices and travel-policy compliance.',
      timeline: 'Onboarding in 1–2 working days; ongoing bookings handled within the hour.',
      docs: [
        'Company PAN and GST certificate',
        'Authorisation letter with signatory details',
        'Employee or guest list with travel windows',
        'Approved travel policy and cabin or class limits',
        'Billing address and PO or work-order, if issued',
        'Invoice and TDS details for accounts'
      ]
    },
    'Tour Packages': {
      desk: 'travel',
      blurb: 'Family, group, honeymoon and pilgrimage tours — stay, transport, sightseeing and meals in one itinerary.',
      timeline: 'Itinerary and quote in 24–48 hours; booking once the advance is received.',
      docs: [
        'Traveller names as per ID proof',
        'Passport and visa for international tours',
        'Travel dates and number of adults and children',
        'Preferred hotel category and room configuration',
        'Special requests — diet, medical, wheelchair, baby cot',
        'Emergency contact for the group lead'
      ]
    }
  }
};
