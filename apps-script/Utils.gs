function nowIso() {
  return new Date().toISOString();
}

function generateId(prefix) {
  var stamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMddHHmmss');
  var rand = Math.floor(Math.random() * 900000 + 100000);
  return prefix + '-' + stamp + '-' + rand;
}

function safeJsonParse(text, fallback) {
  try {
    return JSON.parse(text);
  } catch (err) {
    return fallback;
  }
}

function toMap(headers, values) {
  var obj = {};
  for (var i = 0; i < headers.length; i++) {
    obj[headers[i]] = values[i];
  }
  return obj;
}

function toRow(headers, rowObject) {
  return headers.map(function (key) {
    return rowObject[key] !== undefined ? rowObject[key] : '';
  });
}

function computeSlackSignatureBase(timestamp, rawBody) {
  return 'v0:' + timestamp + ':' + rawBody;
}

function getScriptProperty(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}
