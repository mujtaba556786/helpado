/**
 * OPA5 Journey — Book a Helper dialog and first-run onboarding.
 *
 * Scenarios covered:
 *  1. The booking dialog shows the helper's hourly rate (it previously showed
 *     no price at all, so people booked without ever seeing one)
 *  2. Preferred time is a TimePicker, not a free-text Input
 *  3. Onboarding step 3 renders one chip per ServiceConstants category, keyed
 *     and labelled from the catalogue (it previously had 12 hardcoded English
 *     names that had drifted from the real 10)
 *  4. Safety is two named links at the foot of the profile — no ⋯ overflow, no
 *     ActionSheet, one tap to each action
 *  5. Onboarding has a Back button that returns from step 2 to step 1 (there
 *     was previously no way back once you pressed Next)
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/integration/pages/SchedulePage",
    "helphub/test/integration/pages/BookingPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, DashboardPage, SchedulePage, BookingPage, MockServer) {
    "use strict";

    QUnit.module("Booking dialog and onboarding", {
        before: function () { MockServer.start(); },
        after:  function () { MockServer.stop(); }
    });

    // ── 1 & 2. Booking dialog ─────────────────────────────────────────────

    opaTest("Booking dialog shows the helper's hourly rate", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressViewProfileButton();
        When.onTheBookingDialog.iPressBook();

        Then.onTheBookingDialog.iSeeTheHelperRate();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Preferred time is a TimePicker, not free text", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressViewProfileButton();
        When.onTheBookingDialog.iPressBook();

        Then.onTheBookingDialog.iSeeATimePicker();
        Then.iTeardownMyUIComponent();
    });

    // ── 3. Safety sheet ───────────────────────────────────────────────────

    opaTest("Safety is two named links, with no overflow menu", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressViewProfileButton();

        Then.onTheBookingDialog.iSeeTwoDirectSafetyLinks();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Profile shows either Book/Message or Edit Profile, never both", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheSchedulePage.iPressViewProfileButton();

        Then.onTheBookingDialog.iSeeOnlyTheRightProfileActions();
        Then.iTeardownMyUIComponent();
    });

    // ── 4 & 5. Onboarding ─────────────────────────────────────────────────

    opaTest("Onboarding interest chips come from the service catalogue", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheBookingDialog.iOpenOnboarding();
        When.onTheBookingDialog.iPressOnboardingNext();   // step 1 → 2
        When.onTheBookingDialog.iPressOnboardingNext();   // step 2 → 3

        Then.onTheBookingDialog.iSeeInterestChipsFromTheCatalogue();

        When.onTheBookingDialog.iDismissOnboarding();
        Then.iTeardownMyUIComponent();
    });

    opaTest("Onboarding Back button returns from step 2 to step 1", function (Given, When, Then) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        When.onTheDashboard.iPressNavTab("mySchedule");
        When.onTheBookingDialog.iOpenOnboarding();
        When.onTheBookingDialog.iPressOnboardingNext();   // step 1 → 2

        Then.onTheBookingDialog.iSeeOnboardingStep(2);

        When.onTheBookingDialog.iPressOnboardingBack();   // step 2 → 1

        Then.onTheBookingDialog.iSeeOnboardingStep(1);

        When.onTheBookingDialog.iDismissOnboarding();
        Then.iTeardownMyUIComponent();
    });
});
