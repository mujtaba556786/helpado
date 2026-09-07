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

/**
 * Ownership guards.
 *
 * Before these, every id came from the client: the URL said whose bookings to
 * read, the body said who was sending a message. Identity now comes from the
 * verified JWT (req.userId) and the client-supplied id is either checked
 * against it or overwritten by it.
 */

// The :param must be the caller's own id. A valid admin-panel token also
// passes: an admin acting on a user's record is legitimate, and whoever holds
// that token is fully privileged already.
function requireSelfParam(sParam) {
    return [function (req, res, next) {
        if (ADMIN_PANEL_TOKEN && req.headers['x-admin-token'] === ADMIN_PANEL_TOKEN) {
            req.isAdminPanel = true;
            return next();
        }
        const userId = resolveUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
        req.userId = userId;
        next();
    }, function (req, res, next) {
        if (!req.isAdminPanel && String(req.params[sParam]) !== String(req.userId)) {
            return res.status(403).json({ success: false, error: 'Not your data' });
        }
        next();
    }];
}

// Ignore whatever the body claims for these fields and use the real identity.
function forceBodyUser(...aFields) {
    return [requireAuth, function (req, res, next) {
        aFields.forEach(function (f) { req.body[f] = req.userId; });
        next();
    }];
}

// Resolves the caller from the Bearer token. Returns null when absent/invalid.
function resolveUserId(req) {
    const auth = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return null;
    try {
        return jwt.verify(token, JWT_SECRET).userId;
    } catch {
        return null;
    }
}

// Wraps an async ownership check with auth + consistent error handling.
function ownershipGuard(fnCheck) {
    return async function (req, res, next) {
        const userId = resolveUserId(req);
        if (!userId) return res.status(401).json({ success: false, error: 'Not authenticated' });
        req.userId = userId;
        try {
            await fnCheck(req, res, next);
        } catch (err) {
            next(err);
        }
    };
}

// Caller must be the customer or the provider on the booking in :id.
const requireBookingParticipant = ownershipGuard(async (req, res, next) => {
    const [[row]] = await pool.query(
        'SELECT customer_id, provider_id FROM bookings WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Booking not found' });
    if (String(row.customer_id) !== String(req.userId) &&
        String(row.provider_id) !== String(req.userId)) {
        return res.status(403).json({ success: false, error: 'Not your booking' });
    }
    req.booking = row;
    next();
});

// Caller must be one of the two participants of the conversation.
const requireConversationParticipant = ownershipGuard(async (req, res, next) => {
    const sId = req.params.conversationId || req.body.conversation_id;
    const [[row]] = await pool.query(
        'SELECT participant_1, participant_2 FROM conversations WHERE id = ?', [sId]);
    if (!row) return res.status(404).json({ success: false, error: 'Conversation not found' });
    if (String(row.participant_1) !== String(req.userId) &&
        String(row.participant_2) !== String(req.userId)) {
        return res.status(403).json({ success: false, error: 'Not your conversation' });
    }
    next();
});

// Caller must be the poster or the assigned provider of the task in :id.
const requireTaskParticipant = ownershipGuard(async (req, res, next) => {
    const [[row]] = await pool.query(
        'SELECT poster_id, assigned_provider_id FROM tasks WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
    if (String(row.poster_id) !== String(req.userId) &&
        String(row.assigned_provider_id) !== String(req.userId)) {
        return res.status(403).json({ success: false, error: 'Not your task' });
    }
    next();
});

// Caller must have posted the task in :id.
const requireTaskOwner = ownershipGuard(async (req, res, next) => {
    const [[row]] = await pool.query('SELECT poster_id FROM tasks WHERE id = ?', [req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: 'Task not found' });
    if (String(row.poster_id) !== String(req.userId)) {
        return res.status(403).json({ success: false, error: 'Not your task' });
    }
    next();
});

module.exports = {
    handleAsync, requireAdmin, requireAuth, requireTerms, isBlocked,
    requireSelfParam, forceBodyUser,
    requireBookingParticipant, requireConversationParticipant,
    requireTaskOwner, requireTaskParticipant
};
