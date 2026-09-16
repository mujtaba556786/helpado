/**
 * Helpado verifies nothing about anyone (only the email address is confirmed —
 * see the FAQ answer faqChecksA and Terms section 10). Copy that implies
 * otherwise keeps creeping back in: "verified" badges shipped in a bundle
 * commit (removed in build 3.25), and the Terms' own summary promised
 * "trusted local helpers" while section 10 said the opposite. This guard reads
 * the legal pages and every locale bundle and fails on the known phrasings.
 */
sap.ui.define([], function () {
    "use strict";

    var BASE  = "../../";
    var FILES = [
        "legal/terms.html", "legal/privacy.html", "legal/imprint.html",
        "i18n/i18n.properties", "i18n/i18n_en.properties", "i18n/i18n_de.properties",
        "i18n/i18n_tr.properties", "i18n/i18n_ar.properties"
    ];
    // Each pattern is a promise of vetting the product does not make.
    var CLAIMS = [
        /trusted (local )?(helpers?|neighbou?rs?|people|users?|providers?)/i,
        /(vetted|screened|background[- ]checked|verified) (local )?(helpers?|neighbou?rs?|people|users?|providers?)/i,
        /\b(Verified User|Trusted User)\b/,        // the removed badge names
        /\bexperts? nearby\b/i,                     // the old search heading ("Cleaning Experts Nearby")
        /\b(local |our )?experts\b/i,               // "expert" is a qualification nobody checks
        /vertrauensw(ü|ue)rdige?n? (Helfer|Nachbarn|Anbieter)/i,   // de
        /(gepr(ü|ue)fte|verifizierte) (Helfer|Nachbarn|Anbieter)/i,
        /g(ü|u)venilir (yardımcı|komşu|sağlayıcı)/i,                // tr
        /(doğrulanmış|onaylı) (yardımcı|komşu)/i,
        /مساعد(ين|ون)? موثوق/,                                        // ar
        /جيران موثوق/
    ];

    QUnit.module("legal pages and locale bundles — no vetting claims");

    FILES.forEach(function (sFile) {
        QUnit.test(sFile + " makes no trust or verification claim about helpers", function (assert) {
            var done = assert.async();
            fetch(BASE + sFile).then(function (r) { return r.text(); }).then(function (sText) {
                var aHits = [];
                CLAIMS.forEach(function (re) {
                    var m = sText.match(re);
                    if (m) { aHits.push(m[0]); }
                });
                assert.deepEqual(aHits, [], "no claim phrases (found: " + JSON.stringify(aHits) + ")");
                done();
            }).catch(function (e) { assert.ok(false, "could not load " + sFile + ": " + e); done(); });
        });
    });

    QUnit.test("terms.html section 10 states that only the email address is confirmed", function (assert) {
        var done = assert.async();
        fetch(BASE + "legal/terms.html").then(function (r) { return r.text(); }).then(function (sText) {
            assert.ok(/does <strong>not<\/strong> conduct background checks, identity verification/.test(sText),
                "section 10 disclaims background checks and identity verification");
            assert.ok(/Only a user's email address is confirmed/.test(sText),
                "section 10 says what IS confirmed (email), matching the FAQ");
            assert.ok(/We do not verify anyone's identity or background/.test(sText),
                "the plain-English summary carries the same disclaimer");
            done();
        });
    });
});
