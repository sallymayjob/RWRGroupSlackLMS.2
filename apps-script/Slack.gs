function postSlackMessage(channel, text, blocks) {
  var token = PropertiesService.getScriptProperties().getProperty('SLACK_BOT_TOKEN');
  if (!token) {
    throw new Error('Missing SLACK_BOT_TOKEN');
  }

  var payload = {
    channel: channel,
    text: text || 'Notification',
    blocks: blocks || []
  };

  var response = UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: {
      Authorization: 'Bearer ' + token
    },
    muteHttpExceptions: true
  });

  var body = safeJsonParse(response.getContentText(), { ok: false, error: 'parse_failed' });
  var headers = response.getHeaders ? response.getHeaders() : {};
  var retryAfter = Number(headers['Retry-After'] || headers['retry-after'] || 0);

  return {
    ok: !!body.ok,
    error: body.error || '',
    ts: body.ts || '',
    retryable: response.getResponseCode() === 429 || body.error === 'ratelimited' || body.error === 'internal_error',
    retryAfterSec: retryAfter > 0 ? retryAfter : 0,
    raw: body
  };
}

function postToResponseUrl(responseUrl, messageText) {
  if (!responseUrl) {
    return { ok: false, error: 'missing_response_url' };
  }

  var response = UrlFetchApp.fetch(responseUrl, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      response_type: 'ephemeral',
      text: messageText
    }),
    muteHttpExceptions: true
  });

  return { ok: response.getResponseCode() < 300, code: response.getResponseCode() };
}

function ackJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || { ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
