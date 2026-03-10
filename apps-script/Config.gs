var TAB_NAMES = {
  USERS: 'Users',
  COHORTS: 'Cohorts',
  TRACKS: 'Tracks',
  LESSONS: 'Lessons',
  LESSON_CONTENT: 'Lesson_Content',
  ENROLLMENTS: 'Enrollments',
  PROGRESS: 'Progress',
  DELIVERIES: 'Deliveries',
  REMINDERS: 'Reminders',
  APPROVALS: 'Approvals',
  MESSAGE_TEMPLATES: 'Message_Templates',
  WORKFLOW_RULES: 'Workflow_Rules',
  SETTINGS: 'Settings',
  AUDIT_LOG: 'Audit_Log',
  ERROR_LOG: 'Error_Log',
  QUEUE: 'Queue',
  ADMIN_ACTIONS: 'Admin_Actions',
  CONTENT_PIPELINE: 'Content_Pipeline',
  PROMPT_CONFIGS: 'Prompt_Configs',
  GEM_ROLES: 'Gem_Roles',
  QA_RESULTS: 'QA_Results',
  PUBLISH_QUEUE: 'Publish_Queue',
  GENERATED_DRAFTS: 'Generated_Drafts',
  REQUEST_LOG: 'Request_Log',
  GEMINI_JOBS: 'Gemini_Jobs',
  SCHEMA_METADATA: 'Schema_Metadata'
};

