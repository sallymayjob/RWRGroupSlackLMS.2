function buildLessonBlocks_(lesson, progressId) {
  return [
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*'+ lesson.Title + '*\n' + (lesson.Objective || '')
      }
    },
    {
      type: 'actions',
      elements: [
        {
          type: 'button',
          text: { type: 'plain_text', text: 'Mark Complete' },
          action_id: 'mark_complete',
          value: JSON.stringify({ ProgressID: progressId })
        }
      ]
    }
  ];
}
