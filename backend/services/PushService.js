const admin = require('firebase-admin');
const pool  = require('../db/pool');

async function getTokensForUser(userId) {
    const [rows] = await pool.query(
        'SELECT token FROM device_tokens WHERE user_id = ?',
        [userId]
    );
    return rows.map(r => r.token);
}

async function sendToUser(userId, title, body, data = {}) {
    const tokens = await getTokensForUser(userId);
    if (!tokens.length) return;

    if (!admin.apps.length) return;

    const message = {
        notification: { title, body },
        data: Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])),
        tokens,
        android: {
            priority: 'high',
            notification: { sound: 'default', channelId: 'helpmate_default' },
        },
        apns: {
            payload: { aps: { sound: 'default', badge: 1 } },
        },
    };

    try {
        const res = await admin.messaging().sendEachForMulticast(message);
        // Remove tokens that are no longer valid
        const invalid = [];
        res.responses.forEach((r, i) => {
            if (!r.success && r.error?.code === 'messaging/registration-token-not-registered') {
                invalid.push(tokens[i]);
            }
        });
        if (invalid.length) {
            await pool.query('DELETE FROM device_tokens WHERE token IN (?)', [invalid]);
        }
    } catch (e) {
        console.warn('Push send error:', e.message);
    }
}

async function saveToken(userId, token, platform = 'android') {
    // Upsert: remove old entry for this token, then insert fresh
    await pool.execute('DELETE FROM device_tokens WHERE token = ?', [token]);
    await pool.execute(
        'INSERT INTO device_tokens (user_id, token, platform) VALUES (?, ?, ?)',
        [userId, token, platform]
    );
}

async function removeToken(token, userId) {
    await pool.execute('DELETE FROM device_tokens WHERE token = ? AND user_id = ?',
        [token, userId]);
}

module.exports = { sendToUser, saveToken, removeToken };
