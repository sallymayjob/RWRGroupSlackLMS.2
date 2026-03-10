function handleInteractive(payload, correlationId) {
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
