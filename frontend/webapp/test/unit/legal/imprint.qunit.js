/**
 * Impressum guard (§ 5 DDG). The page shipped with [[…]] placeholders for the
 * operator's name and address because they were not known when the branch was
 * cut. A half-filled Impressum is worse than none — it invites an Abmahnung and
 * looks like a template — so this fails while any placeholder is left, and
 * checks the pieces § 5 DDG actually requires plus the cross-links the other
 * legal pages rely on.
 */
sap.ui.define([], function () {
    "use strict";

    var BASE = "../../";

    function load(sFile) {
        return fetch(BASE + sFile).then(function (r) {
            if (!r.ok) { throw new Error(sFile + " → HTTP " + r.status); }
            return r.text();
        });
    }

    QUnit.module("legal/imprint.html — § 5 DDG Impressum");

    QUnit.test("no [[placeholder]] is left in imprint.html or privacy.html", function (assert) {
        var done = assert.async();
        Promise.all([load("legal/imprint.html"), load("legal/privacy.html")]).then(function (aText) {
            ["legal/imprint.html", "legal/privacy.html"].forEach(function (sFile, i) {
                var aLeft = aText[i].match(/\[\[[^\]]+\]\]/g) || [];
                assert.deepEqual(aLeft, [], sFile + " has no placeholders left (found: " + aLeft.join(", ") + ")");
            });
            done();
        }).catch(function (e) { assert.ok(false, String(e)); done(); });
    });

    QUnit.test("imprint.html carries the § 5 DDG essentials", function (assert) {
        var done = assert.async();
        load("legal/imprint.html").then(function (sText) {
            assert.ok(/§ 5 DDG/.test(sText), "names the legal basis (§ 5 DDG)");
            assert.ok(/Diensteanbieter/.test(sText), "has a service-provider section");
            assert.ok(/mailto:[^"]+@[^"]+/.test(sText), "gives an e-mail address");
            assert.ok(/Deutschland \/ Germany/.test(sText), "gives a postal address ending in Germany");
            assert.ok(/ec\.europa\.eu\/consumers\/odr/.test(sText), "links the EU ODR platform");
            assert.ok(/Art\. 16 DSA/.test(sText), "names the DSA notice channel");
            assert.ok(/href="terms\.html"/.test(sText) && /href="privacy\.html"/.test(sText),
                "links the Terms and the Privacy Policy");
            done();
        }).catch(function (e) { assert.ok(false, String(e)); done(); });
    });

    QUnit.test("terms.html and privacy.html both link the Impressum", function (assert) {
        var done = assert.async();
        Promise.all([load("legal/terms.html"), load("legal/privacy.html")]).then(function (aText) {
            assert.ok(/href="imprint\.html"/.test(aText[0]), "terms.html links imprint.html");
            assert.ok(/href="imprint\.html"/.test(aText[1]), "privacy.html links imprint.html");
            done();
        }).catch(function (e) { assert.ok(false, String(e)); done(); });
    });

    QUnit.test("privacy.html names the real map provider (Esri) and the postal address", function (assert) {
        var done = assert.async();
        load("legal/privacy.html").then(function (sText) {
            assert.ok(/Esri \/ ArcGIS Online/.test(sText), "map section names Esri / ArcGIS Online");
            assert.ok(!/loaded from\s+OpenStreetMap servers/.test(sText),
                "no longer claims tiles come from OpenStreetMap (the app switched to Esri)");
            assert.ok(/Germany<br>/.test(sText), "data-controller block carries a postal address");
            done();
        }).catch(function (e) { assert.ok(false, String(e)); done(); });
    });

    QUnit.test("terms.html section 8 states how review authenticity is ensured (UWG § 5b (3))", function (assert) {
        var done = assert.async();
        load("legal/terms.html").then(function (sText) {
            assert.ok(/Authenticity of reviews/.test(sText), "section 8 has an authenticity paragraph");
            assert.ok(/marked as completed on Helpado/.test(sText), "it names the completed-booking rule");
            done();
        }).catch(function (e) { assert.ok(false, String(e)); done(); });
    });
});
