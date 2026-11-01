sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/SearchPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, SearchPage, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Map location note — which location the map is using", {
        before: function () { MockServer.start(); },
        after: function () { MockServer.stop(); }
    });

    // Sets the location source the way Component and MapMixin do, then asks the
    // controller to re-derive the note. The strip is checked as the user sees it.
    function applyState(oView, sSource, bHasLocation) {
        var oModel = oView.getModel("appData");
        oModel.setProperty("/user/locationSource", sSource);
        oModel.setProperty("/user/location", bHasLocation ? { lat: 48.14, lng: 11.58 } : undefined);
        oView.getController()._refreshLocationNote();
    }

    function viewOf(oControl) {
        var oView = oControl;
        while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
        return oView;
    }

    function expectedText(oView, sKey) {
        return oView.getModel("i18n").getResourceBundle().getText(sKey);
    }

    opaTest("GPS fix: note says helpers are near the current location, no edit button", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.onTheDashboard.iPressServiceTile("Cleaning");
        Then.onTheSearchPage.iSeeSearchPage();
        Then.waitFor({
            id: "searchPage", viewName: VIEW,
            success: function (oPage) {
                var oView = viewOf(oPage);
                applyState(oView, "gps", true);
                var oStrip = oView.byId("locationNoteStrip");
                Opa5.assert.strictEqual(oStrip.getText(), expectedText(oView, "locationNoteGps"), "GPS note shown");
                Opa5.assert.strictEqual(oStrip.getVisible(), true, "strip is visible");
                Opa5.assert.strictEqual(oView.byId("locationNoteAction").getVisible(), false, "no edit button when GPS is on");
            }
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Saved address: note says the profile address is used, with a button to edit it", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.onTheDashboard.iPressServiceTile("Cleaning");
        Then.onTheSearchPage.iSeeSearchPage();
        Then.waitFor({
            id: "searchPage", viewName: VIEW,
            success: function (oPage) {
                var oView = viewOf(oPage);
                applyState(oView, "profile", true);
                Opa5.assert.strictEqual(oView.byId("locationNoteStrip").getText(), expectedText(oView, "locationNoteProfile"), "profile note shown");
                Opa5.assert.strictEqual(oView.byId("locationNoteAction").getVisible(), true, "edit-address button shown");
            }
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("No GPS and no address: note asks for an address, still with the edit button", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
        When.onTheDashboard.iPressServiceTile("Cleaning");
        Then.onTheSearchPage.iSeeSearchPage();
        Then.waitFor({
            id: "searchPage", viewName: VIEW,
            success: function (oPage) {
                var oView = viewOf(oPage);
                applyState(oView, undefined, false);
                Opa5.assert.strictEqual(oView.byId("locationNoteStrip").getText(), expectedText(oView, "locationNoteNone"), "fallback note shown");
                Opa5.assert.strictEqual(oView.byId("locationNoteAction").getVisible(), true, "edit-address button shown");
            }
        });
        Then.iTeardownMyUIComponent();
    });
});
