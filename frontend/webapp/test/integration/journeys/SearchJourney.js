/**
 * OPA5 Journey — Service-tile press → Search/Results page.
 *
 * Scenarios covered:
 *  1. Pressing the Cleaning tile navigates to the search page
 *  2. Provider list is populated after navigating to Cleaning results
 *  3. Sponsored badge is shown (p4 Lisa Chen has featured_until set)
 *  4. PRO badge is shown (p4 Lisa Chen has subscription_plan='pro')
 *  5. Map-toggle button is present on the search page
 *  6. Helper search field is present
 *  7. Provider list is populated after pressing Gardening tile
 *  8. Provider list is populated after pressing Babysitting tile
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/SearchPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, SearchPage, MockServer) {
    "use strict";

    QUnit.module("Search / Provider Results page", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1. Navigate to Cleaning results ──────────────────────────────────

    opaTest("Pressing Cleaning tile navigates to search page", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheSearchPage.iSeeSearchPage();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Cleaning results page shows a populated provider list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheDashboard.iSeeProviderList();
        Then.iTeardownMyUIComponent();
    });

    // ── 2. Sponsored badge ────────────────────────────────────────────────

    opaTest("Featured provider card shows Sponsored badge in Cleaning results", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheDashboard.iSeeProviderList();
        Then.onTheDashboard.iSeeSponsoredBadge();
        Then.iTeardownMyUIComponent();
    });

    // ── 3. PRO badge ──────────────────────────────────────────────────────

    opaTest("Pro provider card shows PRO badge in Cleaning results", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheDashboard.iSeeProviderList();
        Then.onTheDashboard.iSeeProBadge();
        Then.iTeardownMyUIComponent();
    });

    // ── 4. Search-page chrome ─────────────────────────────────────────────

    opaTest("Map-toggle button is present on the search page", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheSearchPage.iSeeMapToggleButton();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Helper search field is present on the search page", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheSearchPage.iSeeHelperSearchField();
        Then.iTeardownMyUIComponent();
    });

    // ── 4b. Filters consolidated into a single popover ────────────────────

    opaTest("Filter button opens a popover containing the filter controls", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.onTheSearchPage.iSeeExpertFilterButton();
        Then.onTheSearchPage.iSeeInlineDistanceAndLanguage();

        When.onTheSearchPage.iOpenExpertFilters();

        Then.onTheSearchPage.iSeeFilterPopoverControls();
        Then.iTeardownMyUIComponent();
    });

    // ── 5. Other categories also return results ───────────────────────────

    opaTest("Pressing Gardening tile shows a populated provider list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Gardening");

        Then.onTheDashboard.iSeeProviderList();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Pressing Babysitting tile shows a populated provider list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Babysitting");

        Then.onTheDashboard.iSeeProviderList();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Pressing Handyman tile shows a populated provider list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Handyman");

        Then.onTheDashboard.iSeeProviderList();
        Then.iTeardownMyUIComponent();
    });
});
