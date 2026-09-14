/**
 * Guards the iOS safe-area rules in css/style.css, which no browser test can
 * exercise because env(safe-area-inset-top) is 0 outside a WebView:
 *
 *   1. The inset is padded onto the <header> element exactly once. UI5 puts
 *      the class sapMPageHeader on that element AND on the Bar inside it, so a
 *      selector list like ".sapMPage > header, .sapMPageHeader" pads twice —
 *      on an iPhone with the WebView under the status bar that was 59pt + 59pt
 *      and every page's title sat under its own header.
 *   2. The content section is shifted by the same inset, because sap.m.Page
 *      positions it at the unpadded header height.
 */
sap.ui.define([], function () {
    "use strict";

    QUnit.module("style.css — iOS safe area");

    function stripComments(s) { return s.replace(/\/\*[\s\S]*?\*\//g, ""); }

    // Returns [{selectors:[...], body:"..."}] for every rule whose body mentions sNeedle.
    function rulesMentioning(sCss, sNeedle) {
        var aOut = [];
        var re = /([^{}]+)\{([^{}]*)\}/g, m;
        while ((m = re.exec(sCss)) !== null) {
            if (m[2].indexOf(sNeedle) >= 0) {
                aOut.push({ selectors: m[1].split(",").map(function (s) { return s.trim(); }).filter(Boolean), body: m[2] });
            }
        }
        return aOut;
    }

    QUnit.test("the top inset is padded onto the page header exactly once, and the section is shifted by it", function (assert) {
        var done = assert.async();
        fetch("../../css/style.css").then(function (r) { return r.text(); }).then(function (sRaw) {
            var sCss = stripComments(sRaw);
            var aTop = rulesMentioning(sCss, "safe-area-inset-top");
            var aPadSelectors = [], aTopSelectors = [];
            aTop.forEach(function (o) {
                var bPads = /padding(-top)?\s*:/.test(o.body);
                o.selectors.forEach(function (s) { (bPads ? aPadSelectors : aTopSelectors).push(s); });
            });

            assert.deepEqual(aPadSelectors, [".sapMPage > header"],
                "exactly one selector pads the inset, and it is the <header> element itself (got " + JSON.stringify(aPadSelectors) + ")");
            assert.ok(aPadSelectors.every(function (s) { return s.indexOf(".sapMPageHeader") < 0; }),
                "no padding rule targets .sapMPageHeader — that class is on the header AND on the bar inside it");

            var sSectionRule = aTopSelectors.filter(function (s) { return /sapMPageWithHeader.*>\s*section$/.test(s); })[0];
            assert.ok(sSectionRule, "a rule shifts the page's content section by the inset");
            var oSection = aTop.filter(function (o) { return o.selectors.indexOf(sSectionRule) >= 0; })[0];
            assert.ok(/top\s*:\s*calc\(\s*2\.75rem\s*\+\s*env\(safe-area-inset-top\)\s*\)/.test(oSection.body),
                "section top is calc(2.75rem + env(safe-area-inset-top)) — 2.75rem being UI5's cozy header height, "
                + "which the OPA5 test 'content starts exactly where its header ends' pins");
            done();
        });
    });
});
