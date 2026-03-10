# Slack LMS + Onboarding + Content Factory Architecture

## 1) Executive Summary
This architecture uses **Slack as the learner UX**, **Google Sheets as the operational system of record**, **Google Apps Script as the backend orchestrator**, and **Gemini + Gem roles as the AI content factory**. It is designed for a small team that needs dependable onboarding/training automation without external infrastructure.

Why this stack fits:
- **Slack-native experience:** learners complete all training actions where they already work.
- **Sheets-first ops:** admins can control cohorts, tracks, schedules, templates, and approvals without code changes.
- **Apps Script orchestration:** native schedulers, Web App endpoints, and Google auth simplify operations.
- **Gemini + Gems:** reusable role-based workers produce lesson drafts, structure maps, QA passes, and publish-ready content artifacts.

Tradeoffs:
- Apps Script and Sheets have quota/performance ceilings.
- Concurrency and high-volume event handling require queueing + locking discipline.
- AI output still needs governance and human approvals.
- At larger scale, migration to stronger data + job infrastructure may be required.

---

## 2) System Architecture Overview
### Component interaction
1. **Learner/Admin in Slack**
   - Uses slash commands, shortcuts, interactive buttons, and modals.
2. **Slack App**
   - Receives events/interactivity.
   - Sends signed HTTP requests to Apps Script Web App.
3. **Apps Script Web App Endpoint (`doPost`)**
   - Verifies Slack signature.
   - Routes commands/events/actions.
   - Writes queue jobs and state updates to Sheets.
4. **Apps Script Time Triggers**
   - Run scheduled jobs: lesson drip, reminders, retry queue, dashboard refresh.
5. **Google Sheets LMS Database**
   - Canonical store for users, lessons, enrollments, progress, deliveries, reminders, approvals, content pipeline, QA, publish states.
6. **Gemini Layer**
   - Apps Script calls Gemini for generation/transformation/validation.
7. **Gem Role Architecture**
   - Sheet-defined role wrappers (Gem_Roles + Prompt_Configs) determine objective, format, constraints, and validator passes.
8. **Content Staging + Publishing**
   - Generated drafts → QA states → approval states → publishing sync into lesson-ready tabs.

Data plane:
- Slack events/actions → Apps Script → Queue/State tabs → Slack responses.

Content plane:
- Source_Content/Ideas → Gemini jobs → Generated_Drafts/QA_Results → Content_Approvals → Lessons/Lesson_Content.

---

## 3) Architecture Principles
1. Slack = learner experience layer.
2. Sheets = LMS control plane + system of record.
3. Apps Script = workflow orchestrator + integration runtime.
4. Gemini = generation/transformation engine.
5. Gems = reusable role-based workers.
6. Config over hardcoding (Settings, Workflow_Rules, Prompt_Configs).
7. Idempotent delivery (dedupe keys, status checks).
8. Fully auditable learner + content lifecycle.
9. Recoverable operations (queue retries, dead-letter states, manual replay).
10. Admin-simple operations (sheet-driven controls, minimal code edits).
11. Low-cost footprint (no external infra).

---

## 4) Core Modules
For each module: **Purpose | Inputs | Outputs | Dependencies | Error handling**

