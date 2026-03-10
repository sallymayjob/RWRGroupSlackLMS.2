# Deployment Guide (Beginner-Friendly)

This guide helps you deploy the Slack LMS system with **zero technical background**.

## Goal
By the end, you will have:
- A Slack app connected to Google Apps Script.
- A Google Sheet acting as your LMS database.
- A running webhook endpoint for commands/events/buttons.
- A queue worker trigger for background jobs.

---

## Quick-start sheet setup (binary-free)
To avoid binary template issues, build the workbook directly in Google Sheets:
1. Create a new blank Google Sheet in Drive.
2. Bind Apps Script to that sheet and add the `apps-script/*.gs` files.
3. Run `setupSheets()` to generate all tabs/headers automatically.
4. Use `docs/spreadsheet_schema.csv` as your template/checklist for validation.

---

## 1) Create the Google Sheet (database)
1. Open Google Sheets and create a new spreadsheet.
2. Name it something like: `RWR Slack LMS`.
3. Keep this sheet open; Apps Script will use it.

---

## 2) Create Apps Script project
1. In the sheet, go to **Extensions → Apps Script**.
2. Create a new script project.
3. Delete any starter code.
4. Add each `.gs` file from the repo `apps-script/` folder into the project.
   - Easiest: create one script file per repo file and paste content.
5. Save the project.

---

## 3) Initialize spreadsheet tabs/headers
1. In Apps Script editor, pick function `setupSheets`.
2. Click **Run**.
3. Authorize permissions when prompted.
4. Return to the sheet and confirm tabs were created (Users, Enrollments, Progress, Queue, etc.).

---

## 4) Deploy Apps Script Web App
1. In Apps Script, click **Deploy → New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone** (required for Slack callbacks).
5. Click **Deploy**.
6. Copy the Web App URL.

> You will paste this same URL in Slack for commands, events, and interactivity.

---

## 5) Create Slack app from manifest
1. Go to Slack API: https://api.slack.com/apps
2. Click **Create New App → From manifest**.
3. Choose your workspace.
4. Open `docs/slack_app_manifest.yaml`.
5. Replace `REPLACE_WITH_DEPLOYMENT_ID` URL placeholders with your Apps Script Web App URL.
6. Paste manifest into Slack and create app.
7. Install app to workspace.

---

## 6) Set Script Properties (secrets)
In Apps Script:
1. Go to **Project Settings → Script Properties**.
2. Add:
   - `SLACK_BOT_TOKEN` = Bot User OAuth Token from Slack (`xoxb-...`)
   - `SLACK_SIGNING_SECRET` = Signing Secret from Slack Basic Information page
   - `GEMINI_API_KEY` = your Gemini API key

---

## 7) Configure Slack endpoints
In Slack App settings:
1. **Event Subscriptions** → enable and set Request URL to your Apps Script Web App URL.
2. **Interactivity & Shortcuts** → enable and set Request URL to same URL.
3. Slash commands should already point to same URL via manifest.

If Slack says URL verification failed, check:
- App deployed and public access is correct.
- Apps Script code includes `doPost`.
- Signing secret in Script Properties is correct.

---

## 8) Add queue trigger (important)
This system does slow work in background jobs.

1. In Apps Script, open **Triggers** (clock icon).
2. Add trigger:
   - Function: `runQueueWorker`
   - Event source: Time-driven
   - Type: Every minute (or every 5 minutes to start)
3. Add trigger:
   - Function: `runDailyReleaseScheduler`
   - Event source: Time-driven
   - Type: Hour timer
4. Add trigger:
   - Function: `runReminderScheduler`
   - Event source: Time-driven
   - Type: Hour timer
5. Save.

---

## 9) Smoke test (quick check)
1. In Slack, run `/progress`.
2. Confirm bot responds (even if “not enrolled yet”).
3. Check sheet tabs:
   - `Audit_Log` should have entries.
   - `Error_Log` should stay empty for successful tests.

Optional Gemini flow test:
1. Post message containing `run brand agent` where bot can read.
2. Confirm queue rows appear for Gemini submit/poll.
3. Confirm `Gemini_Jobs` updates after processing.

---

## 10) Operations checklist (daily)
- Check `Error_Log` for new failures.
- Check `Queue` for jobs stuck in `pending`/`failed_permanent`.
- Check `Gemini_Jobs` for long-running or failed operations.
- Keep bot token/signing secret secure.

---

## Common issues and fixes
### Problem: Slack commands timeout
- Cause: Web app URL wrong or app not deployed.
- Fix: redeploy web app, copy fresh URL, update Slack settings.

### Problem: Signature errors
- Cause: wrong `SLACK_SIGNING_SECRET`.
- Fix: copy exact secret from Slack app settings into Script Properties.

### Problem: No queue processing
- Cause: missing time trigger.
- Fix: add `runQueueWorker` trigger.

### Problem: Gemini errors
- Cause: missing/invalid `GEMINI_API_KEY`.
- Fix: update Script Property and re-run queue jobs.

---

## Non-technical handoff notes
If you are handing this to operations/admin:
- Give them this file + root `README.md`.
- Keep one owner for Slack app settings.
- Keep one owner for Google Sheet data quality.
- Review logs weekly.

That’s it — once deployed, your team can run onboarding and lesson workflows inside Slack with Sheets as the control center.
