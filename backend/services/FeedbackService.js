/**
 * In-app feedback: a user sends an idea, a problem or praise from
 * Settings → Support. Stored for the admin panel only.
 */
const pool = require('../db/pool');

async function submitFeedback(userId, { type, message, app_build, platform }) {
    if (!userId) throw Object.assign(new Error('must be logged in to send feedback'), { status: 401 });
    const [r] = await pool.execute(
        'INSERT INTO feedback (user_id, type, message, app_build, platform) VALUES (?, ?, ?, ?, ?)',
        [userId, type, message, app_build || null, platform || null]
    );
    return { id: r.insertId };
}

async function getFeedback({ status, limit = 50 } = {}) {
    const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
    const params = [];
    let where = '';
    if (status) { where = 'WHERE f.status = ?'; params.push(status); }
    const [rows] = await pool.query(
        `SELECT f.id, f.type, f.message, f.app_build, f.platform, f.status, f.created_at,
                f.user_id, u.name AS user_name, u.email AS user_email
           FROM feedback f
      LEFT JOIN users u ON u.id = f.user_id
           ${where}
       ORDER BY f.created_at DESC
          LIMIT ${lim}`,
        params
    );
    return rows;
}

async function setFeedbackStatus(id, status) {
    const [r] = await pool.execute('UPDATE feedback SET status = ? WHERE id = ?', [status, id]);
    if (!r.affectedRows) throw Object.assign(new Error('feedback not found'), { status: 404 });
}

module.exports = { submitFeedback, getFeedback, setFeedbackStatus };
