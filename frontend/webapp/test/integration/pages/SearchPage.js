/**
 * OPA5 Page Object — Search / Provider-results page (id="searchPage").
 *
 * Covers:
 *  - Provider list (filteredProviders) with AggregationFilled
 *  - Sponsored badge (ObjectStatus text="Sponsored")
 *  - PRO badge       (ObjectStatus text="PRO")
 *  - Map-toggle button (id="mapToggleBtn")
 *  - Helper search field (id="helperSearch")
 *  - Back-navigation button on the page header
 */
sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/actions/EnterText",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "sap/ui/test/matchers/AggregationFilled"
], function (Opa5, Press, EnterText, PropertyStrictEquals, AggregationFilled) {
    "use strict";

    var DASHBOARD_VIEW = "helphub.view.Dashboard";

    Opa5.createPageObjects({
        onTheSearchPage: {

            // ── Actions ──────────────────────────────────────────────────────

            actions: {

                iPressMapToggle: function () {
                    return this.waitFor({
                        id: "mapToggleBtn",
                        viewName: DASHBOARD_VIEW,
                        actions: new Press(),
                        errorMessage: "Map-toggle button not found on search page"
                    });
                },

                iTypeInHelperSearch: function (sQuery) {
                    return this.waitFor({
                        id: "helperSearch",
                        viewName: DASHBOARD_VIEW,
                        actions: new EnterText({ text: sQuery, clearTextFirst: true }),
                        errorMessage: "Helper search field not found on search page"
                    });
                },

                iPressNavBack: function () {
                    return this.waitFor({
                        id: "searchPage",
                        viewName: DASHBOARD_VIEW,
                        actions: function (oPage) {
                            oPage.fireNavButtonPress();
                        },
                        errorMessage: "Back button not found on search page header"
                    });
                },

                iOpenExpertFilters: function () {
                    return this.waitFor({
                        id: "expertFilterBtn",
                        viewName: DASHBOARD_VIEW,
                        actions: new Press(),
                        errorMessage: "Expert filter button not found on search page"
                    });
                }
            },

            // ── Assertions ───────────────────────────────────────────────────

            assertions: {

                iSeeProviderList: function () {
                    return this.waitFor({
                        controlType: "sap.m.List",
                        viewName: DASHBOARD_VIEW,
                        matchers: new AggregationFilled({ name: "items" }),
                        success: function () {
                            Opa5.assert.ok(true, "Provider results list has items");
                        },
                        errorMessage: "Provider results list is empty"
                    });
                },

                iSeeSponsoredBadge: function () {
                    return this.waitFor({
                        controlType: "sap.m.ObjectStatus",
                        viewName: DASHBOARD_VIEW,
                        matchers: new PropertyStrictEquals({ name: "text", value: "Sponsored" }),
                        success: function (aItems) {
                            Opa5.assert.ok(aItems.length > 0,
                                "At least one 'Sponsored' badge is visible in results");
                        },
                        errorMessage: "Sponsored badge not found — check mock data has featured_until set"
                    });
                },

                iSeeProBadge: function () {
                    return this.waitFor({
                        controlType: "sap.m.ObjectStatus",
                        viewName: DASHBOARD_VIEW,
                        matchers: new PropertyStrictEquals({ name: "text", value: "PRO" }),
                        success: function (aItems) {
                            Opa5.assert.ok(aItems.length > 0,
                                "At least one PRO badge is visible in results");
                        },
                        errorMessage: "PRO badge not found — check mock data has subscription_plan='pro'"
                    });
                },

                iSeeMapToggleButton: function () {
                    return this.waitFor({
                        id: "mapToggleBtn",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Map-toggle button is present on search page");
                        },
                        errorMessage: "Map-toggle button not found"
                    });
                },

                iSeeHelperSearchField: function () {
                    return this.waitFor({
                        id: "helperSearch",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Helper search field is present on search page");
                        },
                        errorMessage: "Helper search field not found"
                    });
                },

                iSeeSearchPage: function () {
                    return this.waitFor({
                        id: "searchPage",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Search/results page is the current NavContainer page");
                        },
                        errorMessage: "Search page not found in NavContainer"
                    });
                },

                iSeeExpertFilterButton: function () {
                    return this.waitFor({
                        id: "expertFilterBtn",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Single Filter button is present on the search page");
                        },
                        errorMessage: "Expert filter button not found on search page"
                    });
                },

                iSeeFilterPopoverControls: function () {
                    // Availability is a Switch; rating/price is a RadioButtonGroup.
                    // It replaced a SegmentedButton whose three labels shared one row
                    // and truncated to "Top r..." at larger system font sizes, and whose
                    // heading never said that one option filters on RATING and the other
                    // on PRICE. searchOpenDialogs reaches the popover's static area.
                    this.waitFor({
                        searchOpenDialogs: true,
                        controlType: "sap.m.RadioButtonGroup",
                        success: function (aGroups) {
                            var aButtons = aGroups[0].getButtons();
                            Opa5.assert.strictEqual(aButtons.length, 3,
                                "Rating & price offers three options, one per row");

                            var aTexts = aButtons.map(function (b) { return b.getText(); });
                            Opa5.assert.ok(aTexts.every(function (s) { return s && s.indexOf("filter") !== 0; }),
                                "option labels resolve from i18n (" + aTexts.join(" / ") + ")");

                            // The whole point of the change: the thresholds are stated
                            // rather than left for the user to guess.
                            Opa5.assert.ok(/4\.8/.test(aTexts[1]),
                                "the rating option names its threshold");
                            Opa5.assert.ok(/25/.test(aTexts[2]),
                                "the price option names its threshold");

                            // No label may be clipped — that was the reported symptom.
                            aButtons.forEach(function (b) {
                                var oDom = b.getDomRef();
                                if (!oDom) { return; }
                                var oLabel = oDom.querySelector("label") || oDom;
                                Opa5.assert.ok(oLabel.scrollWidth <= oLabel.clientWidth + 1,
                                    b.getText() + " is not truncated");
                            });
                        },
                        errorMessage: "Rating & price options not found inside the filter popover"
                    });
                    return this.waitFor({
                        searchOpenDialogs: true,
                        controlType: "sap.m.Switch",
                        success: function () {
                            Opa5.assert.ok(true, "'Available now' Switch is present inside the filter popover");
                        },
                        errorMessage: "Availability Switch not found inside the filter popover"
                    });
                },

                iSeeInlineDistanceAndLanguage: function () {
                    // Distance preset chips and Language select live inline on the search
                    // page, outside the popover.
                    this.waitFor({
                        id: "distanceSeg",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Distance preset chips are present inline on the search page");
                        },
                        errorMessage: "Inline distance preset chips not found on the search page"
                    });
                    return this.waitFor({
                        id: "languageSelect",
                        viewName: DASHBOARD_VIEW,
                        success: function () {
                            Opa5.assert.ok(true, "Language select is present inline on the search page");
                        },
                        errorMessage: "Inline language select not found on the search page"
                    });
                }
            }
        }
    });
});
