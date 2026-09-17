/**
 * Marketing pages (site/index.html = /welcome, site/sicherheit.html = /sicherheit).
 *
 * Owner's rules for anything public, decided 2026-09-17, encoded so they cannot
 * creep back in through a copy edit:
 *   - no competitor is named (compare against "große Portale" generically)
 *   - no city or district (the Kiez-first rollout is an internal tactic)
 *   - no promise that depends on the founder's time ("persönlich angeschrieben",
 *     WhatsApp support) — the page must stay true at 10 users and at 10,000
 *   - trustClaims.qunit.js separately bans "geprüft/verifiziert/Experten"
 * Plus the plumbing: every app link goes through __APP_URL__ (replaced by
 * SiteService), all four languages are offered, and nothing is loaded from a
 * third-party host.
 */
sap.ui.define([], function () {
    "use strict";

    var BASE  = "../../";
    var PAGES = ["site/index.html", "site/sicherheit.html"];

    var BANNED = [
        [/betreut|helpling|myhammer|nebenan\.de|taskrabbit|care\.com|kleinanzeigen/i, "competitor name"],
        [/Neuk(ö|oe)lln|Berlin|Wedding|Kreuzberg|نويكولن|برلين|فيدينغ/, "city or district"],
        [/pers(ö|oe)nlich angeschrieben|contacted personally|(vom|from the) (Gr(ü|ue)nder|founder)|kurucu|المؤسس/i, "founder-time promise"],
        [/WhatsApp[- ]?(Support|support|desteği)|واتساب من/i, "WhatsApp support promise"],
        [/helphub-production|railway\.app/i, "hard-coded app host (must be __APP_URL__)"],
        [/https:\/\/fonts\.googleapis|cdnjs|jsdelivr|unpkg/i, "third-party asset host"]
    ];

    function load(sFile) {
        return fetch(BASE + sFile).then(function (r) {
            if (!r.ok) { throw new Error(sFile + " → HTTP " + r.status); }
            return r.text();
        });
    }

    QUnit.module("site pages — owner's rules for public copy");

    PAGES.forEach(function (sFile) {
        QUnit.test(sFile + " breaks none of the public-copy rules", function (assert) {
            var done = assert.async();
            load(sFile).then(function (sText) {
                BANNED.forEach(function (aRule) {
                    var m = sText.match(aRule[0]);
                    assert.ok(!m, sFile + ": no " + aRule[1] + (m ? " (found: \"" + m[0] + "\")" : ""));
                });
                ["de", "tr", "ar", "en"].forEach(function (sLang) {
                    assert.ok(new RegExp('data-lang="' + sLang + '"').test(sText), sFile + " offers " + sLang.toUpperCase());
                });
                assert.ok(/href="\/legal\/imprint\.html"/.test(sText), sFile + " links the Impressum");
                done();
            }).catch(function (e) { assert.ok(false, String(e)); done(); });
        });
    });

    QUnit.test("site/index.html links to the app only through the __APP_URL__ token", function (assert) {
        var done = assert.async();
        load("site/index.html").then(function (sText) {
            var aAppLinks = sText.match(/href="__APP_URL__\//g) || [];
            assert.ok(aAppLinks.length >= 3, "at least the two hero CTAs and the helper CTA use the token (" + aAppLinks.length + ")");
            assert.ok(/href="\/sicherheit"/.test(sText), "the safety block links to /sicherheit");
            done();
        }).catch(function (e) { assert.ok(false, String(e)); done(); });
    });
});
