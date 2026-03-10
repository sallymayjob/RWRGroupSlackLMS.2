function doGet() {
  return ContentService.createTextOutput('Slack LMS endpoint is running.');
}

function doPost(e) {
  var correlationId = generateId('REQ');
  try {
    var verification = verifySlackRequest(e);
    if (!verification.ok) {
      logError('auth_failed', verification.reason, {}, correlationId);
      return ackJson({ ok: false, error: 'unauthorized' });
    }

    return routeSlackRequest(e, correlationId);
  } catch (err) {
    logError('unhandled_exception', String(err), { stack: err && err.stack ? err.stack : '' }, correlationId);
    return ackJson({ ok: true });
  }
}

function runQueueWorker() {
  processNextBatch(10);
}

function setupSheets() {
  bootstrapSchema();
}
