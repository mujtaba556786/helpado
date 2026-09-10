sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("App header — alignment and rhythm", {
        before: function () { MockServer.start(); },
        after: function () { MockServer.stop(); }
    });

    function centreY(oDom) {
        var r = oDom.getBoundingClientRect();
        return r.top + r.height / 2;
    }

    opaTest("Header items sit on the bar's centre line, with equal targets and gaps", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "notifBtn", viewName: VIEW,
            success: function (oBell) {
                var oView = oBell.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                var oGlobe = oView.byId("langBtn");
                var oAvatar = oView.byId("headerAvatar");

                var oBar = oBell.getDomRef().closest(".sapMBar");
                Opa5.assert.ok(oBar, "Found the header bar");

                var fBar = centreY(oBar);
                [["bell", oBell], ["globe", oGlobe], ["avatar", oAvatar]].forEach(function (a) {
                    var fOff = Math.abs(centreY(a[1].getDomRef()) - fBar);
                    // The bar inherits a 57px line-height; without the reset these
                    // ride on its baseline, 7-9px above the bar's centre.
                    Opa5.assert.ok(fOff <= 1.5,
                        a[0] + " is centred on the bar (off by " + fOff.toFixed(1) + "px)");
                });

                var oWord = oBar.querySelector(".hhWordmark");
                if (oWord) {
                    var fWordOff = Math.abs(centreY(oWord) - fBar);
                    Opa5.assert.ok(fWordOff <= 1.5,
                        "wordmark is centred on the bar (off by " + fWordOff.toFixed(1) + "px)");
                }

                // Both icon buttons must be the same size — the globe used to keep
                // UI5's 36px default while the bell was pinned to 44px.
                var rBell = oBell.getDomRef().getBoundingClientRect();
                var rGlobe = oGlobe.getDomRef().getBoundingClientRect();
                Opa5.assert.strictEqual(Math.round(rGlobe.width), Math.round(rBell.width),
                    "Bell and globe are the same width (" + Math.round(rBell.width) + "px)");
                Opa5.assert.ok(Math.round(rBell.width) >= 44,
                    "Header icon buttons meet the 44px touch target");

                // Even spacing across the three right-hand items.
                var rAvatar = oAvatar.getDomRef().getBoundingClientRect();
                var fGap1 = Math.round(rGlobe.left - rBell.right);
                var fGap2 = Math.round(rAvatar.left - rGlobe.right);
                Opa5.assert.strictEqual(fGap2, fGap1,
                    "Gaps between header items are equal (" + fGap1 + "px and " + fGap2 + "px)");
            },
            errorMessage: "Header controls not found"
        });

        Then.iTeardownMyUIComponent();
    });
});