var HEADERS = {};
HEADERS[TAB_NAMES.USERS] = ['UserID','SlackUserID','Email','FullName','Role','ManagerUserID','Timezone','IsActive','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.COHORTS] = ['CohortID','CohortName','TrackID','StartDate','EndDate','Status','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.TRACKS] = ['TrackID','TrackName','CadenceType','CadenceValue','IsActive','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.LESSONS] = ['LessonID','TrackID','LessonSequence','ReleaseDay','Title','Objective','EstimatedMinutes','RequiresApproval','IsActive','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.LESSON_CONTENT] = ['LessonContentID','LessonID','BlockOrder','BlockType','BlockText','BlockJSON','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.ENROLLMENTS] = ['EnrollmentID','UserID','CohortID','TrackID','StartDate','AssignedAt','EnrollmentStatus','PauseReason','PausedAt','ResumedAt','CompletedAt'];
HEADERS[TAB_NAMES.PROGRESS] = ['ProgressID','EnrollmentID','UserID','LessonID','Status','DueDate','CompletedAt','CompletionSource','Score','LastInteractionAt','IsOverdue'];
HEADERS[TAB_NAMES.DELIVERIES] = ['DeliveryID','EnrollmentID','LessonID','SlackChannelID','SlackMessageTS','DeliveryType','DeliveryStatus','SentAt','RetryCount','ErrorCode','ErrorDetails'];
HEADERS[TAB_NAMES.REMINDERS] = ['ReminderID','EnrollmentID','LessonID','ReminderStage','SentAt','DeliveryStatus','CreatedAt'];
HEADERS[TAB_NAMES.APPROVALS] = ['ApprovalID','EnrollmentID','LessonID','ApproverUserID','ApprovalStatus','RequestedAt','DecidedAt','Notes'];
HEADERS[TAB_NAMES.MESSAGE_TEMPLATES] = ['TemplateID','TemplateKey','TemplateText','TemplateBlocksJSON','IsActive','UpdatedAt'];
HEADERS[TAB_NAMES.WORKFLOW_RULES] = ['RuleID','ScopeType','ScopeID','RuleKey','RuleValue','IsActive','UpdatedAt'];
HEADERS[TAB_NAMES.SETTINGS] = ['SettingKey','SettingValue','ValueType','Scope','IsActive','UpdatedBy','UpdatedAt'];
HEADERS[TAB_NAMES.AUDIT_LOG] = ['AuditID','EventType','ActorType','ActorID','TargetType','TargetID','ChangeJSON','CorrelationID','CreatedAt'];
HEADERS[TAB_NAMES.ERROR_LOG] = ['ErrorID','ErrorCode','Message','ContextJSON','CorrelationID','CreatedAt'];
HEADERS[TAB_NAMES.QUEUE] = ['JobID','JobType','EntityType','EntityID','IdempotencyKey','PayloadJSON','Status','Priority','NotBefore','RetryCount','MaxRetries','LockedBy','LockedAt','LastError','FirstAttemptAt','CompletedAt','NextRetryAt','RetryReason','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.ADMIN_ACTIONS] = ['AdminActionID','AdminUserID','ActionType','TargetType','TargetID','PayloadJSON','CreatedAt'];
HEADERS[TAB_NAMES.CONTENT_PIPELINE] = ['PipelineID','TrackID','TargetLessonID','ContentStage','StageStatus','OwnerRole','SourceRef','UpdatedAt'];
HEADERS[TAB_NAMES.PROMPT_CONFIGS] = ['PromptConfigID','PromptName','PromptVersion','SystemPrompt','UserTemplate','OutputFormat','IsActive','UpdatedAt'];
HEADERS[TAB_NAMES.GEM_ROLES] = ['GemRoleID','GemRoleName','Purpose','PromptConfigID','InputSchemaJSON','OutputSchemaJSON','IsValidator','IsActive'];
HEADERS[TAB_NAMES.QA_RESULTS] = ['QAResultID','PipelineID','DraftID','ValidatorGemRoleID','QAStatus','Score','FindingsJSON','RunAt'];
HEADERS[TAB_NAMES.PUBLISH_QUEUE] = ['PublishID','PipelineID','TargetLessonID','PublishStatus','RequestedAt','PublishedAt','Error'];
HEADERS[TAB_NAMES.GENERATED_DRAFTS] = ['DraftID','PipelineID','GemRoleID','PromptVersion','InputSnapshotJSON','DraftOutputJSON','GeneratedAt'];
HEADERS[TAB_NAMES.REQUEST_LOG] = ['RequestID','RequestType','RequestHash','Status','AttemptCount','CorrelationID','LastError','LastSeenAt','CreatedAt'];
HEADERS[TAB_NAMES.GEMINI_JOBS] = ['GeminiJobID','OperationName','LessonID','SourceText','Status','ResultJSON','Error','CreatedAt','UpdatedAt'];
HEADERS[TAB_NAMES.SCHEMA_METADATA] = ['SchemaVersion','TabName','PrimaryKey','StatusColumns','RequiredColumnsJSON','UpdatedAt'];

var STATUS_ENUMS = {
  EnrollmentStatus: ['active','paused','completed','cancelled'],
  ProgressStatus: ['not_started','in_progress','completed','overdue'],
  DeliveryStatus: ['queued','sent','failed','skipped'],
  ReminderStatus: ['sent','failed','skipped'],
  ApprovalStatus: ['pending','approved','rejected']
};

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
  DUPLICATE_CACHE_SECONDS: 600,
  GEMINI_MODEL: 'gemini-2.0-flash',
  GEMINI_API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta',
  GEMINI_MAX_POLL_ATTEMPTS: 20,
  GEMINI_POLL_INTERVAL_SECONDS: 30,
  DAILY_SEND_HOUR_LOCAL: 9
};

function getRuntimeConfig() {
  return {
    maxRetries: Number(getSetting('MAX_RETRIES', DEFAULTS.MAX_RETRIES)),
    baseBackoffSeconds: Number(getSetting('BASE_BACKOFF_SECONDS', DEFAULTS.BASE_BACKOFF_SECONDS)),
    replayWindowSeconds: Number(getSetting('SLACK_REPLAY_WINDOW_SECONDS', DEFAULTS.SLACK_REPLAY_WINDOW_SECONDS)),
    duplicateCacheSeconds: Number(getSetting('DUPLICATE_CACHE_SECONDS', DEFAULTS.DUPLICATE_CACHE_SECONDS)),
    geminiModel: getSetting('GEMINI_MODEL', DEFAULTS.GEMINI_MODEL),
    geminiApiBaseUrl: getSetting('GEMINI_API_BASE_URL', DEFAULTS.GEMINI_API_BASE_URL),
    geminiMaxPollAttempts: Number(getSetting('GEMINI_MAX_POLL_ATTEMPTS', DEFAULTS.GEMINI_MAX_POLL_ATTEMPTS)),
    geminiPollIntervalSeconds: Number(getSetting('GEMINI_POLL_INTERVAL_SECONDS', DEFAULTS.GEMINI_POLL_INTERVAL_SECONDS)),
    dailySendHourLocal: Number(getSetting('DAILY_SEND_HOUR_LOCAL', DEFAULTS.DAILY_SEND_HOUR_LOCAL))
  };
}