- **Slack App** | Slack surface config | user actions/events | signed requests and bot messages | Slack platform | retries to Apps Script endpoint.
- **Apps Script Webhook Endpoint** | ingress | HTTP POST from Slack | routed handler execution | Router/Auth/Queue | always ACK quickly; enqueue heavy work.
- **Slack Request Verifier** | security | headers + raw body | verified/denied request | Signing secret (PropertiesService) | log + reject invalid signatures/replays.
- **Event Router** | event dispatch | Events API payload | event handler call | Events.gs | dedupe by EventID.
- **Command Router** | slash dispatch | slash payload | command handler | Commands.gs | validate permissions + args.
- **Shortcut Router** | shortcut dispatch | shortcut payload | modal open/action | Modals.gs | fallback error modal.
- **Modal Builder** | UI forms | context + config | modal JSON | Templates/Config | schema validation.
- **Lesson Delivery Engine** | release lessons | schedule tick/manual command | deliveries + Slack DMs | Sheets/Slack/Queue | retry send failures.
- **Onboarding Engine** | registration/start | onboard command + form | user/enrollment/progress rows + welcome DM | Sheets/Slack | transactional-like write order.
- **Progress Engine** | state transitions | completion actions/check-ins | Progress + Deliveries updates | Sheets/Approvals | idempotent complete checks.
- **Reminder Engine** | nudges | overdue query + cadence rules | reminder sends + reminder logs | Workflow_Rules/Settings | suppress paused/completed.
- **Approval Engine** | checkoff workflows | milestone completion/manual request | approval tasks + outcome updates | Approvals/Slack | timeout + escalation.
- **Scheduler Engine** | timed orchestration | time triggers | queue job insertion | Queue/Settings | lock to avoid overlap.
- **Queue Processor** | async worker | Queue pending jobs | state changes + API calls | LockService + handlers | retries + dead-letter.
- **Sheets Data Access Layer** | structured I/O | entity reads/writes | normalized records | SpreadsheetApp | schema guards + typed mapping.
- **Config Service** | central config | Settings + Workflow_Rules | runtime config object | Sheets cache | defaults + versioning.
- **Notification Service** | message send abstraction | template + payload | Slack message result | Slack Web API | rate limit backoff.
- **Logging/Monitoring Service** | observability | events/errors | Audit_Log/Error_Log rows | Sheets + stack traces | structured error codes.
- **Gemini Service** | LLM calls | prompt + model params | structured output | Gemini API | timeout/retry and parse errors.
- **Gem Invocation Layer** | role wrapper | GemRoleID + input context | role-specific output | Gem_Roles + Prompt_Configs + Gemini | enforce output schema.
- **Content Pipeline Engine** | end-to-end content jobs | content requests | staged artifacts | pipeline tabs + Gemini | stage transitions with status locks.
- **Content Staging Manager** | artifact state | draft/qa/approval actions | updated pipeline states | Content_Pipeline | invalid transition blocking.
- **Content QA Engine** | automated review | generated drafts | QA_Results + verdict | validator gems | record per-validator outcomes.
- **Publishing Sync Engine** | publish final content | approved artifacts | Lessons/Lesson_Content sync | Publish_Queue | idempotent upsert by content key.

---

## 5) Slack App Design for LMS
### Recommended scopes
- `chat:write`, `chat:write.public`, `im:write`, `im:history` (optional for thread context)
- `commands`
- `users:read`, `users:read.email` (if needed for mapping)
- `channels:read`, `groups:read` (admin/channel routing)

### Event subscriptions
- `app_home_opened`
- `app_mention` (optional admin ops)
- `message.im` (if parsing learner free-text)
- `team_join` (optional onboarding seed)

### Slash commands
- `/learn` – show next lesson options.
- `/progress` – learner progress snapshot.
- `/lesson` – fetch current/next lesson.
- `/complete` – manual completion mark.
- `/onboard` – admin onboarding launch.
- `/admin` – admin menu.
- `/cohort` – cohort-level actions.
- `/resend` – resend lesson.

### Shortcuts
- Global: “Enroll learner”, “Pause/Resume learner”, “Run content pipeline step”.
- Message: “Create lesson from message”, “Send for QA”, “Generate reinforcement”.

### Interactivity and modals
- Interactivity endpoint -> Apps Script Web App URL.
- Modal actions: onboarding intake, reassignment, resend config, approval decisions.

### DM behavior
- Default learner communication channel = bot DM.
- Optional cohort channel announcements + DM deep links.

### Permissions
- Admin-only commands enforced via Users/Admin_Roles mapping.
- Sensitive actions (publish, override completion) require role checks and audit log entries.

---

## 6) Google Sheets Database Design
Tabs with purpose, key columns, PK, relations, sample row pattern:

1. **Users**: learner/admin identity registry. PK `UserID` (`USR-0001`). FK SlackUserID.
2. **Cohorts**: cohort metadata and schedules. PK `CohortID` (`COH-2025-09-A`).
3. **Tracks**: learning pathways. PK `TrackID` (`TRK-ONB-12D`).
4. **Lessons**: lesson index and sequencing. PK `LessonID` (`LES-TRK-001`). FK TrackID.
5. **Lesson_Content**: block-level lesson payloads for Slack composition. PK `LessonContentID`.
6. **Enrollments**: learner-track assignment + start state. PK `EnrollmentID`.
7. **Progress**: per learner per lesson status timeline. Composite key (`EnrollmentID+LessonID`).
8. **Deliveries**: send attempts and outcomes. PK `DeliveryID`.
9. **Reminders**: reminder events and cadence stage. PK `ReminderID`.
10. **Approvals**: manager/admin milestone approvals. PK `ApprovalID`.
11. **Message_Templates**: reusable Slack message layouts.
12. **Workflow_Rules**: cadence and release rules by track/cohort.
13. **Settings**: global runtime settings and feature flags.
14. **Audit_Log**: immutable action journal.
15. **Error_Log**: operational exceptions.
16. **Queue**: async job buffer.
17. **Admin_Actions**: manual actions catalog/history.
18. **Content_Ideas**: idea backlog.
19. **Source_Content**: source docs/snippets links.
20. **Prompt_Configs**: prompt templates/version controls.
21. **Gem_Roles**: role wrapper definitions and routing.
22. **Generated_Drafts**: generated outputs and metadata.
23. **QA_Results**: per-validator results and issues.
24. **Content_Pipeline**: stage machine per content artifact.
25. **Content_Approvals**: approval decisions for publish.
26. **Publish_Queue**: pending/processed publish jobs.

