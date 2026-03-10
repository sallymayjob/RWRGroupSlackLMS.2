function routeSlackRequest(e, correlationId) {
  var rawBody = (e && e.postData && e.postData.contents) ? e.postData.contents : '';
  var contentType = (e && e.postData && e.postData.type) ? e.postData.type : '';
  var requestType = detectRequestType_(rawBody, contentType);
  var requestHash = computeRequestHash(rawBody);

  if (isProcessedRequest(requestType, requestHash)) {
    logAudit('duplicate_request_ignored', 'system', 'router', requestType, requestHash, {}, correlationId);
    return ackJson({ ok: true });
  }

  beginRequestProcessing(requestType, requestHash, correlationId);

  try {
    var response;

    if (contentType.indexOf('application/json') >= 0) {
      var jsonBody = safeJsonParse(rawBody, {});
      if (jsonBody.type === 'url_verification') {
        response = ackJson({ challenge: jsonBody.challenge });
      } else if (jsonBody.type === 'event_callback') {
        response = handleSlackEvent(jsonBody, correlationId);
      }
    }

    if (!response) {
      var params = parseQueryString_(rawBody);
      if (params.payload) {
        var interactive = safeJsonParse(params.payload, {});
        response = handleInteractive(interactive, correlationId);
      } else if (params.command) {
        response = handleSlashCommand(params, correlationId);
      }
    }

    if (!response) {
      logError('unknown_payload', 'Unsupported Slack payload', { contentType: contentType, rawBody: rawBody }, correlationId);
      response = ackJson({ ok: true });
    }

    markRequestProcessed(requestType, requestHash, correlationId);
    return response;
  } catch (err) {
    markRequestFailed(requestType, requestHash, correlationId, String(err));
    throw err;
  }
}

function detectRequestType_(rawBody, contentType) {
  if (contentType.indexOf('application/json') >= 0) {
    var body = safeJsonParse(rawBody, {});
    return body.type || 'json_unknown';
  }

  var params = parseQueryString_(rawBody);
  if (params.command) {
    return 'slash_command';
  }
  if (params.payload) {
    return 'interactive';
  }

  return 'unknown';
}

function parseQueryString_(body) {
  var out = {};
  if (!body) {
    return out;
  }

  body.split('&').forEach(function (pair) {
    var idx = pair.indexOf('=');
    if (idx < 0) {
      return;
    }
    var key = decodeURIComponent(pair.slice(0, idx).replace(/\+/g, ' '));
    var val = decodeURIComponent(pair.slice(idx + 1).replace(/\+/g, ' '));
    out[key] = val;
  });

  return out;
}
