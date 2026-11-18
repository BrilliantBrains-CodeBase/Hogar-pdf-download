/**
 * Hogar / DU – QR Lead Capture backend (Google Apps Script Web App)
 *
 * Deploy: Deploy > New deployment > Web app
 *   Execute as:      Me
 *   Who has access:  Anyone
 *
 * See README.md ("Google Sheets & Apps Script setup") for full instructions.
 */

/* =========================== CONFIGURATION =========================== */

var CONFIG = {
  // Spreadsheet ID from the sheet URL:
  // https://docs.google.com/spreadsheets/d/<THIS_PART_IS_THE_ID>/edit
  // Leave empty ('') if this script is bound to the sheet (Extensions > Apps Script).
  SHEET_ID: '',

  // Tab name that stores the leads (created automatically if missing).
  SHEET_NAME: 'Leads',

  // Timezone used for the Lead ID date part and the timestamp format.
  TIMEZONE: 'Asia/Kolkata',

  // Prefix for generated lead IDs, e.g. LEAD-20261118-7F3A9C.
  LEAD_ID_PREFIX: 'LEAD',
};

// Keep in sync with src/config/formOptions.js
var ALLOWED_CATEGORIES = ['Architect', 'Contractor', 'Builder', 'Interior Designer', 'End Customer', 'Others'];
var ALLOWED_COMPANIES = ['Hogar', 'DU'];

var HEADERS = [
  'Lead ID',
  'Timestamp',
  'Category',
  'Company Selection',
  'Full Name',
  'Firm / Company Name',
  'Mobile Number',
  'Email',
  'City',
  'Remarks',
];

var LIMITS = { fullName: 100, firmName: 150, email: 254, city: 100, remarks: 1000 };

/* ============================== ENDPOINTS ============================= */

function doPost(e) {
  try {
    var data = parseRequest_(e);

    // Honeypot: real visitors never fill this hidden field. Pretend success
    // to the bot but store nothing.
    if (data.website) {
      return json_({ success: true, leadId: 'IGNORED' });
    }

    var clean = validateAndClean_(data);
    if (clean.error) {
      return json_({ success: false, retryable: false, message: clean.error });
    }

    var lock = LockService.getScriptLock();
    if (!lock.tryLock(20000)) {
      return json_({ success: false, retryable: true, message: 'The server is busy. Please try again.' });
    }

    try {
      // Idempotency: the same submissionId (a retry after a lost response)
      // returns the original Lead ID instead of creating a duplicate row.
      var cache = CacheService.getScriptCache();
      var cacheKey = clean.submissionId ? 'sub_' + clean.submissionId : null;
      if (cacheKey) {
        var existing = cache.get(cacheKey);
        if (existing) return json_({ success: true, leadId: existing, duplicate: true });
      }

      var sheet = getSheet_();
      var now = new Date();
      var leadId = generateLeadId_(now);

      var row = [
        leadId,
        now,
        clean.category,
        clean.company,
        clean.fullName,
        clean.firmName,
        clean.mobile,
        clean.email,
        clean.city,
        clean.remarks,
      ].map(function (value, index) {
        return index === 1 ? value : sanitizeForSheet_(value);
      });

      sheet.appendRow(row);
      sheet.getRange(sheet.getLastRow(), 2).setNumberFormat('dd-MMM-yyyy HH:mm:ss');
      SpreadsheetApp.flush(); // make sure the write is committed before replying

      if (cacheKey) cache.put(cacheKey, leadId, 21600); // 6 hours

      return json_({ success: true, leadId: leadId });
    } finally {
      lock.releaseLock();
    }
  } catch (err) {
    console.error('doPost failed: ' + (err && err.stack ? err.stack : err));
    return json_({
      success: false,
      retryable: true,
      message: 'We could not save your details due to a server error. Please try again.',
    });
  }
}

/** Health check: open the /exec URL in a browser to confirm the deployment works. */
function doGet() {
  return json_({ success: true, status: 'ok', service: 'Hogar / DU lead capture' });
}

/* ============================== HELPERS =============================== */

function parseRequest_(e) {
  if (!e) throw new Error('No request data');
  if (e.postData && e.postData.contents) {
    try {
      return JSON.parse(e.postData.contents) || {};
    } catch (parseErr) {
      // Fall through to form-encoded parameters.
    }
  }
  return e.parameter || {};
}

