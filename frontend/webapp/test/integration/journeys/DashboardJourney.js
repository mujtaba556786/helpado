sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, MockServer) {
    "use strict";

    QUnit.module("Dashboard — Launch Features", {
        before: function () { MockServer.start(); },
        // Overrides must be cleared AFTER the queued OPA steps have run — a call
        // at the end of the test body executes before the component even starts.
        afterEach: function () { MockServer.clearOverrides(); },
        after:  function () { MockServer.stop(); }
    });

    // ── Activity strip ────────────────────────────────────────────────────────

    opaTest("Activity strip is visible on the Find Help tab", function (Given, When, Then) {
        Given.iStartMyUIComponent({
            componentConfig: { name: "helphub", manifest: true }
        });

        Then.onTheDashboard.iSeeActivityStrip();
        Then.iTeardownMyUIComponent();
    });

    // The live site returned helpers: 0 (the strip's query looked for a
    // "provider" role that no real account has) and the whole strip hid.
    // With the count fixed, a quiet day still has no open tasks — that item
    // hides at zero instead of advertising "0 open tasks today".
    opaTest("With helpers but no open tasks, the strip shows and the tasks item hides", function (Given, When, Then) {
        MockServer.override("/api/home/activity", function () {
            return MockServer.respond({ success: true, helpers: 3, requests: 0, recent: [{ service: "Gardening", city: "Berlin" }] });
        });
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "activityStrip", viewName: "helphub.view.Dashboard",
            check: function (oStrip) { return oStrip.getVisible() && oStrip.getModel("appData").getProperty("/homeActivity/helpers") === 3; },
            success: function (oStrip) {
                var aItems = oStrip.getItems();
                var aTexts = aItems.map(function (o) { return o.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Text"); })[0].getText(); });
                Opa5.assert.ok(oStrip.getVisible(), "strip is visible with 3 helpers");
                Opa5.assert.ok(/^3 helpers/.test(aTexts[0]) && aItems[0].getVisible(), "helpers item: '" + aTexts[0] + "'");
                Opa5.assert.ok(/open tasks/.test(aTexts[1]) && !aItems[1].getVisible(), "tasks item hidden at 0 open tasks");
                Opa5.assert.ok(aItems[2].getVisible() && /Berlin/.test(aTexts[2]), "active-in item: '" + aTexts[2] + "'");
            },
            errorMessage: "Activity strip not visible with helpers: 3"
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("With no helpers at all, the strip stays hidden", function (Given, When, Then) {
        MockServer.override("/api/home/activity", function () {
            return MockServer.respond({ success: true, helpers: 0, requests: 0, recent: [] });
        });
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "activityStrip", viewName: "helphub.view.Dashboard",
            visible: false,
            check: function (oStrip) { return oStrip.getModel("appData").getProperty("/homeActivity/helpers") === 0; },
            success: function (oStrip) { Opa5.assert.strictEqual(oStrip.getVisible(), false, "strip hidden with 0 helpers"); },
            errorMessage: "Activity strip control not found"
        });
        Then.iTeardownMyUIComponent();
    });

    // ── Primary CTA ───────────────────────────────────────────────────────────

    opaTest("Post a Task CTA button is rendered above the service tiles", function (Given, When, Then) {
        Given.iStartMyUIComponent({
            componentConfig: { name: "helphub", manifest: true }
        });

        Then.onTheDashboard.iSeePostTaskCta();
        Then.iTeardownMyUIComponent();
    });

    // ── Hero badge ────────────────────────────────────────────────────────────

    opaTest("Cleaning tile shows no 'Popular' hero badge (feature off)", function (Given, When, Then) {
        Given.iStartMyUIComponent({
            componentConfig: { name: "helphub", manifest: true }
        });

        Then.onTheDashboard.iSeeNoHeroBadge();
        Then.iTeardownMyUIComponent();
    });

    // ── Sponsored + Pro badges ────────────────────────────────────────────────

    opaTest("Featured provider card shows Sponsored badge in Cleaning results", function (Given, When, Then) {
        Given.iStartMyUIComponent({
            componentConfig: { name: "helphub", manifest: true }
        });

        When.onTheDashboard.iPressServiceTile("Cleaning");
        Then.onTheDashboard.iSeeProviderList();
        Then.onTheDashboard.iSeeSponsoredBadge();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Pro provider card shows PRO badge in Cleaning results", function (Given, When, Then) {
        Given.iStartMyUIComponent({
            componentConfig: { name: "helphub", manifest: true }
        });

        When.onTheDashboard.iPressServiceTile("Cleaning");
        Then.onTheDashboard.iSeeProviderList();
        Then.onTheDashboard.iSeeProBadge();
        Then.iTeardownMyUIComponent();
    });

    // ── Navigation ────────────────────────────────────────────────────────────

    opaTest("My Schedule tab shows bookings list", function (Given, When, Then) {
        Given.iStartMyUIComponent({
            componentConfig: { name: "helphub", manifest: true }
        });

        When.onTheDashboard.iPressNavTab("mySchedule");

        Then.waitFor({
            id: "bookingsList",
            viewName: "helphub.view.Dashboard",
            success: function () { Opa5.assert.ok(true, "Bookings list is rendered on My Schedule tab"); },
            errorMessage: "Bookings list not found on My Schedule tab"
        });
        Then.iTeardownMyUIComponent();
    });
});
