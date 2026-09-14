/**
 * End-to-end check of the API auth layer.
 *
 * The OPA5 suite runs against MockServer, which stubs window.fetch and never
 * reaches Express, so it cannot prove any of this. Run it against a throwaway
 * local database — never against production, it writes rows.
 *
 *   mysql -u root -proot -e "CREATE DATABASE helpado_authtest;"
 *
 *   CORS_ORIGIN=http://localhost:8080 \
 *   MYSQL_HOST=127.0.0.1 MYSQL_PORT=3306 MYSQL_USER=root MYSQL_PASSWORD=root \   # MAMP: MYSQL_PORT=8889
 *   MYSQL_DATABASE=helpado_authtest \
 *   JWT_SECRET=test-jwt-secret-local REFRESH_SECRET=test-refresh-secret-local \
 *   ADMIN_PANEL_TOKEN=test-admin-token PORT=3100 node server.js &
 *
 *   MYSQL_PORT=3306 node test/auth.e2e.js         # same port as above
 *
 *   mysql -u root -proot -e "DROP DATABASE helpado_authtest;"
 */
const jwt   = require('jsonwebtoken');
const mysql = require('mysql2/promise');

const BASE = 'http://localhost:3100/api';
const SECRET = 'test-jwt-secret-local';
const ADMIN = 'test-admin-token';

const ALICE = 'U_ALICE', BOB = 'U_BOB', MALLORY = 'U_MALLORY';
const tok = id => jwt.sign({ userId: id, email: id + '@t.invalid' }, SECRET, { expiresIn: '15m' });

