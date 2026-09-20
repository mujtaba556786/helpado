/**
 * OPA5 Journey — in-app feedback (Settings → Support → "Give feedback").
 *
 * Scenarios covered:
 *  1. The Settings dialog has a Feedback row and pressing it opens the dialog
 *     with "Idea" preselected and an empty message.
 *  2. Sending with an empty message keeps the dialog open and posts NOTHING.
 *  3. Sending a real message POSTs {type, message, app_build, platform} to
 *     /api/feedback exactly once, with the chosen type, and closes the dialog.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/actions/EnterText",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, EnterText, PropertyStrictEquals, DashboardPage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Feedback — Settings → Support → Give feedback", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    function iOpenFeedbackDialog(Given, When) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.waitFor({ id: "headerAvatar", viewName: VIEW, actions: new Press(), errorMessage: "Header avatar not found" });
        When.waitFor({
            controlType: "sap.m.Button", viewName: VIEW,
            matchers: new PropertyStrictEquals({ name: "icon", value: "sap-icon://action-settings" }),
            actions: new Press(), errorMessage: "Settings gear not found"
        });
        When.waitFor({
            controlType: "sap.m.CustomListItem", viewName: VIEW,
            matchers: function (oItem) {
                var bFound = false;
                oItem.findAggregatedObjects(true, function (oChild) {
                    if (oChild.isA("sap.ui.core.Icon") && oChild.getSrc() === "sap-icon://feedback") { bFound = true; }
                });
                return bFound;
            },
            actions: new Press(), errorMessage: "Feedback row not found in SettingsDialog"
        });
    }

    // ── 1. Row opens the dialog in a clean state ─────────────────────────────

    opaTest("Feedback row opens the dialog with 'Idea' preselected and an empty message", function (Given, When, Then) {
        iOpenFeedbackDialog(Given, When);

        Then.waitFor({
            id: "feedbackDialog", viewName: VIEW,
            matchers: function (oDialog) { return oDialog.isOpen(); },
            success: function (oDialog) {
                var oModel = oDialog.getModel("appData");
                Opa5.assert.strictEqual(oModel.getProperty("/feedback/type"), "idea", "type starts as 'idea'");
                Opa5.assert.strictEqual(oModel.getProperty("/feedback/message"), "", "message starts empty");
                var sWant = oDialog.getModel("i18n").getResourceBundle().getText("feedbackTitle");
                Opa5.assert.strictEqual(oDialog.getTitle(), sWant, "dialog title comes from i18n (" + sWant + ")");
            },
            errorMessage: "Feedback dialog did not open"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Empty message: nothing leaves the device ──────────────────────────

    opaTest("Sending an empty message keeps the dialog open and posts nothing", function (Given, When, Then) {
        var aCalls = [];
        MockServer.override("/api/feedback", function (url, options) {
            aCalls.push(JSON.parse(options.body));
            return MockServer.respond({ success: true, id: 1 });
        });

        iOpenFeedbackDialog(Given, When);
        When.waitFor({ id: "feedbackSendButton", viewName: VIEW, actions: new Press(), errorMessage: "Send button not found" });

        Then.waitFor({
            id: "feedbackDialog", viewName: VIEW,
            success: function (oDialog) {
                Opa5.assert.ok(oDialog.isOpen(), "dialog stays open");
                Opa5.assert.strictEqual(aCalls.length, 0, "no POST /api/feedback was made");
            },
            errorMessage: "Feedback dialog not found"
        });

        Then.waitFor({
            success: function () { MockServer.clearOverrides(); }
        });
        Then.iTeardownMyUIComponent();
    });

    // ── 3. Real message: exactly one POST with the right shape ───────────────

    opaTest("A 'Problem' with text POSTs once to /api/feedback and closes the dialog", function (Given, When, Then) {
        var aCalls = [];
        MockServer.override("/api/feedback", function (url, options) {
            aCalls.push({ method: options.method, body: JSON.parse(options.body) });
            return MockServer.respond({ success: true, id: 7 });
        });

        iOpenFeedbackDialog(Given, When);

        When.waitFor({
            controlType: "sap.m.SegmentedButtonItem", viewName: VIEW,
            matchers: new PropertyStrictEquals({ name: "key", value: "problem" }),
            actions: new Press(), errorMessage: "'Problem' segment not found"
        });
        When.waitFor({
            id: "feedbackMessage", viewName: VIEW,
            actions: new EnterText({ text: "Die Karte lädt auf meinem Handy nicht." }),
            errorMessage: "Feedback text area not found"
        });
        When.waitFor({ id: "feedbackSendButton", viewName: VIEW, actions: new Press(), errorMessage: "Send button not found" });

        Then.waitFor({
            id: "feedbackDialog", viewName: VIEW,
            visible: false,   // a closed Dialog is not rendered; OPA's default Visible matcher would never match
            matchers: function (oDialog) { return !oDialog.isOpen(); },
            success: function () {
                Opa5.assert.strictEqual(aCalls.length, 1, "exactly one POST /api/feedback");
                var oCall = aCalls[0];
                Opa5.assert.strictEqual(oCall.method, "POST", "method is POST");
                Opa5.assert.strictEqual(oCall.body.type, "problem", "type is the chosen segment");
                Opa5.assert.strictEqual(oCall.body.message, "Die Karte lädt auf meinem Handy nicht.", "message is the typed text");
                // _HH_BUILD is set by index.html, which the OPA test page does not load,
                // so the value is empty here; production sends e.g. "3.68".
                Opa5.assert.strictEqual(typeof oCall.body.app_build, "string", "app_build field rides along");
                Opa5.assert.strictEqual(oCall.body.platform, "web", "platform is 'web' outside Cordova");
            },
            errorMessage: "Feedback dialog did not close after sending"
        });

        Then.waitFor({
            success: function () { MockServer.clearOverrides(); }
        });
        Then.iTeardownMyUIComponent();
    });
});
