/**
 * OPA5 Journey — popover arrows point at the button that opened them.
 *
 * The custom helpmate theme (exported for UI5 1.147) shipped
 * _sap_m_Popover_ArrowOffset as "0.5rem"; UI5 1.120's Popover feeds that
 * string into Math.max() unparsed, gets NaN, and never positions the arrow —
 * it sat at the stylesheet default 20px from the popover's left edge, pointing
 * at nothing, on the language and notification popovers. The theme value is
 * now the plain "8" the runtime expects (see themes/.../helpmate/README-arrow-
 * offset.md). These tests measure the rendered arrow against the opener so a
 * theme re-export cannot silently bring the bug back.
 *
 *  1. Language popover arrow is centred on the globe button
 *  2. Notifications popover arrow is centred on the bell button
 *  3. Rating dialog opens with no star focused (no focus ring on a star)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, DashboardPage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";
    var TOLERANCE_PX = 4;

    QUnit.module("Popovers — arrow alignment and initial focus", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    function centreX(oDom) {
        var r = oDom.getBoundingClientRect();
        return r.left + r.width / 2;
    }

    // Closed popovers stay in the DOM (display:none), so the first
    // .sapMPopover is often a stale one. Take the visible one.
    function openPopoverArrow(oDoc) {
        var aOpen = Array.prototype.filter.call(oDoc.querySelectorAll(".sapMPopover"), function (el) {
            return el.getBoundingClientRect().width > 0;
        });
        var oPop = aOpen[aOpen.length - 1];
        return oPop ? oPop.querySelector(".sapMPopoverArr") : null;
    }

    // Finds the open popover's arrow DOM and asserts it is centred under the
    // opener. Reads the DOM UI5 actually rendered, not the control properties:
    // the bug was in the rendered offset, with every property looking right.
    function thenArrowPointsAt(Then, sOpenerId, sLabel) {
        Then.waitFor({
            id: sOpenerId,
            viewName: VIEW,
            check: function (oOpener) {
                return !!openPopoverArrow(Opa5.getWindow().document) && !!oOpener.getDomRef();
            },
            success: function (oOpener) {
                var oArrow = openPopoverArrow(Opa5.getWindow().document);
                var fArrow = centreX(oArrow), fOpener = centreX(oOpener.getDomRef());
                var fDelta = Math.abs(fArrow - fOpener);
                Opa5.assert.ok(fDelta <= TOLERANCE_PX,
                    sLabel + " arrow centre (" + Math.round(fArrow) + "px) is within " + TOLERANCE_PX +
                    "px of the button centre (" + Math.round(fOpener) + "px); off by " + Math.round(fDelta) + "px");
                // The positioning code writes an inline left/right when it works;
                // with the NaN bug the style attribute stayed empty.
                Opa5.assert.ok(/left|right/.test(oArrow.getAttribute("style") || ""),
                    sLabel + " arrow has an inline position (UI5 positioned it)");
            },
            errorMessage: sLabel + " popover arrow not rendered"
        });
    }

    // ── 1. Language popover ───────────────────────────────────────────────────

    opaTest("Language popover arrow is centred on the globe button", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({ id: "langBtn", viewName: VIEW, actions: new Press(), errorMessage: "Globe button not found" });
        thenArrowPointsAt(Then, "langBtn", "Language");

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Notifications popover ──────────────────────────────────────────────

    opaTest("Notifications popover arrow is centred on the bell button", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({ id: "notifBtn", viewName: VIEW, actions: new Press(), errorMessage: "Bell button not found" });
        thenArrowPointsAt(Then, "notifBtn", "Notifications");

        Then.iTeardownMyUIComponent();
    });

    // ── 3. Rating dialog initial focus ────────────────────────────────────────
    // Opened directly through the controller: the eligibility route is covered
    // in RatingJourney; this only cares where focus lands on open.

    opaTest("Rating dialog opens with no star focused", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "dashboardPage",
            viewName: VIEW,
            actions: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                oView.getController().onOpenRatingDialog();
            },
            errorMessage: "dashboardPage not found"
        });

        Then.waitFor({
            id: "ratingDialog",
            viewName: VIEW,
            matchers: function (oDialog) { return oDialog.isOpen(); },
            success: function (oDialog) {
                var oActive = Opa5.getWindow().document.activeElement;
                var oStars = oDialog.findAggregatedObjects(true, function (c) { return c.getId().indexOf("newRatingStars") >= 0; })[0];
                var bOnStar = !!(oStars && oStars.getDomRef() && oStars.getDomRef().contains(oActive));
                Opa5.assert.notOk(bOnStar, "Focus is not on a star icon after open (was: " + oActive.tagName + ")");
                Opa5.assert.notOk(oActive.tagName === "TEXTAREA", "Focus is not in the comment box either (keyboard stays down)");
            },
            errorMessage: "Rating dialog did not open"
        });

        Then.iTeardownMyUIComponent();
    });

});
