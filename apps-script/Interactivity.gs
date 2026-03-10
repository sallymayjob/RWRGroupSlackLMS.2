function handleInteractive(payload, correlationId) {
  var type = payload.type || '';

  if (type === 'block_actions') {
    return handleBlockActions_(payload, correlationId);
  }

  if (type === 'shortcut' || type === 'message_action') {
    logAudit('shortcut_received', 'slack_user', payload.user && payload.user.id, 'shortcut', payload.callback_id || '', {}, correlationId);
    return ackJson({ text: 'Shortcut received. Modal workflows are not yet fully implemented.' });
  }

  if (type === 'view_submission') {
    logAudit('modal_submission_received', 'slack_user', payload.user && payload.user.id, 'modal', payload.view && payload.view.callback_id, {}, correlationId);
    return ackJson({ response_action: 'clear' });
  }

  return ackJson({ text: 'Unsupported interactivity type: ' + type });
}

function handleBlockActions_(payload, correlationId) {
  var action = (payload.actions && payload.actions[0]) ? payload.actions[0] : null;
  if (!action) {
    return ackJson({ text: 'No interactive action supplied.' });
  }

  if (action.action_id === 'mark_complete') {
    return handleMarkCompleteAction_(payload, action, correlationId);
  }

  return ackJson({ text: 'Action not implemented: ' + action.action_id });
}

function handleMarkCompleteAction_(payload, action, correlationId) {
  var value = safeJsonParse(action.value || '{}', {});
  var progressId = value.ProgressID;
  if (!progressId) {
    return ackJson({ text: 'Missing ProgressID for completion.' });
  }

  var rows = findRows(TAB_NAMES.PROGRESS, { ProgressID: progressId });
  if (!rows.length) {
    return ackJson({ text: 'Progress record not found.' });
  }

  var row = rows[0];

  var actingSlackUser = payload.user && payload.user.id ? payload.user.id : '';
  var progressUser = findRows(TAB_NAMES.USERS, { UserID: row.UserID, IsActive: true });
  if (!progressUser.length || progressUser[0].SlackUserID !== actingSlackUser) {
    return ackJson({ text: 'You are not allowed to complete this lesson.' });
  }

  if (row.Status === 'completed') {
    return ackJson({ text: 'This lesson is already completed ✅' });
  }

  updateRowById(TAB_NAMES.PROGRESS, 'ProgressID', progressId, {
    Status: 'completed',
    CompletedAt: nowIso(),
    CompletionSource: 'slack_button',
    LastInteractionAt: nowIso(),
    IsOverdue: false
  });

  logAudit('lesson_completed', 'learner', payload.user && payload.user.id, 'progress', progressId, {
    source: 'mark_complete_button'
  }, correlationId);

  return ackJson({ text: 'Marked complete ✅' });
}