let pass = 0, fail = 0;
function check(name, ok, detail) {
    (ok ? pass++ : fail++);
    console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${ok ? '' : '   <-- ' + detail}`);
}
async function req(method, path, { token, admin, body } = {}) {
    const headers = {};
    if (body)  headers['Content-Type'] = 'application/json';
    if (token) headers.Authorization = 'Bearer ' + token;
    if (admin) headers['x-admin-token'] = ADMIN;
    const res = await fetch(BASE + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    let json = null;
    try { json = await res.json(); } catch { /* no body */ }
    return { status: res.status, json };
}

(async () => {
    const db = await mysql.createPool({
        host: '127.0.0.1', port: Number(process.env.MYSQL_PORT || 3306), user: 'root', password: 'root',
        database: 'helpado_authtest'
    });

    // ── seed ──────────────────────────────────────────────────────────────
    for (const [id, role] of [[ALICE, 'user'], [BOB, 'provider'], [MALLORY, 'user']]) {
        await db.execute(
            `INSERT INTO users (id, name, email, role, status)
             VALUES (?, ?, ?, ?, 'Active')
             ON DUPLICATE KEY UPDATE name = VALUES(name)`,
            [id, id, id + '@t.invalid', role]);
    }
    await db.execute(
        `INSERT INTO bookings (id, customer_id, provider_id, service, status)
         VALUES ('BK_1', ?, ?, 'Cleaning', 'confirmed')
         ON DUPLICATE KEY UPDATE status = 'confirmed'`, [ALICE, BOB]);
    await db.execute(
        `INSERT INTO conversations (id, participant_1, participant_2)
         VALUES ('CV_1', ?, ?)
         ON DUPLICATE KEY UPDATE participant_2 = VALUES(participant_2)`, [ALICE, BOB]);

    const alice = tok(ALICE), bob = tok(BOB), mallory = tok(MALLORY);

    // ── 1. the endpoints that were wide open ──────────────────────────────
    let r = await req('GET', `/bookings/user/${ALICE}`);
    check("GET bookings/user/:id  unauthenticated -> 401", r.status === 401, r.status);

    r = await req('GET', `/bookings/user/${ALICE}`, { token: mallory });
    check("GET bookings/user/:id  as another user -> 403", r.status === 403, r.status);

    r = await req('GET', `/bookings/user/${ALICE}`, { token: alice });
    check("GET bookings/user/:id  as the owner -> 200", r.status === 200, r.status);

    r = await req('GET', `/notifications/${ALICE}`, { token: mallory });
    check("GET notifications/:userId as another user -> 403", r.status === 403, r.status);

    r = await req('GET', `/messages/CV_1`, { token: mallory });
    check("GET messages/:conversationId  as a non-participant -> 403", r.status === 403, r.status);

    r = await req('GET', `/messages/CV_1`, { token: bob });
    check("GET messages/:conversationId  as a participant -> 200", r.status === 200, r.status);

    // ── 2. the rating-gate bypass chain ───────────────────────────────────
    r = await req('PUT', `/bookings/BK_1/status`, { body: { status: 'completed' } });
    check("PUT booking status  unauthenticated -> 401", r.status === 401, r.status);

    r = await req('PUT', `/bookings/BK_1/status`, { token: mallory, body: { status: 'completed' } });
    check("PUT booking status  as an outsider -> 403", r.status === 403, r.status);

    const [[bk]] = await db.query("SELECT status FROM bookings WHERE id = 'BK_1'");
    check("booking status unchanged after those attempts", bk.status === 'confirmed', bk.status);

    r = await req('POST', `/ratings`, {
        token: mallory, body: { provider_id: BOB, user_id: MALLORY, stars: 5, comment: 'fake' } });
    check("POST rating with no completed booking -> rejected", r.status >= 400, r.status);

    // ── 3. body-supplied identity is overwritten, not trusted ─────────────
    r = await req('POST', `/bookings`, {
        token: mallory,
        body: { customer_id: ALICE, provider_id: BOB, service: 'Cleaning', scheduled_date: '2030-01-01' } });
    check("POST booking claiming another customer_id -> accepted", r.status === 200, r.status);
    const [[claimed]] = await db.query(
        "SELECT customer_id FROM bookings WHERE provider_id = ? AND scheduled_date = '2030-01-01' LIMIT 1", [BOB]);
    check("  ...but recorded under the real caller, not the claimed id",
        claimed && claimed.customer_id === MALLORY, claimed && claimed.customer_id);

    // ── 4. self-service vs moderation on users ────────────────────────────
    r = await req('PUT', `/users/${ALICE}`, { token: mallory, body: { name: 'hacked' } });
    check("PUT users/:id  editing someone else -> 403", r.status === 403, r.status);

    r = await req('PUT', `/users/${BOB}/approve`, { token: bob });
    check("PUT users/:id/approve  self-approval -> 403", r.status === 403, r.status);

    r = await req('PUT', `/users/${BOB}/approve`, { admin: true });
    check("PUT users/:id/approve  with admin token -> 200", r.status === 200, r.status);

    r = await req('PUT', `/users/${ALICE}`, { admin: true, body: { name: 'Alice A' } });
    check("PUT users/:id  with admin token -> 200", r.status === 200, r.status);

    // ── 5. catalogue + admin header spoofing ──────────────────────────────
    r = await req('POST', `/services`, { token: mallory, body: { name: 'Junk', category: 'x' } });
    check("POST services  as a normal user -> 403/401", r.status === 401 || r.status === 403, r.status);

    r = await req('GET', `/stats`, { token: mallory });
    check("GET stats  as a normal user -> 403", r.status === 403, r.status);

    r = await req('GET', `/admin/reports`, { token: mallory });
    check("GET admin/reports  as a normal user -> 403", r.status === 403, r.status);

    r = await req('GET', `/stats`, { admin: true });
    check("GET stats  with admin token -> 200", r.status === 200, r.status);

    // ── 6. still public on purpose ────────────────────────────────────────
    r = await req('GET', `/providers`);
    check("GET providers  stays public -> 200", r.status === 200, r.status);
    r = await req('GET', `/services`);
    check("GET services  stays public -> 200", r.status === 200, r.status);
    r = await req('GET', `/home/activity`);
    check("GET home/activity  stays public -> 200", r.status === 200, r.status);

    // ── 7. sessions slide — a device in use never needs a new login code ──
    // The refresh JWT used to expire 60 days after LOGIN, so even a daily user
    // was sent back to the email code on day 61. Now every successful refresh
    // pushes the row's expires_at forward; only a device silent for the whole
    // window expires.
    const RSECRET = 'test-refresh-secret-local';
    const rtok = jwt.sign({ userId: ALICE }, RSECRET, { expiresIn: '400d' });
    const rhash = require('crypto').createHash('sha256').update(rtok).digest('hex');
    const nearExpiry = new Date(Date.now() + 60 * 1000);   // would die in a minute
    await db.execute("DELETE FROM refresh_tokens WHERE user_id = ?", [ALICE]);
    await db.execute("INSERT INTO refresh_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)", [ALICE, rhash, nearExpiry]);

    r = await req('POST', `/auth/refresh`, { body: { refreshToken: rtok } });
    check("POST auth/refresh with a live token -> 200 + accessToken", r.status === 200 && !!(r.json && r.json.accessToken), r.status);
    const [[row]] = await db.query("SELECT expires_at FROM refresh_tokens WHERE token_hash = ?", [rhash]);
    const daysLeft = (new Date(row.expires_at) - Date.now()) / 86400000;
    check("  ...and the session slid forward to ~60 days from now", daysLeft > 59 && daysLeft <= 60.01, daysLeft.toFixed(2) + " days");

    await db.execute("UPDATE refresh_tokens SET expires_at = ? WHERE token_hash = ?", [new Date(Date.now() - 1000), rhash]);
    r = await req('POST', `/auth/refresh`, { body: { refreshToken: rtok } });
    check("POST auth/refresh with an expired row -> 401 (a silent device does expire)", r.status === 401, r.status);
    const [[stale]] = await db.query("SELECT expires_at FROM refresh_tokens WHERE token_hash = ?", [rhash]);
    check("  ...and a refused refresh does not slide the row", new Date(stale.expires_at) < new Date(), stale.expires_at);

    await db.execute("UPDATE refresh_tokens SET expires_at = ? WHERE token_hash = ?", [nearExpiry, rhash]);
    r = await req('POST', `/auth/logout`, { body: { refreshToken: rtok } });
    const [[gone]] = await db.query("SELECT COUNT(*) AS n FROM refresh_tokens WHERE token_hash = ?", [rhash]);
    check("POST auth/logout deletes the row, so a stolen token dies with the session", r.status === 200 && gone.n === 0, gone.n);
    r = await req('POST', `/auth/refresh`, { body: { refreshToken: rtok } });
    check("POST auth/refresh after logout -> 401", r.status === 401, r.status);

    console.log(`\n${pass} passed, ${fail} failed`);
    await db.end();
    process.exit(fail ? 1 : 0);
})();
