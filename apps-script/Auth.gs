function verifySlackRequest(e) {
  var headers = normalizeHeaders_(e && e.headers ? e.headers : {});
  var signature = headers['x-slack-signature'];
  var timestamp = headers['x-slack-request-timestamp'];
  var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '';

  if (!signature || !timestamp) {
    return { ok: false, reason: 'missing_headers' };
  }

  var cfg = getRuntimeConfig();
  var nowEpoch = Math.floor(Date.now() / 1000);
  if (Math.abs(nowEpoch - Number(timestamp)) > cfg.replayWindowSeconds) {
    return { ok: false, reason: 'stale_timestamp' };
  }

  var secret = PropertiesService.getScriptProperties().getProperty('SLACK_SIGNING_SECRET');
  if (!secret) {
    return { ok: false, reason: 'missing_signing_secret' };
  }

  var base = computeSlackSignatureBase(timestamp, rawBody);
  var computed = 'v0=' + Utilities.computeHmacSha256Signature(base, secret)
    .map(function (b) {
      var v = (b < 0 ? b + 256 : b).toString(16);
      return v.length === 1 ? '0' + v : v;
    })
    .join('');

  if (computed !== signature) {
    return { ok: false, reason: 'invalid_signature' };
  }

  return { ok: true };
}

function normalizeHeaders_(headers) {
  var out = {};
  Object.keys(headers).forEach(function (k) {
    out[k.toLowerCase()] = headers[k];
  });
  return out;
}