Operational notes:
- Keep one row per atomic event in Audit/Error/Deliveries/Reminders.
- Use immutable IDs and avoid overwriting history columns.
- Use status enums + timestamps for every lifecycle transition.

---

## 7) Recommended Column-Level Schema
### Users
`UserID, SlackUserID, Email, FullName, Role, ManagerUserID, Timezone, IsActive, CreatedAt, UpdatedAt`

### Lessons
`LessonID, TrackID, LessonSequence, ReleaseDay, Title, Objective, ContentRef, EstimatedMinutes, IsActive, Version`

### Enrollments
`EnrollmentID, UserID, CohortID, TrackID, StartDate, AssignedAt, EnrollmentStatus, PauseReason, PausedAt, ResumedAt, CompletedAt`

### Progress
`ProgressID, EnrollmentID, UserID, LessonID, Status, DueDate, CompletedAt, CompletionSource, Score, LastInteractionAt, IsOverdue`

### Deliveries
`DeliveryID, EnrollmentID, LessonID, SlackChannelID, SlackMessageTS, DeliveryType, DeliveryStatus, SentAt, RetryCount, ErrorCode, ErrorDetails`

### Queue
`JobID, JobType, EntityType, EntityID, PayloadJSON, Status, Priority, NotBefore, RetryCount, MaxRetries, LockedBy, LockedAt, LastError, CreatedAt, UpdatedAt`

### Audit_Log
`AuditID, EventType, ActorType, ActorID, TargetType, TargetID, ChangeJSON, CorrelationID, CreatedAt`

### Settings
`SettingKey, SettingValue, ValueType, Scope, IsActive, UpdatedBy, UpdatedAt`

### Content_Pipeline
`PipelineID, ContentIdeaID, SourceDocID, TrackID, TargetLessonID, ContentStage, StageStatus, CurrentOwnerRole, NextAction, LastRunAt, Blockers, ApprovedForPublish`

### Gem_Roles
`GemRoleID, GemRoleName, Purpose, PromptConfigID, InputSchemaJSON, OutputSchemaJSON, Temperature, MaxTokens, IsValidator, IsActive`

### Prompt_Configs
`PromptConfigID, PromptName, PromptVersion, SystemPrompt, UserTemplate, OutputFormat, ConstraintsJSON, EffectiveFrom, IsActive`

### QA_Results
`QAResultID, PipelineID, DraftID, ValidatorGemRoleID, QAStatus, Score, FindingsJSON, RecommendedFixes, RunAt`

### Generated_Drafts
`DraftID, PipelineID, GemRoleID, PromptVersion, InputSnapshotJSON, DraftOutputJSON, DraftText, TokenUsage, CostEstimate, GeneratedAt`

---

## 8) Apps Script Codebase Architecture
- `Code.gs`: entry points (`doPost`, trigger functions).
- `Config.gs`: load Settings/Workflow_Rules and cache.
- `Auth.gs`: Slack signature verification and replay checks.
- `Router.gs`: dispatch request type to handlers.
- `Slack.gs`: Slack Web API calls + retry handling.
- `Sheets.gs`: DAL helpers (get/upsert/query by keys).
- `LessonDelivery.gs`: eligibility, selection, compose/send.
- `Onboarding.gs`: user/enrollment initialization flows.
- `Progress.gs`: complete/check-in logic.
- `Reminders.gs`: cadence logic and sends.
- `Approvals.gs`: request/approve/reject workflows.
- `Commands.gs`: slash command handlers.
- `Events.gs`: event callbacks.
- `Modals.gs`: open/submit modal logic.
- `Queue.gs`: enqueue/dequeue/retry/dead-letter.
- `Scheduler.gs`: timed orchestrations.
- `Templates.gs`: message block templates.
- `Admin.gs`: admin actions and permissions.
- `Utils.gs`: common utilities (ID, dates, locks, enums).
- `Gemini.gs`: Gemini request abstraction.
- `Gems.gs`: role invocation wrapper.
- `ContentPipeline.gs`: stage machine orchestration.
- `QA.gs`: validator execution and scoring.
- `Publishing.gs`: publish sync into Lessons/Lesson_Content.

