function enqueue(jobType, entityType, entityId, payload, opts) {
  var options = opts || {};
  var cfg = getRuntimeConfig();
  appendRow(TAB_NAMES.QUEUE, {
    JobID: generateId('JOB'),
    JobType: jobType,
    EntityType: entityType || '',
    EntityID: entityId || '',
    PayloadJSON: JSON.stringify(payload || {}),
    Status: QUEUE_STATUS.PENDING,
    Priority: options.priority || 5,
    NotBefore: options.notBefore || nowIso(),
    RetryCount: 0,
    MaxRetries: options.maxRetries || cfg.maxRetries,
    LockedBy: '',
    LockedAt: '',
    LastError: '',
    CreatedAt: nowIso(),
    UpdatedAt: nowIso()
  });
}

function processNextBatch(limit) {
  var maxItems = limit || 10;
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var ready = getReadyQueueRows_(maxItems);
    ready.forEach(function (job) {
      claimJob_(job.JobID);
      runQueueJob_(job);
    });
  } finally {
    lock.releaseLock();
  }
}

function getReadyQueueRows_(limit) {
  var now = new Date();
  return getAllRows(TAB_NAMES.QUEUE)
    .filter(function (row) {
      return row.Status === QUEUE_STATUS.PENDING && new Date(row.NotBefore) <= now;
    })
    .sort(function (a, b) {
      return Number(a.Priority || 5) - Number(b.Priority || 5);
    })
    .slice(0, limit);
}

function claimJob_(jobId) {
  updateRowById(TAB_NAMES.QUEUE, 'JobID', jobId, {
    Status: QUEUE_STATUS.PROCESSING,
    LockedBy: Session.getTemporaryActiveUserKey() || 'worker',
    LockedAt: nowIso(),
    UpdatedAt: nowIso()
  });
}

function runQueueJob_(job) {
  try {
    dispatchQueueJob_(job);
    updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
      Status: QUEUE_STATUS.DONE,
      UpdatedAt: nowIso()
    });
    logAudit('queue_job_done', 'system', 'queue', job.EntityType, job.EntityID, { jobType: job.JobType }, job.JobID);
  } catch (err) {
    handleQueueFailure_(job, err);
  }
}

function dispatchQueueJob_(job) {
  var payload = safeJsonParse(job.PayloadJSON || '{}', {});

  switch (job.JobType) {
    case 'NOOP':
      return;
    case 'SEND_PROGRESS_SNAPSHOT':
      handleSendProgressSnapshotJob_(payload);
      return;
    case 'GEMINI_SUBMIT_BRAND_REVIEW':
      handleGeminiSubmitBrandReview_(payload);
      return;
    case 'GEMINI_POLL_OPERATION':
      handleGeminiPollOperation_(payload);
      return;
    default:
      throw new Error('No queue handler registered for JobType=' + job.JobType);
  }
}

function handleSendProgressSnapshotJob_(payload) {
  if (!payload.channel || !payload.text) {
    throw new Error('SEND_PROGRESS_SNAPSHOT missing channel/text');
  }
  var response = postSlackMessage(payload.channel, payload.text, payload.blocks || []);
  if (!response.ok) {
    throw new Error('Slack API error: ' + (response.error || 'unknown'));
  }
}

function handleGeminiSubmitBrandReview_(payload) {
  if (!payload.lessonId || !payload.sourceText) {
    throw new Error('GEMINI_SUBMIT_BRAND_REVIEW missing lessonId/sourceText');
  }

  var operation = submitGeminiBatchJob_(payload.lessonId, payload.sourceText);
  appendRow(TAB_NAMES.GEMINI_JOBS, {
    GeminiJobID: generateId('GMJ'),
    OperationName: operation.name,
    LessonID: payload.lessonId,
    SourceText: payload.sourceText,
    Status: 'submitted',
    ResultJSON: '',
    Error: '',
    CreatedAt: nowIso(),
    UpdatedAt: nowIso()
  });

  enqueue('GEMINI_POLL_OPERATION', 'gemini_operation', operation.name, {
    operationName: operation.name,
    lessonId: payload.lessonId,
    channel: payload.channel || ''
  }, {
    priority: 5,
    notBefore: new Date(Date.now() + 15000).toISOString()
  });
}

