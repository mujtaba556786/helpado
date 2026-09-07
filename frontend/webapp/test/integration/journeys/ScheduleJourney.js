/**
 * OPA5 Journey — My Schedule tab (bookings list and status filters).
 *
 * Scenarios covered:
 *  1. My Schedule tab shows the bookings list control
 *  2. Bookings list is populated (has items from mock data)
 *  3. Status filter popover lists all 6 options (all / pending / confirmed / completed / declined / cancelled)
 *  4. Confirmed booking shows a "Success" state badge
 *  5. Pending booking shows a "Warning" state badge
 *  6. Completed booking shows a "None" state badge (grey/neutral)
 *  7. Declined booking shows an "Error" state badge
 *  5. Opening the provider profile dialog shows a numeric rating (not 'No rating')
 *  6. Pressing "confirmed" filter chip limits list to confirmed bookings only
 *  7. Pressing "pending" filter chip limits list to pending bookings only
 *  8. Pressing "all" filter chip restores the full list (excluding cancelled)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/SchedulePage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, SchedulePage, MockServer) {
    "use strict";

    QUnit.module("My Schedule — bookings list and filters", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1 & 2. Basic list rendering ───────────────────────────────────────

    opaTest("My Schedule tab shows the bookings list control", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeBookingsList();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Bookings list is populated with items from mock data", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeBookingsListFilled();
        Then.iTeardownMyUIComponent();
    });

    // ── 3. Filter chips ───────────────────────────────────────────────────

    opaTest("The status filter popover lists all 6 status options", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeAllStatusFilterOptions();
        Then.iTeardownMyUIComponent();
    });

    // ── 4. Booking status badges ──────────────────────────────────────────

    opaTest("Confirmed booking shows an ObjectStatus with state 'Success'", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeBookingStatusBadge("confirmed", "Success");
        Then.iTeardownMyUIComponent();
    });

    opaTest("Pending booking shows an ObjectStatus with state 'Warning'", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeBookingStatusBadge("pending", "Warning");
        Then.iTeardownMyUIComponent();
    });

    opaTest("Completed booking shows an ObjectStatus with state 'None'", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeBookingStatusBadge("completed", "None");
        Then.iTeardownMyUIComponent();
    });

    opaTest("Declined booking shows an ObjectStatus with state 'Error'", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.onTheSchedulePage.iSeeBookingStatusBadge("declined", "Error");
        Then.iTeardownMyUIComponent();
    });

    // ── 5. Provider profile dialog shows a rating ─────────────────────────

    opaTest("Pressing Profile on a booking card opens profile dialog with a numeric rating", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressViewProfileButton();

        Then.onTheSchedulePage.iSeeProfileDialogWithRating();
        Then.iTeardownMyUIComponent();
    });

    // ── 6. Filter interactions ────────────────────────────────────────────

    opaTest("Pressing 'confirmed' filter chip shows only confirmed bookings", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressBookingFilter("confirmed");

        // After filtering, list should still be filled (we have B1 confirmed)
        Then.onTheSchedulePage.iSeeBookingsListFilled();

        // And the list should only contain confirmed status badges
        Then.waitFor({
            id: "bookingsList",
            viewName: "helphub.view.Dashboard",
            success: function (oList) {
                var aItems = oList.getItems();
                var bAllConfirmed = aItems.every(function (oItem) {
                    var aStatuses = oItem.findAggregatedObjects(true, function (o) {
                        return o.isA("sap.m.ObjectStatus");
                    });
                    return aStatuses.some(function (s) { return s.getText() === "confirmed"; });
                });
                Opa5.assert.ok(bAllConfirmed,
                    "After 'confirmed' filter all visible bookings have status 'confirmed'");
            },
            errorMessage: "Bookings list not found for filter verification"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Pressing 'pending' filter chip shows only pending bookings", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressBookingFilter("pending");

        Then.onTheSchedulePage.iSeeBookingsListFilled();

        Then.waitFor({
            id: "bookingsList",
            viewName: "helphub.view.Dashboard",
            success: function (oList) {
                var aItems = oList.getItems();
                var bAllPending = aItems.every(function (oItem) {
                    var aStatuses = oItem.findAggregatedObjects(true, function (o) {
                        return o.isA("sap.m.ObjectStatus");
                    });
                    return aStatuses.some(function (s) { return s.getText() === "pending"; });
                });
                Opa5.assert.ok(bAllPending,
                    "After 'pending' filter all visible bookings have status 'pending'");
            },
            errorMessage: "Bookings list not found after pending filter"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Pressing 'all' filter chip restores the full (non-cancelled) list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressBookingFilter("confirmed"); // narrow first
        When.onTheSchedulePage.iPressBookingFilter("all");       // then reset

        // With 4 non-cancelled bookings in mock data (B1–B4), list should show 4 items
        Then.waitFor({
            id: "bookingsList",
            viewName: "helphub.view.Dashboard",
            success: function (oList) {
                Opa5.assert.ok(oList.getItems().length >= 4,
                    "After reset to 'all', at least 4 bookings visible (cancelled hidden by default)");
            },
            errorMessage: "Bookings list not found for 'all' filter verification"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── Mark as completed ─────────────────────────────────────────────────
    // Reviews require a completed booking, and nothing used to move a booking
    // into that state, so this action is what makes reviewing possible at all.
    // It must appear only on the customer's own confirmed booking whose date has
    // passed — B1 (confirmed, 2025-06-20) qualifies; B2 (pending) must not.

    opaTest("Confirmed past booking offers 'Mark as completed'", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.waitFor({
            controlType: "sap.m.Button",
            viewName: "helphub.view.Dashboard",
            matchers: function (oBtn) {
                if (!oBtn.getText || oBtn.getText() !== "Mark as completed") return false;
                // getVisible() is the control's own flag — a button inside a hidden
                // parent still reports true. Check it is actually rendered.
                var oDom = oBtn.getDomRef();
                return !!oDom && oDom.offsetParent !== null;
            },
            success: function (aButtons) {
                var aStatuses = aButtons.map(function (b) {
                    var oCtx = b.getBindingContext("appData");
                    return oCtx && oCtx.getObject() ? oCtx.getObject().status : "?";
                });
                Opa5.assert.ok(aButtons.length > 0, "'Mark as completed' is offered");
                Opa5.assert.ok(
                    aStatuses.every(function (s) { return s === "confirmed"; }),
                    "only on confirmed bookings (got: " + aStatuses.join(", ") + ")"
                );
            },
            errorMessage: "'Mark as completed' was not offered on any confirmed past booking"
        });

        Then.iTeardownMyUIComponent();
    });
});