Stateless focus: routers, template rendering, and API wrappers.
State interactions: centralized through `Sheets.gs` to reduce schema drift.

---

## 9) Request and Workflow Flows
A. **New onboarding**
Learner/Admin → `/onboard` → Slack App → Apps Script Router → Onboarding Engine → Users/Enrollments/Progress rows → Welcome DM.

B. **Daily lesson release**
Trigger → Scheduler Engine → Lesson Delivery Engine → eligibility query → Deliveries insert + Slack DM → Audit log.

C. **Mark complete**
Learner button → interactivity payload → Progress Engine → update Progress/Deliveries → if milestone then Approvals → confirmation DM.

D. **View progress**
`/progress` → Command Router → aggregate Progress + Deliveries → templated summary response.

E. **Admin resend lesson**
`/resend` or shortcut → modal input → admin auth check → new delivery job → send + log reason.

F. **Overdue reminders**
Trigger → Reminder Engine → overdue query + cadence checks → send reminder/escalation → Reminders rows.

G. **Manager approval milestone**
Milestone event → Approval Engine → manager DM with Approve/Reject → Approvals update + learner notification.

H. **Cohort start**
Admin action → batch enroll cohort users → queue lesson day 1 sends by window.

I. **Pause/Resume**
Admin shortcut → Enrollments status update → suppression flags for reminders/releases.

J. **Completion cascade**
Completion update → next lesson eligibility recalc → optionally enqueue immediate next lesson.

K. **Gemini draft generation**
Pipeline job → Gem Invocation Layer (Content Agent) → Generated_Drafts write.

L. **Gem QA validation**
Pipeline job → run PED validators + QA Reviewer → QA_Results + Content_Pipeline stage update.

M. **Approval to publish**
Content approver action → Content_Approvals yes → Publish_Queue insertion → Publishing Sync upsert.

N. **CSV sync**
CSV Course Map Generator Gem → parsed rows → Lessons/Lesson_Content upsert + sync report.

---

## 10) Lesson Delivery Engine Design
### Eligibility logic
Eligible when:
- EnrollmentStatus = `active`
- Lesson not already `completed`
- Release rule satisfied:
  - daily drip: `today >= StartDate + ReleaseDay`
  - milestone: prior milestone approved/completed
  - schedule window: current local time inside allowed send window

### Next lesson selection
- Query Lessons by TrackID and ascending LessonSequence.
- Find first lesson with Progress status in (`not_started`,`active`,`overdue`) and no successful delivery for current cycle.

### Sent marking + duplicate prevention
- Before send: create deterministic dedupe key (`EnrollmentID|LessonID|DeliveryType|DateBucket`).
- Check Deliveries for existing success with same key.
- Send Slack DM, then update DeliveryStatus + SlackMessageTS.

### Failure + retry
- On API failure: mark delivery `failed`, increment retry, enqueue retry job with exponential backoff and max retries from Settings.
- Move to dead-letter after max retries; notify admin.

### Admin resend behavior
- Uses explicit `DeliveryType=admin_resend` and bypasses normal dedupe key but links original DeliveryID.
- Always audit actor + reason.

---

## 11) Progress Tracking Design
Statuses: `not_started`, `active`, `completed`, `overdue`, `paused`, `dropped`, `approved`.

Completion action updates:
1. Progress row `Status=completed`, `CompletedAt`.
2. Deliveries row linked completion metadata.
3. Approvals row creation if completion requires signoff.
4. Audit_Log append with actor/source.
5. Learner DM summary update and optional next lesson trigger.

Overdue calculation:
- daily job computes `DueDate < today AND Status in (not_started,active)`.

---

## 12) Reminder and Nudge Architecture
Cadence model in `Workflow_Rules`:
- `Reminder1DelayDays`
- `Reminder2DelayDays`
- `EscalationDelayDays`
- `EscalationTarget` (manager/admin)

