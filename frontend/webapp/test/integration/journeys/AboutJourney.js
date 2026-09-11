/**
 * OPA5 Journey — Settings dialog (gear icon on Edit Profile page).
 *
 * Scenarios covered:
 *  1. Gear button exists on the edit-profile page header
 *  2. Tapping gear opens the SettingsDialog
 *  3. SettingsDialog has NO Language row (the header globe is the only switcher)
 *  4. SettingsDialog contains Terms of Service list item
 *  5. SettingsDialog contains Privacy Policy list item
 *  6. SettingsDialog contains Help & FAQ list item
 *  7. SettingsDialog contains Contact Support list item
 *  8. SettingsDialog contains "Helpado" title in About section
 *  9. Dialog is titled "Help & Info" (nothing settable is left in it)
 * 10. "How Helpado works" row re-opens the first-login tour on step 2
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "sap/ui/core/IconPool",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, PropertyStrictEquals, IconPool, DashboardPage, MockServer) {
    "use strict";

    QUnit.module("Settings Dialog — gear icon on Edit Profile page", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── Helper: navigate to edit profile and open Settings dialog ─────────────
    function iOpenSettingsDialog(Given, When) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        // Open edit profile via header avatar
        When.waitFor({
            id: "headerAvatar",
            viewName: "helphub.view.Dashboard",
            actions: new Press(),
            errorMessage: "Header avatar not found"
        });
        // No ActionSheet step here: onHeaderAvatarMenu navigates straight to Edit
        // Profile now, so the old "pick Edit Profile from the sheet" press is gone.
        // Press the gear / settings button in the editPage header
        When.waitFor({
            controlType: "sap.m.Button",
            viewName: "helphub.view.Dashboard",
            matchers: new PropertyStrictEquals({ name: "icon", value: "sap-icon://action-settings" }),
            actions: new Press(),
            errorMessage: "Settings gear button not found in edit profile header"
        });
    }

    // ── 1. Gear button exists on edit profile ─────────────────────────────────

    opaTest("Gear (settings) button exists on edit profile page header", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.waitFor({
            id: "headerAvatar",
            viewName: "helphub.view.Dashboard",
            actions: new Press(),
            errorMessage: "Header avatar not found"
        });
        // Avatar navigates straight to Edit Profile — no ActionSheet step.

        Then.waitFor({
            controlType: "sap.m.Button",
            viewName: "helphub.view.Dashboard",
            matchers: new PropertyStrictEquals({ name: "icon", value: "sap-icon://action-settings" }),
            success: function () {
                Opa5.assert.ok(true, "Settings gear button found on edit profile header");
            },
            errorMessage: "Settings gear button not found on edit profile header"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 2. Tapping gear opens SettingsDialog ──────────────────────────────────

    opaTest("Tapping gear button opens the Settings dialog", function (Given, When, Then) {
        iOpenSettingsDialog(Given, When);

        Then.waitFor({
            // The fragment is loaded with id: view.getId(), so the dialog's real id
            // is "<viewId>--settingsDialog". Without viewName, OPA matches the bare
            // string against the global id and never finds it.
            id: "settingsDialog",
            viewName: "helphub.view.Dashboard",
            success: function () {
                Opa5.assert.ok(true, "SettingsDialog opened after pressing gear button");
            },
            errorMessage: "SettingsDialog did not open"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 3. No Language row ────────────────────────────────────────────────────
    // Language used to be listed here as a second door to the same popover the
    // header globe opens (both fire onLanguageMenu). It was removed as a duplicate;
    // this guards against it quietly coming back. The globe itself is covered by
    // the header tests in ServiceTilesJourney.

    opaTest("SettingsDialog has no Language row (header globe is the only switcher)", function (Given, When, Then) {
        iOpenSettingsDialog(Given, When);

        Then.waitFor({
            id: "settingsDialog",
            viewName: "helphub.view.Dashboard",
            success: function (oDialog) {
                var aWorldIcons = oDialog.findAggregatedObjects(true, function (oCtrl) {
                    return oCtrl.isA("sap.ui.core.Icon") && oCtrl.getSrc() === "sap-icon://world";
                });
                Opa5.assert.strictEqual(aWorldIcons.length, 0,
                    "SettingsDialog contains no language (world icon) row");

                var aLegal = oDialog.findAggregatedObjects(true, function (oCtrl) {
                    return oCtrl.isA("sap.ui.core.Icon") && oCtrl.getSrc() === "sap-icon://document-text";
                });
                Opa5.assert.ok(aLegal.length > 0,
                    "Other rows are still present, so the dialog was really inspected");
            },
            errorMessage: "SettingsDialog did not open"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 4 & 5. Legal list items ───────────────────────────────────────────────

    [
        { title: "Terms of Service",  icon: "sap-icon://document-text" },
        { title: "Privacy Policy",    icon: "sap-icon://shield"        }
    ].forEach(function (oItem) {
        opaTest("SettingsDialog contains '" + oItem.title + "' list item", function (Given, When, Then) {
            iOpenSettingsDialog(Given, When);

            Then.waitFor({
                controlType: "sap.ui.core.Icon",
                matchers: new PropertyStrictEquals({ name: "src", value: oItem.icon }),
                success: function (aIcons) {
                    Opa5.assert.ok(true, "'" + oItem.title + "' list item found in SettingsDialog");
                    // The old version of this test asserted the icon *property* on a
                    // StandardListItem and passed happily while sap-icon://privacy
                    // rendered nothing, because that name is not in the font. Check the
                    // glyph resolves, not just that the string was set.
                    Opa5.assert.ok(IconPool.getIconInfo(aIcons[0].getSrc()),
                        oItem.icon + " exists in the icon font");
                },
                errorMessage: "'" + oItem.title + "' list item not found in SettingsDialog"
            });

            Then.iTeardownMyUIComponent();
        });
    });

    // ── 6 & 7. Support list items ─────────────────────────────────────────────

    [
        { title: "How Helpado works", icon: "sap-icon://learning-assistant" },
        { title: "Help & FAQ",        icon: "sap-icon://sys-help-2"         },
        { title: "Contact Support",   icon: "sap-icon://email"              }
    ].forEach(function (oItem) {
        opaTest("SettingsDialog contains '" + oItem.title + "' list item", function (Given, When, Then) {
            iOpenSettingsDialog(Given, When);

            Then.waitFor({
                controlType: "sap.ui.core.Icon",
                matchers: new PropertyStrictEquals({ name: "src", value: oItem.icon }),
                success: function (aIcons) {
                    Opa5.assert.ok(true, "'" + oItem.title + "' list item found in SettingsDialog");
                    // The old version of this test asserted the icon *property* on a
                    // StandardListItem and passed happily while sap-icon://privacy
                    // rendered nothing, because that name is not in the font. Check the
                    // glyph resolves, not just that the string was set.
                    Opa5.assert.ok(IconPool.getIconInfo(aIcons[0].getSrc()),
                        oItem.icon + " exists in the icon font");
                },
                errorMessage: "'" + oItem.title + "' list item not found in SettingsDialog"
            });

            Then.iTeardownMyUIComponent();
        });
    });

    // ── 8. Helpado title in About section ───────────────────────────────────

    opaTest("SettingsDialog About section shows 'Helpado' title", function (Given, When, Then) {
        iOpenSettingsDialog(Given, When);

        Then.waitFor({
            controlType: "sap.m.Title",
            matchers: new PropertyStrictEquals({ name: "text", value: "Helpado" }),
            success: function () {
                Opa5.assert.ok(true, "'Helpado' title found in SettingsDialog About section");
            },
            errorMessage: "'Helpado' title not found in SettingsDialog"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 9. Title ───────────────────────────────────────────────────────────────
    // Renamed from "Settings & Help" once the Language row went: the dialog is
    // Legal / Support / About, there is nothing left in it a user can *set*.

    opaTest("Dialog is titled 'Help & Info'", function (Given, When, Then) {
        iOpenSettingsDialog(Given, When);

        Then.waitFor({
            id: "settingsDialog",
            viewName: "helphub.view.Dashboard",
            matchers: new PropertyStrictEquals({ name: "title", value: "Help & Info" }),
            success: function () {
                Opa5.assert.ok(true, "Dialog title is 'Help & Info'");
            },
            errorMessage: "Dialog title is not 'Help & Info'"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 10. How it works → onboarding tour, step 2 ────────────────────────────
    // MockServer seeds hhOnboarded=1, so the tour never auto-opens in tests; the
    // only way it can appear here is through this row. Assert the step, not just
    // that some dialog opened — landing on Welcome (step 1) would be a regression.

    opaTest("'How Helpado works' row opens the tour on the How-it-works step", function (Given, When, Then) {
        iOpenSettingsDialog(Given, When);

        When.waitFor({
            controlType: "sap.m.CustomListItem",
            viewName: "helphub.view.Dashboard",
            matchers: function (oItem) {
                return oItem.findAggregatedObjects(true, function (oCtrl) {
                    return oCtrl.isA("sap.ui.core.Icon") && oCtrl.getSrc() === "sap-icon://learning-assistant";
                }).length > 0;
            },
            actions: new Press(),
            errorMessage: "'How Helpado works' row not found in Help & Info"
        });

        Then.waitFor({
            id: "onboardingDialog",
            viewName: "helphub.view.Dashboard",
            matchers: function (oDialog) { return oDialog.isOpen(); },
            success: function (oDialog) {
                var iStep = oDialog.getModel("appData").getProperty("/onboarding/step");
                Opa5.assert.strictEqual(iStep, 2, "Tour opened on step 2 (How it works), not Welcome");
            },
            errorMessage: "Onboarding tour did not open from Help & Info"
        });

        // Help & Info closes underneath; isOpen() stays true for the length of the
        // close animation, so poll for it rather than asserting at the instant the
        // tour appears. visible:false because a closed dialog is not rendered.
        Then.waitFor({
            id: "settingsDialog",
            viewName: "helphub.view.Dashboard",
            visible: false,
            matchers: function (oSettings) { return !oSettings.isOpen(); },
            success: function () {
                Opa5.assert.ok(true, "Help & Info closed behind the tour");
            },
            errorMessage: "Help & Info stayed open behind the tour"
        });

        Then.iTeardownMyUIComponent();
    });

});
