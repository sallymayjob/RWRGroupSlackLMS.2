function pauseEnrollment_(enrollmentId, reason, adminSlackUserId, correlationId) {
  updateRowById(TAB_NAMES.ENROLLMENTS, 'EnrollmentID', enrollmentId, {
    EnrollmentStatus: 'paused',
    PauseReason: reason || 'manual_pause',
    PausedAt: nowIso()
  });

  appendRow(TAB_NAMES.ADMIN_ACTIONS, {
    AdminActionID: generateId('ADM'),
    AdminUserID: adminSlackUserId,
    ActionType: 'pause_enrollment',
    TargetType: 'enrollment',
    TargetID: enrollmentId,
    PayloadJSON: JSON.stringify({ reason: reason || '' }),
    CreatedAt: nowIso()
  });

  logAudit('enrollment_paused', 'admin', adminSlackUserId, 'enrollment', enrollmentId, { reason: reason || '' }, correlationId || '');
}

function resumeEnrollment_(enrollmentId, adminSlackUserId, correlationId) {
  updateRowById(TAB_NAMES.ENROLLMENTS, 'EnrollmentID', enrollmentId, {
    EnrollmentStatus: 'active',
    ResumedAt: nowIso(),
    PauseReason: ''
  });

  appendRow(TAB_NAMES.ADMIN_ACTIONS, {
    AdminActionID: generateId('ADM'),
    AdminUserID: adminSlackUserId,
    ActionType: 'resume_enrollment',
    TargetType: 'enrollment',
    TargetID: enrollmentId,
    PayloadJSON: '{}',
    CreatedAt: nowIso()
  });

  logAudit('enrollment_resumed', 'admin', adminSlackUserId, 'enrollment', enrollmentId, {}, correlationId || '');
}
