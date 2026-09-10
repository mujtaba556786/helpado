const pool = require('../db/pool');
const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const https = require('https');

/**
 * Geocode a human-readable address using OpenStreetMap Nominatim (no API key needed).
 * Returns { lat, lng } or null if the address cannot be resolved.
 */
async function geocodeAddress({ street_name, street_number, city, state, country, pincode } = {}) {
    const parts = [
        street_number && street_name ? `${street_number} ${street_name}` : (street_name || ''),
        city,
        state,
        pincode,
        country
    ].filter(Boolean);
    if (!parts.length) return null;

    const q = encodeURIComponent(parts.join(', '));
    const url = `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`;

    return new Promise((resolve) => {
        const req = https.get(url, { headers: { 'User-Agent': 'Helpado/1.0 mujtabaahmed556@gmail.com' } }, (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    const results = JSON.parse(body);
                    if (results && results[0]) {
                        resolve({ lat: parseFloat(results[0].lat), lng: parseFloat(results[0].lon) });
                    } else {
                        resolve(null);
                    }
                } catch { resolve(null); }
            });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(5000, () => { req.destroy(); resolve(null); });
    });
}

const UPLOADS_DIR = path.join(__dirname, '../uploads');

async function createMailTransporter() {
    if (process.env.USE_ETHEREAL === 'true') {
        const testAccount = await nodemailer.createTestAccount();
        const transporter = nodemailer.createTransport({ host: 'smtp.ethereal.email', port: 587, secure: false, auth: { user: testAccount.user, pass: testAccount.pass } });
        return { transporter, isEthereal: true };
    }
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const transporter = nodemailer.createTransport({ host, port: parseInt(process.env.SMTP_PORT || '587'), secure: process.env.SMTP_SECURE === 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
    return { transporter, isEthereal: host.includes('ethereal.email') };
}

async function getAll() {
    const [rows] = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
    return rows;
}

async function updateUser(id, b) {
    if (b.pincode && !/^[A-Za-z0-9\s\-]{3,10}$/.test(b.pincode.trim())) {
        throw Object.assign(new Error('Invalid postal code format'), { status: 400 });
    }

    const fields = [];
    const values = [];
    const add = (col, val) => { fields.push(`${col} = ?`); values.push(val); };

    if (b.name        !== undefined) add('name',              b.name || null);
    if (b.bio         !== undefined) add('bio',               b.bio || null);
    if (b.languages   !== undefined) add('languages',         b.languages || null);
    if (b.years       !== undefined) add('years',             parseInt(b.years || 0));
    if (b.phone       !== undefined) add('phone',             b.phone || null);
    if (b.rate        !== undefined) add('rate',              parseFloat(b.rate || 0));
    if (b.availability !== undefined) {
        add('availability', Array.isArray(b.availability) ? b.availability.join(',') : (b.availability || ''));
    }
    if (b.serviceCategories !== undefined) {
        const cats = Array.isArray(b.serviceCategories)
            ? b.serviceCategories
            : (b.serviceCategories || '').split(',').filter(Boolean);
        // Fetch current plan to enforce free-tier category limit
        const [[current]] = await pool.query('SELECT subscription_plan, role FROM users WHERE id = ?', [id]);
        if (current && current.role === 'provider' && (current.subscription_plan || 'free') === 'free' && cats.length > 3) {
            throw Object.assign(new Error('Free providers can list up to 3 service categories. Upgrade to Pro for unlimited.'), { status: 400 });
        }
        add('service_categories', cats.join(','));
    }
    if (b.street_name   !== undefined) add('street_name',   b.street_name || null);
    if (b.street_number !== undefined) add('street_number', b.street_number || null);
    if (b.city          !== undefined) add('city',          b.city || null);
    if (b.state         !== undefined) add('state',         b.state || null);
    if (b.country       !== undefined) add('country',       b.country || null);
    if (b.pincode       !== undefined) add('pincode',       b.pincode || null);
    if (b.lat           !== undefined) add('lat',           parseFloat(b.lat) || null);
    if (b.lng           !== undefined) add('lng',           parseFloat(b.lng) || null);

    if (fields.length === 0) throw Object.assign(new Error('No fields to update'), { status: 400 });

    values.push(id);
    await pool.execute(`UPDATE users SET ${fields.join(', ')} WHERE id = ?`, values);

    // Auto-geocode: if address fields changed but lat/lng weren't explicitly provided,
    // fetch coordinates in background so provider appears in location searches.
    const addressChanged = ['street_name','street_number','city','state','country','pincode']
        .some(k => b[k] !== undefined);
    const latLngExplicit = b.lat !== undefined || b.lng !== undefined;
    if (addressChanged && !latLngExplicit) {
        // Fetch current address from DB and geocode
        const [[row]] = await pool.query(
            'SELECT street_name, street_number, city, state, country, pincode, lat, lng FROM users WHERE id = ?', [id]
        );
        if (row && row.lat == null) {
            geocodeAddress(row).then(async (coords) => {
                if (coords) {
                    await pool.execute('UPDATE users SET lat = ?, lng = ? WHERE id = ?',
                        [coords.lat, coords.lng, id]);
                    console.log(`[GEO] Geocoded user ${id}: ${coords.lat}, ${coords.lng}`);
                }
            }).catch(e => console.error('[GEO] Geocoding error:', e.message));
        }
    }
}

async function uploadAvatar(id, filenameOrUrl) {
    const [existing] = await pool.query('SELECT avatar FROM users WHERE id = ?', [id]);
    const oldAvatar = existing[0]?.avatar;
    // Clean up old local file only (skip Cloudinary/external URLs)
    if (oldAvatar && oldAvatar.startsWith('/uploads/')) {
        const oldPath = path.join(UPLOADS_DIR, path.basename(oldAvatar));
        if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    // Cloudinary gives a full https URL; local disk gives just a filename
    const avatarUrl = filenameOrUrl.startsWith('http')
        ? filenameOrUrl
        : `/uploads/${filenameOrUrl}`;
    await pool.execute('UPDATE users SET avatar = ? WHERE id = ?', [avatarUrl, id]);
    return avatarUrl;
}

const HERO_CATEGORY = 'Cleaning';

async function getProviders(category) {
    // Select monetization columns alongside existing fields
    // created_at and completed_jobs back the two facts shown on a provider card.
    // They replaced a "Verified" badge that claimed an identity check nobody
    // performs — these are things the database can actually prove.
    // NB: trust_level is deliberately NOT selected. It is an internal moderation
    // score (account age + activity + absence of reports), not a verification,
    // and must not be surfaced to users as one.
    let sql = `SELECT id, name, avatar, bio, rating, rate, city, state, country,
                      lat, lng, languages, years, availability, service_categories, phone,
                      subscription_plan, featured_until, featured_category, monthly_booking_value,
                      created_at,
                      (SELECT COUNT(*) FROM bookings b
                        WHERE b.provider_id = users.id
                          AND b.status = 'completed') AS completed_jobs
               FROM users
               WHERE service_categories IS NOT NULL
                 AND service_categories != ''
                 AND service_categories != 'None'`;
    const params = [];
    if (category) {
        sql += ' AND FIND_IN_SET(?, service_categories)';
        params.push(category);
    }
    // Ranking: featured (1000) → Pro (+20) → hero category (+15) → rating×10
    const heroBoost  = category === HERO_CATEGORY ? 15 : 0;
    const catParam   = category || '';
    sql += `
        ORDER BY
          (CASE WHEN featured_until > NOW()
                 AND (featured_category = ? OR featured_category IS NULL)
                THEN 1000 ELSE 0 END) DESC,
          (CASE WHEN subscription_plan = 'pro' THEN 20 ELSE 0 END
           + ${heroBoost}
           + COALESCE(rating, 0) * 10) DESC`;
    params.push(catParam);

    const [rows] = await pool.query(sql, params);
    return rows.map(u => ({
        id: u.id,
        name: u.name,
        photo: u.avatar && u.avatar.startsWith('/uploads/') ? `${process.env.BACKEND_URL || process.env.API_BASE_URL || 'https://helphub-production.up.railway.app'}${u.avatar}` : (u.avatar || ''),
        bio: u.bio || '',
        rating: u.rating || 5.0,
        rate: u.rate || 0,
        currency: 'EUR',
        city: u.city || '',
        lat: u.lat,
        lng: u.lng,
        languages: u.languages || '',
        years: u.years || 0,
        availability: u.availability || 'Available Now',
        serviceType: u.service_categories || '',
        service_categories: u.service_categories || '',
        phone: u.phone || '',
        subscription_plan: u.subscription_plan || 'free',
        featured_until: u.featured_until || null,
        featured_category: u.featured_category || null,
        monthly_booking_value: parseFloat(u.monthly_booking_value) || 0
    }));
}

async function getProviderRatings(providerId) {
    const [rows] = await pool.query(
        `SELECT r.id, r.stars, r.comment, r.created_at, r.status,
                COALESCE(u.name, r.reviewer_name, 'Anonymous') AS reviewer_name,
                u.avatar AS reviewer_avatar
         FROM ratings r
         LEFT JOIN users u ON u.id = r.user_id
         WHERE r.provider_id = ? AND r.status IN ('approved', 'pending')
         ORDER BY r.created_at DESC`,
        [providerId]
    );
    return rows;
}

async function createRating({ provider_id, user_id, reviewer_name, stars, comment }) {
    if (!provider_id) throw Object.assign(new Error('provider_id is required'), { status: 400 });
    if (!user_id)     throw Object.assign(new Error('user_id is required — must be logged in to rate'), { status: 400 });
    if (user_id === provider_id) throw Object.assign(new Error('You cannot rate yourself'), { status: 400 });
    const iStars = parseInt(stars);
    if (!iStars || iStars < 1 || iStars > 5) throw Object.assign(new Error('stars must be 1–5'), { status: 400 });

    // You may only review someone you actually hired. Without this, any logged-in
    // user could rate any provider they had never met — enough for a competitor to
    // sink a provider's rating, and it made every existing rating meaningless.
    // Hiding the form client-side is not sufficient: this endpoint is callable
    // directly.
    const [[booked]] = await pool.query(
        "SELECT id FROM bookings WHERE customer_id = ? AND provider_id = ? AND status = 'completed' LIMIT 1",
        [user_id, provider_id]
    );
    if (!booked) {
        throw Object.assign(
            new Error('You can only review a helper after a completed booking with them'),
            { status: 403 }
        );
    }

    const [[existing]] = await pool.query('SELECT id FROM ratings WHERE provider_id = ? AND user_id = ?', [provider_id, user_id]);
    if (existing) {
        await pool.execute(
            'UPDATE ratings SET stars = ?, comment = ?, reviewer_name = ?, status = ?, created_at = NOW() WHERE provider_id = ? AND user_id = ?',
            [iStars, comment || null, reviewer_name || 'Anonymous', 'pending', provider_id, user_id]
        );
    } else {
        await pool.execute(
            'INSERT INTO ratings (provider_id, user_id, reviewer_name, stars, comment, status) VALUES (?, ?, ?, ?, ?, ?)',
            [provider_id, user_id, reviewer_name || 'Anonymous', iStars, comment || null, 'pending']
        );
    }

    const [[{ avg }]] = await pool.query(
        "SELECT ROUND(AVG(stars), 1) AS avg FROM ratings WHERE provider_id = ? AND status != 'rejected'",
        [provider_id]
    );
    await pool.execute('UPDATE users SET rating = ? WHERE id = ?', [avg || null, provider_id]);
    return { newAverage: avg, updated: !!existing };
}

async function updateStatus(id, status) {
    if (!status) throw Object.assign(new Error('status is required'), { status: 400 });
    await pool.execute('UPDATE users SET status = ? WHERE id = ?', [status, id]);
}

async function approveUser(id) {
    await pool.execute("UPDATE users SET status = 'Active' WHERE id = ?", [id]);
    try {
        const [[user]] = await pool.query('SELECT name, email FROM users WHERE id = ?', [id]);
        if (user) {
            await pool.execute(
                'INSERT INTO notifications (user_id, type, title, message) VALUES (?, ?, ?, ?)',
                [id, 'admin_warning', '🎉 Account Approved!',
                 'Your provider account has been approved. You can now receive bookings and apply to tasks.']
            );
            if (user.email) {
                const { transporter, isEthereal } = await createMailTransporter();
                const info = await transporter.sendMail({
                    from: `"Helpado" <${process.env.SMTP_USER || 'noreply@helpado.app'}>`,
                    to: user.email,
                    subject: '🎉 Your Helpado provider account is approved!',
                    html: `<div style="font-family:sans-serif;max-width:520px;margin:auto">
                        <h2>Welcome to Helpado, ${user.name || 'there'}!</h2>
                        <p>Great news — your provider account has been <strong>approved</strong>.</p>
                        <p>You can now:</p>
                        <ul>
                            <li>Receive booking requests from customers</li>
                            <li>Browse and apply to posted tasks</li>
                            <li>Build your reputation with reviews</li>
                        </ul>
                        <p>Log in to get started.</p>
                        <p style="color:#888;font-size:12px">Helpado — Neighborhood Help Network</p>
                    </div>`
                });
                if (isEthereal) console.log('Provider approval email preview:', nodemailer.getTestMessageUrl(info));
            }
        }
    } catch (e) {
        console.error('Provider approval notification error:', e.message);
    }
}

async function onboardUser(id, { name, role, bio }) {
    const newStatus = role === 'Provider' ? 'Pending Approval' : 'Active';
    await pool.execute(
        'UPDATE users SET name = ?, role = ?, bio = ?, onboarded = 1, status = ? WHERE id = ?',
        [name || null, role || 'Customer', bio || null, newStatus, id]
    );
    return newStatus;
}

async function updateProfile(id, { name, bio, avatar }) {
    await pool.execute(
        'UPDATE users SET name = ?, bio = ?, avatar = ? WHERE id = ?',
        [name || null, bio || null, avatar || null, id]
    );
}

module.exports = {
    getAll, updateUser, uploadAvatar, getProviders, getProviderRatings,
    createRating, updateStatus, approveUser, onboardUser, updateProfile
};
