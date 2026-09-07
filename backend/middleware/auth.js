const jwt = require('jsonwebtoken');
const pool = require('../db/pool');
const { JWT_SECRET } = require('../config/secrets');

// No fallback value: an unset ADMIN_PANEL_TOKEN must fail closed. A default here
// would be a publicly-known master key for every admin endpoint.
const ADMIN_PANEL_TOKEN = process.env.ADMIN_PANEL_TOKEN || '';

const handleAsync = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

async function requireAdmin(req, res, next) {
    if (ADMIN_PANEL_TOKEN && req.headers['x-admin-token'] === ADMIN_PANEL_TOKEN) return next();

    // Identity comes from a signed JWT only. The previous x-user-id / ?user_id
    // fallback let any caller claim to be an admin just by setting a header.
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });

    let userId;
    try {
        userId = jwt.verify(token, JWT_SECRET).userId;
    } catch {
        return res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }

    const [[user]] = await pool.query('SELECT role FROM users WHERE id = ?', [userId]);
    if (!user || user.role !== 'admin') return res.status(403).json({ success: false, error: 'Admin only' });
    req.userId = userId;
    next();
}

function requireAuth(req, res, next) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'Not authenticated' });
    try {
        const payload = jwt.verify(token, JWT_SECRET);
        req.userId = payload.userId;
        next();
    } catch {
        res.status(401).json({ success: false, error: 'Invalid or expired token' });
    }
}

async function requireTerms(req, res, next) {
    const [[user]] = await pool.query('SELECT terms_accepted_at FROM users WHERE id = ?', [req.userId]);
    if (!user || !user.terms_accepted_at) {
        return res.status(403).json({ success: false, error: 'terms_required' });
    }
    next();
}

async function isBlocked(userA, userB) {
    const [[row]] = await pool.query(
        'SELECT id FROM user_blocks WHERE (blocker_id = ? AND blocked_id = ?) OR (blocker_id = ? AND blocked_id = ?)',
        [userA, userB, userB, userA]
    );
    return !!row;
}

module.exports = { handleAsync, requireAdmin, requireAuth, requireTerms, isBlocked };
