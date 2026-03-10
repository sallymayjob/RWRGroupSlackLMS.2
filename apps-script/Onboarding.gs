function onboardLearnerBySlackUser_(slackUserId, trackId, cohortId, actorSlackUserId, correlationId) {
  var user = getUserBySlackId_(slackUserId);
  if (!user) {
    throw new Error('Unknown user for onboarding: ' + slackUserId);
  }

  var existing = findRows(TAB_NAMES.ENROLLMENTS, { UserID: user.UserID, TrackID: trackId, EnrollmentStatus: 'active' });
  if (existing.length) {
    return existing[0].EnrollmentID;
  }

  var enrollmentId = generateId('ENR');
  var now = nowIso();
  appendRow(TAB_NAMES.ENROLLMENTS, {
    EnrollmentID: enrollmentId,
    UserID: user.UserID,
    CohortID: cohortId || '',
    TrackID: trackId,
    StartDate: now,
    AssignedAt: now,
    EnrollmentStatus: 'active'
  });

  seedProgressForEnrollment_(enrollmentId, user.UserID, trackId, now);

  logAudit('learner_onboarded', 'admin', actorSlackUserId || '', 'enrollment', enrollmentId, {
    trackId: trackId,
    cohortId: cohortId || ''
  }, correlationId);

  return enrollmentId;
}

function seedProgressForEnrollment_(enrollmentId, userId, trackId, startDateIso) {
  var lessons = getAllRows(TAB_NAMES.LESSONS)
    .filter(function (l) { return l.TrackID === trackId && String(l.IsActive) !== 'false'; })
    .sort(function (a, b) { return Number(a.LessonSequence || 0) - Number(b.LessonSequence || 0); });

  lessons.forEach(function (lesson) {
    var due = new Date(startDateIso);
    due.setDate(due.getDate() + Number(lesson.ReleaseDay || 0));

    appendRow(TAB_NAMES.PROGRESS, {
      ProgressID: generateId('PRG'),
      EnrollmentID: enrollmentId,
      UserID: userId,
      LessonID: lesson.LessonID,
      Status: 'not_started',
      DueDate: due.toISOString(),
      IsOverdue: false,
      LastInteractionAt: nowIso()
    });
  });
}
