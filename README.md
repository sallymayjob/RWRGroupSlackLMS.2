# RWR Slack LMS (ELI5 Guide)

## What is this?
Think of this project like a **smart school helper inside Slack**.

- Your team learns in Slack.
- Lessons are tracked in a Google Sheet.
- A Google Apps Script “robot” sends lessons, records progress, and handles reminders.
- Gemini can help review/generate content in the background.

If you are non-technical: this is a **plug-and-play starter kit** for running onboarding/training from Slack.

---

## Super simple picture
1. Someone clicks a button or runs a Slack command (like `/progress`).
2. Slack sends that to this project.
3. The Apps Script checks security, then saves/reads data in Google Sheets.
4. It replies in Slack.
5. Big/slow jobs go to a queue so Slack stays fast.

---

## What you need (no coding required)
- A Slack workspace where you can create apps.
- A Google account (for Sheets + Apps Script).
- This repository files.
- 30–60 minutes for first setup.

---

## Where the important files are
- `docs/slack_app_manifest.yaml` → Slack app setup template.
- `docs/spreadsheet_schema.csv` → all spreadsheet tabs + columns.
- `docs/deployment.md` → full setup checklist.
- `apps-script/` → backend script files to paste/import into Apps Script.

---

## What this system already does
- Verifies Slack requests securely.
- Supports slash commands + interactive actions.
- Stores records in Google Sheets.
- Uses a retry queue for background work.
- Supports async Gemini job submission/polling.
- Computes brand score in deterministic code.

---

## What to do next
Follow **`docs/deployment.md`** step by step.

That guide is written for beginners and tells you exactly where to click in Slack and Google.
