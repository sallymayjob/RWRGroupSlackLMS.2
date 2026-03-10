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
    // Placeholder for job handlers.
    updateRowById(TAB_NAMES.QUEUE, 'JobID', job.JobID, {
      Status: QUEUE_STATUS.DONE,
      UpdatedAt: nowIso()
    });
    logAudit('queue_job_done', 'system', 'queue', job.EntityType, job.EntityID, { jobType: job.JobType }, job.JobID);
  } catch (err) {
    handleQueueFailure_(job, err);
  }
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
