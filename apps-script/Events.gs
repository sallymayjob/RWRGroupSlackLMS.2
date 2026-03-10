function handleSlackEvent(body, correlationId) {
  logAudit('event_received', 'slack', body.team_id || '', 'event', body.event && body.event.type, { eventId: body.event_id }, correlationId);
  return ackJson({ ok: true });
}
