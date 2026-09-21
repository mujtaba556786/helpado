const pool = require('../db/pool');
const { isBlocked } = require('../middleware/auth');

async function getConversations(userId) {
    // A chat the caller "deleted" (conversation_hides) stays out of their list
    // until the other side writes again; then it returns with only the new
    // messages. The other participant's copy is untouched throughout.
    const [rows] = await pool.query(
        `SELECT c.*,
                u1.name AS p1_name, u1.avatar AS p1_avatar,
                u2.name AS p2_name, u2.avatar AS p2_avatar,
                h.hidden_at,
                (SELECT COUNT(*) FROM direct_messages dm
                 WHERE dm.conversation_id = c.id AND dm.sender_id != ? AND dm.is_read = 0
                   AND (h.hidden_at IS NULL OR dm.created_at > h.hidden_at)) AS unread_count
         FROM conversations c
         LEFT JOIN users u1 ON u1.id = c.participant_1
         LEFT JOIN users u2 ON u2.id = c.participant_2
         LEFT JOIN conversation_hides h ON h.conversation_id = c.id AND h.user_id = ?
         WHERE (c.participant_1 = ? OR c.participant_2 = ?)
           AND (h.hidden_at IS NULL OR c.last_message_at > h.hidden_at)
         ORDER BY c.last_message_at DESC`,
        [userId, userId, userId, userId]
    );

    const conversations = rows.map(c => {
        const isP1 = c.participant_1 === userId;
        const otherAvatar = isP1 ? c.p2_avatar : c.p1_avatar;
        return {
            id: c.id,
            other_id: isP1 ? c.participant_2 : c.participant_1,
            other_name: isP1 ? c.p2_name : c.p1_name,
            other_avatar: otherAvatar && otherAvatar.startsWith('/uploads/') ? `http://localhost:3000${otherAvatar}` : (otherAvatar || ''),
            last_message: c.last_message,
            last_message_at: c.last_message_at,
            unread_count: c.unread_count
        };
    });

    const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);
    return { conversations, totalUnread };
}

async function findOrCreateConversation(user1_id, user2_id) {
    if (await isBlocked(user1_id, user2_id)) {
        const err = new Error('Cannot start a conversation with this user');
        err.statusCode = 403;
        throw err;
    }

    const [existing] = await pool.query(
        `SELECT * FROM conversations
         WHERE (participant_1 = ? AND participant_2 = ?) OR (participant_1 = ? AND participant_2 = ?)`,
        [user1_id, user2_id, user2_id, user1_id]
    );
    if (existing.length > 0) return { conversation: existing[0], created: false };

    const id = 'CONV' + Date.now();
    await pool.execute('INSERT INTO conversations (id, participant_1, participant_2) VALUES (?, ?, ?)', [id, user1_id, user2_id]);
    const [[conv]] = await pool.query('SELECT * FROM conversations WHERE id = ?', [id]);
    return { conversation: conv, created: true };
}

/**
 * Messages as ONE participant sees them: nothing from before they hid the chat,
 * and three flags that replace the text client-side —
 *   removed = 1  moderation removed it        → "removed by moderation"
 *   deleted = 1  the sender unsent it         → "message deleted"
 *   edited  = 1  the sender edited it         → "(edited)" under the bubble
 * Text is never served for removed or deleted messages.
 */
async function getMessages(conversationId, viewerId) {
    const [rows] = await pool.query(
        `SELECT dm.id, dm.conversation_id, dm.sender_id, dm.is_read, dm.created_at,
                IF(dm.deleted_at IS NULL AND dm.deleted_by_sender_at IS NULL, dm.content, '') AS content,
                IF(dm.deleted_at IS NULL, 0, 1)           AS removed,
                IF(dm.deleted_by_sender_at IS NULL, 0, 1) AS deleted,
                IF(dm.edited_at IS NULL, 0, 1)            AS edited,
                u.name AS sender_name, u.avatar AS sender_avatar
         FROM direct_messages dm
         LEFT JOIN users u ON u.id = dm.sender_id
         LEFT JOIN conversation_hides h ON h.conversation_id = dm.conversation_id AND h.user_id = ?
         WHERE dm.conversation_id = ?
           AND (h.hidden_at IS NULL OR dm.created_at > h.hidden_at)
         ORDER BY dm.created_at ASC
         LIMIT 100`,
        [viewerId || null, conversationId]
    );
    return rows;
}

const EDIT_WINDOW_MINUTES = 15;
const UNSENT_RETENTION_DAYS = 30;

/** Sender fixes a typo: own message, within 15 minutes, not removed by moderation. */
async function editMessage(messageId, senderId, content) {
    const [[msg]] = await pool.query(
        `SELECT id, conversation_id, sender_id, content, created_at, deleted_at, deleted_by_sender_at,
                TIMESTAMPDIFF(MINUTE, created_at, NOW()) AS age_min
           FROM direct_messages WHERE id = ?`, [messageId]);
    if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
    if (String(msg.sender_id) !== String(senderId)) throw Object.assign(new Error('Not your message'), { status: 403 });
    if (msg.deleted_at || msg.deleted_by_sender_at) throw Object.assign(new Error('Message no longer editable'), { status: 403 });
    if (msg.age_min > EDIT_WINDOW_MINUTES) {
        throw Object.assign(new Error(`Messages can be edited for ${EDIT_WINDOW_MINUTES} minutes`), { status: 403, code: 'edit_window_over' });
    }
    await pool.execute('UPDATE direct_messages SET content = ?, edited_at = NOW() WHERE id = ?', [content, messageId]);
    // The list preview showed the old text if this was the last message.
    await pool.execute(
        'UPDATE conversations SET last_message = ? WHERE id = ? AND last_message = ?',
        [content.substring(0, 200), msg.conversation_id, msg.content.substring(0, 200)]);
    return { edited: true };
}

