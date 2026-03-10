function postSlackMessage(channel, text, blocks) {
  var token = getScriptProperty('SLACK_BOT_TOKEN');
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

  return safeJsonParse(response.getContentText(), { ok: false, error: 'parse_failed' });
}

function ackJson(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj || { ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
