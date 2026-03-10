function handleSlackEvent(body, correlationId) {
  var eventType = body && body.event ? body.event.type : 'unknown';
  logAudit('event_received', 'slack', body.team_id || '', 'event', eventType, { eventId: body.event_id }, correlationId);

  if (eventType !== 'message') {
    return ackJson({ ok: true });
  }

  if (shouldIgnoreMessageEvent_(body.event)) {
    return ackJson({ ok: true });
  }

  if (shouldRunBrandAgent_(body.event)) {
    enqueue('GEMINI_SUBMIT_BRAND_REVIEW', 'message', body.event.client_msg_id || body.event.ts, {
      lessonId: body.event.client_msg_id || body.event.ts,
      sourceText: body.event.text || '',
      channel: body.event.channel || ''
    }, { priority: 4 });

    logAudit('brand_review_enqueued', 'system', 'events', 'channel', body.event.channel || '', {
      eventTs: body.event.ts
    }, correlationId);
  }

  return ackJson({ ok: true });
}

function shouldIgnoreMessageEvent_(eventPayload) {
  if (!eventPayload) {
    return true;
  }

  if (eventPayload.subtype) {
    return true;
  }

  if (eventPayload.bot_id) {
    return true;
  }

  return false;
}

function shouldRunBrandAgent_(eventPayload) {
  if (!eventPayload || !eventPayload.text) {
    return false;
  }
  return eventPayload.text.toLowerCase().indexOf('run brand agent') >= 0;
}
