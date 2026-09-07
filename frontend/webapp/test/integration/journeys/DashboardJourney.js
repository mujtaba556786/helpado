sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, MockServer) {
    "use strict";

    QUnit.module("Dashboard — Launch Features", {
        before: function () { MockServer.start(); },
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
