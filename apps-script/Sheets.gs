function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet(tabName) {
  var sheet = getSpreadsheet_().getSheetByName(tabName);
  if (!sheet) {
    throw new Error('Missing tab: ' + tabName);
  }
  return sheet;
}

function ensureSheetWithHeaders(tabName, headers) {
  var ss = getSpreadsheet_();
  var sheet = ss.getSheetByName(tabName);
  if (!sheet) {
    sheet = ss.insertSheet(tabName);
  }

  var range = sheet.getRange(1, 1, 1, headers.length);
  var existing = range.getValues()[0];
  var shouldWrite = existing.join('|') !== headers.join('|');
  if (shouldWrite) {
    range.setValues([headers]);
  }

  return sheet;
}

function bootstrapSchema() {
  Object.keys(HEADERS).forEach(function (tabName) {
    ensureSheetWithHeaders(tabName, HEADERS[tabName]);
  });
}

function appendRow(tabName, rowObject) {
  var sheet = getSheet(tabName);
  var headers = HEADERS[tabName];
  if (!headers) {
    throw new Error('Unknown headers for tab: ' + tabName);
  }
  sheet.appendRow(toRow(headers, rowObject));
}

function getAllRows(tabName) {
  var sheet = getSheet(tabName);
  var values = sheet.getDataRange().getValues();
  if (values.length <= 1) {
    return [];
  }
  var headers = values[0];
  return values.slice(1).map(function (row, idx) {
    var mapped = toMap(headers, row);
    mapped.__rowNum = idx + 2;
    return mapped;
  });
}

function findRows(tabName, criteria) {
  return getAllRows(tabName).filter(function (row) {
    return Object.keys(criteria).every(function (key) {
      return String(row[key]) === String(criteria[key]);
    });
  });
}

function updateRowById(tabName, idField, idValue, updates) {
  var sheet = getSheet(tabName);
  var rows = getAllRows(tabName);
  var target = rows.filter(function (row) {
    return String(row[idField]) === String(idValue);
  })[0];

  if (!target) {
    return false;
  }

  var headers = HEADERS[tabName];
  var next = {};
  headers.forEach(function (key) {
    next[key] = target[key];
  });
  Object.keys(updates).forEach(function (key) {
    next[key] = updates[key];
  });

  sheet.getRange(target.__rowNum, 1, 1, headers.length).setValues([toRow(headers, next)]);
  return true;
}

function getSetting(key, fallback) {
  var rows = findRows(TAB_NAMES.SETTINGS, { SettingKey: key, IsActive: true });
  if (!rows.length) {
    return fallback;
  }
  return rows[0].SettingValue;
}
