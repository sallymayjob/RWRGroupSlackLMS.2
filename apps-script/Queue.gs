function enqueue(jobType, entityType, entityId, payload, opts) {
  var options = opts || {};
  var cfg = getRuntimeConfig();
  var idempotencyKey = options.idempotencyKey || '';

  if (idempotencyKey && hasLiveQueueJob_(idempotencyKey)) {
    return;
  }

  appendRow(TAB_NAMES.QUEUE, {
    JobID: generateId('JOB'),
    JobType: jobType,
    EntityType: entityType || '',
    EntityID: entityId || '',
    IdempotencyKey: idempotencyKey,
    PayloadJSON: JSON.stringify(payload || {}),
    Status: QUEUE_STATUS.PENDING,
    Priority: options.priority || 5,
    NotBefore: options.notBefore || nowIso(),
    RetryCount: 0,
    MaxRetries: options.maxRetries || cfg.maxRetries,
    LockedBy: '',
    LockedAt: '',
    LastError: '',
    FirstAttemptAt: '',
    CompletedAt: '',
    NextRetryAt: '',
    RetryReason: '',
    CreatedAt: nowIso(),
    UpdatedAt: nowIso()
  });
}

function hasLiveQueueJob_(idempotencyKey) {
  var rows = findRows(TAB_NAMES.QUEUE, { IdempotencyKey: idempotencyKey });
  return rows.some(function (r) {
    return r.Status === QUEUE_STATUS.PENDING || r.Status === QUEUE_STATUS.PROCESSING;
  });
}

function processNextBatch(limit) {
  var maxItems = limit || 10;
  var claimedJobs = claimReadyQueueRows_(maxItems);
  claimedJobs.forEach(function (job) {
    runQueueJob_(job);
  });
}

function claimReadyQueueRows_(limit) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    reclaimStaleProcessingJobs_();
    var ready = getReadyQueueRows_(limit);
    ready.forEach(function (job) {
      claimJob_(job.JobID);
    });
    return ready;
  } finally {
    lock.releaseLock();
  }
}

function reclaimStaleProcessingJobs_() {
  var staleBefore = new Date(Date.now() - (10 * 60 * 1000));
  var rows = getAllRows(TAB_NAMES.QUEUE).filter(function (row) {
    return row.Status === QUEUE_STATUS.PROCESSING && row.LockedAt && new Date(row.LockedAt) < staleBefore;
  });

  rows.forEach(function (row) {
    updateRowById(TAB_NAMES.QUEUE, 'JobID', row.JobID, {
      Status: QUEUE_STATUS.PENDING,
      LockedBy: '',
      LockedAt: '',
      LastError: 'stale_lock_recovered',
      RetryReason: 'stale_lock_recovered',
      UpdatedAt: nowIso()
    });
    logError('queue_stale_lock_recovered', 'Recovered stale queue lock', { jobId: row.JobID }, row.JobID);
  });
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
    NextRetryAt: '',
    RetryReason: '',
    UpdatedAt: nowIso()
  });
}

function runQueueJob_(job) {
  if (!job.FirstAttemptAt) {
    updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
      FirstAttemptAt: nowIso(),
      UpdatedAt: nowIso()
    });
  }

  try {
    dispatchQueueJob_(job);
    updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
      Status: QUEUE_STATUS.DONE,
      CompletedAt: nowIso(),
      NextRetryAt: '',
      RetryReason: '',
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
    case 'SEND_LESSON':
      sendLessonDelivery_(payload);
      return;
    case 'SEND_REMINDER':
      sendReminder_(payload);
      return;
    case 'PROCESS_ONBOARD_COMMAND':
      processOnboardCommandJob_(payload);
      return;
    case 'PROCESS_RESEND_COMMAND':
      processResendCommandJob_(payload);
      return;
    case 'PROCESS_ADMIN_COMMAND':
      processAdminCommandJob_(payload);
      return;
    case 'PROCESS_COMPLETE_COMMAND':
      processCompleteCommandJob_(payload);
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
    if (response.retryable) {
      throw new Error('SLACK_RETRYABLE:' + String(response.retryAfterSec || 0) + ':' + (response.error || 'unknown'));
    }
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
    channel: payload.channel || '',
    pollAttempt: 0
  }, {
    priority: 5,
    notBefore: new Date(Date.now() + 15000).toISOString(),
    idempotencyKey: 'gemini_poll:' + operation.name + ':0'
  });
}

function handleGeminiPollOperation_(payload) {
  if (!payload.operationName || !payload.lessonId) {
    throw new Error('GEMINI_POLL_OPERATION missing operationName/lessonId');
  }

  var cfg = getRuntimeConfig();
  var pollAttempt = Number(payload.pollAttempt || 0);
  if (pollAttempt >= cfg.geminiMaxPollAttempts) {
    recordGeminiJobResult_(payload.operationName, 'failed', null, 'max_poll_attempts_exceeded');
    logError('gemini_poll_timeout', 'Gemini operation did not complete before max poll attempts', {
      operationName: payload.operationName,
      lessonId: payload.lessonId,
      pollAttempt: pollAttempt
    }, payload.operationName);
    return;
  }

  var operationBody = getGeminiOperation_(payload.operationName);
  if (!operationBody.done) {
    enqueue('GEMINI_POLL_OPERATION', 'gemini_operation', payload.operationName, {
      operationName: payload.operationName,
      lessonId: payload.lessonId,
      channel: payload.channel || '',
      pollAttempt: pollAttempt + 1
    }, {
      priority: 5,
      notBefore: new Date(Date.now() + (cfg.geminiPollIntervalSeconds * 1000)).toISOString(),
      idempotencyKey: 'gemini_poll:' + payload.operationName + ':' + String(pollAttempt + 1)
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
    }, { priority: 6, idempotencyKey: 'brand_review_notice:' + payload.operationName });
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
      CompletedAt: nowIso(),
      UpdatedAt: nowIso()
    });
    logError('queue_failed_permanent', String(err), { jobId: job.JobID, jobType: job.JobType }, job.JobID);
    return;
  }

  var cfg = getRuntimeConfig();
  var delaySec = cfg.baseBackoffSeconds * Math.pow(2, retry - 1);
  var m = String(err).match(/SLACK_RETRYABLE:(\d+):/);
  if (m) {
    var retryAfter = Number(m[1] || 0);
    if (retryAfter > delaySec) {
      delaySec = retryAfter;
    }
  }
  var next = new Date(Date.now() + delaySec * 1000).toISOString();

  updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
    Status: QUEUE_STATUS.PENDING,
    RetryCount: retry,
    NotBefore: next,
    LastError: String(err),
    CompletedAt: '',
    NextRetryAt: next,
    RetryReason: String(err),
    LockedBy: '',
    LockedAt: '',
    UpdatedAt: nowIso()
  });

  logError('queue_retry_scheduled', String(err), { jobId: job.JobID, retry: retry, next: next }, job.JobID);
}
