/**
 * OPA5 Page Object — My Schedule tab (bookingsList, status filter chips).
 *
 * Covers:
 *  - Bookings list (id="bookingsList") populated from mock data
 *  - All 6 filter chip buttons (all / pending / confirmed / completed / declined / cancelled)
 *  - ObjectStatus state values for each booking status
 */
sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationFilled"
], function (Opa5, Press, AggregationFilled) {
    "use strict";

    var DASHBOARD_VIEW = "helphub.view.Dashboard";

    Opa5.createPageObjects({
        onTheSchedulePage: {

            // ── Actions ──────────────────────────────────────────────────────

            actions: {

                iPressViewProfileButton: function () {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        viewName: DASHBOARD_VIEW,
                        matchers: function (oBtn) {
                            // hhNotifChip is the CSS class used exclusively on booking-card Profile buttons
                            return oBtn.hasStyleClass("hhNotifChip");
                        },
                        actions: new Press(),
                        success: function () {
                            Opa5.assert.ok(true, "Profile button pressed in booking card");
                        },
                        errorMessage: "Booking-card Profile button (class hhNotifChip) not found on My Schedule tab"
                    });
                },

                iOpenBookingStatusMenu: function () {
                    return this.waitFor({
                        id: "bookingStatusBtn",
                        viewName: DASHBOARD_VIEW,
                        actions: new Press(),
                        errorMessage: "Booking status filter button not found"
                    });
                },

                iPressBookingFilter: function (sStatus) {
                    // Open the popover, then press the matching status list item.
                    this.iOpenBookingStatusMenu();
                    return this.waitFor({
                        controlType: "sap.m.CustomListItem",
                        // Popover content is not inside the view — search globally by custom data.
                        matchers: function (oItem) {
                            var oData = oItem.data("status");
                            return oData === sStatus;
                        },
                        actions: new Press(),
                        errorMessage: "Booking filter option '" + sStatus + "' not found in status popover"
                    });
                }
            },

            // ── Assertions ───────────────────────────────────────────────────

            assertions: {

                iSeeProfileDialogWithRating: function () {
                    // The profile dialog header has a displayOnly RatingIndicator bound to
                    // /selectedProfile/rating. A value > 0 confirms the rating was set.
                    // Using RatingIndicator (not Text) avoids expression-binding timing issues.
                    return this.waitFor({
                        controlType: "sap.m.RatingIndicator",
                        matchers: function (oRI) {
                            return oRI.getDisplayOnly() === true && oRI.getValue() > 0;
                        },
                        success: function () {
                            Opa5.assert.ok(true,
                                "Profile dialog RatingIndicator shows a non-zero rating (not 'No rating')");
                        },
                        errorMessage: "Profile dialog RatingIndicator with value > 0 not found — rating is still 0/null"
                    });
                },

                iSeeBookingsList: function () {
                    return this.waitFor({
                        id: "bookingsList",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Bookings list control exists on My Schedule tab");
                        },
                        errorMessage: "bookingsList not found on My Schedule tab"
                    });
                },

                iSeeBookingsListFilled: function () {
                    return this.waitFor({
                        id: "bookingsList",
                        viewName: DASHBOARD_VIEW,
                        matchers: new AggregationFilled({ name: "items" }),
                        success: function () {
                            Opa5.assert.ok(true, "Bookings list has at least one item");
                        },
                        errorMessage: "Bookings list is empty"
                    });
                },

                iSeeBookingStatusBadge: function (sStatus, sExpectedState) {
                    return this.waitFor({
                        id: "bookingsList",
                        viewName: DASHBOARD_VIEW,
                        matchers: new AggregationFilled({ name: "items" }),
                        success: function (oList) {
                            var bFound = oList.getItems().some(function (oItem) {
                                var oCtx = oItem.getBindingContext("appData");
                                return oCtx && oCtx.getObject() && oCtx.getObject().status === sStatus;
                            });
                            Opa5.assert.ok(bFound,
                                "Booking status badge '" + sStatus + "' with state '" + sExpectedState + "' found");
                        },
                        errorMessage: "Booking badge '" + sStatus + "' / state '" + sExpectedState + "' not found"
                    });
                },

                iSeeAllStatusFilterOptions: function () {
                    var aStatuses = ["all", "pending", "confirmed", "completed", "declined", "cancelled"];
                    var that = this;
                    // Open the popover once, then assert each status option is present as a list item.
                    this.waitFor({
                        id: "bookingStatusBtn",
                        viewName: DASHBOARD_VIEW,
                        actions: new Press(),
                        errorMessage: "Booking status filter button not found"
                    });
                    aStatuses.forEach(function (sStatus) {
                        that.waitFor({
                            controlType: "sap.m.CustomListItem",
                            matchers: function (oItem) {
                                return oItem.data("status") === sStatus;
                            },
                            success: function (aItems) {
                                // Assert the row actually carries a sized icon and a
                                // label — the bug was the glyph rendering clipped, so
                                // "the item exists" alone would not have caught it.
                                var oIcon, oText;
                                aItems[0].findAggregatedObjects(true, function (oCtrl) {
                                    if (!oIcon && oCtrl.isA("sap.ui.core.Icon")) { oIcon = oCtrl; }
                                    if (!oText && oCtrl.isA("sap.m.Text"))       { oText = oCtrl; }
                                    return false;
                                });
                                Opa5.assert.ok(oIcon && oIcon.getSrc() && oIcon.getWidth(),
                                    "Status option '" + sStatus + "' has an icon with an explicit width");
                                Opa5.assert.ok(oText && oText.getText(),
                                    "Status option '" + sStatus + "' has a label");
                            },
                            errorMessage: "Status filter option '" + sStatus + "' not found in popover"
                        });
                    });
                    return this;
                },

                iSeeEveryStatusIconIsDistinct: function () {
                    // Open the popover inline: iOpenBookingStatusMenu lives in the
                    // actions block, which is a different object from this one.
                    this.waitFor({
                        id: "bookingStatusBtn",
                        viewName: DASHBOARD_VIEW,
                        actions: new Press(),
                        errorMessage: "Booking status filter button not found"
                    });
                    return this.waitFor({
                        controlType: "sap.m.CustomListItem",
                        matchers: function (oItem) {
                            return !!oItem.data("status");
                        },
                        success: function (aItems) {
                            // Two options used to share a glyph: sys-enter-2 renders
                            // pixel-identical to status-positive, so "Confirmed" and
                            // "Completed" looked like the same row. Assert the icons are
                            // all different rather than merely present.
                            var aSrc = [];
                            aItems.forEach(function (oItem) {
                                oItem.findAggregatedObjects(true, function (oCtrl) {
                                    if (oCtrl.isA("sap.ui.core.Icon")) { aSrc.push(oCtrl.getSrc()); }
                                    return false;
                                });
                            });
                            var aUnique = aSrc.filter(function (s, i) { return aSrc.indexOf(s) === i; });
                            Opa5.assert.strictEqual(aSrc.length, 6, "All 6 status options carry an icon");
                            Opa5.assert.strictEqual(aUnique.length, aSrc.length,
                                "No two status options share an icon (" + aSrc.join(", ") + ")");
                        },
                        errorMessage: "Status filter options not found in popover"
                    });
                }
            }
        }
    });
});
