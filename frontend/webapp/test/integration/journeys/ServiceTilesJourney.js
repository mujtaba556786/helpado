/**
 * OPA5 Journey — Service-tile grid on the Find Help tab.
 *
 * Scenarios covered:
 *  1. Service grid renders one tile per ServiceConstants category
 *  2. "Popular" hero badge appears only on the Cleaning tile
 *  3. Post-a-Task CTA button is rendered above the tile grid
 *  4. Activity strip is visible (helpers > 0 in mock data)
 *  5. Notification bell button exists in the header
 *  6. Header avatar exists
 *  7. Language selector button exists
 *  8. Every expected service name has a tile (spot-checks key categories)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/model/ServiceConstants",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, ServiceConstants, DashboardPage, MockServer) {
    "use strict";

    QUnit.module("Service Tiles — Find Help tab", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1. Tile grid renders ────────────────────────────────────────────────

    opaTest("Service tile grid renders with items on the Find Help tab", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            controlType: "sap.m.CustomListItem",
            viewName: "helphub.view.Dashboard",
            matchers: function (oItem) {
                var bHasSvcName = false;
                oItem.findAggregatedObjects(true, function (oChild) {
                    if (oChild.isA("sap.m.Text") && oChild.hasStyleClass("fiSvcName")) {
                        bHasSvcName = true;
                    }
                });
                return bHasSvcName;
            },
            success: function (aItems) {
                // ServiceConstants is the single source of truth for categories,
                // so derive the expected count from it instead of hardcoding one.
                Opa5.assert.strictEqual(aItems.length, ServiceConstants.length,
                    "One tile per service category (expected " + ServiceConstants.length +
                    ", got " + aItems.length + ")");
            },
            errorMessage: "Service tiles did not render"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Hero badge on Cleaning only ────────────────────────────────────

    opaTest("'Popular' hero badge is visible on the Cleaning tile", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.onTheDashboard.iSeeHeroBadgeOnCleaning();

        Then.iTeardownMyUIComponent();
    });

    opaTest("No 'Popular' badge appears on Gardening tile", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        // Gardening tile should not carry a *visible* Popular badge.
        // (The ObjectStatus node exists in the aggregation tree but has visible=false for
        // non-Cleaning tiles — we must check getVisible() in the assertion.)
        Then.waitFor({
            controlType: "sap.m.CustomListItem",
            viewName: "helphub.view.Dashboard",
            matchers: function (oItem) {
                var bFound = false;
                oItem.findAggregatedObjects(true, function (oChild) {
                    if (oChild.isA("sap.m.Text") &&
                        oChild.hasStyleClass("fiSvcName") &&
                        oChild.getText() === "Gardening") {
                        bFound = true;
                    }
                });
                return bFound;
            },
            success: function (aItems) {
                var oTile = aItems[0];
                var bHasVisiblePopular = false;
                oTile.findAggregatedObjects(true, function (o) {
                    if (o.isA("sap.m.ObjectStatus") &&
                        o.getText() === "Popular" &&
                        o.getVisible()) {
                        bHasVisiblePopular = true;
                    }
                });
                Opa5.assert.ok(!bHasVisiblePopular,
                    "Gardening tile does not carry a visible Popular badge");
            },
            errorMessage: "Gardening tile not found"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 3. Post-a-Task CTA ────────────────────────────────────────────────

    opaTest("Post a Task CTA button is rendered above the service tiles", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.onTheDashboard.iSeePostTaskCta();

        Then.iTeardownMyUIComponent();
    });

    // ── 4. Activity strip ─────────────────────────────────────────────────

    opaTest("Activity strip is visible with helpers count from mock data", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.onTheDashboard.iSeeActivityStrip();

        Then.iTeardownMyUIComponent();
    });

    // ── 5. Header controls ────────────────────────────────────────────────

    opaTest("Notification bell button is present in the app header", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "notifBtn",
            viewName: "helphub.view.Dashboard",
            success: function () {
                Opa5.assert.ok(true, "Notification bell button (id='notifBtn') is in the header");
            },
            errorMessage: "Notification bell button not found in header"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Header avatar is present", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "headerAvatar",
            viewName: "helphub.view.Dashboard",
            success: function () {
                Opa5.assert.ok(true, "Header avatar (id='headerAvatar') is present");
            },
            errorMessage: "Header avatar not found"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Language selector button is present in the header", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "langBtn",
            viewName: "helphub.view.Dashboard",
            success: function () {
                Opa5.assert.ok(true, "Language button (id='langBtn') is present");
            },
            errorMessage: "Language button not found"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Pressing the language button opens a Popover (not a modal Dialog)", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "langBtn",
            viewName: "helphub.view.Dashboard",
            actions: new (sap.ui.require("sap/ui/test/actions/Press"))(),
            errorMessage: "Could not press the language button"
        });

        // A Popover must be open — no sap.m.Dialog should appear
        Then.waitFor({
            controlType: "sap.m.Popover",
            matchers: function (oPopover) { return oPopover.isOpen(); },
            success: function () {
                Opa5.assert.ok(true, "Language selector opens as a Popover anchored to the globe button");
            },
            errorMessage: "Language Popover did not open after pressing the lang button"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Language Popover contains all four language options including English", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "langBtn",
            viewName: "helphub.view.Dashboard",
            actions: new (sap.ui.require("sap/ui/test/actions/Press"))(),
            errorMessage: "Could not press the language button"
        });

        var aExpectedLangs = ["English", "Deutsch", "Türkçe", "العربية"];
        aExpectedLangs.forEach(function (sLang) {
            Then.waitFor({
                controlType: "sap.m.StandardListItem",
                matchers: function (oItem) {
                    return (oItem.getTitle() || "").indexOf(sLang) >= 0;
                },
                success: function () {
                    Opa5.assert.ok(true, "Language option '" + sLang + "' is present in the Popover");
                },
                errorMessage: "Language option '" + sLang + "' is MISSING from the language selector"
            });
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 6. Spot-check specific service categories ─────────────────────────

    // Spot-check a sample drawn from the catalogue itself. Hardcoding names let
    // this drift: it still asked for "Babysitting", which is not a category.
    // In English the i18n label equals the constant's name, which is what the
    // tile renders.
    var aCategorySpotChecks = ServiceConstants.slice(0, 5).map(function (oSvc) {
        return oSvc.name;
    });

    aCategorySpotChecks.forEach(function (sCat) {
        opaTest("Service tile for '" + sCat + "' is present", function (Given, When, Then) {
            Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

            var _sCat = sCat; // capture loop variable for the closure
            Then.waitFor({
                controlType: "sap.m.CustomListItem",
                viewName: "helphub.view.Dashboard",
                matchers: function (oItem) {
                    var bFound = false;
                    oItem.findAggregatedObjects(true, function (oChild) {
                        if (oChild.isA("sap.m.Text") &&
                            oChild.hasStyleClass("fiSvcName") &&
                            oChild.getText() === _sCat) {
                            bFound = true;
                        }
                    });
                    return bFound;
                },
                success: function (aItems) {
                    Opa5.assert.ok(aItems.length > 0, "Tile for '" + _sCat + "' found");
                },
                errorMessage: "Service tile for '" + _sCat + "' not found"
            });

            Then.iTeardownMyUIComponent();
        });
    });
});
