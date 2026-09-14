/**
 * OPA5 Journey — the six hand-drawn category SVGs and the icon-font glyphs
 * read as ONE icon set on every surface that lists categories.
 *
 * The tiles were fixed first (ServiceTilesJourney). These three pickers put
 * both kinds side by side and each had its own mismatch: the Post Task Select
 * left glyphs near-black next to green SVGs; the onboarding chips sized an
 * image icon to the button's full inner height (twice the glyph) and showed
 * green-on-green when selected; the task filter menu coloured glyphs in the
 * OLD SVG green.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/model/ServiceConstants",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/TasksPage",
    "helphub/test/integration/pages/BookingPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, ServiceConstants, DashboardPage, TasksPage, BookingPage, MockServer) {
    "use strict";

    var GREEN = "rgb(16, 185, 129)";   // #10b981, the colour the SVGs are drawn in

    QUnit.module("Category icons — one set in every picker", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    function kinds(aEls) {
        var n = { svg: 0, font: 0 };
        aEls.forEach(function (o) { n[o.kind]++; });
        return n;
    }

    opaTest("Post Task category Select: glyphs are the SVG green, all rows in one box", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressPostTaskCta();

        Then.waitFor({
            id: "taskCategorySelect", viewName: "helphub.view.Dashboard",
            success: function (oSelect) {
                oSelect.open();
            },
            errorMessage: "Post Task category Select not found"
        });
        Then.waitFor({
            controlType: "sap.m.SelectList",
            check: function (aLists) {
                var oDom = aLists[0] && aLists[0].getDomRef();
                return !!oDom && oDom.querySelectorAll("li").length >= ServiceConstants.length;
            },
            success: function (aLists) {
                var aRows = [].slice.call(aLists[0].getDomRef().querySelectorAll("li")).map(function (li) {
                    var oIcon = li.querySelector(".sapUiIcon"), oImg = li.querySelector("img");
                    var oEl = oIcon || oImg, r = oEl.getBoundingClientRect();
                    return { kind: oIcon ? "font" : "svg", color: oIcon ? getComputedStyle(oIcon).color : GREEN, h: r.height };
                });
                var n = kinds(aRows);
                Opa5.assert.ok(n.svg >= 6 && n.font >= 4, n.svg + " SVG rows and " + n.font + " glyph rows");
                Opa5.assert.ok(aRows.every(function (o) { return o.color === GREEN; }),
                    "every glyph is " + GREEN + " like the SVGs (got " + JSON.stringify(aRows.filter(function (o) { return o.color !== GREEN; }).map(function (o) { return o.color; })) + ")");
                var h = aRows[0].h;
                Opa5.assert.ok(aRows.every(function (o) { return Math.abs(o.h - h) <= 1; }), "all icons share one height (" + Math.round(h) + "px)");
                aLists[0].getParent().close && aLists[0].getParent().close();
            },
            errorMessage: "Category Select list did not open"
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Onboarding interest chips: SVG and glyph marks are the same size and colour, white when selected", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheBookingDialog.iOpenOnboarding();
        When.onTheBookingDialog.iPressOnboardingNext();
        When.onTheBookingDialog.iPressOnboardingNext();

        Then.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) { return !!oBtn.data("interestKey"); },
            check: function (aBtns) { return aBtns.length >= ServiceConstants.length && aBtns.every(function (b) { return !!b.getDomRef(); }); },
            success: function (aBtns) {
                var aMarks = aBtns.map(function (oBtn) {
                    var oDom = oBtn.getDomRef();
                    var oIcon = oDom.querySelector(".sapUiIcon"), oImg = oDom.querySelector("img");
                    var oEl = oIcon || oImg, r = oEl.getBoundingClientRect();
                    // A glyph's box is its line box; its visible mark is its font-size.
                    // An <img>'s box IS the mark. Compare mark sizes.
                    var fMark = oIcon ? parseFloat(getComputedStyle(oIcon).fontSize) : r.height;
                    return { kind: oIcon ? "font" : "svg", mark: fMark, w: r.width, color: oIcon ? getComputedStyle(oIcon).color : GREEN, btn: oBtn };
                });
                var n = kinds(aMarks);
                Opa5.assert.ok(n.svg >= 6 && n.font >= 4, n.svg + " SVG chips and " + n.font + " glyph chips");
                var fRef = aMarks.filter(function (o) { return o.kind === "font"; })[0].mark;
                Opa5.assert.ok(aMarks.every(function (o) { return Math.abs(o.mark - fRef) <= 1; }),
                    "every mark is " + Math.round(fRef) + "px (SVG marks: " + aMarks.filter(function (o) { return o.kind === "svg"; }).map(function (o) { return Math.round(o.mark); }).join(",") + ")");
                Opa5.assert.ok(aMarks.every(function (o) { return Math.abs(o.w - aMarks[0].w) <= 1; }),
                    "every icon box has the same width (" + Math.round(aMarks[0].w) + "px), so labels align");
                Opa5.assert.ok(aMarks.every(function (o) { return o.color === GREEN; }), "unselected glyphs are the SVG green");

                // Select one SVG chip and one glyph chip.
                var oSvgChip = aMarks.filter(function (o) { return o.kind === "svg"; })[0].btn;
                var oFontChip = aMarks.filter(function (o) { return o.kind === "font"; })[0].btn;
                oSvgChip.firePress(); oFontChip.firePress();
            },
            errorMessage: "Interest chips not rendered"
        });
        Then.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) { return !!oBtn.data("interestKey") && oBtn.getType() === "Emphasized"; },
            check: function (aBtns) { return aBtns.length === 2 && aBtns.every(function (b) { return b.getDomRef() && b.getDomRef().querySelector(".sapMBtnEmphasized"); }); },
            success: function (aBtns) {
                aBtns.forEach(function (oBtn) {
                    var oDom = oBtn.getDomRef();
                    var oIcon = oDom.querySelector(".sapUiIcon"), oImg = oDom.querySelector("img");
                    if (oIcon) {
                        Opa5.assert.strictEqual(getComputedStyle(oIcon).color, "rgb(255, 255, 255)", oBtn.getText() + ": selected glyph is white");
                    } else {
                        Opa5.assert.ok(/invert\(1\)/.test(getComputedStyle(oImg).filter), oBtn.getText() + ": selected SVG is inverted to white");
                    }
                });
            },
            errorMessage: "Selected chips did not become Emphasized"
        });
        When.onTheBookingDialog.iDismissOnboarding();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Task category filter menu: glyphs are the SVG green, not the old #2E8B57", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("tasks");
        When.onTheTasksPage.iPressTaskCategoryFilter();

        Then.waitFor({
            controlType: "sap.ui.core.Icon",
            matchers: function (oIcon) { return oIcon.hasStyleClass("hhCatMenuIcon"); },
            check: function (aIcons) { return aIcons.length >= 4 && aIcons.every(function (i) { return !!i.getDomRef(); }); },
            success: function (aIcons) {
                var aColors = aIcons.map(function (i) { return getComputedStyle(i.getDomRef()).color; });
                Opa5.assert.ok(aColors.every(function (c) { return c === GREEN; }),
                    aIcons.length + " glyphs in the menu are " + GREEN + " (got " + JSON.stringify(aColors.filter(function (c) { return c !== GREEN; })) + ")");
            },
            errorMessage: "Task category menu glyphs not found"
        });
        Then.iTeardownMyUIComponent();
    });
});