function handleGeminiPollOperation_(payload) {
  if (!payload.operationName || !payload.lessonId) {
    throw new Error('GEMINI_POLL_OPERATION missing operationName/lessonId');
  }

  var operationBody = getGeminiOperation_(payload.operationName);
  if (!operationBody.done) {
    enqueue('GEMINI_POLL_OPERATION', 'gemini_operation', payload.operationName, payload, {
      priority: 5,
      notBefore: new Date(Date.now() + 30000).toISOString()
    });
    return;
  }

  if (operationBody.error) {
    recordGeminiJobResult_(payload.operationName, 'failed', null, String(operationBody.error));
    throw new Error('Gemini operation failed: ' + JSON.stringify(operationBody.error));
  }

  var structured = extractGeminiStructuredResult_(operationBody);
  var scoreResult = computeBrandComplianceScore(structured.flags || {});

  recordGeminiJobResult_(payload.operationName, 'completed', {
    structured: structured,
    score: scoreResult
  }, '');

  logAudit('gemini_brand_review_completed', 'system', 'queue', 'lesson', payload.lessonId, {
    operationName: payload.operationName,
    score: scoreResult.score,
    deductions: scoreResult.deductions
  }, payload.operationName);

  if (payload.channel) {
    enqueue('SEND_PROGRESS_SNAPSHOT', 'channel', payload.channel, {
      channel: payload.channel,
      text: 'Brand review complete for lesson `' + payload.lessonId + '`\nScore: *' + scoreResult.score + '*\nDeductions: ' + (scoreResult.deductions.join(', ') || 'none')
    }, { priority: 6 });
  }
}

function recordGeminiJobResult_(operationName, status, resultObj, errorText) {
  var rows = findRows(TAB_NAMES.GEMINI_JOBS, { OperationName: operationName });
  if (!rows.length) {
    appendRow(TAB_NAMES.GEMINI_JOBS, {
      GeminiJobID: generateId('GMJ'),
      OperationName: operationName,
      LessonID: '',
      SourceText: '',
      Status: status,
      ResultJSON: resultObj ? JSON.stringify(resultObj) : '',
      Error: errorText || '',
      CreatedAt: nowIso(),
      UpdatedAt: nowIso()
    });
    return;
  }

  updateRowById(TAB_NAMES.GEMINI_JOBS, 'GeminiJobID', rows[0].GeminiJobID, {
    Status: status,
    ResultJSON: resultObj ? JSON.stringify(resultObj) : '',
    Error: errorText || '',
    UpdatedAt: nowIso()
  });
}

function handleQueueFailure_(job, err) {
  var retry = Number(job.RetryCount || 0) + 1;
  var maxRetries = Number(job.MaxRetries || getRuntimeConfig().maxRetries);
  if (retry > maxRetries) {
    updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
      Status: QUEUE_STATUS.FAILED_PERMANENT,
      RetryCount: retry,
      LastError: String(err),
      UpdatedAt: nowIso()
    });
    logError('queue_failed_permanent', String(err), { jobId: job.JobID, jobType: job.JobType }, job.JobID);
    return;
  }

  var cfg = getRuntimeConfig();
  var delaySec = cfg.baseBackoffSeconds * Math.pow(2, retry - 1);
  var next = new Date(Date.now() + delaySec * 1000).toISOString();

  updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
    Status: QUEUE_STATUS.PENDING,
    RetryCount: retry,
    NotBefore: next,
    LastError: String(err),
    LockedBy: '',
    LockedAt: '',
    UpdatedAt: nowIso()
  });

  logError('queue_retry_scheduled', String(err), { jobId: job.JobID, retry: retry, next: next }, job.JobID);
}
