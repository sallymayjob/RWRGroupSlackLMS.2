# Apps Script Starter

This folder contains the initial implementation skeleton for the Slack LMS backend.

## Security and Slack integration model
- Uses **Slack Events API + Interactivity + Slash Commands** via a Web App endpoint.
- Uses **request signing verification** (`X-Slack-Signature`, `X-Slack-Request-Timestamp`) in `Auth.gs`.
- Does **not** rely on deprecated outgoing webhooks or static verification tokens.
- Enforces replay-window checks and duplicate payload suppression.

## Setup
1. Create a standalone Apps Script project bound to the LMS spreadsheet.
2. Add all `.gs` files from this folder (including `CommandJobs.gs`).
3. Set Script Properties:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
   - `GEMINI_API_KEY`
4. Run `setupSheets()` once on the target spreadsheet.
5. Deploy Web App and use URL as Slack Request URL / Interactivity URL.
6. Create a time trigger for `runQueueWorker` (e.g., every minute).

## Current coverage
- Slack signature verification and replay-window protection.
- Payload routing for slash commands, events, and interactivity.
- Slash commands are fast-ACKed with queued background processing for heavier admin operations.
- Interactivity handler now supports block actions, shortcuts, and modal submissions (basic modal clear response).
- Duplicate request suppression with hash + cache + request log.
- `/progress` command.
- `mark_complete` action handler (idempotent completion update).
- Queue primitives with retries, dead-letter status, and typed handlers.
- Onboarding helper, lesson-delivery scheduler, and reminder scheduler modules.
- Async Gemini Batch flow (`GEMINI_SUBMIT_BRAND_REVIEW` -> `GEMINI_POLL_OPERATION`).
- Structured Gemini JSON output enforcement via `response_schema`.
- Deterministic brand compliance scoring in application code (`BrandScoring.gs`).
- Structured `Audit_Log` and `Error_Log` writing.


## Beginner setup guide
For a click-by-click non-technical setup guide, see `docs/deployment.md`.


## Recommended triggers
- `runQueueWorker`: every minute
- `runDailyReleaseScheduler`: hourly
- `runReminderScheduler`: hourly
