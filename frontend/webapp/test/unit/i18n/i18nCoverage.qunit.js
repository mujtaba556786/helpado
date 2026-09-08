/**
 * Guards the i18n contract that this app keeps regressing on:
 *
 *   1. Every {i18n>key} used in a view or fragment must exist in the bundle.
 *      A missing key renders the key name to the user — silently, no error.
 *   2. All five locale files must carry exactly the same keys. A key present
 *      only in the base file leaves German, Turkish and Arabic users looking at
 *      English (or at the raw key).
 *
 * Both have bitten this codebase repeatedly, most of it in flows nobody reads
 * in a non-English locale — booking confirmation, block/report, onboarding.
 */
sap.ui.define([], function () {
    "use strict";

    var BASE     = "../../";
    var LOCALES  = ["i18n/i18n.properties", "i18n/i18n_en.properties", "i18n/i18n_de.properties",
                    "i18n/i18n_tr.properties", "i18n/i18n_ar.properties"];
    var VIEWS    = [
        "view/App.view.xml", "view/Login.view.xml", "view/Dashboard.view.xml",
        "view/fragments/AiChatDialog.fragment.xml",
        "view/fragments/BookingDialog.fragment.xml",
        "view/fragments/DmChatDialog.fragment.xml",
        "view/fragments/ExpertFiltersPopover.fragment.xml",
        "view/fragments/NotificationsDialogV2.fragment.xml",
        "view/fragments/OnboardingDialog.fragment.xml",
        "view/fragments/PostTaskDialog.fragment.xml",
        "view/fragments/ProfileDialog.fragment.xml",
        "view/fragments/RatingDialog.fragment.xml",
        "view/fragments/ReportDialog.fragment.xml",
        "view/fragments/SettingsDialog.fragment.xml",
        "view/fragments/TaskDetailDialog.fragment.xml",
        "view/fragments/TermsAcceptanceDialog.fragment.xml"
    ];

    function fetchText(sPath) {
        return fetch(BASE + sPath).then(function (r) {
            return r.ok ? r.text() : null;   // a renamed view should not fail the suite
        }).catch(function () { return null; });
    }

    function keysOf(sProps) {
        var aKeys = [], re = /^([A-Za-z0-9_]+)=/gm, m;
        while ((m = re.exec(sProps)) !== null) { aKeys.push(m[1]); }
        return aKeys;
    }

    QUnit.module("i18n coverage");

    QUnit.test("every locale file carries the same keys as the base bundle", function (assert) {
        var done = assert.async();
        Promise.all(LOCALES.map(fetchText)).then(function (aTexts) {
            var mKeys = {};
            LOCALES.forEach(function (sFile, i) {
                assert.ok(aTexts[i], sFile + " is readable");
                mKeys[sFile] = keysOf(aTexts[i] || "");
            });

            var aBase = mKeys["i18n/i18n.properties"];
            assert.ok(aBase.length > 200, "base bundle has " + aBase.length + " keys");

            LOCALES.slice(1).forEach(function (sFile) {
                var oHave = {};
                mKeys[sFile].forEach(function (k) { oHave[k] = true; });
                var aMissing = aBase.filter(function (k) { return !oHave[k]; });
                assert.deepEqual(aMissing, [],
                    sFile + " defines every base key" +
                    (aMissing.length ? " — missing: " + aMissing.join(", ") : ""));
            });
            done();
        });
    });

    /**
     * Controllers speak to the user through MessageToast and MessageBox, and every
     * one of those strings was hardcoded English until 2026-09-08 — 53 of them, so
     * a German user got English for essentially every message the app sent. The
     * view-only checks above could not see any of it.
     */
    QUnit.test("no controller passes a bare string literal to a toast or message box", function (assert) {
        var done = assert.async();
        var CONTROLLERS = [
            "controller/BaseController.js", "controller/Login.controller.js",
            "controller/Dashboard.controller.js",
            "controller/mixins/BookingMixin.js", "controller/mixins/DmMixin.js",
            "controller/mixins/FilterMixin.js", "controller/mixins/MapMixin.js",
            "controller/mixins/NotificationMixin.js",
            "controller/mixins/OnboardingFavoritesMixin.js",
            "controller/mixins/ProfileMixin.js", "controller/mixins/TaskMixin.js",
            "controller/mixins/TrustSafetyMixin.js", "controller/mixins/AiChatMixin.js"
        ];
        Promise.all(CONTROLLERS.map(fetchText)).then(function (aTexts) {
            var aBad = [], iScanned = 0;
            CONTROLLERS.forEach(function (sFile, i) {
                var sJs = aTexts[i];
                if (!sJs) { return; }
                iScanned++;
                var re = /(?:MessageToast\.show|MessageBox\.(?:show|alert|confirm|success|error|warning))\(\s*"([^"]{2,})"/g,
                    m;
                while ((m = re.exec(sJs)) !== null) {
                    aBad.push(sFile.split("/").pop() + ': "' + m[1].slice(0, 40) + '"');
                }
            });
            assert.ok(iScanned > 8, iScanned + " controllers scanned");
            assert.deepEqual(aBad, [],
                "every user-facing message resolves through the i18n bundle" +
                (aBad.length ? " — hardcoded: " + aBad.join("; ") : ""));
            done();
        });
    });

    QUnit.test("every {i18n>key} used in a view exists in the bundle", function (assert) {
        var done = assert.async();
        Promise.all([fetchText("i18n/i18n.properties")].concat(VIEWS.map(fetchText)))
            .then(function (aTexts) {
                var oKeys = {};
                keysOf(aTexts[0] || "").forEach(function (k) { oKeys[k] = true; });

                var aBad = [], iUsed = 0;
                VIEWS.forEach(function (sView, i) {
                    var sXml = aTexts[i + 1];
                    if (!sXml) { return; }
                    var re = /\{i18n>([A-Za-z0-9_]+)\}/g, m;
                    while ((m = re.exec(sXml)) !== null) {
                        iUsed++;
                        if (!oKeys[m[1]]) { aBad.push(m[1] + " (" + sView + ")"); }
                    }
                });

                assert.ok(iUsed > 100, iUsed + " i18n references scanned across the views");
                assert.deepEqual(aBad, [],
                    "no view references a key the bundle does not define" +
                    (aBad.length ? " — " + aBad.join(", ") : ""));
                done();
            });
    });
});
