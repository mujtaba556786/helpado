const jwt    = require('jsonwebtoken');
const crypto = require('crypto');
const pool   = require('../db/pool');
const { calculateTrustScore } = require('./TrustService');
// Shared with middleware/auth.js so sign and verify always use the same key.
const { JWT_SECRET, REFRESH_SECRET } = require('../config/secrets');

const CURRENT_TERMS_VERSION = '1.0';

// ── Token helpers ─────────────────────────────────────────────────────────────

function issueAccessToken(user) {
    return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: '15m' });
}

// A session lasts SESSION_DAYS after its last use, not after login. Every
// successful refresh pushes the row's expires_at forward, so anyone who opens
// the app at least once in that window never sees a login code again; a
// device silent for the whole window does. The DB row is the real lifetime —
// logout deletes it — and the JWT only carries a distant hard cap so
// jwt.verify does not cut a live session off at day 60 as it used to.
const SESSION_DAYS   = 60;
const SESSION_MS     = SESSION_DAYS * 24 * 60 * 60 * 1000;
const REFRESH_JWT_TTL = '400d';

async function issueRefreshToken(user) {
    const token     = jwt.sign({ userId: user.id }, REFRESH_SECRET, { expiresIn: REFRESH_JWT_TTL });
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_MS);
    await pool.execute(
        'INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.id, tokenHash, expiresAt]
    );
    return token;
}

async function issueTokens(user) {
    return { accessToken: issueAccessToken(user), refreshToken: await issueRefreshToken(user) };
}

// ── User helpers ──────────────────────────────────────────────────────────────

async function upsertSocialUser({ email, name, avatar, provider }) {
    const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    let user;
    if (rows.length > 0) {
        user = rows[0];
        if (avatar && user.avatar !== avatar) {
            await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatar, user.id]);
            user.avatar = avatar;
        }
    } else {
        const id             = 'U' + Date.now();
        const fallbackAvatar = avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;
        await pool.execute(
            'INSERT INTO users (id, name, email, role, status, avatar, onboarded, provider) VALUES (?, ?, ?, "Customer", "Active", ?, 0, ?)',
            [id, name, email, fallbackAvatar, provider]
        );
        const [newRows] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
        user = newRows[0];
    }
    return { user, ...(await issueTokens(user)) };
}

async function findOrCreateEmailUser(email, { role, provider } = {}) {
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) return users[0];

    const id     = 'U' + Date.now();
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`;
    await pool.execute(
        'INSERT INTO users (id, name, email, role, status, avatar, onboarded, provider) VALUES (?, ?, ?, ?, "Active", ?, 1, ?)',
        [id, email.split('@')[0], email, role || 'Customer', avatar, provider || 'Email']
    );
    const [newUser] = await pool.query('SELECT * FROM users WHERE id = ?', [id]);
    return newUser[0];
}

// ── Auth methods ──────────────────────────────────────────────────────────────

async function loginPasswordless(email, role, provider) {
    const user = await findOrCreateEmailUser(email, { role, provider });
    const tokens = await issueTokens(user);
    return { user, ...tokens };
}

async function consumeMagicToken(tokenHash) {
    const [[record]] = await pool.query('SELECT * FROM magic_link_tokens WHERE token_hash = ?', [tokenHash]);
    if (!record) {
        const err = new Error('invalid');
        err.statusCode = 400;
        throw err;
    }
    if (new Date() > new Date(record.expires_at)) {
        await pool.execute('DELETE FROM magic_link_tokens WHERE token_hash = ?', [tokenHash]);
        const err = new Error('expired');
        err.statusCode = 400;
        throw err;
    }
    await pool.execute('DELETE FROM magic_link_tokens WHERE token_hash = ?', [tokenHash]);

    const user = await findOrCreateEmailUser(record.email);
    calculateTrustScore(user.id).catch(() => {});
    const tokens = await issueTokens(user);
    return { user, ...tokens };
}

// Verify a 6-digit OTP code (the mobile-friendly path — same email also carries a
// click-link consumed by consumeMagicToken). Single-use: the row is deleted on
// success or expiry. Brute force is bounded by the 15-min expiry + the auth rate
// limiter on the route.
async function consumeMagicCode(email, code) {
    const [[record]] = await pool.query(
        'SELECT * FROM magic_link_tokens WHERE email = ? ORDER BY created_at DESC LIMIT 1',
        [email]
    );
    if (!record || !record.code_hash) {
        const err = new Error('invalid'); err.statusCode = 400; throw err;
    }
    if (new Date() > new Date(record.expires_at)) {
        await pool.execute('DELETE FROM magic_link_tokens WHERE id = ?', [record.id]);
        const err = new Error('expired'); err.statusCode = 400; throw err;
    }
    const codeHash = crypto.createHash('sha256').update(String(code)).digest('hex');
    if (codeHash !== record.code_hash) {
        const err = new Error('invalid'); err.statusCode = 400; throw err;
    }
    await pool.execute('DELETE FROM magic_link_tokens WHERE email = ?', [email]);

    const user = await findOrCreateEmailUser(record.email);
    calculateTrustScore(user.id).catch(() => {});
    const tokens = await issueTokens(user);
    return { user, ...tokens };
}

async function refreshAccessToken(refreshToken) {
    let payload;
    try {
        payload = jwt.verify(refreshToken, REFRESH_SECRET);
    } catch {
        const err = new Error('Invalid or expired refresh token');
        err.statusCode = 401;
        throw err;
    }

    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const [rows] = await pool.query(
        'SELECT * FROM refresh_tokens WHERE user_id = ? AND token_hash = ? AND expires_at > NOW()',
        [payload.userId, tokenHash]
    );
    if (rows.length === 0) {
        const err = new Error('Refresh token revoked or expired');
        err.statusCode = 401;
        throw err;
    }

    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if (users.length === 0) {
        const err = new Error('User not found');
        err.statusCode = 401;
        throw err;
    }
    if (users[0].status !== 'Active') {
        const err = new Error('Account suspended');
        err.statusCode = 401;
        throw err;
    }
    // Slide the session: this device was just used, so it gets another full window.
    await pool.execute(
        'UPDATE refresh_tokens SET expires_at = ? WHERE token_hash = ?',
        [new Date(Date.now() + SESSION_MS), tokenHash]
    );
    return issueAccessToken(users[0]);
}

async function logout(refreshToken) {
    if (refreshToken) {
        const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        await pool.execute('DELETE FROM refresh_tokens WHERE token_hash = ?', [tokenHash]);
    }
}

async function getMe(token) {
    let payload;
    try { payload = jwt.verify(token, JWT_SECRET); }
    catch {
        const err = new Error('Invalid or expired token');
        err.statusCode = 401;
        throw err;
    }
    const [rows] = await pool.query('SELECT * FROM users WHERE id = ?', [payload.userId]);
    if (!rows.length) {
        const err = new Error('User not found');
        err.statusCode = 404;
        throw err;
    }
    return rows[0];
}

async function acceptTerms(userId) {
    await pool.execute(
        'UPDATE users SET terms_accepted_at = NOW(), terms_version = ? WHERE id = ?',
        [CURRENT_TERMS_VERSION, userId]
    );
    return CURRENT_TERMS_VERSION;
}

module.exports = {
    issueTokens, upsertSocialUser,
    loginPasswordless, consumeMagicToken, consumeMagicCode,
    refreshAccessToken, logout, getMe, acceptTerms,
    CURRENT_TERMS_VERSION, SESSION_DAYS
};
