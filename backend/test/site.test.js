/**
 * Marketing pages: token replacement and host routing, without a database.
 *   node --test backend/test/site.test.js
 */
const { test } = require('node:test');
const assert   = require('node:assert/strict');
const Site     = require('../services/SiteService');

test('renderSitePage replaces every __APP_URL__ and strips a trailing slash', () => {
    const html = '<a href="__APP_URL__/">x</a><a href="__APP_URL__/">y</a>';
    assert.equal(Site.renderSitePage(html, 'https://app.example.de/'),
        '<a href="https://app.example.de/">x</a><a href="https://app.example.de/">y</a>');
    assert.equal(Site.renderSitePage(html, 'https://app.example.de'),
        '<a href="https://app.example.de/">x</a><a href="https://app.example.de/">y</a>');
});

test('both site pages exist and every app link carries the token, never a hard-coded host', () => {
    for (const name of Object.keys(Site.PAGES)) {
        const html = Site.readPage(name);
        assert.ok(html && html.length > 1000, name + ' loads');
        assert.ok(!/helphub-production|railway\.app/.test(html), name + ' has no hard-coded app host');
    }
    assert.ok(Site.readPage('welcome').includes('__APP_URL__/'), 'landing links to the app via the token');
    assert.equal(Site.readPage('nope'), null, 'unknown page → null, not a path lookup');
});

test('isLandingHost matches LANDING_HOST case-insensitively and is off when unset', () => {
    const prev = process.env.LANDING_HOST;
    delete process.env.LANDING_HOST;
    assert.equal(Site.isLandingHost({ hostname: 'helpado.de' }), false, 'unset → never');
    process.env.LANDING_HOST = 'Helpado.de';
    assert.equal(Site.isLandingHost({ hostname: 'helpado.de' }), true);
    assert.equal(Site.isLandingHost({ hostname: 'app.helpado.de' }), false, 'the app host keeps the app at /');
    if (prev === undefined) delete process.env.LANDING_HOST; else process.env.LANDING_HOST = prev;
});

test('appUrlFor prefers FRONTEND_URL (the magic-link base) over the request origin', () => {
    const prev = process.env.FRONTEND_URL;
    process.env.FRONTEND_URL = 'https://app.helpado.de';
    assert.equal(Site.appUrlFor({ protocol: 'http', get: () => 'localhost:3000' }), 'https://app.helpado.de');
    delete process.env.FRONTEND_URL; delete process.env.APP_URL;
    assert.equal(Site.appUrlFor({ protocol: 'http', get: () => 'localhost:3000' }), 'http://localhost:3000');
    if (prev !== undefined) process.env.FRONTEND_URL = prev;
});
