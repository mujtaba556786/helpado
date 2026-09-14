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
 *  8. Provider list is populated after pressing Elder Care tile
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

    opaTest("Pressing Elder Care tile shows a populated provider list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        // Babysitting is not in ServiceConstants; Elder Care is.
        When.onTheDashboard.iPressServiceTile("Elder Care");

        Then.onTheDashboard.iSeeProviderList();
        Then.iTeardownMyUIComponent();
    });

    // ── Rating on a helper nobody has reviewed ───────────────────────────
    //
    // The API defaulted rating to 5.0, so a brand-new helper carried five
    // stars — a stronger trust signal than anyone actually reviewed. The card
    // now shows "New" until review_count > 0.

    // The map box (26vh) and the map div (260px / 180px) used to be sized
    // independently, so a blank strip sat between the map and the Show/Hide
    // button on a tall phone and the box cropped the attribution on a short
    // desktop window. The div now carries the height and the box wraps it.
    opaTest("The map fills its box exactly — no strip below it, nothing cropped", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.waitFor({
            id: "mapContainer", viewName: "helphub.view.Dashboard",
            check: function (oBox) {
                return oBox.getVisible() && !!oBox.getDomRef() && !!oBox.getDomRef().querySelector("#googleMap");
            },
            success: function (oBox) {
                var oBoxRect = oBox.getDomRef().getBoundingClientRect();
                var oMapRect = oBox.getDomRef().querySelector("#googleMap").getBoundingClientRect();
                Opa5.assert.ok(Math.abs(oBoxRect.height - oMapRect.height) <= 1,
                    "Map div (" + Math.round(oMapRect.height) + "px) and its box (" + Math.round(oBoxRect.height) + "px) are the same height");
                Opa5.assert.ok(oMapRect.height >= 180, "Map is at least 180px tall (" + Math.round(oMapRect.height) + "px)");
                Opa5.assert.ok(Math.abs(oMapRect.height - Math.max(window.innerHeight * 0.26, 180)) <= 1,
                    "Map height tracks the viewport (26vh, min 180px)");
            },
            errorMessage: "Map container is not rendered on the search page"
        });
        Then.iTeardownMyUIComponent();
    });

    // Every NavContainer page: the header is padded by env(safe-area-inset-top)
    // and the content section is shifted by the same amount. With no inset
    // (browser) the section must sit exactly at the header's bottom edge —
    // this guards the 2.75rem in the rule against a theme/density change.
    opaTest("The search page content starts exactly where its header ends", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.waitFor({
            id: "searchPage", viewName: "helphub.view.Dashboard",
            check: function (oPage) { return !!oPage.getDomRef() && !!oPage.getDomRef().querySelector(":scope > header"); },
            success: function (oPage) {
                var oHeader  = oPage.getDomRef().querySelector(":scope > header").getBoundingClientRect();
                var oSection = oPage.getDomRef().querySelector(":scope > section").getBoundingClientRect();
                Opa5.assert.ok(Math.abs(oSection.top - oHeader.bottom) <= 1,
                    "Section top (" + Math.round(oSection.top) + "px) meets header bottom (" + Math.round(oHeader.bottom) + "px)");
            },
            errorMessage: "Search page has no header"
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("A helper with no reviews shows 'New' instead of five stars", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Cleaning");

        Then.waitFor({
            controlType: "sap.m.CustomListItem",
            viewName: "helphub.view.Dashboard",
            matchers: function (oItem) {
                var oCtx = oItem.getBindingContext("appData");
                return !!oCtx && oCtx.getProperty("id") === "p9";
            },
            success: function (aItems) {
                var oItem = aItems[0];
                var aStars = oItem.findAggregatedObjects(true, function (c) { return c.isA("sap.m.RatingIndicator"); });
                var aNew   = oItem.findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.ObjectStatus") && c.hasStyleClass("hhNewHelperBadge");
                });
                Opa5.assert.ok(aStars.length === 1 && !aStars[0].getVisible(),
                    "No star rating is shown for a helper with review_count 0");
                Opa5.assert.ok(aNew.length === 1 && aNew[0].getVisible() && !!aNew[0].getText(),
                    "A 'New' badge is shown instead (text: '" + (aNew[0] && aNew[0].getText()) + "')");
            },
            errorMessage: "Card for the unreviewed helper p9 not found"
        });

        // ...and a reviewed helper on the same list still shows stars.
        Then.waitFor({
            controlType: "sap.m.CustomListItem",
            viewName: "helphub.view.Dashboard",
            matchers: function (oItem) {
                var oCtx = oItem.getBindingContext("appData");
                return !!oCtx && oCtx.getProperty("id") === "p4";
            },
            success: function (aItems) {
                var aStars = aItems[0].findAggregatedObjects(true, function (c) { return c.isA("sap.m.RatingIndicator"); });
                var aNew   = aItems[0].findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.ObjectStatus") && c.hasStyleClass("hhNewHelperBadge");
                });
                Opa5.assert.ok(aStars.length === 1 && aStars[0].getVisible() && aStars[0].getValue() > 4,
                    "A reviewed helper still shows their star rating");
                Opa5.assert.ok(aNew.length === 1 && !aNew[0].getVisible(), "...and no 'New' badge");
            },
            errorMessage: "Card for the reviewed helper p4 not found"
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Pressing Handyman tile shows a populated provider list", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressServiceTile("Handyman");

        Then.onTheDashboard.iSeeProviderList();
        Then.iTeardownMyUIComponent();
    });
});
