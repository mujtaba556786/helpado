/**
 * OPA5 Journey — Service-tile grid on the Find Help tab.
 *
 * Scenarios covered:
 *  1. Service grid renders one tile per ServiceConstants category
 *  2. "Popular" hero badge stays hidden (feature intentionally off)
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

    // ── 1b. Nanny and the Other catch-all ─────────────────────────────────

    opaTest("Nanny and Other are offered, with Other last as the catch-all", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            id: "dashboardPage", viewName: "helphub.view.Dashboard",
            success: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                var aServices = oView.getModel("appData").getProperty("/services") || [];
                var aNames = aServices.map(function (s) { return s.name; });

                Opa5.assert.ok(aNames.indexOf("Nanny") >= 0, "Nanny is a category");
                Opa5.assert.ok(aNames.indexOf("Other") >= 0, "Other is a category");

                // "Other" is the fallback for anything the list does not cover, so
                // it has to sit last rather than among the real categories.
                Opa5.assert.strictEqual(aNames[aNames.length - 1], "Other",
                    "Other is the final entry");

                // Every category must render a translated label, never a raw
                // i18n key — these feed the tiles, the task category filter, the
                // Post Task select, the onboarding chips and a helper's own
                // category picker, all from this one list.
                var aUnresolved = aServices.filter(function (s) {
                    return !s.label || s.label.indexOf("service") === 0;
                }).map(function (s) { return s.name; });
                Opa5.assert.strictEqual(aUnresolved.length, 0,
                    "all category labels resolve from i18n" +
                    (aUnresolved.length ? " (unresolved: " + aUnresolved.join(", ") + ")" : ""));

                // Pet Care carried "customer" — a human figure — because SAP's
                // icon font has no animal in any of its 704 glyphs. The tile
                // renders a drawn SVG instead, so the category needs an img.
                // Six categories the SAP font cannot express are drawn instead:
                // its "tree" is an org chart, "home-share" is a share arrow and
                // "family-care" is three adults.
                var aDrawn = aServices.filter(function (s) { return s.img; });
                Opa5.assert.ok(aDrawn.length >= 6,
                    aDrawn.length + " categories supply their own tile artwork");
                aDrawn.forEach(function (s) {
                    Opa5.assert.ok(/\.svg$/.test(s.img), s.name + " artwork is an svg (" + s.img + ")");
                    // display is what the task category filter, Post Task select,
                    // onboarding chips and a helper's own picker bind to. Those
                    // controls take sap.ui.core.URI, so they render the drawing
                    // rather than falling back to a wrong font glyph.
                    Opa5.assert.strictEqual(s.display, s.img,
                        s.name + " compact surfaces use the drawing, not the glyph");
                    // The compact surfaces — task category filter, Post Task
                    // select, onboarding chips, a helper's own picker — render an
                    // icon, not an image, so the font glyph must remain.
                    Opa5.assert.ok(!!s.icon, s.name + " keeps a font icon fallback");
                });
                aServices.filter(function (s) { return !s.img; }).forEach(function (s) {
                    Opa5.assert.strictEqual(s.display, s.icon,
                        s.name + " falls back to its font glyph");
                });

                // No category may use an overflow/menu glyph — those read as a
                // menu control rather than a thing you can ask for.
                var aMenuish = aServices.filter(function (s) {
                    return /overflow|megamenu|menu2?$/.test(s.icon || "");
                }).map(function (s) { return s.name; });
                Opa5.assert.strictEqual(aMenuish.length, 0,
                    "no category uses a menu-style icon" +
                    (aMenuish.length ? " (" + aMenuish.join(", ") + ")" : ""));
            },
            errorMessage: "Could not read the service catalogue"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Hero badge on Cleaning only ────────────────────────────────────

    opaTest("No tile shows a 'Popular' badge while the flag is off", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.onTheDashboard.iSeeNoHeroBadge();

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
