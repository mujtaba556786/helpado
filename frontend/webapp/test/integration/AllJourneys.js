/**
 * AllJourneys.js — entry point for the OPA5 integration-test suite.
 *
 * Loaded by opaTests.qunit.html via data-sap-ui-oninit.
 * Every journey module is listed here; adding a new one only requires
 * an extra entry in the dependency array below.
 *
 * Journey coverage:
 *  DashboardJourney     — original smoke tests (activity strip, CTA, hero badge, badges, tab)
 *  ServiceTilesJourney  — service grid render, hero badge, header controls, tile spot-checks
 *  SearchJourney        — tile press → results page, Sponsored/PRO badges, map toggle, search field
 *  ScheduleJourney      — bookings list, all 5 status badges, 6 filter chips, profile dialog rating, filter interactions
 *  TasksJourney         — Browse/My Tasks toggle, feed list, OPEN badge, search, category filter, dialog
 *  MessagesJourney      — conversations list, unread badge, DM chat dialog
 *  NotificationsJourney — bell, dialog, items, Mark-all-read, filter chips
 *  NavigationJourney    — tab cycle, tile→search, back-nav, NavContainer page existence
 *  AboutJourney         — Settings tab hero, legal/support list items, version, made-in text
 *  BookingJourney       — booking dialog rate + TimePicker, onboarding chips + Back button
 *  PolishJourney        — nav contrast, empty message/saved states, profile availability
 *  LoginJourney         — brand logo, subtitle, neighbourhood scene, Sign In contrast
 *  HelpFaqJourney       — real FAQ content, settings section labels not duplicated
 *  HeaderJourney        — header items centred on the bar, equal targets and gaps
 *  BottomNavJourney     — one selected tab, even widths, readable labels both states
 *  RatingJourney        — tappable star icons write /newRating, empty submit refused, compact dialog
 *  PopoverJourney       — popover arrows centred on their opener (theme param), rating dialog initial focus
 */
sap.ui.define([
    "sap/ui/test/Opa5",
    "helphub/test/integration/journeys/DashboardJourney",
    "helphub/test/integration/journeys/ServiceTilesJourney",
    "helphub/test/integration/journeys/SearchJourney",
    "helphub/test/integration/journeys/ScheduleJourney",
    "helphub/test/integration/journeys/TasksJourney",
    "helphub/test/integration/journeys/MessagesJourney",
    "helphub/test/integration/journeys/NotificationsJourney",
    "helphub/test/integration/journeys/NavigationJourney",
    "helphub/test/integration/journeys/AboutJourney",
    "helphub/test/integration/journeys/BookingJourney",
    "helphub/test/integration/journeys/PolishJourney",
    "helphub/test/integration/journeys/LoginJourney",
    "helphub/test/integration/journeys/HelpFaqJourney",
    "helphub/test/integration/journeys/HeaderJourney",
    "helphub/test/integration/journeys/BottomNavJourney",
    "helphub/test/integration/journeys/RatingJourney",
    "helphub/test/integration/journeys/PopoverJourney"
], function (Opa5) {
    "use strict";

    // UI5 1.120 (the version the app ships with — see ui5.yaml) has a bug in
    // sap.m.Popover: its override of the popup's close() reads `that.oPopup`
    // after exit() has nulled it, so destroying an *open* popover leaves a
    // stale auto-close handler that throws "Cannot read properties of null
    // (reading 'getOpenState')" into whatever test runs next. 1.147 fixed it
    // (uses `this.getOpenState()`), which is why this never showed while the
    // proxy served the unpinned latest. The app never destroys an open popover;
    // teardown does, on every test that left one open. Close them first.
    (function () {
        var fnTeardown = Opa5.prototype.iTeardownMyUIComponent;
        Opa5.prototype.iTeardownMyUIComponent = function () {
            var that = this;
            this.waitFor({
                success: function () {
                    var oWin = Opa5.getWindow(), oCore = oWin.sap.ui.getCore();
                    Array.prototype.forEach.call(
                        oWin.document.querySelectorAll(".sapMPopover, .sapMDialog"),
                        function (el) {
                            var oCtrl = oCore.byId(el.id);
                            if (oCtrl && oCtrl.isOpen && oCtrl.isOpen() && oCtrl.close) { oCtrl.close(); }
                        });
                }
            });
            this.waitFor({
                check: function () {
                    var oWin = Opa5.getWindow();
                    return !Array.prototype.some.call(
                        oWin.document.querySelectorAll(".sapMPopover, .sapMDialog"),
                        function (el) { return el.getBoundingClientRect().width > 0; });
                },
                errorMessage: "A popover or dialog stayed open into teardown"
            });
            return fnTeardown.apply(that, arguments);
        };
    })();

    QUnit.start();
});
