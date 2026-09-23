/**
 * The brand mark lives in exactly one place.
 *
 * Before this test the pin-and-handshake mark's predecessor was hand-copied into
 * five files — img/logo.svg, the two data-URI links in index.html, and the inline
 * hero <svg> in both marketing pages. A rebrand that missed one left a stale mark
 * on a live page with nothing to catch it.
 *
 * So: every surface must point at a generated PNG (res/brand/build_icons.py emits
 * them all from res/brand/pin.png), and no file may carry an inline copy of the
 * mark's geometry again.
 */
sap.ui.define([], function () {
    "use strict";

    var BASE = "../../";

    // The old house-and-heart roof path, in raw and URL-encoded form. Any file
    // still carrying it was missed by the rebrand.
    var OLD_MARK = /M256\s*96\s*L444\s*254|M256%2096%20L444%20254/;

    // An inline <svg> that paints a rounded tile is the mark being redrawn by hand.
    var INLINE_TILE = /<svg[^>]*>(?:(?!<\/svg>)[\s\S])*?<rect[^>]*rx=["']116["'][\s\S]*?<\/svg>/;

    function load(sFile) {
        return fetch(BASE + sFile).then(function (r) {
            if (!r.ok) { throw new Error(sFile + " → HTTP " + r.status); }
            return r.text();
        });
    }

    function head(sFile) {
        return fetch(BASE + sFile, { method: "GET" }).then(function (r) {
            return { ok: r.ok, type: r.headers.get("content-type") || "" };
        });
    }

    QUnit.module("brand mark — one source, no hand-copies");

    // ── the generated files exist ────────────────────────────────────────────
    [
        "img/logo.png",
        "img/favicon.png",
        "img/apple-touch-icon.png"
    ].forEach(function (sFile) {
        QUnit.test(sFile + " is generated and served", function (assert) {
            var done = assert.async();
            head(sFile).then(function (o) {
                assert.ok(o.ok, sFile + " is reachable");
                assert.ok(/image\/png/.test(o.type), sFile + " is served as PNG (got \"" + o.type + "\")");
            }).catch(function (e) {
                assert.ok(false, String(e));
            }).finally(done);
        });
    });

    QUnit.test("the old house mark is gone and img/logo.svg no longer exists", function (assert) {
        var done = assert.async();
        var aFiles = [
            "index.html",
            "site/index.html",
            "site/sicherheit.html",
            "model/models.js"
        ];
        Promise.all(aFiles.map(load)).then(function (aText) {
            aText.forEach(function (sText, i) {
                assert.ok(!OLD_MARK.test(sText), aFiles[i] + " carries no copy of the old mark");
                assert.ok(!/img\/logo\.svg/.test(sText), aFiles[i] + " does not reference the deleted logo.svg");
            });
            return fetch(BASE + "img/logo.svg");
        }).then(function (r) {
            assert.strictEqual(r.status, 404, "img/logo.svg is deleted (got HTTP " + r.status + ")");
        }).catch(function (e) {
            assert.ok(false, String(e));
        }).finally(done);
    });

    // ── each surface points at the generated files ───────────────────────────
    QUnit.test("index.html links the generated favicon and apple-touch icon", function (assert) {
        var done = assert.async();
        load("index.html").then(function (s) {
            assert.ok(/rel="icon"[^>]*href="img\/favicon\.png"/.test(s), "favicon is img/favicon.png");
            assert.ok(/rel="apple-touch-icon"[^>]*href="img\/apple-touch-icon\.png"/.test(s),
                "apple-touch icon is img/apple-touch-icon.png");
            // Relative, not absolute: the APK loads index.html from file://.
            assert.ok(!/rel="(icon|apple-touch-icon)"[^>]*href="\//.test(s),
                "neither link uses an absolute path (breaks inside the Cordova APK)");
        }).catch(function (e) {
            assert.ok(false, String(e));
        }).finally(done);
    });

    QUnit.test("the login page takes its logo from the generated PNG", function (assert) {
        var done = assert.async();
        load("model/models.js").then(function (s) {
            assert.ok(/toUrl\("helphub\/img\/logo\.png"\)/.test(s),
                "models.js logoUrl points at img/logo.png");
        }).catch(function (e) {
            assert.ok(false, String(e));
        }).finally(done);
    });

    ["site/index.html", "site/sicherheit.html"].forEach(function (sFile) {
        QUnit.test(sFile + " shows the mark as an image, not inline SVG", function (assert) {
            var done = assert.async();
            load(sFile).then(function (s) {
                assert.ok(/<link rel="icon" href="\/img\/favicon\.png"/.test(s), "favicon is /img/favicon.png");
                assert.ok(/<img src="\/img\/logo\.png"/.test(s), "header mark is /img/logo.png");
                var m = s.match(INLINE_TILE);
                assert.ok(!m, "no hand-drawn tile SVG left" + (m ? " (found " + m[0].slice(0, 60) + "…)" : ""));
            }).catch(function (e) {
                assert.ok(false, String(e));
            }).finally(done);
        });
    });

    ["legal/imprint.html", "legal/privacy.html", "legal/terms.html"].forEach(function (sFile) {
        QUnit.test(sFile + " has the brand favicon", function (assert) {
            var done = assert.async();
            load(sFile).then(function (s) {
                assert.ok(/<link rel="icon" href="\/img\/favicon\.png"/.test(s),
                    sFile + " links /img/favicon.png");
            }).catch(function (e) {
                assert.ok(false, String(e));
            }).finally(done);
        });
    });
});
