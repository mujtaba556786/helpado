sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Login";

    QUnit.module("Login — brand artwork and copy", {
        before: function () {
            MockServer.start();
            // MockServer seeds a token so the other journeys land on the dashboard.
            // The Login view only renders when the app starts signed out.
            localStorage.removeItem("helpmate_token");
            localStorage.removeItem("helphub_refresh_token");
            localStorage.removeItem("helpmate_user_id");
        },
        after: function () { MockServer.stop(); }
    });

    // ── Legal footer ─────────────────────────────────────────────────────────
    // § 5 DDG: the Impressum has to be reachable without an account. Settings
    // only exists behind the login, so the login card carries the links.

    opaTest("Login card links to the Impressum and Privacy Policy, and the Impressum link opens it", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "loginLegalLinks",
            viewName: VIEW,
            success: function (oBox) {
                var aTexts = oBox.findAggregatedObjects(true, function (oCtrl) {
                    return oCtrl.isA("sap.m.Link");
                }).map(function (oLink) { return oLink.getText(); });
                Opa5.assert.ok(aTexts.some(function (t) { return /Impressum/i.test(t); }),
                    "an Impressum link is on the login card (" + aTexts.join(" | ") + ")");
                Opa5.assert.ok(aTexts.some(function (t) { return /Privacy|Datenschutz/i.test(t); }),
                    "a Privacy Policy link is on the login card");
            },
            errorMessage: "loginLegalLinks not rendered on the Login view"
        });

        When.waitFor({
            id: "loginImprintLink",
            viewName: VIEW,
            actions: new Press(),
            errorMessage: "Impressum link not found on the login card"
        });

        Then.waitFor({
            controlType: "sap.m.Dialog",
            matchers: function (oDialog) {
                if (oDialog.getTitle() !== "Impressum" || !oDialog.isOpen()) { return false; }
                var oDom = oDialog.getDomRef();
                var oFrame = oDom && oDom.querySelector("iframe");
                return !!(oFrame && /\/legal\/imprint\.html$/.test(oFrame.getAttribute("src") || ""));
            },
            success: function () {
                Opa5.assert.ok(true, "Impressum opens from the login card before sign-in");
            },
            errorMessage: "Legal dialog with /legal/imprint.html did not open from the login card"
        });

        Then.iTeardownMyUIComponent();
    });

    // Relative luminance / contrast per WCAG 2.1, same helper as PolishJourney.
    function luminance(sColor) {
        var a = sColor.match(/[\d.]+/g).slice(0, 3).map(function (n) {
            var c = Number(n) / 255;
            return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }
    function contrast(sFg, sBg) {
        var l1 = luminance(sFg), l2 = luminance(sBg);
        return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
    }

    opaTest("Login shows the pin logo, the network subtitle and the neighbourhood scene", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "brandLogo", viewName: VIEW,
            success: function (oAvatar) {
                Opa5.assert.ok(/img\/logo\.png(\?.*)?$/.test(oAvatar.getSrc()),
                    "Logo resolves to img/logo.png (got " + oAvatar.getSrc() + ")");
            },
            errorMessage: "Brand logo is not rendered on the login page"
        });

        Then.waitFor({
            id: "brandSubtitle", viewName: VIEW,
            success: function (oText) {
                Opa5.assert.strictEqual(oText.getText(), "Neighborhood Help Network",
                    "Subtitle reads 'Neighborhood Help Network'");
                Opa5.assert.strictEqual(oText.getTextAlign(), "Center", "Subtitle is centred");
            },
            errorMessage: "Brand subtitle is missing"
        });

        Then.waitFor({
            id: "brandScene", viewName: VIEW,
            success: function (oImage) {
                Opa5.assert.ok(/img\/neighbourhood\.svg(\?.*)?$/.test(oImage.getSrc()),
                    "Bottom scene resolves to img/neighbourhood.svg");
                var oRect = oImage.getDomRef().getBoundingClientRect();
                Opa5.assert.ok(oRect.width > 0 && oRect.height > 0,
                    "Scene renders with a real size (" + Math.round(oRect.width) + "x" + Math.round(oRect.height) + ")");
                // The scene SVG carries no intrinsic width on purpose — with one it
                // set the flex basis and pushed the whole page into overflow.
                Opa5.assert.ok(document.documentElement.scrollWidth <= document.documentElement.clientWidth + 1,
                    "Scene does not push the page into horizontal overflow");
            },
            errorMessage: "Neighbourhood scene is not rendered"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Sign In button keeps a readable label on the shipped theme", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "signInButton", viewName: VIEW,
            success: function (oButton) {
                var oInner = oButton.getDomRef("inner");
                var oLabel = oButton.getDomRef("content") || oInner;
                var fRatio = contrast(
                    window.getComputedStyle(oLabel).color,
                    window.getComputedStyle(oInner).backgroundColor
                );
                Opa5.assert.ok(fRatio >= 4.5,
                    "Sign In label contrast is " + fRatio.toFixed(2) + ":1 (WCAG AA needs 4.5:1)");
            },
            errorMessage: "Sign In button not found on the login page"
        });

        Then.iTeardownMyUIComponent();
    });
});
