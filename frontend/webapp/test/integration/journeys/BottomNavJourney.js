sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/core/IconPool",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, IconPool, DashboardPage, MockServer) {
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

    // The Tasks count badge was anchored to the tab's right edge, so on a wide
    // desktop tab it sat on the border to Messages and read as an unread-message
    // count. It must sit on the Tasks icon, inside the Tasks button.
    opaTest("The Tasks badge sits on the Tasks icon, not on the border to Messages", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            controlType: "sap.m.Button",
            viewName: "helphub.view.Dashboard",
            matchers: function (oBtn) { return oBtn.data("tab") === "tasks"; },
            check: function (aBtns) {
                var oWrap = aBtns[0].getParent().getDomRef();
                return !!oWrap && !!oWrap.querySelector(".hhNavBadge") &&
                       aBtns[0].getModel("appData").getProperty("/openTaskCount") > 0;
            },
            success: function (aBtns) {
                var oBtn   = aBtns[0].getDomRef().getBoundingClientRect();
                var oIcon  = aBtns[0].getDomRef().querySelector(".sapUiIcon").getBoundingClientRect();
                var oBadge = aBtns[0].getParent().getDomRef().querySelector(".hhNavBadge").getBoundingClientRect();
                var fBadgeX = (oBadge.left + oBadge.right) / 2;
                Opa5.assert.ok(fBadgeX > oBtn.left && fBadgeX < oBtn.right - 12,
                    "Badge centre (" + Math.round(fBadgeX) + "px) is inside the Tasks button (" +
                    Math.round(oBtn.left) + "–" + Math.round(oBtn.right) + "px), clear of its right edge");
                Opa5.assert.ok(Math.abs(fBadgeX - (oIcon.left + oIcon.right) / 2) <= 24,
                    "Badge is within 24px of the Tasks icon centre (" + Math.round((oIcon.left + oIcon.right) / 2) + "px)");
                // Vertically it has to overlap the icon and stay inside the bar —
                // the bar's sapMBarPH clips overflow, so a badge floated above the
                // bar passes the horizontal checks while being invisible.
                var oBar = aBtns[0].getDomRef().closest(".hhBottomNav").getBoundingClientRect();
                Opa5.assert.ok(oBadge.top >= oBar.top && oBadge.bottom <= oBar.bottom,
                    "Badge (" + Math.round(oBadge.top) + "–" + Math.round(oBadge.bottom) + "px) lies inside the nav bar (" +
                    Math.round(oBar.top) + "–" + Math.round(oBar.bottom) + "px), so it is not clipped");
                Opa5.assert.ok(oBadge.bottom > oIcon.top && oBadge.top < oIcon.bottom,
                    "Badge overlaps the Tasks icon vertically (icon " + Math.round(oIcon.top) + "–" + Math.round(oIcon.bottom) + "px)");
            },
            errorMessage: "Tasks tab has no badge (openTaskCount is 0?)"
        });
        Then.iTeardownMyUIComponent();
    });

    // The bar's glyphs are styled as the service tiles' icons: same 40px mint
    // square (.fiSvcIconWrap), same green, same 1.25rem glyph; the selected tab
    // is the tiles' hover state (solid green, white glyph). Before this the bar
    // had dark-grey glyphs a size larger than the tiles' and one filled heart
    // among four outlined icons, and looked like another app's footer.
    opaTest("Nav icons match the service tile icons; the selected one is the tile hover state", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "dashboardPage", viewName: VIEW,
            success: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                var oWin = Opa5.getWindow();

                var oTileWrap = oWin.document.querySelector(".fiSvcIconWrap");
                var oTileIcon = oWin.document.querySelector(".fiSvcIcon.sapUiIcon");
                Opa5.assert.ok(oTileWrap && oTileIcon, "a service tile icon is on screen to compare against");
                var tw = oWin.getComputedStyle(oTileWrap), ti = oWin.getComputedStyle(oTileIcon);

                navButtons(oView).forEach(function (b) {
                    var oDom = b.getDomRef();
                    var oIcon = oDom.querySelector(".sapMBtnIcon.sapUiIcon");
                    var st = oWin.getComputedStyle(oIcon);
                    var sTab = b.getCustomData().filter(function (d) { return d.getKey() === "tab"; })[0].getValue();
                    var bSel = oDom.getAttribute("data-hhsel") === "true";
                    var oRect = oIcon.getBoundingClientRect();

                    Opa5.assert.ok(Math.abs(oRect.width - parseFloat(tw.width)) <= 1 &&
                                   Math.abs(oRect.height - parseFloat(tw.height)) <= 1,
                        sTab + " icon box is the tile's " + tw.width + " square (got " +
                        Math.round(oRect.width) + "x" + Math.round(oRect.height) + ")");
                    Opa5.assert.strictEqual(st.borderTopLeftRadius, tw.borderTopLeftRadius,
                        sTab + " icon box has the tile's corner radius");
                    Opa5.assert.strictEqual(st.fontSize, ti.fontSize,
                        sTab + " glyph is the tile glyph size (" + ti.fontSize + ")");

                    if (bSel) {
                        Opa5.assert.strictEqual(st.backgroundColor, ti.color,
                            sTab + " (selected) box is solid tile green");
                        Opa5.assert.strictEqual(st.color, "rgb(255, 255, 255)",
                            sTab + " (selected) glyph is white");
                    } else {
                        Opa5.assert.strictEqual(st.color, ti.color,
                            sTab + " glyph is the tile green (" + ti.color + ")");
                        Opa5.assert.strictEqual(st.backgroundColor, tw.backgroundColor,
                            sTab + " box is the tile tint (" + tw.backgroundColor + ")");
                    }
                });

                // Saved uses the outline heart: the filled one was the only solid
                // glyph in the row and read heavier than its neighbours.
                var oSaved = navButtons(oView).filter(function (b) {
                    return b.getCustomData().some(function (d) { return d.getKey() === "tab" && d.getValue() === "saved"; });
                })[0];
                Opa5.assert.strictEqual(oSaved && oSaved.getIcon(), "sap-icon://heart-2",
                    "Saved tab uses the outline heart (heart-2)");
                Opa5.assert.ok(IconPool.getIconInfo("heart-2"), "heart-2 exists in the icon font");
            },
            errorMessage: "Bottom nav buttons not found"
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