/** Sender unsends: both sides see a placeholder. Text stays for reports, purged after 30 days. */
async function unsendMessage(messageId, senderId) {
    const [[msg]] = await pool.query(
        'SELECT id, conversation_id, sender_id, content, deleted_by_sender_at FROM direct_messages WHERE id = ?', [messageId]);
    if (!msg) throw Object.assign(new Error('Message not found'), { status: 404 });
    if (String(msg.sender_id) !== String(senderId)) throw Object.assign(new Error('Not your message'), { status: 403 });
    if (msg.deleted_by_sender_at) return { already: true };
    await pool.execute('UPDATE direct_messages SET deleted_by_sender_at = NOW() WHERE id = ?', [messageId]);
    await pool.execute(
        'UPDATE conversations SET last_message = NULL WHERE id = ? AND last_message = ?',
        [msg.conversation_id, msg.content.substring(0, 200)]);
    return { already: false };
}

/** "Chat löschen": hide the conversation for the caller only. Idempotent; re-hiding moves the cut-off forward. */
async function hideConversation(conversationId, userId) {
    await pool.execute(
        `INSERT INTO conversation_hides (conversation_id, user_id, hidden_at) VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE hidden_at = NOW()`,
        [conversationId, userId]);
    return { hidden: true };
}

/** Daily: blank the text of unsent messages older than the evidence window. */
async function purgeUnsentMessages() {
    const [r] = await pool.execute(
        `UPDATE direct_messages SET content = ''
          WHERE deleted_by_sender_at IS NOT NULL AND content <> ''
            AND deleted_by_sender_at < NOW() - INTERVAL ${UNSENT_RETENTION_DAYS} DAY`);
    if (r.affectedRows) console.log(`[MESSAGES] purged text of ${r.affectedRows} unsent message(s)`);
    return r.affectedRows;
}

async function sendMessage(conversation_id, sender_id, content) {
    if (!conversation_id || !sender_id || !content) {
        const err = new Error('conversation_id, sender_id, and content required');
        err.statusCode = 400;
        throw err;
    }

    const [[conv]] = await pool.query('SELECT participant_1, participant_2 FROM conversations WHERE id = ?', [conversation_id]);
    if (conv) {
        const otherId = conv.participant_1 === sender_id ? conv.participant_2 : conv.participant_1;
        if (await isBlocked(sender_id, otherId)) {
            const err = new Error('Cannot send messages to this user');
            err.statusCode = 403;
            throw err;
        }
    }

    const id = 'DM' + Date.now() + Math.random().toString(36).slice(2, 6);
    await pool.execute(
        'INSERT INTO direct_messages (id, conversation_id, sender_id, content) VALUES (?, ?, ?, ?)',
        [id, conversation_id, sender_id, content]
    );
    await pool.execute(
        'UPDATE conversations SET last_message = ?, last_message_at = NOW() WHERE id = ?',
        [content.substring(0, 200), conversation_id]
    );

    const [[convFull]] = await pool.query('SELECT * FROM conversations WHERE id = ?', [conversation_id]);
    if (convFull) {
        const recipientId = convFull.participant_1 === sender_id ? convFull.participant_2 : convFull.participant_1;
        const [[sender]] = await pool.query('SELECT name FROM users WHERE id = ?', [sender_id]);
        const senderName = sender ? sender.name : 'Someone';
        await pool.execute(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [recipientId, 'direct_message', `💬 ${senderName}`, content.substring(0, 100)]
        );
    }

    return { messageId: id };
}

async function markMessagesRead(conversationId, userId) {
    if (!userId) {
        const err = new Error('user_id required');
        err.statusCode = 400;
        throw err;
    }
    await pool.execute(
        'UPDATE direct_messages SET is_read = 1 WHERE conversation_id = ? AND sender_id != ? AND is_read = 0',
        [conversationId, userId]
    );
}

async function getUnreadCount(userId) {
    const [[{ count }]] = await pool.query(
        `SELECT COUNT(*) AS count FROM direct_messages dm
         JOIN conversations c ON c.id = dm.conversation_id
         WHERE (c.participant_1 = ? OR c.participant_2 = ?)
           AND dm.sender_id != ? AND dm.is_read = 0`,
        [userId, userId, userId]
    );
    return count;
}

module.exports = {
    getConversations, findOrCreateConversation, getMessages, sendMessage, markMessagesRead, getUnreadCount,
    editMessage, unsendMessage, hideConversation, purgeUnsentMessages, EDIT_WINDOW_MINUTES, UNSENT_RETENTION_DAYS
};
