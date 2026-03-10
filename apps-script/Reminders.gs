function enqueueOverdueReminders_(correlationId) {
  var now = new Date();
  var cooldownMs = 24 * 60 * 60 * 1000;
  var overdue = getAllRows(TAB_NAMES.PROGRESS)
    .filter(function (p) {
      return p.Status !== 'completed' && new Date(p.DueDate) < now;
    });

  overdue.forEach(function (p) {
    var recent = findRows(TAB_NAMES.REMINDERS, {
      EnrollmentID: p.EnrollmentID,
      LessonID: p.LessonID,
      DeliveryStatus: 'sent'
    }).some(function (r) {
      return r.SentAt && (now.getTime() - new Date(r.SentAt).getTime()) < cooldownMs;
    });

    if (recent) {
      return;
    }

    enqueue('SEND_REMINDER', 'progress', p.ProgressID, { progressId: p.ProgressID }, {
      priority: 7,
      idempotencyKey: 'send_reminder:' + p.ProgressID + ':' + now.toISOString().slice(0, 10)
    });
  });

  logAudit('overdue_reminders_enqueued', 'system', 'scheduler', 'progress', String(overdue.length), {}, correlationId || '');
}

function sendReminder_(payload) {
  var progressRows = findRows(TAB_NAMES.PROGRESS, { ProgressID: payload.progressId });
  if (!progressRows.length) {
    return;
  }
  var progress = progressRows[0];

  var enrollmentRows = findRows(TAB_NAMES.ENROLLMENTS, { EnrollmentID: progress.EnrollmentID });
  if (!enrollmentRows.length || enrollmentRows[0].EnrollmentStatus !== 'active') {
    return;
  }

  var userRows = findRows(TAB_NAMES.USERS, { UserID: progress.UserID, IsActive: true });
  if (!userRows.length) {
    return;
  }
  var user = userRows[0];

  var response = postSlackMessage(user.SlackUserID, 'Reminder: you have an overdue lesson to complete.', []);
  if (!response.ok && response.retryable) {
    throw new Error('SLACK_RETRYABLE:' + String(response.retryAfterSec || 0) + ':' + (response.error || 'unknown'));
  }
  appendRow(TAB_NAMES.REMINDERS, {
    ReminderID: generateId('RMD'),
    EnrollmentID: progress.EnrollmentID,
    LessonID: progress.LessonID,
    ReminderStage: 'reminder_1',
    SentAt: nowIso(),
    DeliveryStatus: response.ok ? 'sent' : 'failed',
    CreatedAt: nowIso()
  });
}
