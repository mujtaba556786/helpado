const crypto       = require('crypto');
const nodemailer   = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const AuthService  = require('../services/AuthService');
const pool         = require('../db/pool');

const GOOGLE_CLIENT_ID  = process.env.GOOGLE_CLIENT_ID;
const googleClient      = new OAuth2Client(GOOGLE_CLIENT_ID);

// ── Email sending ─────────────────────────────────────────────────────────────
// Priority: Resend API (HTTPS, works on Railway) → SMTP (local dev fallback)
//
// To enable on Railway: add RESEND_API_KEY in the Variables tab.
// Sign up free at https://resend.com — 3,000 emails/month free.

const EMAIL_HTML = (magicUrl, code) =>
    `<div style="font-family:sans-serif;max-width:420px;margin:auto">
        <h2 style="color:#4FB584">Helpado</h2>
        <p>Use either option below to sign in. This expires in <strong>15 minutes</strong> and can only be used once.</p>
        <p style="margin:8px 0 4px;color:#555"><strong>On the web:</strong> tap the button.</p>
        <a href="${magicUrl}" style="display:inline-block;padding:12px 28px;background:#4FB584;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;margin:8px 0 16px">Sign in to Helpado</a>
        <p style="margin:8px 0 4px;color:#555"><strong>In the app:</strong> enter this code:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#0f172a;margin:4px 0 16px">${code}</p>
        <p style="color:#888;font-size:12px">If you didn't request this, you can safely ignore this email.</p>
     </div>`;

async function sendEmail({ to, subject, html }) {
    // ── Resend (HTTPS API — no port 587 needed, works on Railway) ────────────
    if (process.env.RESEND_API_KEY) {
        const from = process.env.SMTP_FROM || 'Helpado <onboarding@resend.dev>';
        const res = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ from, to, subject, html })
        });
        const data = await res.json();
        if (!res.ok) throw new Error('Resend error: ' + (data.message || JSON.stringify(data)));
        console.log(`[AUTH] Email sent via Resend to ${to} (id: ${data.id})`);
        return;
    }

    // ── Ethereal (dev preview — set USE_ETHEREAL=true) ───────────────────────
    if (process.env.USE_ETHEREAL === 'true') {
        const testAccount = await nodemailer.createTestAccount();
        const t = nodemailer.createTransport({
            host: 'smtp.ethereal.email', port: 587, secure: false,
            auth: { user: testAccount.user, pass: testAccount.pass }
        });
        const info = await t.sendMail({ from: 'Helpado <noreply@helphub.local>', to, subject, html });
        console.log(`\n📧 Ethereal preview: ${nodemailer.getTestMessageUrl(info)}\n`);
        return;
    }

    // ── SMTP fallback (local dev with Gmail app-password) ────────────────────
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error('No email provider configured. Set RESEND_API_KEY in Railway env vars.');
    }
    const host = process.env.SMTP_HOST || 'smtp.gmail.com';
    const t = nodemailer.createTransport({
        host, port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        family: 4,
        connectionTimeout: 8000, greetingTimeout: 5000, socketTimeout: 10000,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });
    await t.sendMail({
        from: process.env.SMTP_FROM || '"Helpado" <noreply@helphub.local>',
        to, subject, html
    });
    console.log(`[AUTH] Email sent via SMTP to ${to}`);
}

async function googleLogin(req, res) {
    const { idToken } = req.body;
    if (!idToken) return res.status(400).json({ success: false, error: 'idToken is required' });
    if (!GOOGLE_CLIENT_ID) return res.status(500).json({ success: false, error: 'GOOGLE_CLIENT_ID not configured on server' });

    let payload;
    try {
        const ticket = await googleClient.verifyIdToken({ idToken, audience: GOOGLE_CLIENT_ID });
        payload = ticket.getPayload();
    } catch (err) {
        console.error('Google token verification failed:', err.message);
        return res.status(401).json({ success: false, error: 'Invalid Google token' });
    }

    const { email, name, picture } = payload;
    const result = await AuthService.upsertSocialUser({ email, name, avatar: picture, provider: 'Google' });
    res.json({ success: true, ...result });
}

