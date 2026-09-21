/**
 * OPA5 Journey — blocking is enforced in the UI, and can be undone.
 *
 *  1. A profile of someone I blocked shows the "blocked" strip and Unblock,
 *     and hides Book / Message and the Block link.
 *  2. Pressing Unblock sends exactly one DELETE /api/users/<id>/block, the
 *     strip disappears and Book / Message come back.
 *  3. Settings → Blocked users lists my blocks with an Unblock button each;
 *     the empty state text shows when there are none.
 *  4. Deleting my own task: the Delete button sits in the dialog footer,
 *     confirm sends exactly one DELETE /api/tasks/<id>, the dialog closes.
 *     (Two real bugs: an undeclared variable threw before the confirm, and a
 *     wrong `this` in the callback threw after the server had deleted.)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/TasksPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, PropertyStrictEquals, DashboardPage, TasksPage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Blocking — enforced and reversible; task delete", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    function iOpenProfileOf(Given, When, sId, sName) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.waitFor({
            id: "dashboardPage", viewName: VIEW,
            actions: function (oPage) {
                oPage.getModel("appData").setProperty("/recentlyViewed", [{ id: sId, name: sName, category: "Cleaning", avatar: "" }]);
            }
        });
        When.onTheDashboard.iPressNavTab("saved");
        When.waitFor({
            controlType: "sap.m.Button", viewName: VIEW,
            matchers: function (oBtn) {
                if (oBtn.getIcon() !== "sap-icon://person-placeholder") { return false; }
                var oParent = oBtn.getParent();
                while (oParent && oParent.getId && oParent.getId().indexOf("recentlyViewedList") < 0) { oParent = oParent.getParent(); }
                return !!oParent;
            },
            actions: new Press(), errorMessage: "Profile button on the Recently Viewed card not found"
        });
    }

    function blocksOverride(aBlocked, aCalls) {
        MockServer.override("/api/users/me/blocks", function () {
            return MockServer.respond({ success: true, blocked: aBlocked.map(function (id) { return { blocked_id: id, name: "Blocked " + id, avatar: "" }; }) });
        });
        MockServer.override("/block", function (url, options) {
            aCalls.push({ method: (options.method || "GET").toUpperCase(), url: String(url) });
            if ((options.method || "").toUpperCase() === "DELETE") {
                aBlocked.splice(0, aBlocked.length);   // server side: block gone
            }
            return MockServer.respond({ success: true });
        });
    }

    // ── 1 + 2. Blocked profile, then Unblock ─────────────────────────────────

    opaTest("A blocked user's profile hides Book/Message, shows the strip and Unblock; Unblock reverts it", function (Given, When, Then) {
        var aBlocked = ["p4"], aCalls = [];
        blocksOverride(aBlocked, aCalls);

        iOpenProfileOf(Given, When, "p4", "Lisa Chen");

        Then.waitFor({
            id: "profileDialog", viewName: VIEW,
            matchers: function (oDialog) { return oDialog.isOpen(); },
            success: function (oDialog) {
                var oModel = oDialog.getModel("appData");
                Opa5.assert.strictEqual(oModel.getProperty("/isBlockedProfile"), true, "profile is flagged as blocked");
                Opa5.assert.strictEqual(oModel.getProperty("/isOtherUnblockedProfile"), false, "Book/Message row is hidden");
                var byId = function (sSuffix) { return oDialog.findAggregatedObjects(true, function (c) { return c.getId && new RegExp(sSuffix + "$").test(c.getId()); })[0]; };
                Opa5.assert.ok(byId("profileBlockedStrip").getVisible(), "'blocked' strip is visible");
                Opa5.assert.ok(byId("profileUnblockBtn").getVisible(), "Unblock button is visible");
                Opa5.assert.notOk(byId("profileBlockBtn").getVisible(), "Block button is hidden");
            },
            errorMessage: "Profile dialog did not open"
        });

        When.waitFor({ id: "profileUnblockBtn", viewName: VIEW, actions: new Press(), errorMessage: "Unblock button not found" });

        Then.waitFor({
            id: "profileDialog", viewName: VIEW,
            matchers: function (oDialog) { return oDialog.getModel("appData").getProperty("/isBlockedProfile") === false; },
            success: function (oDialog) {
                var aDeletes = aCalls.filter(function (c) { return c.method === "DELETE"; });
                Opa5.assert.strictEqual(aDeletes.length, 1, "exactly one DELETE …/block");
                Opa5.assert.ok(/\/api\/users\/p4\/block$/.test(aDeletes[0].url), "for user p4 (" + aDeletes[0].url + ")");
                Opa5.assert.strictEqual(oDialog.getModel("appData").getProperty("/isOtherUnblockedProfile"), true, "Book/Message row is back");
            },
            errorMessage: "profile did not leave the blocked state after Unblock"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    // ── 3. Settings → Blocked users ──────────────────────────────────────────

    opaTest("Settings → Blocked users lists my blocks with an Unblock button, and an empty state otherwise", function (Given, When, Then) {
        var aBlocked = ["p2", "p3"], aCalls = [];
        blocksOverride(aBlocked, aCalls);

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.waitFor({ id: "headerAvatar", viewName: VIEW, actions: new Press(), errorMessage: "Header avatar not found" });
        When.waitFor({
            controlType: "sap.m.Button", viewName: VIEW,
            matchers: new PropertyStrictEquals({ name: "icon", value: "sap-icon://action-settings" }),
            actions: new Press(), errorMessage: "Settings gear not found"
        });
        When.waitFor({ id: "blockedUsersRow", viewName: VIEW, actions: new Press(), errorMessage: "Blocked users row not found" });

        Then.waitFor({
            id: "blockedUsersList", viewName: VIEW,
            matchers: function (oList) { return oList.getItems().length === 2; },
            success: function (oList) {
                var aNames = oList.getItems().map(function (i) { return i.getBindingContext("appData").getObject().name; });
                Opa5.assert.deepEqual(aNames, ["Blocked p2", "Blocked p3"], "both blocked users are listed");
                var aBtns = oList.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Button"); });
                Opa5.assert.strictEqual(aBtns.length, 2, "one Unblock button per row");
            },
            errorMessage: "Blocked users list did not render two rows"
        });

        When.waitFor({
            controlType: "sap.m.Button", viewName: VIEW,
            matchers: function (oBtn) {
                var oCtx = oBtn.getBindingContext("appData");
                return !!oCtx && oCtx.getObject().blocked_id === "p2" && oBtn.getIcon() === "sap-icon://accept";
            },
            actions: new Press(), errorMessage: "Unblock button for p2 not found"
        });

        Then.waitFor({
            id: "blockedUsersList", viewName: VIEW,
            matchers: function (oList) { return oList.getItems().length === 0; },
            success: function (oList) {
                Opa5.assert.strictEqual(aCalls.filter(function (c) { return c.method === "DELETE"; }).length, 1, "one DELETE …/block");
                var sWant = oList.getModel("i18n").getResourceBundle().getText("blockedUsersNone");
                Opa5.assert.strictEqual(oList.getNoDataText(), sWant, "empty state reads \"" + sWant + "\"");
            },
            errorMessage: "list did not refresh after Unblock"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });

    // ── 4. Delete my own task ────────────────────────────────────────────────

    opaTest("Deleting my own task: footer Delete → confirm → one DELETE /api/tasks/<id>, dialog closes", function (Given, When, Then) {
        var aDeletes = [];
        var aErrors = [];
        MockServer.override("/api/tasks/T2", function (url, options) {
            var sMethod = (options && options.method || "GET").toUpperCase();
            if (sMethod === "DELETE") { aDeletes.push(String(url)); return MockServer.respond({ success: true }); }
            return MockServer.respond({ success: true, task: { id: "T2", poster_id: "U_TEST_001", poster_name: "Julia Tester", title: "Garden cleanup needed", description: "Autumn leaves everywhere.", category: "Home", status: "open", application_count: 0 }, applications: [] });
        });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.waitFor({
            id: "dashboardPage", viewName: VIEW,
            actions: function () { Opa5.getWindow().addEventListener("error", function (e) { aErrors.push(String(e.message)); }); }
        });
        When.onTheDashboard.iPressNavTab("tasks");
        When.onTheTasksPage.iPressToggle("mine");
        When.waitFor({
            controlType: "sap.m.CustomListItem", viewName: VIEW,
            matchers: function (oItem) {
                var oCtx = oItem.getBindingContext("appData");
                return !!oCtx && oCtx.getObject().id === "T2";
            },
            actions: new Press(), errorMessage: "own task T2 not found in My Tasks"
        });

        Then.waitFor({
            id: "taskDeleteBtn", viewName: VIEW,
            success: function (oBtn) {
                var oDialog = oBtn.getParent();
                while (oDialog && !(oDialog.isA && oDialog.isA("sap.m.Dialog"))) { oDialog = oDialog.getParent(); }
                Opa5.assert.ok(oDialog && oDialog.getBeginButton() === oBtn, "Delete is the dialog's footer button, not buried in the content");
                Opa5.assert.ok(oBtn.getVisible(), "Delete is visible for my own task");
            },
            errorMessage: "Delete button not found on the own-task dialog"
        });
        When.waitFor({ id: "taskDeleteBtn", viewName: VIEW, actions: new Press(), errorMessage: "Delete button not pressable" });
        When.waitFor({
            controlType: "sap.m.Button",
            matchers: function (oBtn) {
                var oDialog = oBtn.getParent();
                while (oDialog && !(oDialog.isA && oDialog.isA("sap.m.Dialog"))) { oDialog = oDialog.getParent(); }
                return !!oDialog && oDialog.isOpen() && oBtn.getText() === "OK";
            },
            actions: new Press(), errorMessage: "confirmation OK button not found (did the confirm open at all?)"
        });

        Then.waitFor({
            id: "taskDetailDialog", viewName: VIEW, visible: false,
            matchers: function (oDialog) { return !oDialog.isOpen(); },
            success: function () {
                Opa5.assert.strictEqual(aDeletes.length, 1, "exactly one DELETE /api/tasks/T2");
                Opa5.assert.deepEqual(aErrors, [], "no uncaught error during delete");
            },
            errorMessage: "task detail dialog did not close after deleting"
        });

        Then.waitFor({ success: function () { MockServer.clearOverrides(); } });
        Then.iTeardownMyUIComponent();
    });
});
