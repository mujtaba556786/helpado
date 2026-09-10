sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, MockServer) {
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
                Opa5.assert.ok(/img\/logo\.svg(\?.*)?$/.test(oAvatar.getSrc()),
                    "Logo resolves to img/logo.svg (got " + oAvatar.getSrc() + ")");
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
