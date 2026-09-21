const pool = require('../db/pool');
const { isBlocked, blockExclusion } = require('../middleware/auth');

async function createTask({ poster_id, title, description, category, budget, task_date, location, lat, lng }) {
    if (!poster_id || !title || !category) {
        const err = new Error('poster_id, title, and category are required');
        err.statusCode = 400;
        throw err;
    }

    // DB-backed rate limit: max 3 tasks per hour (survives server restarts)
    const [[{ recentCount }]] = await pool.query(
        'SELECT COUNT(*) AS recentCount FROM tasks WHERE poster_id = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
        [poster_id]
    );
    if (recentCount >= 3) {
        const err = new Error('You can only post 3 tasks per hour. Please try again later.');
        err.statusCode = 429;
        throw err;
    }

    const [[dup]] = await pool.query(
        'SELECT id FROM tasks WHERE poster_id = ? AND title = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)',
        [poster_id, title]
    );
    if (dup) {
        const err = new Error('A task with this title was already posted recently.');
        err.statusCode = 400;
        throw err;
    }

    const id = 'T' + Date.now();
    await pool.execute(
        'INSERT INTO tasks (id, poster_id, title, description, category, budget, task_date, location, lat, lng) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [id, poster_id, title, description || null, category, budget || null, task_date || null, location || null, lat || null, lng || null]
    );
    return { taskId: id };
}

async function listTasks({ category, status, poster_id, search }, viewerId) {
    let sql = `SELECT t.*, u.name AS poster_name, u.avatar AS poster_avatar,
                      (SELECT COUNT(*) FROM task_applications ta WHERE ta.task_id = t.id) AS application_count
               FROM tasks t
               LEFT JOIN users u ON u.id = t.poster_id
               WHERE 1=1`;
    const params = [];
    if (category) { sql += ' AND t.category = ?'; params.push(category); }
    if (status)   { sql += ' AND t.status = ?';   params.push(status); }
    if (poster_id){ sql += ' AND t.poster_id = ?'; params.push(poster_id); }
    if (search)   { sql += ' AND (t.title LIKE ? OR t.description LIKE ? OR t.location LIKE ?)'; params.push(`%${search}%`, `%${search}%`, `%${search}%`); }
    // Tasks from people blocked either way do not appear in the feed.
    const excl = blockExclusion('t.poster_id', viewerId);
    sql += excl.sql; params.push(...excl.params);
    sql += ' ORDER BY t.created_at DESC LIMIT 50';

    const [rows] = await pool.query(sql, params);
    return rows.map(t => ({
        ...t,
        poster_avatar: t.poster_avatar && t.poster_avatar.startsWith('/uploads/') ? `http://localhost:3000${t.poster_avatar}` : (t.poster_avatar || '')
    }));
}

async function getTask(taskId) {
    const [[task]] = await pool.query(
        `SELECT t.*, u.name AS poster_name, u.avatar AS poster_avatar
         FROM tasks t LEFT JOIN users u ON u.id = t.poster_id WHERE t.id = ?`,
        [taskId]
    );
    if (!task) {
        const err = new Error('Task not found');
        err.statusCode = 404;
        throw err;
    }

    const [applications] = await pool.query(
        `SELECT ta.*, u.name AS provider_name, u.avatar AS provider_avatar, u.rating AS provider_rating
         FROM task_applications ta LEFT JOIN users u ON u.id = ta.provider_id
         WHERE ta.task_id = ? ORDER BY ta.created_at DESC`,
        [taskId]
    );

    task.poster_avatar = task.poster_avatar && task.poster_avatar.startsWith('/uploads/') ? `http://localhost:3000${task.poster_avatar}` : (task.poster_avatar || '');
    applications.forEach(a => {
        a.provider_avatar = a.provider_avatar && a.provider_avatar.startsWith('/uploads/') ? `http://localhost:3000${a.provider_avatar}` : (a.provider_avatar || '');
    });
    return { task, applications };
}

async function applyToTask(taskId, provider_id, message) {
    if (!provider_id) {
        const err = new Error('provider_id required');
        err.statusCode = 400;
        throw err;
    }

    const [[taskCheck]] = await pool.query('SELECT poster_id FROM tasks WHERE id = ?', [taskId]);
    if (taskCheck && await isBlocked(provider_id, taskCheck.poster_id)) {
        const err = new Error('Cannot apply to this task');
        err.statusCode = 403;
        throw err;
    }

    const [dup] = await pool.query('SELECT id FROM task_applications WHERE task_id = ? AND provider_id = ?', [taskId, provider_id]);
    if (dup.length > 0) {
        const err = new Error('Already applied to this task');
        err.statusCode = 400;
        throw err;
    }

    const id = 'TA' + Date.now();
    await pool.execute('INSERT INTO task_applications (id, task_id, provider_id, message) VALUES (?, ?, ?, ?)', [id, taskId, provider_id, message || null]);

    const [[task]] = await pool.query('SELECT poster_id, title FROM tasks WHERE id = ?', [taskId]);
    const [[provider]] = await pool.query('SELECT name FROM users WHERE id = ?', [provider_id]);
    if (task) {
        await pool.execute(
            'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
            [task.poster_id, 'task_application', `📋 New applicant for "${task.title}"`, `${provider?.name || 'Someone'} wants to help with your task.`]
        );
    }
    return { applicationId: id };
}

async function assignTask(taskId, provider_id) {
    if (!provider_id) {
        const err = new Error('provider_id required');
        err.statusCode = 400;
        throw err;
    }
    await pool.execute('UPDATE tasks SET assigned_provider_id = ?, status = ? WHERE id = ?', [provider_id, 'assigned', taskId]);
    await pool.execute('UPDATE task_applications SET status = ? WHERE task_id = ? AND provider_id = ?', ['accepted', taskId, provider_id]);
    await pool.execute('UPDATE task_applications SET status = ? WHERE task_id = ? AND provider_id != ?', ['rejected', taskId, provider_id]);

    const [[task]] = await pool.query('SELECT title FROM tasks WHERE id = ?', [taskId]);
    await pool.execute(
        'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
        [provider_id, 'task_assigned', `✅ You've been assigned!`, `You were selected for the task "${task?.title || ''}".`]
    );
}

async function updateStatus(taskId, status) {
    if (!['open', 'assigned', 'completed'].includes(status)) {
        const err = new Error('Invalid status');
        err.statusCode = 400;
        throw err;
    }
    await pool.execute('UPDATE tasks SET status = ? WHERE id = ?', [status, taskId]);
}

async function deleteTask(taskId, user_id) {
    if (!user_id) {
        const err = new Error('user_id required');
        err.statusCode = 400;
        throw err;
    }
    const [[task]] = await pool.query('SELECT poster_id FROM tasks WHERE id = ?', [taskId]);
    if (!task) {
        const err = new Error('Task not found');
        err.statusCode = 404;
        throw err;
    }
    if (task.poster_id !== user_id) {
        const err = new Error('Only the poster can delete this task');
        err.statusCode = 403;
        throw err;
    }
    await pool.execute('DELETE FROM task_applications WHERE task_id = ?', [taskId]);
    await pool.execute('DELETE FROM tasks WHERE id = ?', [taskId]);
}

module.exports = { createTask, listTasks, getTask, applyToTask, assignTask, updateStatus, deleteTask };
