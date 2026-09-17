/**
 * Static marketing pages (landing page, safety guide) under frontend/webapp/site.
 *
 * The app itself must stay at "/" — the magic-link redirect and the APK both
 * boot from index.html there — so the landing page lives at /welcome on every
 * host and takes over "/" only on LANDING_HOST (e.g. helpado.de) once that is
 * set. The pages link to the app through the __APP_URL__ token so one file
 * works on both hosts.
 */
const fs   = require('fs');
const path = require('path');

const SITE_DIR = path.join(__dirname, '../../frontend/webapp/site');

const PAGES = {
    welcome:    'index.html',
    sicherheit: 'sicherheit.html'
};

/** Pure: token replacement only, so it can be tested without a server. */
function renderSitePage(html, appUrl) {
    const base = String(appUrl || '').replace(/\/+$/, '');
    return html.split('__APP_URL__').join(base);
}

/** The app's public base: FRONTEND_URL is what the magic link already redirects to. */
function appUrlFor(req) {
    return process.env.FRONTEND_URL || process.env.APP_URL || `${req.protocol}://${req.get('host')}`;
}

function readPage(name) {
    const file = PAGES[name];
    if (!file) return null;
    return fs.readFileSync(path.join(SITE_DIR, file), 'utf8');
}

/** True when this request should get the landing page instead of the app at "/". */
function isLandingHost(req) {
    const host = (process.env.LANDING_HOST || '').trim().toLowerCase();
    return !!host && (req.hostname || '').toLowerCase() === host;
}

module.exports = { renderSitePage, appUrlFor, readPage, isLandingHost, PAGES };
