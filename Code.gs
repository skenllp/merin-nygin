// ============================================================
//  Code.gs — Google Apps Script for Merin & Nygin RSVP
//
//  HOW TO DEPLOY:
//  1. Go to script.google.com → New project
//  2. Paste this entire file, save (Ctrl+S)
//  3. Click Deploy → New deployment
//     Type: Web App
//     Execute as: Me
//     Who has access: Anyone
//  4. Click Deploy → copy the Web App URL
//  5. Paste the URL into SCRIPT_URL in js/rsvp.js
//
//  SHEET: auto-created tab named "RSVP" with header row
// ============================================================

var HEADERS = ['Timestamp', 'Name', 'Phone', 'Guests', 'Attending', 'Wish'];

/* ── Get or create the RSVP sheet ── */
function getSheet() {
  var ss    = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName('RSVP');

  if (!sheet) {
    sheet = ss.insertSheet('RSVP');
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
    var headerRange = sheet.getRange(1, 1, 1, HEADERS.length);
    headerRange
      .setFontWeight('bold')
      .setBackground('#2E4E2E')
      .setFontColor('#FFFFFF')
      .setHorizontalAlignment('center');
    sheet.setFrozenRows(1);
    sheet.setColumnWidths(1, 6, 180);
    sheet.setColumnWidth(2, 200); // Name
    sheet.setColumnWidth(6, 400); // Wish
  }

  return sheet;
}

/* ── Handle GET requests ── */
function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || '';

  if (action === 'getWishes') {
    return getWishesResponse();
  }

  return jsonResponse({ result: 'ok', message: 'RSVP API is running.' });
}

/* ── Handle POST requests (form submission) ── */
function doPost(e) {
  try {
    var data = {};

    /* Parse URL-encoded body (what the hidden-form POST sends) */
    if (e.postData && e.postData.contents) {
      e.postData.contents.split('&').forEach(function (pair) {
        var idx   = pair.indexOf('=');
        if (idx < 0) return;
        var key   = decodeURIComponent(pair.substring(0, idx).replace(/\+/g, ' '));
        var value = decodeURIComponent(pair.substring(idx + 1).replace(/\+/g, ' '));
        data[key] = value;
      });
    }

    /* Fallback: try JSON body */
    if (!data.name && e.postData && e.postData.contents) {
      try { data = JSON.parse(e.postData.contents); } catch (x) {}
    }

    /* Fallback: query parameters */
    if (!data.name && e.parameter) {
      data = e.parameter;
    }

    /* Append row */
    getSheet().appendRow([
      data.timestamp || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
      data.name      || '',
      data.phone     || '',
      data.guests    || '',
      data.attending || '',
      data.wish      || ''
    ]);

    return jsonResponse({ result: 'success' });

  } catch (err) {
    return jsonResponse({ result: 'error', message: err.message });
  }
}

/* ── Return wishes as JSON ── */
function getWishesResponse() {
  try {
    var sheet = getSheet();
    var last  = sheet.getLastRow();

    if (last <= 1) {
      return jsonResponse({ wishes: [] });
    }

    var rows   = sheet.getRange(2, 1, last - 1, 6).getValues();
    var wishes = [];

    rows.forEach(function (row) {
      var name = String(row[1] || '').trim();
      var wish = String(row[5] || '').trim();
      if (name && wish) {
        wishes.push({ name: name, wish: wish });
      }
    });

    /* Newest first */
    wishes.reverse();

    return jsonResponse({ wishes: wishes });

  } catch (err) {
    return jsonResponse({ wishes: [], error: err.message });
  }
}

/* ── JSON response helper with CORS header ── */
function jsonResponse(obj) {
  var output = ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
  return output;
}
