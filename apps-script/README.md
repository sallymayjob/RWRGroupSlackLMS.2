# Apps Script Starter

This folder contains the initial implementation skeleton for the Slack LMS backend.

## Setup
1. Create a standalone Apps Script project bound to the LMS spreadsheet.
2. Add all `.gs` files from this folder.
3. Set Script Properties:
   - `SLACK_BOT_TOKEN`
   - `SLACK_SIGNING_SECRET`
4. Run `setupSheets()` once on the target spreadsheet.
5. Deploy Web App and use URL as Slack Request URL / Interactivity URL.
6. Create a time trigger for `runQueueWorker` (e.g., every minute).

## Current coverage
- Slack signature verification and replay-window protection.
- Payload routing for slash commands, events, and interactivity.
- Duplicate request suppression with hash + cache + request log.
- `/progress` command.
- `mark_complete` action handler (idempotent completion update).
- Queue primitives with retries, dead-letter status, and typed handlers.
- Structured `Audit_Log` and `Error_Log` writing.
