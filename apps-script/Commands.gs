function handleSlashCommand(payload, correlationId) {
  switch (payload.command) {
    case '/progress':
      return handleProgressCommand_(payload, correlationId);
    case '/onboard':
      return handleOnboardCommand_(payload, correlationId);
    case '/resend':
      return handleResendCommand_(payload, correlationId);
    case '/admin':
      return handleAdminCommand_(payload, correlationId);
    case '/learn':
    case '/lesson':
      return handleLessonCommand_(payload, correlationId);
    case '/complete':
      return handleCompleteCommand_(payload, correlationId);
    case '/cohort':
      return handleCohortCommand_(payload, correlationId);
    default:
      return ackJson({ response_type: 'ephemeral', text: 'Command not implemented: ' + payload.command });
  }
}

function handleOnboardCommand_(payload, correlationId) {
  var auth = requireAdmin_(payload.user_id);
  if (!auth.ok) {
    return ackJson({ response_type: 'ephemeral', text: 'You are not authorized to onboard learners.' });
  }

  enqueue('PROCESS_ONBOARD_COMMAND', 'slash_command', payload.user_id, {
    actorSlackUserId: payload.user_id,
    text: payload.text || '',
    responseUrl: payload.response_url || '',
    correlationId: correlationId
  }, { priority: 4 });

  return ackJson({ response_type: 'ephemeral', text: 'Onboarding request queued.' });
}

function handleResendCommand_(payload, correlationId) {
  var auth = requireAdmin_(payload.user_id);
  if (!auth.ok) {
    return ackJson({ response_type: 'ephemeral', text: 'You are not authorized to resend lessons.' });
  }

  enqueue('PROCESS_RESEND_COMMAND', 'slash_command', payload.user_id, {
    actorSlackUserId: payload.user_id,
    text: payload.text || '',
    responseUrl: payload.response_url || '',
    correlationId: correlationId
  }, { priority: 4 });

  return ackJson({ response_type: 'ephemeral', text: 'Resend request queued.' });
}

function handleAdminCommand_(payload, correlationId) {
  var auth = requireAdmin_(payload.user_id);
  if (!auth.ok) {
    return ackJson({ response_type: 'ephemeral', text: 'You are not authorized to use /admin.' });
  }

  enqueue('PROCESS_ADMIN_COMMAND', 'slash_command', payload.user_id, {
    actorSlackUserId: payload.user_id,
    text: payload.text || '',
    responseUrl: payload.response_url || '',
    correlationId: correlationId
  }, { priority: 4 });

  return ackJson({ response_type: 'ephemeral', text: 'Admin command queued.' });
}

function handleLessonCommand_(payload, correlationId) {
  var user = getUserBySlackId_(payload.user_id);
  if (!user) {
    return ackJson({ response_type: 'ephemeral', text: 'User not found in LMS.' });
  }
  var enrollments = findRows(TAB_NAMES.ENROLLMENTS, { UserID: user.UserID, EnrollmentStatus: 'active' });
  if (!enrollments.length) {
    return ackJson({ response_type: 'ephemeral', text: 'No active enrollment.' });
  }
  var next = getNextEligibleProgress_(enrollments[0].EnrollmentID);
  if (!next) {
    return ackJson({ response_type: 'ephemeral', text: 'No lesson due right now.' });
  }
  var lessonRows = findRows(TAB_NAMES.LESSONS, { LessonID: next.LessonID });
  var title = lessonRows.length ? lessonRows[0].Title : next.LessonID;

  logAudit('lesson_lookup', 'learner', user.UserID, 'lesson', next.LessonID, {}, correlationId);
  return ackJson({ response_type: 'ephemeral', text: 'Next lesson: ' + title + ' (' + next.LessonID + ')' });
}

function handleCompleteCommand_(payload, correlationId) {
  enqueue('PROCESS_COMPLETE_COMMAND', 'slash_command', payload.user_id, {
    actorSlackUserId: payload.user_id,
    text: payload.text || '',
    responseUrl: payload.response_url || '',
    correlationId: correlationId
  }, { priority: 4 });

  return ackJson({ response_type: 'ephemeral', text: 'Completion request queued.' });
}

function handleCohortCommand_(payload, correlationId) {
  var auth = requireAdmin_(payload.user_id);
  if (!auth.ok) {
    return ackJson({ response_type: 'ephemeral', text: 'You are not authorized to use /cohort.' });
  }
  return ackJson({ response_type: 'ephemeral', text: '/cohort workflow queued for future expansion.' });
}

function handleProgressCommand_(payload, correlationId) {
  var slackUserId = payload.user_id;
  var user = getUserBySlackId_(slackUserId);

  if (!user) {
    return ackJson({
      response_type: 'ephemeral',
      text: 'You are not enrolled yet. Ask an admin to run /onboard.'
    });
  }

  var activeEnrollments = findRows(TAB_NAMES.ENROLLMENTS, {
    UserID: user.UserID,
    EnrollmentStatus: 'active'
  });
  if (!activeEnrollments.length) {
    return ackJson({
      response_type: 'ephemeral',
      text: 'No active enrollments found for your profile.'
    });
  }

  var enrollment = activeEnrollments[0];
  var rows = findRows(TAB_NAMES.PROGRESS, { EnrollmentID: enrollment.EnrollmentID });
  var completed = rows.filter(function (r) { return r.Status === 'completed'; }).length;
  var overdue = rows.filter(function (r) { return String(r.IsOverdue) === 'true' || r.Status === 'overdue'; }).length;
  var remaining = Math.max(rows.length - completed, 0);

  logAudit('progress_viewed', 'learner', user.UserID, 'enrollment', enrollment.EnrollmentID, {
    completed: completed,
    overdue: overdue,
    remaining: remaining
  }, correlationId);

  return ackJson({
    response_type: 'ephemeral',
    text: '*Your progress*\nCompleted: ' + completed + '\nRemaining: ' + remaining + '\nOverdue: ' + overdue
  });
}