async function facebookLogin(req, res) {
    const { accessToken: fbAccessToken } = req.body;
    if (!fbAccessToken) return res.status(400).json({ success: false, error: 'accessToken is required' });

    let fbData;
    try {
        const fbRes = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture.type(large)&access_token=${encodeURIComponent(fbAccessToken)}`);
        fbData = await fbRes.json();
    } catch (err) {
        console.error('Facebook Graph API call failed:', err.message);
        return res.status(502).json({ success: false, error: 'Could not reach Facebook API' });
    }

    if (fbData.error) {
        console.error('Facebook token invalid:', fbData.error);
        return res.status(401).json({ success: false, error: 'Invalid Facebook token' });
    }

    const email  = fbData.email || `fb_${fbData.id}@facebook.com`;
    const avatar = fbData.picture?.data?.url || null;
    const result = await AuthService.upsertSocialUser({ email, name: fbData.name, avatar, provider: 'Facebook' });
    res.json({ success: true, ...result });
}

async function passwordlessLogin(req, res) {
    // SECURITY: this logs in any email with no ownership proof — testing only.
    // Disabled unless ALLOW_DEMO_LOGIN=true is explicitly set (never in production).
    if (process.env.ALLOW_DEMO_LOGIN !== 'true') {
        return res.status(403).json({ success: false, error: 'Demo login is disabled.' });
    }
    const { email, role, provider } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required' });
    const result = await AuthService.loginPasswordless(email, role, provider);
    res.json({ success: true, ...result });
}

async function sendMagicLink(req, res) {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: 'email is required' });

    // SECURITY: every login must prove email ownership. We always send a one-time
    // link + 6-digit code; tokens are only issued after the link is clicked
    // (consumeMagicToken) or the code is entered (consumeMagicCode). There is NO
    // direct-login shortcut for existing users — that allowed account takeover by
    // anyone who merely knew the email. Returning users stay signed in via the
    // stored refresh token (auto-login in Component.js), so this only appears on a
    // new device or after logout.
    const rawToken    = crypto.randomBytes(32).toString('hex');
    const tokenHash   = crypto.createHash('sha256').update(rawToken).digest('hex');
    const code        = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    const codeHash    = crypto.createHash('sha256').update(code).digest('hex');
    const expiresAt   = new Date(Date.now() + 15 * 60 * 1000);
    const backendBase = process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;

    await pool.execute('DELETE FROM magic_link_tokens WHERE email = ?', [email]);
    await pool.execute(
        'INSERT INTO magic_link_tokens (token_hash, code_hash, email, expires_at) VALUES (?, ?, ?, ?)',
        [tokenHash, codeHash, email, expiresAt]
    );

    const magicUrl = `${backendBase}/api/auth/magic?token=${rawToken}`;
    try {
        await sendEmail({ to: email, subject: 'Sign in to Helpado', html: EMAIL_HTML(magicUrl, code) });
        console.log(`[AUTH] Magic-link + code email sent to: ${email}`);
        res.json({ success: true, directLogin: false, message: 'Sign-in link & code sent — check your inbox.' });
    } catch (err) {
        console.error('[AUTH] Failed to send magic link email:', err.message);
        console.log(`[DEV] Magic link for ${email}: ${magicUrl}  (code: ${code})`);
        res.status(500).json({ success: false, error: 'Could not send sign-in email. Please try again.' });
    }
}

// Verify the 6-digit code from the email (mobile-friendly path) and issue tokens.
async function verifyOtp(req, res) {
    const { email, code } = req.body;
    if (!email || !code) return res.status(400).json({ success: false, error: 'email and code are required' });
    try {
        const result = await AuthService.consumeMagicCode(email, code);
        console.log(`[AUTH] OTP code login for: ${email}`);
        res.json({ success: true, ...result });
    } catch (err) {
        const msg = err.message === 'expired'
            ? 'This code has expired. Request a new one.'
            : 'Invalid code. Please check and try again.';
        res.status(400).json({ success: false, error: msg });
    }
}

// Admin panel login: validates a password against ADMIN_PASSWORD (constant-time)
// and returns the admin API token. The token is never shipped in the client build.
async function adminLogin(req, res) {
    const { password } = req.body;
    const expected = process.env.ADMIN_PASSWORD;
    if (!expected) {
        return res.status(503).json({ success: false, error: 'Admin login is not configured on the server.' });
    }
    const a = crypto.createHash('sha256').update(String(password || '')).digest();
    const b = crypto.createHash('sha256').update(String(expected)).digest();
    if (!crypto.timingSafeEqual(a, b)) {
        return res.status(401).json({ success: false, error: 'Incorrect password.' });
    }
    const token = process.env.ADMIN_PANEL_TOKEN || 'helphub-admin-panel';
    console.log('[AUTH] Admin panel login');
    res.json({ success: true, token });
}

async function magicLinkCallback(req, res) {
    const { token } = req.query;
    if (!token) return res.status(400).send('Missing token.');

    const frontendBase = process.env.FRONTEND_URL || process.env.BACKEND_URL || `${req.protocol}://${req.get('host')}`;
    const tokenHash    = crypto.createHash('sha256').update(token).digest('hex');
    try {
        const { accessToken, refreshToken } = await AuthService.consumeMagicToken(tokenHash);
        return res.redirect(`${frontendBase}/?accessToken=${encodeURIComponent(accessToken)}&refreshToken=${encodeURIComponent(refreshToken)}`);
    } catch (err) {
        const msg = err.message === 'expired'
            ? 'This sign-in link has expired. Links are valid for 15 minutes.'
            : 'This sign-in link is invalid or has already been used.';
        return res.status(400).send(`<html><body style="font-family:sans-serif;text-align:center;padding:40px">
            <h2 style="color:#4FB584">Helpado</h2><p>${msg}</p>
            <p><a href="${frontendBase}">Request a new link</a></p>
            </body></html>`);
    }
}

async function getMe(req, res) {
    const auth  = req.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ success: false, error: 'No token provided' });
    const user = await AuthService.getMe(token);
    res.json({ success: true, user });
}

async function refreshToken(req, res) {
    const { refreshToken: rt } = req.body;
    if (!rt) return res.status(400).json({ success: false, error: 'refreshToken is required' });
    const accessToken = await AuthService.refreshAccessToken(rt);
    res.json({ success: true, accessToken });
}

async function logout(req, res) {
    await AuthService.logout(req.body.refreshToken);
    res.json({ success: true, message: 'Logged out' });
}

async function acceptTerms(req, res) {
    const version = await AuthService.acceptTerms(req.userId);
    res.json({ success: true, terms_version: version });
}

function getTermsVersion(req, res) {
    res.json({ version: AuthService.CURRENT_TERMS_VERSION });
}

module.exports = {
    googleLogin, facebookLogin, passwordlessLogin,
    sendMagicLink, verifyOtp, adminLogin, magicLinkCallback,
    getMe, refreshToken, logout, acceptTerms, getTermsVersion
};
