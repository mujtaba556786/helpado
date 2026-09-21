/**
 * Report-driven message moderation and account erasure.
 *
 * Access to private messages is deliberately narrow: an admin can read the
 * conversation BETWEEN THE TWO PARTIES OF A REPORT, nothing else. There is no
 * endpoint that lists or searches all conversations.
 */
const pool = require('../db/pool');

/** The conversation between a report's reporter and the reported user, with its last 50 messages. */
async function getReportConversation(reportId) {
    const [[report]] = await pool.query(
        'SELECT id, reporter_id, reported_type, reported_id FROM reports WHERE id = ?', [reportId]);
    if (!report) throw Object.assign(new Error('report not found'), { status: 404 });
    if (report.reported_type !== 'user') {
        throw Object.assign(new Error('only user reports have a conversation to show'), { status: 400 });
    }
    const [[conv]] = await pool.query(
        `SELECT id, participant_1, participant_2 FROM conversations
          WHERE (participant_1 = ? AND participant_2 = ?) OR (participant_1 = ? AND participant_2 = ?)
          LIMIT 1`,
        [report.reporter_id, report.reported_id, report.reported_id, report.reporter_id]);
    if (!conv) return { report, conversation: null, messages: [] };

    // Evidence view: a message the SENDER unsent still shows its text here (kept
    // 30 days, see MessageService.purgeUnsentMessages) flagged unsent = 1, so a
    // report cannot be dodged by deleting the insult. Moderation-removed text
    // stays hidden even from admins.
    const [messages] = await pool.query(
        `SELECT dm.id, dm.sender_id, dm.created_at,
                IF(dm.deleted_at IS NULL, dm.content, '') AS content,
                IF(dm.deleted_at IS NULL, 0, 1)           AS removed,
                IF(dm.deleted_by_sender_at IS NULL, 0, 1) AS unsent,
                IF(dm.edited_at IS NULL, 0, 1)            AS edited,
                u.name AS sender_name
           FROM direct_messages dm
      LEFT JOIN users u ON u.id = dm.sender_id
          WHERE dm.conversation_id = ?
       ORDER BY dm.created_at DESC
          LIMIT 50`,
        [conv.id]);
    return { report, conversation: conv, messages: messages.reverse() };
}

/** Soft-remove one message: the row stays as evidence, readers get '' + removed = 1. */
async function removeMessage(messageId) {
    const [[msg]] = await pool.query(
        'SELECT id, conversation_id, content, deleted_at FROM direct_messages WHERE id = ?', [messageId]);
    if (!msg) throw Object.assign(new Error('message not found'), { status: 404 });
    if (msg.deleted_at) return { already: true };
    await pool.execute('UPDATE direct_messages SET deleted_at = NOW() WHERE id = ?', [messageId]);
    // The conversation list previews last_message; never show removed text there.
    await pool.execute(
        'UPDATE conversations SET last_message = NULL WHERE id = ? AND last_message = ?',
        [msg.conversation_id, msg.content]);
    return { already: false };
}

const ERASED_NAME = 'Gelöschter Nutzer';

/**
 * GDPR Art. 17 erasure. The users row is kept (bookings, ratings and reports
 * reference it) but every personal field is blanked, the login is made
 * impossible, sessions are revoked, and the user's own content is removed.
 * Used both by the account owner (DELETE /users/me) and by an admin.
 */
async function eraseUser(userId, { by } = {}) {
    const [[user]] = await pool.query('SELECT id, role, status, email FROM users WHERE id = ?', [userId]);
    if (!user) throw Object.assign(new Error('user not found'), { status: 404 });
    if (String(user.role || '').toLowerCase() === 'admin') throw Object.assign(new Error('admin accounts cannot be erased here'), { status: 403 });
    if (user.status === 'Deleted') return { already: true };

    const conn = await pool.getConnection();
    try {
        await conn.beginTransaction();
        await conn.execute(
            `UPDATE users SET
                name = ?, email = ?, avatar = NULL, bio = NULL, phone = NULL,
                street_name = NULL, street_number = NULL, city = NULL, pincode = NULL,
                languages = NULL, availability = NULL, service_categories = NULL,
                status = 'Deleted'
             WHERE id = ?`,
            [ERASED_NAME, `deleted-${userId}@deleted.helpado.invalid`, userId]);
        await conn.execute('DELETE FROM refresh_tokens   WHERE user_id = ?', [userId]);
        await conn.execute('DELETE FROM device_tokens    WHERE user_id = ?', [userId]);
        await conn.execute('DELETE FROM magic_link_tokens WHERE email = ?', [user.email]);
        await conn.execute('DELETE FROM user_blocks      WHERE blocker_id = ? OR blocked_id = ?', [userId, userId]);
        // The user's own words go; the other side's messages stay (they belong to them).
        await conn.execute(
            "UPDATE direct_messages SET content = '', deleted_at = COALESCE(deleted_at, NOW()) WHERE sender_id = ?", [userId]);
        await conn.execute(
            'UPDATE conversations SET last_message = NULL WHERE participant_1 = ? OR participant_2 = ?', [userId, userId]);
        await conn.execute('UPDATE ratings SET comment = NULL, reviewer_name = ? WHERE user_id = ?', [ERASED_NAME, userId]);
        await conn.execute("UPDATE tasks SET status = 'cancelled' WHERE poster_id = ? AND status = 'open'", [userId]);
        await conn.commit();
    } catch (e) {
        await conn.rollback();
        throw e;
    } finally {
        conn.release();
    }
    console.log(`[MODERATION] user ${userId} erased (${by || 'self'})`);
    return { already: false };
}

module.exports = { getReportConversation, removeMessage, eraseUser, ERASED_NAME };
