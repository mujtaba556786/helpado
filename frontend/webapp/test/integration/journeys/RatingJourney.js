/**
 * OPA5 Journey — "Rate this helper" dialog.
 *
 * The stars used to be a sap.m.RatingIndicator, which clips on the device
 * (slot sized from the unscaled icon, glyph scaled by WebView text zoom).
 * They are now five tappable Icons backed by appData>/newRating. These tests
 * pin the behaviour that replacement has to keep:
 *
 *  1. Tapping the 4th star stores 4 and fills exactly four stars
 *  2. Submitting with no star chosen is refused: dialog stays open, no request
 *  3. Dialog is compact (not stretched) — a 3-field form, not a full screen
 *  4. Profile opens from Recently Viewed — the reset of this form on profile
 *     open used to call setValue on the star control; with the stars now a
 *     plain HBox that threw "p.setValue is not a function" and the profile
 *     never opened. Every profile-open path resets the form, so this pins the
 *     one that broke.
 *
 * The dialog is reached through the only eligible route: the completed booking
 * with p4 (B3 in mock data) → Profile → Leave a review. That also proves the
 * eligibility gate still holds, since the Review button is invisible otherwise.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/SchedulePage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, DashboardPage, SchedulePage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Rating dialog — stars, empty submit, compact size", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    function iOpenRatingDialog(Given, When) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.onTheDashboard.iPressNavTab("mySchedule");

        // Profile button on the B3 card specifically — the only completed booking.
        When.waitFor({
            controlType: "sap.m.Button",
            viewName: VIEW,
            matchers: function (oBtn) {
                if (!oBtn.hasStyleClass("hhNotifChip")) { return false; }
                var oCtx = oBtn.getBindingContext("appData");
                return !!oCtx && oCtx.getObject().id === "B3";
            },
            actions: new Press(),
            errorMessage: "Profile button on the completed booking B3 not found"
        });

        When.waitFor({
            controlType: "sap.m.Button",
            viewName: VIEW,
            matchers: function (oBtn) { return oBtn.getIcon() === "sap-icon://feedback"; },
            actions: new Press(),
            errorMessage: "'Leave a review' button not visible — rating eligibility gate broken?"
        });
    }

    function starIcons(oDialog) {
        return oDialog.findAggregatedObjects(true, function (oCtrl) {
            return oCtrl.isA("sap.ui.core.Icon") && oCtrl.data("star") !== null;
        });
    }

    // ── 1. Tap the 4th star ───────────────────────────────────────────────────

    opaTest("Tapping the 4th star stores 4 and fills exactly four stars", function (Given, When, Then) {
        iOpenRatingDialog(Given, When);

        When.waitFor({
            id: "ratingDialog",
            viewName: VIEW,
            success: function (oDialog) {
                var aStars = starIcons(oDialog);
                Opa5.assert.strictEqual(aStars.length, 5, "Five star icons rendered");
                new Press().executeOn(aStars[3]);
            },
            errorMessage: "Rating dialog did not open"
        });

        Then.waitFor({
            id: "ratingDialog",
            viewName: VIEW,
            matchers: function (oDialog) {
                return oDialog.getModel("appData").getProperty("/newRating") === 4;
            },
            success: function (oDialog) {
                Opa5.assert.ok(true, "appData>/newRating is 4");
                var aFilled = starIcons(oDialog).filter(function (o) { return o.getSrc() === "sap-icon://favorite"; });
                Opa5.assert.strictEqual(aFilled.length, 4, "Exactly four stars are filled");
            },
            errorMessage: "Star press did not write 4 to appData>/newRating"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Submit with no stars ───────────────────────────────────────────────

    opaTest("Submitting with no star chosen keeps the dialog open and sends nothing", function (Given, When, Then) {
        iOpenRatingDialog(Given, When);

        var iRatingPosts = 0;
        When.waitFor({
            id: "ratingDialog",
            viewName: VIEW,
            success: function (oDialog) {
                Opa5.assert.strictEqual(oDialog.getModel("appData").getProperty("/newRating"), 0,
                    "Form opens with no star selected");
                var oWin = Opa5.getWindow();
                var fnOrig = oWin.fetch;
                oWin.fetch = function (url, opts) {
                    if (String(url).indexOf("/api/ratings") >= 0 && opts && opts.method === "POST") { iRatingPosts++; }
                    return fnOrig.apply(this, arguments);
                };
                oDialog.getBeginButton().firePress();
            },
            errorMessage: "Rating dialog did not open"
        });

        Then.waitFor({
            id: "ratingDialog",
            viewName: VIEW,
            matchers: function (oDialog) { return oDialog.isOpen(); },
            success: function () {
                Opa5.assert.ok(true, "Dialog stays open after an empty submit");
                Opa5.assert.strictEqual(iRatingPosts, 0, "No POST /api/ratings was sent");
            },
            errorMessage: "Dialog closed on an empty submit"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 3. Compact, not stretched ─────────────────────────────────────────────

    opaTest("Rating dialog is compact, not stretched full-screen", function (Given, When, Then) {
        iOpenRatingDialog(Given, When);

        Then.waitFor({
            id: "ratingDialog",
            viewName: VIEW,
            success: function (oDialog) {
                Opa5.assert.strictEqual(oDialog.getStretch(), false, "stretch is off");
                // The stretched class is what UI5 applies when a dialog goes
                // full-screen; its absence is the rendered proof, and unlike
                // window.innerHeight it does not read 0 in a hidden test tab.
                var oDom = oDialog.getDomRef();
                Opa5.assert.ok(oDom && !oDom.classList.contains("sapMDialogStretched"),
                    "Dialog is rendered compact (no sapMDialogStretched class)");
            },
            errorMessage: "Rating dialog did not open"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 4. Profile from Recently Viewed ───────────────────────────────────────

    opaTest("Profile opens from a Recently Viewed card (rating form reset must not throw)", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        // Seed one recently-viewed helper straight into the model; the list is
        // otherwise empty in tests because nothing has been viewed yet.
        When.waitFor({
            id: "dashboardPage",
            viewName: VIEW,
            actions: function (oPage) {
                oPage.getModel("appData").setProperty("/recentlyViewed", [
                    { id: "p4", name: "Lisa Chen", category: "Cleaning", avatar: "" }
                ]);
            },
            errorMessage: "dashboardPage not found"
        });
        When.onTheDashboard.iPressNavTab("saved");

        var aErrors = [];
        When.waitFor({
            id: "recentlyViewedList",
            viewName: VIEW,
            actions: function () {
                var oWin = Opa5.getWindow();
                oWin.addEventListener("error", function (e) { aErrors.push(String(e.message)); });
            },
            errorMessage: "Recently Viewed list not rendered after seeding"
        });

        When.waitFor({
            controlType: "sap.m.Button",
            viewName: VIEW,
            matchers: function (oBtn) {
                if (oBtn.getIcon() !== "sap-icon://person-placeholder") { return false; }
                var oParent = oBtn.getParent();
                while (oParent && oParent.getId && oParent.getId().indexOf("recentlyViewedList") < 0) {
                    oParent = oParent.getParent();
                }
                return !!oParent;
            },
            actions: new Press(),
            errorMessage: "Profile button on the Recently Viewed card not found"
        });

        Then.waitFor({
            id: "profileDialog",
            viewName: VIEW,
            matchers: function (oDialog) { return oDialog.isOpen(); },
            success: function (oDialog) {
                Opa5.assert.strictEqual(
                    oDialog.getModel("appData").getProperty("/selectedProfile/id"), "p4",
                    "Profile dialog opened for the recently viewed helper");
                Opa5.assert.deepEqual(aErrors, [], "No uncaught error while opening the profile");
            },
            errorMessage: "Profile dialog did not open from Recently Viewed"
        });

        Then.iTeardownMyUIComponent();
    });

});
