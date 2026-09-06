/**
 * OPA5 Journey — Settings dialog (gear icon on Edit Profile page).
 *
 * Scenarios covered:
 *  1. Gear button exists on the edit-profile page header
 *  2. Tapping gear opens the SettingsDialog
 *  3. SettingsDialog contains Language list item
 *  4. SettingsDialog contains Terms of Service list item
 *  5. SettingsDialog contains Privacy Policy list item
 *  6. SettingsDialog contains Help & FAQ list item
 *  7. SettingsDialog contains Contact Support list item
 *  8. SettingsDialog contains "Helpado" title in About section
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "sap/ui/test/matchers/PropertyStrictEquals",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, PropertyStrictEquals, DashboardPage, MockServer) {
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

    // ── 3. Language item ──────────────────────────────────────────────────────

    opaTest("SettingsDialog contains Language list item", function (Given, When, Then) {
        iOpenSettingsDialog(Given, When);

        Then.waitFor({
            controlType: "sap.m.StandardListItem",
            matchers: new PropertyStrictEquals({ name: "icon", value: "sap-icon://world" }),
            success: function () {
                Opa5.assert.ok(true, "Language list item found in SettingsDialog");
            },
            errorMessage: "Language list item not found in SettingsDialog"
        });

        Then.iTeardownMyUIComponent();
    });

    // ── 4 & 5. Legal list items ───────────────────────────────────────────────

    [
        { title: "Terms of Service",  icon: "sap-icon://document-text" },
        { title: "Privacy Policy",    icon: "sap-icon://privacy"       }
    ].forEach(function (oItem) {
        opaTest("SettingsDialog contains '" + oItem.title + "' list item", function (Given, When, Then) {
            iOpenSettingsDialog(Given, When);

            Then.waitFor({
                controlType: "sap.m.StandardListItem",
                matchers: new PropertyStrictEquals({ name: "icon", value: oItem.icon }),
                success: function () {
                    Opa5.assert.ok(true, "'" + oItem.title + "' list item found in SettingsDialog");
                },
                errorMessage: "'" + oItem.title + "' list item not found in SettingsDialog"
            });

            Then.iTeardownMyUIComponent();
        });
    });

    // ── 6 & 7. Support list items ─────────────────────────────────────────────

    [
        { title: "Help & FAQ",       icon: "sap-icon://sys-help-2" },
        { title: "Contact Support",  icon: "sap-icon://email"      }
    ].forEach(function (oItem) {
        opaTest("SettingsDialog contains '" + oItem.title + "' list item", function (Given, When, Then) {
            iOpenSettingsDialog(Given, When);

            Then.waitFor({
                controlType: "sap.m.StandardListItem",
                matchers: new PropertyStrictEquals({ name: "icon", value: oItem.icon }),
                success: function () {
                    Opa5.assert.ok(true, "'" + oItem.title + "' list item found in SettingsDialog");
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

});
