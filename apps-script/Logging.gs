function logAudit(eventType, actorType, actorId, targetType, targetId, changeObj, correlationId) {
  appendRow(TAB_NAMES.AUDIT_LOG, {
    AuditID: generateId('AUD'),
    EventType: eventType,
    ActorType: actorType || 'system',
    ActorID: actorId || '',
    TargetType: targetType || '',
    TargetID: targetId || '',
    ChangeJSON: JSON.stringify(changeObj || {}),
    CorrelationID: correlationId || '',
    CreatedAt: nowIso()
  });
}

function logError(errorCode, message, contextObj, correlationId) {
  appendRow(TAB_NAMES.ERROR_LOG, {
    ErrorID: generateId('ERR'),
    ErrorCode: errorCode,
    Message: message,
    ContextJSON: JSON.stringify(contextObj || {}),
    CorrelationID: correlationId || '',
    CreatedAt: nowIso()
  });
}
