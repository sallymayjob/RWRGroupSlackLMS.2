function getUserBySlackId_(slackUserId) {
  var rows = findRows(TAB_NAMES.USERS, { SlackUserID: slackUserId, IsActive: true });
  return rows.length ? rows[0] : null;
}

function requireAdmin_(slackUserId) {
  var user = getUserBySlackId_(slackUserId);
  if (!user) {
    return { ok: false, reason: 'unknown_user' };
  }

  var role = String(user.Role || '').toLowerCase();
  var isAdmin = role === 'admin' || role === 'owner' || role.indexOf('admin') >= 0;
  if (!isAdmin) {
    return { ok: false, reason: 'forbidden' };
  }

  return { ok: true, user: user };
}
