function handleSlashCommand(payload, correlationId) {
  switch (payload.command) {
    case '/progress':
      return handleProgressCommand_(payload, correlationId);
    case '/onboard':
    case '/admin':
    case '/cohort':
    case '/resend':
      return handleAdminCommandStub_(payload, correlationId);
    case '/learn':
    case '/lesson':
    case '/complete':
      return ackJson({
        response_type: 'ephemeral',
        text: 'Command is recognized but not implemented yet: ' + payload.command
      });
    default:
      return ackJson({
        response_type: 'ephemeral',
        text: 'Command not yet implemented: ' + payload.command
      });
  }
}

function handleAdminCommandStub_(payload, correlationId) {
  var auth = requireAdmin_(payload.user_id);
  if (!auth.ok) {
    logAudit('admin_command_denied', 'slack_user', payload.user_id, 'command', payload.command, {
      reason: auth.reason
    }, correlationId);
    return ackJson({
      response_type: 'ephemeral',
      text: 'You are not authorized to use ' + payload.command + '.'
    });
  }

  logAudit('admin_command_invoked', 'admin', auth.user.UserID, 'command', payload.command, {
    text: payload.text || ''
  }, correlationId);

  return ackJson({
    response_type: 'ephemeral',
    text: payload.command + ' is authorized but not implemented yet.'
  });
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
