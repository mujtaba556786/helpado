/**
 * OPA5 Journey — Messages tab (conversations list, unread badge).
 *
 * Scenarios covered:
 *  1. Messages nav-tab button exists in the bottom navigation bar
 *  2. Switching to Messages tab shows at least one conversation
 *  3. A conversation with unread_count > 0 shows an unread badge
 *  4. DM Chat dialog opens when pressing a conversation item
 *  5. Messages render as real UI5 controls with their text content
 *  6. Own vs received messages are distinguished (alignment + read ticks)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/AggregationFilled",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/MessagesPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, AggregationFilled, DashboardPage, MessagesPage, MockServer) {
    "use strict";

    QUnit.module("Messages tab — conversations and unread counts", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1. Tab button ─────────────────────────────────────────────────────

    opaTest("Messages nav-tab button is present in the bottom bar", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.onTheMessagesPage.iSeeMessagesTabButton();
        Then.iTeardownMyUIComponent();
    });

    // ── 2. Conversations list ─────────────────────────────────────────────

    opaTest("Switching to Messages tab shows at least one conversation", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("messages");

        Then.onTheMessagesPage.iSeeAtLeastOneConversation();
        Then.iTeardownMyUIComponent();
    });

    // ── 3. Unread badge ───────────────────────────────────────────────────

    opaTest("A conversation with unread messages shows an unread count badge", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("messages");

        Then.onTheMessagesPage.iSeeUnreadBadgeOnConversation();
        Then.iTeardownMyUIComponent();
    });

    // ── 4. Open DM chat dialog ────────────────────────────────────────────

    opaTest("Pressing a conversation item opens the DM chat dialog", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("messages");

        // Wait for a conversation list to be populated, then press its first item.
        // Avoids fragile class-binding checks on aggregation-cloned items.
        When.waitFor({
            controlType: "sap.m.List",
            viewName: "helphub.view.Dashboard",
            matchers: new AggregationFilled({ name: "items" }),
            success: function (aLists) {
                var aFilled = aLists.filter(function (l) { return l.getItems().length > 0; });
                new Press().executeOn(aFilled[0].getItems()[0]);
            },
            errorMessage: "No conversation list item found to press"
        });

        Then.waitFor({
            controlType: "sap.m.Dialog",
            success: function (aDialogs) {
                var bOpen = aDialogs.some(function (d) { return d.isOpen(); });
                Opa5.assert.ok(bOpen, "DM chat dialog opened after pressing a conversation");
            },
            errorMessage: "DM chat dialog did not open after pressing conversation item"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 5. Messages render as real UI5 controls ───────────────────────────
    // Guards the redesign: bubbles used to be an injected HTML string via
    // core:HTML, which rendered no controls at all and could not be asserted.

    opaTest("DM chat renders each message as a UI5 control with its text", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("messages");
        When.waitFor({
            controlType: "sap.m.List",
            viewName: "helphub.view.Dashboard",
            matchers: new AggregationFilled({ name: "items" }),
            success: function (aLists) {
                var aFilled = aLists.filter(function (l) { return l.getItems().length > 0; });
                new Press().executeOn(aFilled[0].getItems()[0]);
            },
            errorMessage: "No conversation list item found to press"
        });

        Then.waitFor({
            controlType: "sap.m.List",
            searchOpenDialogs: true,
            matchers: new AggregationFilled({ name: "items" }),
            success: function (aLists) {
                var aTexts = [];
                aLists[0].findAggregatedObjects(true, function (o) {
                    if (o.isA("sap.m.Text")) { aTexts.push(o.getText()); }
                    return false;
                });
                Opa5.assert.ok(
                    aTexts.indexOf("See you tomorrow!") > -1,
                    "Message body is rendered by a real sap.m.Text control"
                );
            },
            errorMessage: "DM message list rendered no items"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 6. Own vs received distinction ────────────────────────────────────

    opaTest("Own messages are right-aligned and show a read tick", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("messages");
        When.waitFor({
            controlType: "sap.m.List",
            viewName: "helphub.view.Dashboard",
            matchers: new AggregationFilled({ name: "items" }),
            success: function (aLists) {
                var aFilled = aLists.filter(function (l) { return l.getItems().length > 0; });
                new Press().executeOn(aFilled[0].getItems()[0]);
            },
            errorMessage: "No conversation list item found to press"
        });

        Then.waitFor({
            controlType: "sap.m.List",
            searchOpenDialogs: true,
            matchers: new AggregationFilled({ name: "items" }),
            success: function (aLists) {
                var bOwnAligned = false, bTick = false;
                aLists[0].findAggregatedObjects(true, function (o) {
                    if (o.isA("sap.m.HBox") && o.getJustifyContent() === "End") { bOwnAligned = true; }
                    if (o.isA("sap.m.Text") && /\u2713/.test(o.getText() || "")) { bTick = true; }
                    return false;
                });
                Opa5.assert.ok(bOwnAligned, "Own message is aligned to the end (right)");
                Opa5.assert.ok(bTick, "Own message shows a delivery/read tick");
            },
            errorMessage: "Could not inspect rendered DM messages"
        });

        Then.iTeardownMyUIComponent();
    });
});
