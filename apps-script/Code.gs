/**
 * Sidvin Celeste — Lead capture endpoint
 * -------------------------------------------------------------
 * Spreadsheet : "Sidvin Celeste New Google Ads"
 * Sheet tab   : "Google sheet"
 * Columns     : Date | Name | Email | Phone number | Configuration
 *
 * SETUP
 * 1. Open the spreadsheet "Sidvin Celeste New Google Ads".
 * 2. Extensions -> Apps Script. Delete any placeholder code, paste this file.
 * 3. Deploy -> New deployment -> type "Web app"
 *       Execute as        : Me
 *       Who has access    : Anyone
 *    Copy the /exec URL it gives you.
 * 4. Paste that URL into assets/js/config.js  ->  SHEET_ENDPOINT
 *
 * Re-deploy (Manage deployments -> edit -> New version) after any edit,
 * otherwise the live URL keeps serving the old code.
 */

var SHEET_NAME = 'Google sheet';
var HEADERS = ['Date', 'Name', 'Email', 'Phone number', 'Configuration'];

/* ------------------------------------------------------------------ */

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);

    var data = parseRequest_(e);

    var name = String(data.name || '').trim();
    var email = String(data.email || '').trim();
    var phone = String(data.phone || '').trim();
    var config = String(data.configuration || '').trim();

    if (!name || !email || !phone || !config) {
      return json_({ result: 'error', message: 'All fields are required.' });
    }

    var sheet = getSheet_();

    // Timestamp in IST, written as plain text so Sheets never reformats it.
    var stamp = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd/MM/yyyy HH:mm:ss');

    sheet.appendRow([stamp, name, email, phone, config]);

    return json_({ result: 'success', row: sheet.getLastRow() });
  } catch (err) {
    return json_({ result: 'error', message: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}

/** Lets you sanity-check the deployment by opening the /exec URL in a browser. */
function doGet() {
  return json_({ result: 'ok', message: 'Sidvin Celeste lead endpoint is live.' });
}

/* ------------------------------------------------------------------ */

/** Accepts JSON bodies, text/plain JSON bodies and classic form posts. */
function parseRequest_(e) {
  if (!e) return {};

  if (e.postData && e.postData.contents) {
    var raw = e.postData.contents;
    try {
      return JSON.parse(raw);
    } catch (ignore) {
      // Not JSON — fall through to the parsed form parameters below.
    }
  }

  var out = {};
  if (e.parameter) {
    for (var k in e.parameter) out[k] = e.parameter[k];
  }
  return out;
}

function getSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    sheet.getRange(1, 1, 1, HEADERS.length)
      .setFontWeight('bold')
      .setBackground('#0b1f33')
      .setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    sheet.setColumnWidth(1, 160);
    sheet.setColumnWidth(2, 180);
    sheet.setColumnWidth(3, 240);
    sheet.setColumnWidth(4, 150);
    sheet.setColumnWidth(5, 140);
  }

  return sheet;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
