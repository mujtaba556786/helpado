sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "sap/ui/test/matchers/AggregationFilled"
], function (Opa5, Press, PropertyStrictEquals, AggregationFilled) {
    "use strict";

    var DASHBOARD_VIEW = "helphub.view.Dashboard";

    Opa5.createPageObjects({
        onTheDashboard: {
            actions: {
                /**
                 * Find a service-tile CustomListItem by matching the sap.m.Text child
                 * whose text equals sServiceName — uses the UI5 control API (no jQuery
                 * DOM traversal) so it works even before the browser has painted.
                 */
                iPressServiceTile: function (sServiceName) {
                    return this.waitFor({
                        controlType: "sap.m.CustomListItem",
                        viewName: DASHBOARD_VIEW,
                        matchers: function (oItem) {
                            var bFound = false;
                            oItem.findAggregatedObjects(true, function (oChild) {
                                if (oChild.isA("sap.m.Text") &&
                                    oChild.hasStyleClass("fiSvcName") &&
                                    oChild.getText() === sServiceName) {
                                    bFound = true;
                                }
                            });
                            return bFound;
                        },
                        actions: new Press(),
                        errorMessage: "Could not find service tile: " + sServiceName
                    });
                },

                iPressNavTab: function (sTabKey) {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        viewName: DASHBOARD_VIEW,
                        matchers: function (oBtn) {
                            var aData = oBtn.getCustomData();
                            return aData.some(function (d) {
                                return d.getKey() === "tab" && d.getValue() === sTabKey;
                            });
                        },
                        actions: new Press(),
                        errorMessage: "Could not find nav tab: " + sTabKey
                    });
                },

                iPressPostTaskCta: function () {
                    return this.waitFor({
                        id: "primaryCta",
                        viewName: DASHBOARD_VIEW,
                        actions: function (oVBox) {
                            var aButtons = oVBox.getItems ? oVBox.getItems() : [];
                            var oBtn = aButtons.find(function (c) { return c.isA("sap.m.Button"); });
                            if (oBtn) { oBtn.firePress(); }
                        },
                        errorMessage: "Post a Task CTA button not found"
                    });
                }
            },

            assertions: {
                iSeeActivityStrip: function () {
                    return this.waitFor({
                        id: "activityStrip",
                        viewName: DASHBOARD_VIEW,
                        matchers: new PropertyStrictEquals({ name: "visible", value: true }),
                        success: function () { Opa5.assert.ok(true, "Activity strip is visible"); },
                        errorMessage: "Activity strip not visible"
                    });
                },

                iSeePostTaskCta: function () {
                    return this.waitFor({
                        id: "primaryCta",
                        viewName: DASHBOARD_VIEW,
                        success: function () { Opa5.assert.ok(true, "Post a Task CTA is rendered"); },
                        errorMessage: "Post a Task CTA not found"
                    });
                },

                // The "Popular" badge is intentionally hidden (see Dashboard.view.xml):
                // nothing measures popularity yet. Guard that it stays hidden rather
                // than asserting it appears.
                iSeeNoHeroBadge: function () {
                    return this.waitFor({
                        controlType: "sap.m.CustomListItem",
                        viewName: DASHBOARD_VIEW,
                        success: function (aItems) {
                            var bVisible = false;
                            aItems.forEach(function (oItem) {
                                oItem.findAggregatedObjects(true, function (o) {
                                    if (o.isA("sap.m.ObjectStatus") &&
                                        o.getText() === "Popular" && o.getVisible()) {
                                        bVisible = true;
                                    }
                                    return false;
                                });
                            });
                            Opa5.assert.ok(!bVisible, "No tile shows a visible 'Popular' badge");
                        },
                        errorMessage: "Could not inspect service tiles for the Popular badge"
                    });
                },

                iSeeSponsoredBadge: function () {
                    return this.waitFor({
                        controlType: "sap.m.ObjectStatus",
                        viewName: DASHBOARD_VIEW,
                        matchers: new PropertyStrictEquals({ name: "text", value: "Sponsored" }),
                        success: function (aItems) {
                            Opa5.assert.ok(aItems.length > 0, "Sponsored badge found on featured provider card");
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
                            Opa5.assert.ok(aItems.length > 0, "PRO badge found on Pro provider card");
                        },
                        errorMessage: "PRO badge not found — check mock data has subscription_plan='pro'"
                    });
                },

                iSeeProviderList: function () {
                    return this.waitFor({
                        controlType: "sap.m.List",
                        viewName: DASHBOARD_VIEW,
                        matchers: new AggregationFilled({ name: "items" }),
                        success: function () { Opa5.assert.ok(true, "Provider list has items"); },
                        errorMessage: "Provider list is empty"
                    });
                }
            }
        }
    });
});