Execution:
- Scheduler runs reminder job hourly/daily.
- For each overdue progress record:
  - skip if paused/completed/dropped.
  - consult Reminders history to determine next stage.
  - send proper template and log reminder record.

Suppression:
- Enrollment paused.
- Lesson completed after previous reminder.
- Track/cohort suppression flag in Settings.

---

## 13) Queue and Scheduler Design
Why queueing:
- Fast ACK to Slack.
- Avoid Apps Script execution limits.
- Smooth spikes and retries.

Queue structure:
- See Queue schema above with `JobType`, `PayloadJSON`, retry fields.

Job types:
- `SEND_LESSON`, `SEND_REMINDER`, `PROCESS_COMPLETION`, `RUN_QA`, `PUBLISH_CONTENT`, `RESEND_LESSON`, `SYNC_CSV`.

Retry strategy:
- Exponential backoff: `baseDelay * 2^RetryCount`.
- Dead-letter status `failed_permanent` with admin alert.

Locking:
- `LockService.getScriptLock()` around dequeue + critical writes.
- Per-entity lock keys for enrollment/lesson updates.

Slack retries/duplicates:
- Store request/event hash + timestamp in cache/sheet.
- Ignore duplicates within replay window.

Gemini jobs:
- Retry-safe due to immutable DraftID and stage transitions.

---

## 14) Security Architecture
- Verify Slack signatures (timestamp + body + HMAC signing secret).
- Reject stale requests (replay window, e.g., >5 min).
- Store bot token, signing secret, Gemini credentials in Script Properties.
- Least privilege Slack scopes only.
- Role-based admin controls in Users/Admin mapping.
- Spreadsheet ACL: editors limited to ops team; viewers for reporting tabs when needed.
- PII minimization: store only required identity fields.
- Audit every sensitive action (pause/resume, overrides, publish).

---

## 15) Reliability and Scalability
- Keep webhook responses fast; queue heavy work.
- Batch deliveries by cohort + send window.
- Use locks for concurrent writes.
- Prevent duplicate modal submissions with idempotency tokens.
- Archive old Deliveries/Audit logs periodically to archive sheets.
- Keep sheet formulas lightweight; use precomputed summary tabs.
- Manage Gemini latency by async jobs + partial batch size limits.
- Scale threshold: when concurrent cohorts and row counts exceed Sheets comfort zone, plan migration.

---

## 16) Admin Operating Model
Non-technical admin workflows:
1. Add/edit lessons in Lessons + Lesson_Content.
2. Update templates in Message_Templates.
3. Enroll learners via `/onboard` or Enrollments tab.
4. Start cohort by setting Cohorts `Status=active`.
5. Pause/resume via admin shortcut.
6. Resend via `/resend`.
7. Review Error_Log daily; replay failed queue jobs.
8. Tune reminder rules in Workflow_Rules.
9. Review AI drafts in Generated_Drafts.
10. Approve/reject in Content_Approvals.
11. Adjust prompt versions in Prompt_Configs.
12. Select Gem role execution via pipeline modal.

---

## 17) Reporting and Dashboard Design
Sheet dashboard tabs/views:
- Learner progress summary (by user).
- Cohort progress summary (% complete, overdue count).
- Lesson completion rates by lesson/track.
- Overdue learners queue.
- Onboarding milestone completion tracker.
- Reminder effectiveness (completion after reminder stage).
- Failed deliveries + retry aging.
- Daily activity (events, completions, sends).
- AI draft throughput (drafts/day by role).
- QA pass/fail rates by validator.
- Publish queue aging.
- Content bottlenecks by stage duration.

---

## 18) Sample Slack Message Patterns
- **Welcome DM**: greeting + track/cohort + start date + CTA button (`View First Lesson`).
- **Lesson release**: title, objective, 3–5 micro blocks, checklist, buttons (`Mark Complete`, `Need Help`).
- **Completion confirmation**: success state, next lesson timing, reinforcement tip.
- **Reminder**: concise overdue notice + due date + direct completion button.
- **Escalation/admin alert**: stalled learner summary + quick actions.
- **Approval request**: milestone details + Approve/Reject buttons + notes modal.
- **Progress summary**: completed/remaining, current streak, next due item.

---

