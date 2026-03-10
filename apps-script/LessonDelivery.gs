function enqueueDueLessons_(correlationId) {
  var enrollments = getAllRows(TAB_NAMES.ENROLLMENTS)
    .filter(function (e) { return e.EnrollmentStatus === 'active'; });

  enrollments.forEach(function (enrollment) {
    var next = getNextEligibleProgress_(enrollment.EnrollmentID);
    if (!next) {
      return;
    }

    enqueue('SEND_LESSON', 'enrollment', enrollment.EnrollmentID, {
      enrollmentId: enrollment.EnrollmentID,
      lessonId: next.LessonID,
      progressId: next.ProgressID
    }, {
      priority: 4,
      idempotencyKey: 'send_lesson:' + enrollment.EnrollmentID + ':' + next.LessonID
    });
  });

  logAudit('due_lessons_enqueued', 'system', 'scheduler', 'enrollments', String(enrollments.length), {}, correlationId || '');
}

function getNextEligibleProgress_(enrollmentId) {
  var now = new Date();
  var rows = getAllRows(TAB_NAMES.PROGRESS)
    .filter(function (p) {
      return p.EnrollmentID === enrollmentId && p.Status !== 'completed' && new Date(p.DueDate) <= now;
    })
    .sort(function (a, b) { return new Date(a.DueDate) - new Date(b.DueDate); });

  if (!rows.length) {
    return null;
  }

  var candidate = rows[0];
  var sent = findRows(TAB_NAMES.DELIVERIES, {
    EnrollmentID: enrollmentId,
    LessonID: candidate.LessonID,
    DeliveryType: 'scheduled',
    DeliveryStatus: 'sent'
  });
  return sent.length ? null : candidate;
}

function sendLessonDelivery_(payload) {
  var enrollmentRows = findRows(TAB_NAMES.ENROLLMENTS, { EnrollmentID: payload.enrollmentId });
  if (!enrollmentRows.length) {
    throw new Error('Missing enrollment for SEND_LESSON');
  }
  var enrollment = enrollmentRows[0];

  var userRows = findRows(TAB_NAMES.USERS, { UserID: enrollment.UserID, IsActive: true });
  if (!userRows.length) {
    throw new Error('Missing user for enrollment ' + payload.enrollmentId);
  }
  var user = userRows[0];

  var lessonRows = findRows(TAB_NAMES.LESSONS, { LessonID: payload.lessonId });
  if (!lessonRows.length) {
    throw new Error('Missing lesson ' + payload.lessonId);
  }
  var lesson = lessonRows[0];

  var msg = '*Lesson ' + lesson.LessonSequence + ':* ' + lesson.Title + '\n' + (lesson.Objective || '');
  var response = postSlackMessage(user.SlackUserID, msg, buildLessonBlocks_(lesson, payload.progressId));
  if (!response.ok) {
    if (response.retryable) {
      throw new Error('SLACK_RETRYABLE:' + String(response.retryAfterSec || 0) + ':' + (response.error || 'unknown'));
    }
    throw new Error('Slack send lesson failed: ' + (response.error || 'unknown'));
  }

  appendRow(TAB_NAMES.DELIVERIES, {
    DeliveryID: generateId('DLV'),
    EnrollmentID: enrollment.EnrollmentID,
    LessonID: lesson.LessonID,
    SlackChannelID: user.SlackUserID,
    SlackMessageTS: response.ts || '',
    DeliveryType: 'scheduled',
    DeliveryStatus: 'sent',
    SentAt: nowIso(),
    RetryCount: 0
  });
}
