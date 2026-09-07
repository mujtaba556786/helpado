const pool        = require('../db/pool');
const PushService = require('./PushService');

async function getByUser(userId) {
    const [rows] = await pool.query(
        'SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50',
        [userId]
    );
    return rows;
}

async function getUnreadCount(userId) {
    const [[{ count }]] = await pool.query(
        'SELECT COUNT(*) AS count FROM notifications WHERE user_id = ? AND is_read = 0',
        [userId]
    );
    return count;
}

async function markRead(notificationId, userId) {
    await pool.execute(
        'UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?',
        [notificationId, userId]);
}

async function markAllRead(userId) {
    await pool.execute('UPDATE notifications SET is_read = 1 WHERE user_id = ?', [userId]);
}

// Create an in-app notification and also fire a push notification to the user's devices.
async function createAndPush(userId, type, title, message, bookingId = null) {
    await pool.execute(
        'INSERT INTO notifications (user_id, type, title, message, booking_id) VALUES (?, ?, ?, ?, ?)',
        [userId, type, title, message, bookingId]
    );
    // Fire push silently — don't let a push failure break the main flow
    PushService.sendToUser(userId, title, message, { type, bookingId: bookingId || '' }).catch(() => {});
}

module.exports = { getByUser, getUnreadCount, markRead, markAllRead, createAndPush };
