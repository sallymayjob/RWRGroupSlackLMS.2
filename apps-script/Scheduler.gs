function runDailyReleaseScheduler() {
  enqueueDueLessons_(generateId('SCH'));
}

function runReminderScheduler() {
  enqueueOverdueReminders_(generateId('SCH'));
}