## 19) Recommended File/Folder Structure
```
/apps-script
  Code.gs
  Config.gs
  Auth.gs
  Router.gs
  Slack.gs
  Sheets.gs
  LessonDelivery.gs
  Onboarding.gs
  Progress.gs
  Reminders.gs
  Approvals.gs
  Commands.gs
  Events.gs
  Modals.gs
  Queue.gs
  Scheduler.gs
  Templates.gs
  Admin.gs
  Utils.gs
  Gemini.gs
  Gems.gs
  ContentPipeline.gs
  QA.gs
  Publishing.gs
/docs
  architecture.md
  schema-reference.md
  deployment.md
  slack-manifest-sample.yaml
/prompts
  prompt-registry.json
  gem-role-definitions.json
/fixtures
  sample-slack-payloads.json
  sample-queue-rows.csv
  sample-content-pipeline.csv
```

---

## 20) MVP Build Plan
### Phase 1
- Slack app baseline, request verification, core sheets schema, learner registration, welcome flow.

### Phase 2
- Lesson delivery engine, progress tracking, completion interactions.

### Phase 3
- Reminders, approvals, admin controls (pause/resume/resend).

### Phase 4
- Gemini content pipeline, Gem role registry, QA validators, publishing sync.

### Phase 5
- Dashboards, queue recovery tooling, operational hardening.

### Phase 6
- Scale improvements, prompt governance, archive lifecycle, modular content ops.

---

## 21) Example Use Cases
- **12-day onboarding**: Track with ReleaseDay 0–11; daily DM + milestone approvals.
- **12-week training**: weekly release cadence rule + progress check-ins.
- **Monthly microlearning**: monthly scheduler + compact lesson blocks.
- **Cohort compliance**: cohort start date drives synchronized delivery and escalation rules.
- **Manager approvals**: milestone lessons create Approvals routed to manager.
- **AI monthly generation**: Content Agent + Map Agent produce monthly lesson pack drafts.
- **Structured QA**: PED validators must pass thresholds before publish.
- **Content map sync**: CSV generator roles feed Lessons/Lesson_Content through Publish_Queue.

---

## 22) Risks and Limitations
- Apps Script quotas/execution ceilings can throttle peak loads.
- Slack rate limits require batching/retry backoff.
- Spreadsheet growth can degrade query and formula performance.
- Concurrency constraints require careful locking.
- Gemini latency/cost may vary by volume and model.
- Prompt drift can reduce content consistency.
- Human QA remains required for accuracy and pedagogy.
- Maintenance threshold reached when row volume, concurrency, or compliance requirements outgrow Sheets.

---

## 23) Final Recommendation
This architecture is highly suitable for:
- small teams,
- pilot LMS programs,
- internal onboarding systems,
- AI-assisted content operations with moderate scale.

It is acceptable for medium training programs if queueing, archival, and operational discipline are enforced.

Replace/augment with stronger infrastructure when you hit sustained high concurrency, strict compliance constraints, or large data volumes that exceed Apps Script + Sheets operational comfort.

---

## Optional Implementation Artifacts
### A) Sample queue row
```json
{
  "JobID": "JOB-20260901-000123",
  "JobType": "SEND_LESSON",
  "EntityType": "Enrollment",
  "EntityID": "ENR-1209",
  "PayloadJSON": "{\"EnrollmentID\":\"ENR-1209\",\"LessonID\":\"LES-TRK-004\"}",
  "Status": "pending",
  "RetryCount": 0,
  "MaxRetries": 5,
  "NotBefore": "2026-09-01T14:00:00Z"
}
```

### B) Sample prompt registry format
```json
{
  "PromptConfigID": "PRM-CONTENT-001",
  "PromptName": "MicrolearningLessonDraft",
  "PromptVersion": "v3",
  "SystemPrompt": "You are a lesson author...",
  "UserTemplate": "Generate lesson JSON for topic: {{topic}}",
  "OutputFormat": "JSON_SCHEMA_V1"
}
```

### C) Sample Gem role definition
```json
{
  "GemRoleID": "GEM-PED-05",
  "GemRoleName": "PED-05 Sequencing Validator",
  "Purpose": "Validate pedagogical sequence and dependency order.",
  "PromptConfigID": "PRM-PED05-002",
  "IsValidator": true
}
```

### D) Sample lesson payload structure
```json
{
  "lesson": {
    "LessonID": "LES-TRK-004",
    "title": "Handling Customer Objections",
    "objective": "Apply a 3-step response framework",
    "blocks": [
      {"type": "text", "value": "Today you'll practice..."},
      {"type": "checklist", "items": ["Acknowledge", "Clarify", "Respond"]},
      {"type": "link", "url": "https://...", "label": "Reference Guide"}
    ],
    "actions": ["mark_complete", "need_help"]
  }
}
```
