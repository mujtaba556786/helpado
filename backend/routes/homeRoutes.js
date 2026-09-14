const express = require('express');
const router  = express.Router();
const pool    = require('../db/pool');
const { handleAsync } = require('../middleware/auth');
const { HELPER_WHERE } = require('../services/UserService');

// GET /api/home/activity — public, no auth required
// Returns live marketplace pulse signals for the home screen activity strip
router.get('/activity', handleAsync(async (req, res) => {
    // Same definition of "helper" as the marketplace list (HELPER_WHERE) —
    // this used to require role = 'provider', which no real account has, so
    // the strip counted 0 and hid itself in production. "Nearby" still needs
    // a location.
    const [[{ helpers }]] = await pool.query(
        `SELECT COUNT(*) AS helpers FROM users
         WHERE ${HELPER_WHERE}
           AND lat IS NOT NULL`
    );

    const [[{ requests }]] = await pool.query(
        `SELECT COUNT(*) AS requests FROM tasks
         WHERE status = 'open'
           AND created_at > DATE_SUB(NOW(), INTERVAL 24 HOUR)`
    );

    const [recent] = await pool.query(
        `SELECT b.service, u.city
         FROM bookings b
         JOIN users u ON u.id = b.provider_id
         WHERE b.status IN ('confirmed', 'completed')
         ORDER BY b.created_at DESC
         LIMIT 3`
    );

    res.json({ success: true, helpers, requests, recent });
}));

module.exports = router;
