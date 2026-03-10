function computeRequestHash(rawBody) {
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, rawBody || '');
  return digest.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? '0' + v : v;
  }).join('');
}

function isDuplicateRequest(requestType, requestHash) {
  var cache = CacheService.getScriptCache();
  var key = 'dup:' + requestType + ':' + requestHash;
  return cache.get(key) === '1';
}

function markRequestSeen(requestType, requestHash, correlationId) {
  var cfg = getRuntimeConfig();
  var cache = CacheService.getScriptCache();
  var key = 'dup:' + requestType + ':' + requestHash;
  cache.put(key, '1', cfg.duplicateCacheSeconds);

  appendRow(TAB_NAMES.REQUEST_LOG, {
    RequestID: generateId('RQL'),
    RequestType: requestType,
    RequestHash: requestHash,
    Status: 'seen',
    CorrelationID: correlationId,
    CreatedAt: nowIso()
  });
}
