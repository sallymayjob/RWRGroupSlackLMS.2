function handleSlashCommand(payload, correlationId) {
  switch (payload.command) {
    case '/progress':
      return handleProgressCommand_(payload, correlationId);
    default:
      return ackJson({
        response_type: 'ephemeral',
        text: 'Command not yet implemented: ' + payload.command
      });
  }
}

function handleProgressCommand_(payload, correlationId) {
  var slackUserId = payload.user_id;
  var users = findRows(TAB_NAMES.USERS, { SlackUserID: slackUserId, IsActive: true });

  if (!users.length) {
    return ackJson({
      response_type: 'ephemeral',
      text: 'You are not enrolled yet. Ask an admin to run /onboard.'
    });
  }

  var user = users[0];
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
