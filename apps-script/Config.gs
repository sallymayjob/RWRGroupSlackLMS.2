var TAB_NAMES = {
  USERS: 'Users',
  ENROLLMENTS: 'Enrollments',
  PROGRESS: 'Progress',
  DELIVERIES: 'Deliveries',
  QUEUE: 'Queue',
  AUDIT_LOG: 'Audit_Log',
  ERROR_LOG: 'Error_Log',
  SETTINGS: 'Settings',
  REQUEST_LOG: 'Request_Log'
};

var HEADERS = {};
HEADERS[TAB_NAMES.USERS] = [
  'UserID', 'SlackUserID', 'Email', 'FullName', 'Role', 'ManagerUserID', 'Timezone', 'IsActive', 'CreatedAt', 'UpdatedAt'
];
HEADERS[TAB_NAMES.ENROLLMENTS] = [
  'EnrollmentID', 'UserID', 'CohortID', 'TrackID', 'StartDate', 'AssignedAt', 'EnrollmentStatus', 'PauseReason', 'PausedAt', 'ResumedAt', 'CompletedAt'
];
HEADERS[TAB_NAMES.PROGRESS] = [
  'ProgressID', 'EnrollmentID', 'UserID', 'LessonID', 'Status', 'DueDate', 'CompletedAt', 'CompletionSource', 'Score', 'LastInteractionAt', 'IsOverdue'
];
HEADERS[TAB_NAMES.DELIVERIES] = [
  'DeliveryID', 'EnrollmentID', 'LessonID', 'SlackChannelID', 'SlackMessageTS', 'DeliveryType', 'DeliveryStatus', 'SentAt', 'RetryCount', 'ErrorCode', 'ErrorDetails'
];
HEADERS[TAB_NAMES.QUEUE] = [
  'JobID', 'JobType', 'EntityType', 'EntityID', 'PayloadJSON', 'Status', 'Priority', 'NotBefore', 'RetryCount', 'MaxRetries', 'LockedBy', 'LockedAt', 'LastError', 'CreatedAt', 'UpdatedAt'
];
HEADERS[TAB_NAMES.AUDIT_LOG] = [
  'AuditID', 'EventType', 'ActorType', 'ActorID', 'TargetType', 'TargetID', 'ChangeJSON', 'CorrelationID', 'CreatedAt'
];
HEADERS[TAB_NAMES.ERROR_LOG] = [
  'ErrorID', 'ErrorCode', 'Message', 'ContextJSON', 'CorrelationID', 'CreatedAt'
];
HEADERS[TAB_NAMES.SETTINGS] = [
  'SettingKey', 'SettingValue', 'ValueType', 'Scope', 'IsActive', 'UpdatedBy', 'UpdatedAt'
];
HEADERS[TAB_NAMES.REQUEST_LOG] = [
  'RequestID', 'RequestType', 'RequestHash', 'Status', 'CorrelationID', 'CreatedAt'
];

var QUEUE_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  DONE: 'done',
  FAILED_PERMANENT: 'failed_permanent'
};

var DEFAULTS = {
  MAX_RETRIES: 5,
  BASE_BACKOFF_SECONDS: 30,
  SLACK_REPLAY_WINDOW_SECONDS: 300,
  DUPLICATE_CACHE_SECONDS: 600
};

function getRuntimeConfig() {
  return {
    maxRetries: Number(getSetting('MAX_RETRIES', DEFAULTS.MAX_RETRIES)),
    baseBackoffSeconds: Number(getSetting('BASE_BACKOFF_SECONDS', DEFAULTS.BASE_BACKOFF_SECONDS)),
    replayWindowSeconds: Number(getSetting('SLACK_REPLAY_WINDOW_SECONDS', DEFAULTS.SLACK_REPLAY_WINDOW_SECONDS)),
    duplicateCacheSeconds: Number(getSetting('DUPLICATE_CACHE_SECONDS', DEFAULTS.DUPLICATE_CACHE_SECONDS))
  };
}
