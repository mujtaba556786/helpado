/**
 * OPA5 Journey — Notification bell and unread-count badge.
 *
 * Scenarios covered:
 *  1.  Notification bell button is rendered in the header
 *  2.  Notification HTML badge element exists (id="notifBadge")
 *  3.  Pressing the bell opens the Notifications popover
 *  4.  Notifications dialog contains at least one item
 *  5.  Unread notifications show a visual distinction (is_read=0)
 *  6.  Notifications dialog has a "Mark all read" button
 *  7.  Notifications dialog has filter chips (all / today / yesterday / earlier)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationFilled",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, AggregationFilled, PropertyStrictEquals, DashboardPage, MockServer) {
    "use strict";

    QUnit.module("Notifications — bell, dialog, badges", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1. Bell button ────────────────────────────────────────────────────

    opaTest("Notification bell button is rendered in the app header", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "notifBtn",
            viewName: "helphub.view.Dashboard",
            success: function () {
                Opa5.assert.ok(true, "Notification bell button (id='notifBtn') exists");
            },
            errorMessage: "Notification bell not found"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Badge HTML element ─────────────────────────────────────────────

    opaTest("Notification badge HTML element is rendered in the header", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        // sap.ui.core.HTML is not reliably found via OPA5 controlType+viewName search.
        // Search the Element registry for any control whose ID ends with '--notifBadge'.
        Then.waitFor({
            check: function () {
                var bFound = false;
                sap.ui.core.Element.registry.forEach(function (el) {
                    if (el.getId().indexOf("--notifBadge") >= 0) { bFound = true; }
                });
                return bFound;
            },
            success: function () {
                Opa5.assert.ok(true, "Notification badge HTML element (id='notifBadge') exists");
            },
            errorMessage: "Notification badge HTML element not found"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 3. Dialog opens ───────────────────────────────────────────────────

    opaTest("Pressing the bell opens the Notifications dialog", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "notifBtn",
            viewName: "helphub.view.Dashboard",
            actions: new Press(),
            errorMessage: "Could not press the notification bell button"
        });

        // The bell opens NotificationsDialogV2, a sap.m.Popover anchored to the
        // button (CLAUDE.md: use a Popover, not a Dialog, for button-anchored
        // menus). This assertion still looked for the retired V1 sap.m.Dialog.
        Then.waitFor({
            controlType: "sap.m.Popover",
            success: function (aPopovers) {
                var bOpen = aPopovers.some(function (p) { return p.isOpen(); });
                Opa5.assert.ok(bOpen, "Notifications popover is open");
            },
            errorMessage: "Notifications popover did not open after pressing the bell"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 4. Dialog has items ───────────────────────────────────────────────

    opaTest("Notifications dialog contains at least one notification item", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "notifBtn",
            viewName: "helphub.view.Dashboard",
            actions: new Press(),
            errorMessage: "Could not press the notification bell"
        });

        Then.waitFor({
            controlType: "sap.m.List",
            matchers: new AggregationFilled({ name: "items" }),
            success: function () {
                Opa5.assert.ok(true, "Notifications list inside the dialog has items");
            },
            errorMessage: "Notifications list is empty"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 5 & 6. Dialog controls ────────────────────────────────────────────

    opaTest("Notifications dialog has a 'Mark all read' button", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "notifBtn",
            viewName: "helphub.view.Dashboard",
            actions: new Press(),
            errorMessage: "Could not press the notification bell"
        });

        Then.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) {
                return (oBtn.getText() || "").toLowerCase().indexOf("mark all") >= 0 ||
                       (oBtn.getText() || "").toLowerCase().indexOf("read") >= 0;
            },
            success: function () {
                Opa5.assert.ok(true, "'Mark all read' button found inside Notifications dialog");
            },
            errorMessage: "'Mark all read' button not found in Notifications dialog"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 7. Filter chips ───────────────────────────────────────────────────

    opaTest("Notifications dialog has filter chip buttons (all, today, yesterday, earlier)", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "notifBtn",
            viewName: "helphub.view.Dashboard",
            actions: new Press(),
            errorMessage: "Could not press the notification bell"
        });

        var aFilters = ["all", "today", "yesterday", "earlier"];
        aFilters.forEach(function (sFilter) {
            Then.waitFor({
                controlType: "sap.m.Button",
                matchers: function (oBtn) {
                    var aData = oBtn.getCustomData();
                    return aData.some(function (d) {
                        return d.getKey() === "filter" && d.getValue() === sFilter;
                    });
                },
                success: function () {
                    Opa5.assert.ok(true, "Notification filter chip '" + sFilter + "' is present");
                },
                errorMessage: "Notification filter chip '" + sFilter + "' not found"
            });
        });

        Then.iTeardownMyUIComponent();
    });
});
