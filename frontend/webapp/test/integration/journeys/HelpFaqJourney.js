sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, MockServer) {
    "use strict";

    var VIEW = "helphub.view.Dashboard";

    QUnit.module("Help & FAQ — real answers, not a mail draft", {
        before: function () { MockServer.start(); },
        after: function () { MockServer.stop(); }
    });

    opaTest("Help & FAQ opens the FAQ dialog with answerable questions", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        // Go straight through the controller: the entry point lives in the
        // Settings dialog, which is itself reached from the Edit Profile page.
        When.waitFor({
            id: "dashboardPage", viewName: VIEW,
            actions: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                oView.getController().onOpenHelp();
            },
            errorMessage: "Could not reach the Dashboard controller"
        });

        Then.waitFor({
            id: "helpFaqDialog", viewName: VIEW,
            success: function (oDialog) {
                Opa5.assert.ok(oDialog.isOpen(), "FAQ dialog is open");
                Opa5.assert.strictEqual(oDialog.getStretch(), true, "FAQ dialog is full-screen like every other dialog");

                var aPanels = oDialog.findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.Panel");
                });
                Opa5.assert.ok(aPanels.length >= 7, "FAQ has " + aPanels.length + " questions");

                // The app performs no identity check. The FAQ must say so, in
                // the place users look for answers rather than only in Terms.
                var aHeaders = aPanels.map(function (p) { return p.getHeaderText(); });
                var iChecks = aHeaders.findIndex(function (s) { return /check/i.test(s); });
                Opa5.assert.ok(iChecks >= 0, "FAQ explains how helpers are checked");
                var aChecksText = aPanels[iChecks].findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.Text");
                });
                var sAnswer = aChecksText.length ? aChecksText[0].getText() : "";
                Opa5.assert.ok(/do not check/i.test(sAnswer),
                    "the answer states plainly what is NOT checked");
                Opa5.assert.ok(/email/i.test(sAnswer),
                    "the answer names what IS confirmed (email)");

                // Each question must actually carry an answer — an empty panel
                // would repeat the original sin of promising help and giving none.
                var iAnswered = aPanels.filter(function (oPanel) {
                    var aTexts = oPanel.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Text"); });
                    return aTexts.length > 0 && aTexts[0].getText().length > 20;
                }).length;
                Opa5.assert.strictEqual(iAnswered, aPanels.length, "Every question has a real answer");

                var bHeadersResolved = aPanels.every(function (oPanel) {
                    var s = oPanel.getHeaderText();
                    return s && s.indexOf("faq") !== 0;
                });
                Opa5.assert.ok(bHeadersResolved, "Question headings resolve from i18n (no raw keys)");
            },
            errorMessage: "FAQ dialog did not open"
        });

        Then.waitFor({
            id: "faqContactSupport", viewName: VIEW,
            success: function (oButton) {
                Opa5.assert.ok(oButton.getVisible(), "FAQ offers Contact Support as the fallback");
            },
            errorMessage: "Contact Support button missing from the FAQ"
        });

        Then.iTeardownMyUIComponent();
    });

    opaTest("Settings sections no longer repeat their own item labels", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "dashboardPage", viewName: VIEW,
            actions: function (oPage) {
                var oView = oPage.getParent();
                while (!oView.isA("sap.ui.core.mvc.View")) { oView = oView.getParent(); }
                oView.getController().onOpenSettings();
            }
        });

        Then.waitFor({
            id: "settingsDialog", viewName: VIEW,
            success: function (oDialog) {
                var aHeaders = oDialog.findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.GroupHeaderListItem");
                });
                // Rows are CustomListItems now, so the label is the first Text inside
                // each one rather than a title property.
                var aItems = oDialog.findAggregatedObjects(true, function (c) {
                    return c.isA("sap.m.CustomListItem");
                });
                var aHeaderTitles = aHeaders.map(function (h) { return h.getTitle(); });
                var aItemTitles = aItems.map(function (oItem) {
                    var sLabel = "";
                    oItem.findAggregatedObjects(true, function (c) {
                        if (!sLabel && c.isA("sap.m.Text")) { sLabel = c.getText(); }
                        return false;
                    });
                    return sLabel;
                });

                aHeaderTitles.forEach(function (sHeader) {
                    Opa5.assert.strictEqual(aItemTitles.indexOf(sHeader), -1,
                        "Section '" + sHeader + "' does not repeat one of its own item labels");
                });
                Opa5.assert.notStrictEqual(aHeaderTitles.indexOf(oDialog.getTitle()), 0,
                    "Panel title '" + oDialog.getTitle() + "' is not also its first section heading");
            },
            errorMessage: "Settings dialog did not open"
        });

        Then.iTeardownMyUIComponent();
    });
});
