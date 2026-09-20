const pool = require('../db/pool');
const { isBlocked } = require('../middleware/auth');

async function getConversations(userId) {
    const [rows] = await pool.query(
        `SELECT c.*,
                u1.name AS p1_name, u1.avatar AS p1_avatar,
                u2.name AS p2_name, u2.avatar AS p2_avatar,
                (SELECT COUNT(*) FROM direct_messages dm
                 WHERE dm.conversation_id = c.id AND dm.sender_id != ? AND dm.is_read = 0) AS unread_count
         FROM conversations c
         LEFT JOIN users u1 ON u1.id = c.participant_1
         LEFT JOIN users u2 ON u2.id = c.participant_2
         WHERE c.participant_1 = ? OR c.participant_2 = ?
         ORDER BY c.last_message_at DESC`,
        [userId, userId, userId]
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

async function getMessages(conversationId) {
    const [rows] = await pool.query(
        `SELECT dm.id, dm.conversation_id, dm.sender_id, dm.is_read, dm.created_at,
                IF(dm.deleted_at IS NULL, dm.content, '') AS content,
                IF(dm.deleted_at IS NULL, 0, 1)          AS removed,
                u.name AS sender_name, u.avatar AS sender_avatar
         FROM direct_messages dm
         LEFT JOIN users u ON u.id = dm.sender_id
         WHERE dm.conversation_id = ?
         ORDER BY dm.created_at ASC
         LIMIT 100`,
        [conversationId]
    );
    return rows;
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

module.exports = { getConversations, findOrCreateConversation, getMessages, sendMessage, markMessagesRead, getUnreadCount };