function str_(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '') // control chars (keeps \t \n \r)
    .replace(/\r\n?/g, '\n')
    .trim();
}

function normalizeIndianMobile_(value) {
  var digits = str_(value).replace(/[\s\-().]/g, '');
  if (digits.indexOf('+91') === 0) digits = digits.slice(3);
  else if (digits.length === 12 && digits.indexOf('91') === 0) digits = digits.slice(2);
  else if (digits.length === 11 && digits.indexOf('0') === 0) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

function validateAndClean_(data) {
  var category = str_(data.category);
  var company = str_(data.company);
  var fullName = str_(data.fullName).replace(/\s+/g, ' ');
  var firmName = str_(data.firmName).replace(/\s+/g, ' ');
  var email = str_(data.email).toLowerCase();
  var city = str_(data.city).replace(/\s+/g, ' ');
  var remarks = str_(data.remarks);
  var mobile = normalizeIndianMobile_(data.mobile);
  var submissionId = str_(data.submissionId).replace(/[^A-Za-z0-9-]/g, '').slice(0, 64);

  if (ALLOWED_CATEGORIES.indexOf(category) === -1) return { error: 'Please select a valid category.' };
  if (ALLOWED_COMPANIES.indexOf(company) === -1) return { error: 'Please select a valid company.' };
  if (fullName.length < 2) return { error: 'Please enter your full name.' };
  if (fullName.length > LIMITS.fullName) return { error: 'Full name is too long.' };
  if (!mobile) return { error: 'Please enter a valid 10-digit Indian mobile number.' };
  if (email && (email.length > LIMITS.email || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email))) {
    return { error: 'Please enter a valid email address.' };
  }
  if (firmName.length > LIMITS.firmName) return { error: 'Firm / company name is too long.' };
  if (city.length > LIMITS.city) return { error: 'City is too long.' };
  if (remarks.length > LIMITS.remarks) return { error: 'Remarks are too long.' };

  return {
    submissionId: submissionId,
    category: category,
    company: company,
    fullName: fullName,
    firmName: firmName,
    mobile: '+91 ' + mobile,
    email: email,
    city: city,
    remarks: remarks,
  };
}

/**
 * Prevents spreadsheet formula / CSV injection: any value starting with
 * = + - @ (or tab / CR) is prefixed with an apostrophe so Sheets stores it
 * as plain text instead of evaluating it.
 */
function sanitizeForSheet_(value) {
  var s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) return "'" + s;
  return s;
}

function getSheet_() {
  var ss = CONFIG.SHEET_ID ? SpreadsheetApp.openById(CONFIG.SHEET_ID) : SpreadsheetApp.getActiveSpreadsheet();
  if (!ss) throw new Error('Spreadsheet not found. Set CONFIG.SHEET_ID in Code.gs.');

  var sheet = ss.getSheetByName(CONFIG.SHEET_NAME) || ss.insertSheet(CONFIG.SHEET_NAME);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#000000').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function generateLeadId_(date) {
  var datePart = Utilities.formatDate(date, CONFIG.TIMEZONE, 'yyyyMMdd');
  var randomPart = Utilities.getUuid().replace(/-/g, '').slice(0, 6).toUpperCase();
  return CONFIG.LEAD_ID_PREFIX + '-' + datePart + '-' + randomPart;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/* ============================ MANUAL TOOLS ============================ */

/**
 * Run once from the editor (select "setup" > Run) to authorise the script
 * and create the "Leads" tab with headers.
 */
function setup() {
  var sheet = getSheet_();
  Logger.log('Ready: ' + sheet.getParent().getName() + ' > ' + sheet.getName());
}

/** Run from the editor to append a test row and see the JSON response in the log. */
function testSubmission() {
  var response = doPost({
    postData: {
      contents: JSON.stringify({
        submissionId: 'test-' + Date.now(),
        category: 'Architect',
        company: 'Hogar',
        fullName: 'Test Visitor',
        firmName: '=HYPERLINK("http://example.com")',
        mobile: '9876543210',
        email: 'test@example.com',
        city: 'Hyderabad',
        remarks: 'Test submission from the Apps Script editor',
      }),
    },
  });
  Logger.log(response.getContent());
}
