function validateRowForTab_(tabName, rowObject) {
  if (!rowObject) {
    return;
  }

  if (tabName === TAB_NAMES.ENROLLMENTS && rowObject.EnrollmentStatus !== undefined) {
    assertEnumValue_('EnrollmentStatus', rowObject.EnrollmentStatus, STATUS_ENUMS.EnrollmentStatus);
  }

  if (tabName === TAB_NAMES.PROGRESS && rowObject.Status !== undefined) {
    assertEnumValue_('ProgressStatus', rowObject.Status, STATUS_ENUMS.ProgressStatus);
  }

  if (tabName === TAB_NAMES.DELIVERIES && rowObject.DeliveryStatus !== undefined) {
    assertEnumValue_('DeliveryStatus', rowObject.DeliveryStatus, STATUS_ENUMS.DeliveryStatus);
  }

  if (tabName === TAB_NAMES.REMINDERS && rowObject.DeliveryStatus !== undefined) {
    assertEnumValue_('ReminderStatus', rowObject.DeliveryStatus, STATUS_ENUMS.ReminderStatus);
  }

  if (tabName === TAB_NAMES.APPROVALS && rowObject.ApprovalStatus !== undefined) {
    assertEnumValue_('ApprovalStatus', rowObject.ApprovalStatus, STATUS_ENUMS.ApprovalStatus);
  }
}

function assertEnumValue_(fieldName, value, allowed) {
  var v = String(value);
  var ok = allowed.some(function (a) { return a === v; });
  if (!ok) {
    throw new Error('Invalid ' + fieldName + ' value: ' + v + ' (allowed: ' + allowed.join(', ') + ')');
  }
}

function seedSchemaMetadata() {
  var now = nowIso();
  var tabs = [
    { tabName: TAB_NAMES.ENROLLMENTS, pk: 'EnrollmentID', statusCols: 'EnrollmentStatus' },
    { tabName: TAB_NAMES.PROGRESS, pk: 'ProgressID', statusCols: 'Status' },
    { tabName: TAB_NAMES.DELIVERIES, pk: 'DeliveryID', statusCols: 'DeliveryStatus' },
    { tabName: TAB_NAMES.REMINDERS, pk: 'ReminderID', statusCols: 'DeliveryStatus' },
    { tabName: TAB_NAMES.APPROVALS, pk: 'ApprovalID', statusCols: 'ApprovalStatus' },
    { tabName: TAB_NAMES.QUEUE, pk: 'JobID', statusCols: 'Status' }
  ];

  tabs.forEach(function (entry) {
    var existing = findRows(TAB_NAMES.SCHEMA_METADATA, { TabName: entry.tabName });
    var row = {
      SchemaVersion: '1',
      TabName: entry.tabName,
      PrimaryKey: entry.pk,
      StatusColumns: entry.statusCols,
      RequiredColumnsJSON: JSON.stringify(HEADERS[entry.tabName] || []),
      UpdatedAt: now
    };

    if (!existing.length) {
      appendRow(TAB_NAMES.SCHEMA_METADATA, row);
    }
  });
}
