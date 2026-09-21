/**
 * OPA5 Journey — editing, unsending and deleting in a DM chat.
 *
 *  1. Tapping the OTHER person's bubble opens nothing; tapping an own, fresh
 *     bubble opens a menu with Edit and Delete; an own bubble older than the
 *     15-minute window offers Delete only.
 *  2. Edit: the composer fills with the text and shows the edit bar; Send does
 *     exactly one PUT /api/messages/<id> with the new text (no POST), the bubble
 *     shows the new text plus "(edited)", and the edit bar closes.
 *  3. Unsend: confirm → exactly one DELETE /api/messages/<id>; the bubble shows
 *     the "message deleted" placeholder, styled like a removed one.
 *  4. Delete chat: header ⋮ → Delete chat → confirm → exactly one
 *     DELETE /api/conversations/<id>/me and the chat dialog closes.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/actions/EnterText",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer",
    "helphub/test/mockdata/data"
], function (opaTest, Opa5, Press, EnterText, DashboardPage, MockServer, MockData) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";
    var ME = "U_TEST_001";   // MockData.USER.id

    QUnit.module("DM chat — edit, unsend, delete chat", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    function messagesFixture() {
        var now = Date.now();
        return [
            { id: "MX1", conversation_id: "CONV1", sender_id: "p1", content: "Hi! Are you free on Saturday?", is_read: 1, created_at: new Date(now - 60 * 60000).toISOString() },
            { id: "MX2", conversation_id: "CONV1", sender_id: ME,   content: "Yes, 10 am wroks for me",     is_read: 1, created_at: new Date(now - 2 * 60000).toISOString() },
            { id: "MX3", conversation_id: "CONV1", sender_id: ME,   content: "Old message from earlier",     is_read: 1, created_at: new Date(now - 40 * 60000).toISOString() }
        ];
    }

    function iOpenTheChat(Given, When, aCalls) {
        MockServer.override("/api/messages/", function (url, options) {
            var sMethod = (options && options.method || "GET").toUpperCase();
            if (sMethod === "GET") { return MockServer.respond({ success: true, messages: messagesFixture() }); }
            if (url.indexOf("/read") >= 0) { return MockServer.respond({ success: true }); }
            aCalls.push({ method: sMethod, url: String(url), body: options && options.body ? JSON.parse(options.body) : null });
            return MockServer.respond({ success: true });
        });
        MockServer.override("/api/messages", function (url, options) {
            // bare /api/messages = POST send; must NOT happen during an edit
            aCalls.push({ method: (options.method || "GET").toUpperCase(), url: String(url), body: options.body ? JSON.parse(options.body) : null });
            return MockServer.respond({ success: true, messageId: "NEW" });
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
        When.waitFor({
            id: "dmMessageList", viewName: VIEW,
            matchers: function (oList) {
                return oList.getItems().length === 3 && oList.getItems().every(function (i) { return !!i.getDomRef(); });
            },
            errorMessage: "DM list with the three fixture messages not rendered"
        });
    }

    function bubbleFor(sId) {
        return function (oItem) {
            var oCtx = oItem.getBindingContext("appData");
            return !!(oCtx && oCtx.getObject() && oCtx.getObject().id === sId);
        };
    }

    function iPressActionSheetButton(When, sText) {
        When.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) {
                var oParent = oBtn.getParent();
                while (oParent && !(oParent.isA && oParent.isA("sap.m.ActionSheet"))) { oParent = oParent.getParent(); }
                return !!oParent && oBtn.getText() === sText;
            },
            actions: new Press(), errorMessage: "ActionSheet button '" + sText + "' not found"
        });
    }

    function iPressMessageBoxAction(When, sText) {
        When.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) {
                var oDialog = oBtn.getParent();
                while (oDialog && !(oDialog.isA && oDialog.isA("sap.m.Dialog"))) { oDialog = oDialog.getParent(); }
                return !!oDialog && oDialog.isOpen() && oBtn.getText() === sText;
            },
            actions: new Press(), errorMessage: "MessageBox button '" + sText + "' not found"
        });
    }

    // ── 1. Who gets a menu ───────────────────────────────────────────────────

    opaTest("Only own, intact bubbles open a menu; a 40-minute-old one offers no Edit", function (Given, When, Then) {
        var aCalls = [];
        iOpenTheChat(Given, When, aCalls);

        Then.waitFor({
            id: "dmMessageList", viewName: VIEW,
            success: function (oList) {
                var aItems = oList.getItems();
                var byId = function (sId) { return aItems.filter(bubbleFor(sId))[0]; };
                Opa5.assert.strictEqual(byId("MX1").getType(), "Inactive", "the other person's bubble is not pressable");
                Opa5.assert.strictEqual(byId("MX2").getType(), "Active", "own fresh bubble is pressable");
                Opa5.assert.strictEqual(byId("MX3").getType(), "Active", "own old bubble is pressable (unsend still allowed)");
                var oOld = byId("MX3").getBindingContext("appData").getObject();
                Opa5.assert.strictEqual(oOld.canEdit, false, "40-minute-old own message is not editable");
                Opa5.assert.strictEqual(byId("MX2").getBindingContext("appData").getObject().canEdit, true, "2-minute-old own message is editable");
            }
        });

        // Open the menu on the fresh own bubble and read its buttons.
        When.waitFor({ controlType: "sap.m.CustomListItem", viewName: VIEW, matchers: bubbleFor("MX2"), actions: new Press(), errorMessage: "own bubble MX2 not found" });
        Then.waitFor({
            controlType: "sap.m.ActionSheet",
            success: function (aSheets) {
                var aTexts = aSheets[0].getButtons().map(function (b) { return b.getText(); });
                Opa5.assert.deepEqual(aTexts, ["Edit", "Delete message"], "menu offers Edit and Delete message (" + aTexts.join(", ") + ")");
            },
            errorMessage: "ActionSheet did not open on the own bubble"
        });
        // The cancel button only exists on phone widths (desktop renders a Popover), so close it directly.
        When.waitFor({ controlType: "sap.m.ActionSheet", success: function (aSheets) { aSheets[0].close(); }, errorMessage: "ActionSheet not open" });

        Then.waitFor({ success: function () { Opa5.assert.strictEqual(aCalls.length, 0, "opening a menu sends nothing"); MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    // ── 2. Edit ──────────────────────────────────────────────────────────────

    opaTest("Edit fills the composer, PUTs once with the new text, shows (edited) and no POST happens", function (Given, When, Then) {
        var aCalls = [];
        iOpenTheChat(Given, When, aCalls);

        When.waitFor({ controlType: "sap.m.CustomListItem", viewName: VIEW, matchers: bubbleFor("MX2"), actions: new Press(), errorMessage: "own bubble MX2 not found" });
        iPressActionSheetButton(When, "Edit");

        Then.waitFor({
            id: "dmInput", viewName: VIEW,
            matchers: function (oInput) { return oInput.getValue() === "Yes, 10 am wroks for me"; },
            success: function () { Opa5.assert.ok(true, "composer holds the original text"); },
            errorMessage: "composer was not filled with the message text"
        });
        Then.waitFor({ id: "dmEditBar", viewName: VIEW, success: function (oBar) { Opa5.assert.ok(oBar.getVisible(), "edit bar is visible"); } });

        When.waitFor({ id: "dmInput", viewName: VIEW, actions: new EnterText({ text: "Yes, 10 am works for me", clearTextFirst: true }), errorMessage: "dmInput not found" });
        When.waitFor({ id: "dmSendBtn", viewName: VIEW, actions: new Press(), errorMessage: "Send not found" });

        Then.waitFor({
            controlType: "sap.m.CustomListItem", viewName: VIEW,
            matchers: function (oItem) {
                var o = oItem.getBindingContext("appData") && oItem.getBindingContext("appData").getObject();
                return !!o && o.id === "MX2" && o.content === "Yes, 10 am works for me";
            },
            success: function (aItems) {
                var o = aItems[0].getBindingContext("appData").getObject();
                Opa5.assert.strictEqual(aCalls.length, 1, "exactly one request left the app");
                Opa5.assert.strictEqual(aCalls[0].method, "PUT", "it was a PUT (not a POST of a new message)");
                Opa5.assert.ok(/\/api\/messages\/MX2$/.test(aCalls[0].url), "to /api/messages/MX2");
                Opa5.assert.deepEqual(aCalls[0].body, { content: "Yes, 10 am works for me" }, "with the corrected text");
                Opa5.assert.strictEqual(o.editedLabel, "(edited)", "bubble carries the (edited) label");
            },
            errorMessage: "edited bubble did not update"
        });
        Then.waitFor({ id: "dmEditBar", viewName: VIEW, visible: false, success: function (oBar) { Opa5.assert.notOk(oBar.getVisible(), "edit bar closed after saving"); } });
        Then.waitFor({ id: "dmInput", viewName: VIEW, success: function (oInput) { Opa5.assert.strictEqual(oInput.getValue(), "", "composer is empty again"); } });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    // ── 3. Unsend ────────────────────────────────────────────────────────────

    opaTest("Unsend: confirm → one DELETE /api/messages/<id> and the placeholder bubble", function (Given, When, Then) {
        var aCalls = [];
        iOpenTheChat(Given, When, aCalls);

        When.waitFor({ controlType: "sap.m.CustomListItem", viewName: VIEW, matchers: bubbleFor("MX3"), actions: new Press(), errorMessage: "own bubble MX3 not found" });
        iPressActionSheetButton(When, "Delete message");
        iPressMessageBoxAction(When, "Delete");

        Then.waitFor({
            controlType: "sap.m.CustomListItem", viewName: VIEW,
            matchers: function (oItem) {
                var o = oItem.getBindingContext("appData") && oItem.getBindingContext("appData").getObject();
                return !!o && o.id === "MX3" && o.deleted === true;
            },
            success: function (aItems) {
                var o = aItems[0].getBindingContext("appData").getObject();
                var sWant = aItems[0].getModel("i18n").getResourceBundle().getText("dmMessageDeleted");
                Opa5.assert.deepEqual(aCalls.map(function (c) { return c.method + " " + c.url.replace(/^.*\/api/, "/api"); }),
                    ["DELETE /api/messages/MX3"], "exactly one DELETE to the message");
                Opa5.assert.strictEqual(o.content, sWant, "bubble shows \"" + sWant + "\"");
                Opa5.assert.strictEqual(o.removedStr, "true", "placeholder is styled as secondary text");
                Opa5.assert.strictEqual(aItems[0].getType(), "Inactive", "a deleted bubble has no menu any more");
            },
            errorMessage: "unsent bubble did not turn into the placeholder"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    // ── 4. Delete chat ───────────────────────────────────────────────────────

    opaTest("Delete chat: ⋮ → Delete chat → confirm → one DELETE /api/conversations/<id>/me and the dialog closes", function (Given, When, Then) {
        var aCalls = [];
        var aConvCalls = [];
        // The override replaces the whole /api/conversations handler, so the list
        // GET must still answer with the mock conversations or there is no chat to open.
        MockServer.override("/api/conversations", function (url, options) {
            var sMethod = (options && options.method || "GET").toUpperCase();
            if (sMethod === "GET") {
                return MockServer.respond({ success: true, conversations: MockData.CONVERSATIONS, totalUnread: MockData.DM_UNREAD_COUNT });
            }
            aConvCalls.push({ method: sMethod, url: String(url) });
            return MockServer.respond({ success: true });
        });
        iOpenTheChat(Given, When, aCalls);

        When.waitFor({ id: "dmChatMenuBtn", viewName: VIEW, actions: new Press(), errorMessage: "chat ⋮ button not found" });
        iPressActionSheetButton(When, "Delete chat");
        iPressMessageBoxAction(When, "Delete");

        Then.waitFor({
            id: "dmChatDialog", viewName: VIEW, visible: false,
            matchers: function (oDialog) { return !oDialog.isOpen(); },
            success: function () {
                var aMine = aConvCalls.filter(function (c) { return c.method === "DELETE"; });
                Opa5.assert.strictEqual(aMine.length, 1, "exactly one DELETE on conversations");
                Opa5.assert.ok(/\/api\/conversations\/[^/]+\/me$/.test(aMine[0].url), "to /api/conversations/<id>/me (" + aMine[0].url + ")");
                Opa5.assert.strictEqual(aCalls.length, 0, "no message endpoint was touched");
            },
            errorMessage: "chat dialog did not close after deleting the chat"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });
});
