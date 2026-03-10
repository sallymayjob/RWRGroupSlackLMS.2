function computeRequestHash(rawBody) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawBody || '');
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function withRequestLogLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(5000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function getRequestRecord_(requestType, requestHash) {
  var rows = findRows(TAB_NAMES.REQUEST_LOG, {
    RequestType: requestType,
    RequestHash: requestHash
  });
  return rows.length ? rows[0] : null;
}

function isProcessedRequest(requestType, requestHash) {
  var cache = CacheService.getScriptCache();
  var processedKey = 'dup:processed:' + requestType + ':' + requestHash;
  if (cache.get(processedKey) === '1') {
    return true;
  }

  var record = getRequestRecord_(requestType, requestHash);
  return !!(record && record.Status === 'processed');
}

function claimRequestForProcessing(requestType, requestHash, correlationId) {
  return withRequestLogLock_(function () {
    var cfg = getRuntimeConfig();
    var cache = CacheService.getScriptCache();
    var processedKey = 'dup:processed:' + requestType + ':' + requestHash;
    if (cache.get(processedKey) === '1') {
      return { duplicate: true };
    }

    var record = getRequestRecord_(requestType, requestHash);
    if (record && record.Status === 'processed') {
      cache.put(processedKey, '1', cfg.duplicateCacheSeconds);
      return { duplicate: true };
    }

    if (!record) {
      appendRow(TAB_NAMES.REQUEST_LOG, {
        RequestID: generateId('RQL'),
        RequestType: requestType,
        RequestHash: requestHash,
        Status: 'processing',
        AttemptCount: 1,
        CorrelationID: correlationId,
        LastSeenAt: nowIso(),
        CreatedAt: nowIso()
      });
      return { duplicate: false };
    }

    updateRowById(TAB_NAMES.REQUEST_LOG, 'RequestID', record.RequestID, {
      Status: 'processing',
      AttemptCount: Number(record.AttemptCount || 0) + 1,
      CorrelationID: correlationId,
      LastSeenAt: nowIso()
    });
    return { duplicate: false };
  });
}

function beginRequestProcessing(requestType, requestHash, correlationId) {
  return claimRequestForProcessing(requestType, requestHash, correlationId);
}

function markRequestProcessed(requestType, requestHash, correlationId) {
  var cfg = getRuntimeConfig();
  var cache = CacheService.getScriptCache();
  var processedKey = 'dup:processed:' + requestType + ':' + requestHash;
  cache.put(processedKey, '1', cfg.duplicateCacheSeconds);

  withRequestLogLock_(function () {
    var record = getRequestRecord_(requestType, requestHash);
    if (!record) {
      appendRow(TAB_NAMES.REQUEST_LOG, {
        RequestID: generateId('RQL'),
        RequestType: requestType,
        RequestHash: requestHash,
        Status: 'processed',
        AttemptCount: 1,
        CorrelationID: correlationId,
        LastSeenAt: nowIso(),
        CreatedAt: nowIso()
      });
      return;
    }

    updateRowById(TAB_NAMES.REQUEST_LOG, 'RequestID', record.RequestID, {
      Status: 'processed',
      CorrelationID: correlationId,
      LastSeenAt: nowIso()
    });
  });
}

function markRequestFailed(requestType, requestHash, correlationId, errorText) {
  withRequestLogLock_(function () {
    var record = getRequestRecord_(requestType, requestHash);
    if (!record) {
      appendRow(TAB_NAMES.REQUEST_LOG, {
        RequestID: generateId('RQL'),
        RequestType: requestType,
        RequestHash: requestHash,
        Status: 'failed',
        AttemptCount: 1,
        CorrelationID: correlationId,
        LastSeenAt: nowIso(),
        LastError: errorText || '',
        CreatedAt: nowIso()
      });
      return;
    }

    updateRowById(TAB_NAMES.REQUEST_LOG, 'RequestID', record.RequestID, {
      Status: 'failed',
      CorrelationID: correlationId,
      LastSeenAt: nowIso(),
      LastError: errorText || ''
    });
  });
}
