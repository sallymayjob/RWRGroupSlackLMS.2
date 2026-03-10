function processOnboardCommandJob_(payload) {
  var parts = (payload.text || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    postToResponseUrl(payload.responseUrl, 'Usage: /onboard <@user_or_slackId> <TrackID> [CohortID]');
    return;
  }

  var targetSlack = parts[0].replace(/[<@>]/g, '');
  var trackId = parts[1];
  var cohortId = parts[2] || '';

  var enrollmentId = onboardLearnerBySlackUser_(targetSlack, trackId, cohortId, payload.actorSlackUserId, payload.correlationId || '');
  postToResponseUrl(payload.responseUrl, 'Onboarded learner. EnrollmentID: ' + enrollmentId);
}

function processResendCommandJob_(payload) {
  var parts = (payload.text || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length < 2) {
    postToResponseUrl(payload.responseUrl, 'Usage: /resend <EnrollmentID> <LessonID>');
    return;
  }

  enqueue('SEND_LESSON', 'enrollment', parts[0], {
    enrollmentId: parts[0],
    lessonId: parts[1],
    progressId: ''
  }, { priority: 3 });

  postToResponseUrl(payload.responseUrl, 'Resend queued for EnrollmentID=' + parts[0] + ', LessonID=' + parts[1]);
}

function processAdminCommandJob_(payload) {
  var parts = (payload.text || '').trim().split(/\s+/).filter(Boolean);

  if (parts[0] === 'pause' && parts[1]) {
    pauseEnrollment_(parts[1], parts.slice(2).join(' ') || 'manual_pause', payload.actorSlackUserId, payload.correlationId || '');
    postToResponseUrl(payload.responseUrl, 'Enrollment paused: ' + parts[1]);
    return;
  }

  if (parts[0] === 'resume' && parts[1]) {
    resumeEnrollment_(parts[1], payload.actorSlackUserId, payload.correlationId || '');
    postToResponseUrl(payload.responseUrl, 'Enrollment resumed: ' + parts[1]);
    return;
  }

  postToResponseUrl(payload.responseUrl, 'Admin commands: /admin pause <EnrollmentID> [reason], /admin resume <EnrollmentID>');
}

function processCompleteCommandJob_(payload) {
  var user = getUserBySlackId_(payload.actorSlackUserId);
  if (!user) {
    postToResponseUrl(payload.responseUrl, 'User not found in LMS.');
    return;
  }

  var lessonId = (payload.text || '').trim();
  if (!lessonId) {
    postToResponseUrl(payload.responseUrl, 'Usage: /complete <LessonID>');
    return;
  }

  var rows = getAllRows(TAB_NAMES.PROGRESS).filter(function (p) {
    return p.UserID === user.UserID && p.LessonID === lessonId;
  });
  if (!rows.length) {
    postToResponseUrl(payload.responseUrl, 'No progress row found for lesson.');
    return;
  }

  updateRowById(TAB_NAMES.PROGRESS, 'ProgressID', rows[0].ProgressID, {
    Status: 'completed',
    CompletedAt: nowIso(),
    CompletionSource: 'slash_command',
    LastInteractionAt: nowIso(),
    IsOverdue: false
  });

  logAudit('lesson_completed', 'learner', user.UserID, 'lesson', lessonId, { source: 'slash_command' }, payload.correlationId || '');
  postToResponseUrl(payload.responseUrl, 'Marked complete: ' + lessonId);
}
