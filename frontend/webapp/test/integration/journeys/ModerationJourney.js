/**
 * OPA5 Journey — moderation as the user sees it.
 *
 *  1. A message the moderation removed (content '', removed = 1) renders the
 *     localised placeholder in grey, never the original text.
 *  2. Settings → Account → "Delete account": Cancel in the confirm sends
 *     nothing; the DELETE action sends exactly one DELETE /api/users/me and the
 *     app returns to the login screen.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, PropertyStrictEquals, DashboardPage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Moderation — removed messages and account erasure", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1. Removed message placeholder ───────────────────────────────────────

    opaTest("A removed message shows the moderation placeholder, not its text", function (Given, When, Then) {
        MockServer.override("/api/messages/", function () {
            return MockServer.respond({ success: true, messages: [
                { id: "M1", conversation_id: "CONV1", sender_id: "p1", content: "Hi! Are you free on Saturday?", is_read: 1, removed: 0, created_at: "2026-09-17T10:00:00Z" },
                { id: "M2", conversation_id: "CONV1", sender_id: "p1", content: "", is_read: 1, removed: 1, created_at: "2026-09-17T10:01:00Z" }
            ] });
        });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.onTheDashboard.iPressNavTab("messages");
        When.waitFor({
            controlType: "sap.m.CustomListItem", viewName: VIEW,
            matchers: function (oItem) {
                var oCtx = oItem.getBindingContext("appData");
                return !!(oCtx && oCtx.getObject() && typeof oCtx.getObject().other_name === "string");
            },
            actions: new Press(), errorMessage: "No conversation row to press"
        });

        Then.waitFor({
            id: "dmMessageList", viewName: VIEW,
            matchers: function (oList) {
                // Items exist before they are painted; the assertions read the DOM.
                return oList.getItems().length === 2 &&
                       oList.getItems().every(function (oItem) { return !!oItem.getDomRef(); });
            },
            success: function (oList) {
                var sWant = oList.getModel("i18n").getResourceBundle().getText("messageRemoved");
                var aTexts = oList.findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.Text") && c.getRenderWhitespace && c.getRenderWhitespace();
                });
                var aBodies = aTexts.map(function (t) { return t.getText(); });
                Opa5.assert.ok(aBodies.indexOf("Hi! Are you free on Saturday?") >= 0, "the intact message renders its text");
                Opa5.assert.ok(aBodies.indexOf(sWant) >= 0, "the removed message renders \"" + sWant + "\"");
                var oRemoved = aTexts.filter(function (t) { return t.getText() === sWant; })[0];
                var oDom = oRemoved.getDomRef();
                Opa5.assert.strictEqual(oDom.getAttribute("data-hhremoved"), "true", "the placeholder carries data-hhremoved");
                var oIntact = aTexts.filter(function (t) { return t.getText() === "Hi! Are you free on Saturday?"; })[0];
                var sRemovedColor = Opa5.getWindow().getComputedStyle(oDom).color;
                var sIntactColor  = Opa5.getWindow().getComputedStyle(oIntact.getDomRef()).color;
                Opa5.assert.notStrictEqual(sRemovedColor, sIntactColor, "the placeholder is styled differently from a normal message (" + sRemovedColor + " vs " + sIntactColor + ")");
                Opa5.assert.strictEqual(aBodies.filter(function (b) { return b === ""; }).length, 0, "no empty bubble is rendered");
            },
            errorMessage: "DM list with two messages not rendered"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    // ── 2. Delete account ────────────────────────────────────────────────────

    function iOpenSettings(Given, When) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.waitFor({ id: "headerAvatar", viewName: VIEW, actions: new Press(), errorMessage: "Header avatar not found" });
        When.waitFor({
            controlType: "sap.m.Button", viewName: VIEW,
            matchers: new PropertyStrictEquals({ name: "icon", value: "sap-icon://action-settings" }),
            actions: new Press(), errorMessage: "Settings gear not found"
        });
    }

    // Confirms are bottom sheets (SheetMixin): a sap.m.Dialog with class hhSheet.
    function iPressMessageBoxAction(When, sActionText) {
        When.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) {
                var oDialog = oBtn.getParent();
                while (oDialog && !(oDialog.isA && oDialog.isA("sap.m.Dialog"))) { oDialog = oDialog.getParent(); }
                return !!oDialog && oDialog.isOpen() && oDialog.hasStyleClass("hhSheet") && oBtn.getText() === sActionText;
            },
            actions: new Press(),
            errorMessage: "Sheet button '" + sActionText + "' not found"
        });
    }

    opaTest("Delete account: Cancel in the confirm sends nothing", function (Given, When, Then) {
        var iDeletes = 0;
        MockServer.override("/api/users/me", function (url, options) {
            if ((options.method || "GET").toUpperCase() === "DELETE") iDeletes++;
            return MockServer.respond({ success: true });
        });

        iOpenSettings(Given, When);
        When.waitFor({ id: "deleteAccountRow", viewName: VIEW, actions: new Press(), errorMessage: "Delete account row not found" });

        Then.waitFor({
            controlType: "sap.m.Dialog",
            matchers: function (d) { return d.isOpen() && d.hasStyleClass("hhSheet") && d.data("sheet") === "deleteAccount"; },
            success: function (aDialogs) {
                var aTexts = aDialogs[0].findAggregatedObjects(true, function (c) { return c.isA("sap.m.Text"); }).map(function (t) { return t.getText(); });
                Opa5.assert.ok(aTexts.indexOf("Delete your account?") >= 0, "sheet carries the question as its title text");
                var aBtns = aDialogs[0].findAggregatedObjects(true, function (c) { return c.isA("sap.m.Button"); }).map(function (b) { return b.getText(); });
                Opa5.assert.deepEqual(aBtns, ["Cancel", "Delete account"], "confirm offers Cancel then Delete account (" + aBtns.join(", ") + ")");
            },
            errorMessage: "Delete-account sheet did not open"
        });
        iPressMessageBoxAction(When, "Cancel");

        Then.waitFor({
            id: "settingsDialog", viewName: VIEW,
            success: function (oDialog) {
                Opa5.assert.ok(oDialog.isOpen(), "settings stay open after Cancel");
                Opa5.assert.strictEqual(iDeletes, 0, "no DELETE /api/users/me was sent");
            },
            errorMessage: "Settings dialog not found"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Delete account: confirming sends exactly one DELETE /api/users/me and returns to login", function (Given, When, Then) {
        var aCalls = [];
        MockServer.override("/api/users/me", function (url, options) {
            // The substring also matches GET /api/users/me/blocks (loaded at start);
            // this test is about the erasure call, so record DELETEs only.
            var sMethod = (options.method || "GET").toUpperCase();
            if (sMethod === "DELETE") { aCalls.push(sMethod); }
            return MockServer.respond({ success: true, already: false, blocked: [] });
        });

        iOpenSettings(Given, When);
        When.waitFor({ id: "deleteAccountRow", viewName: VIEW, actions: new Press(), errorMessage: "Delete account row not found" });
        iPressMessageBoxAction(When, "Delete account");

        Then.waitFor({
            viewName: "helphub.view.Login",
            id: "signInButton",
            success: function () {
                Opa5.assert.deepEqual(aCalls, ["DELETE"], "exactly one DELETE /api/users/me");
                Opa5.assert.ok(!localStorage.getItem("helpmate_token"), "the access token was cleared");
            },
            errorMessage: "Login screen did not appear after deleting the account"
        });

        Then.waitFor({
            success: function () {
                MockServer.clearOverrides();
                // Other journeys expect a signed-in start; MockServer.start() seeded
                // the token once, so put it back the way the seed does.
                MockServer.stop(); MockServer.start();
            }
        });
        Then.iTeardownMyUIComponent();
    });
});
