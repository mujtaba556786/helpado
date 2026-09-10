sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Bottom navigation — selected state and rhythm", {
        before: function () { MockServer.start(); },
        after: function () { MockServer.stop(); }
    });

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
    // Walk up for the first ancestor with a painted background — a transparent
    // button sits on the bar, so its own background says nothing about contrast.
    function paintedBg(oDom) {
        var el = oDom;
        while (el && el !== document.documentElement) {
            var s = window.getComputedStyle(el).backgroundColor;
            if (s && s !== "transparent" && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(s)) { return s; }
            el = el.parentElement;
        }
        return "rgb(255, 255, 255)";
    }

    function navButtons(oView) {
        return oView.findAggregatedObjects(true, function (c) {
            return c.isA("sap.m.Button") && c.hasStyleClass && c.hasStyleClass("hhNavBtn");
        });
    }

    opaTest("Exactly one tab is marked selected, and it is the current one", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.waitFor({
            id: "dashboardPage", viewName: VIEW,
            success: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                var aBtns = navButtons(oView);
                Opa5.assert.strictEqual(aBtns.length, 5, "five destinations");

                var aSelected = aBtns.filter(function (b) {
                    return b.getDomRef() && b.getDomRef().getAttribute("data-hhsel") === "true";
                });
                Opa5.assert.strictEqual(aSelected.length, 1,
                    "exactly one tab carries data-hhsel=true");

                var sTab = aSelected[0].getCustomData().filter(function (d) {
                    return d.getKey() === "tab";
                })[0].getValue();
                Opa5.assert.strictEqual(sTab, "mySchedule", "the marked tab is the one navigated to");

                // Selection must not be UI5's primary-action style — that renders a
                // solid fill and reads as a button dropped into the bar.
                aBtns.forEach(function (b) {
                    Opa5.assert.notStrictEqual(b.getType(), "Emphasized",
                        "no nav tab uses the Emphasized (primary action) type");
                });
            },
            errorMessage: "Bottom nav buttons not found"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("All five tabs are the same width", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "dashboardPage", viewName: VIEW,
            success: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                var aWidths = navButtons(oView).map(function (b) {
                    return Math.round(b.getDomRef().getBoundingClientRect().width);
                });
                // Tasks and Messages nest an extra flex item for their badge; they
                // used to collapse to their label width, so the selected pill
                // changed size as you moved along the bar.
                var iMin = Math.min.apply(null, aWidths);
                var iMax = Math.max.apply(null, aWidths);
                Opa5.assert.ok(iMax - iMin <= 1,
                    "tab widths are even (" + aWidths.join(", ") + ")");
            }
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Both selected and unselected labels are readable", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "dashboardPage", viewName: VIEW,
            success: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }

                navButtons(oView).forEach(function (b) {
                    var oDom = b.getDomRef();
                    var oLabel = oDom.querySelector(".sapMBtnContent");
                    if (!oLabel) { return; }
                    var bSel = oDom.getAttribute("data-hhsel") === "true";
                    var fRatio = contrast(window.getComputedStyle(oLabel).color, paintedBg(oDom));
                    var sTab = b.getCustomData().filter(function (d) {
                        return d.getKey() === "tab";
                    })[0].getValue();
                    // The unselected labels regressed to #4bb87d on white (2.48:1)
                    // when the polish pass dropped the old override and relied on
                    // a theme token transparent buttons do not read.
                    Opa5.assert.ok(fRatio >= 4.5,
                        sTab + (bSel ? " (selected)" : " (unselected)") +
                        " label contrast is " + fRatio.toFixed(2) + ":1");
                });
            }
        });

        Then.iTeardownMyUIComponent();
    });
});
