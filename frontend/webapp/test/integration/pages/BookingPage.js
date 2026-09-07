/**
 * OPA5 Page Object — Book a Helper dialog and the onboarding dialog.
 *
 * Covers the two things that were wrong before:
 *  - the booking dialog never showed the helper's rate, so people committed
 *    to a booking without ever seeing a price;
 *  - onboarding step 3 rendered 12 hardcoded English category names that had
 *    drifted from the real 10-entry catalogue in model/ServiceConstants.js.
 */
sap.ui.define([
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "helphub/model/ServiceConstants"
], function (Opa5, Press, ServiceConstants) {
    "use strict";

    var DASHBOARD_VIEW = "helphub.view.Dashboard";

    function findIn(oRoot, fnMatch) {
        var aHits = [];
        oRoot.findAggregatedObjects(true, function (oChild) {
            if (fnMatch(oChild)) { aHits.push(oChild); }
            return false;
        });
        return aHits;
    }

    Opa5.createPageObjects({
        onTheBookingDialog: {
            actions: {
                iPressBook: function () {
                    return this.waitFor({
                        controlType: "sap.m.Button",
                        searchOpenDialogs: true,
                        matchers: function (oBtn) {
                            return oBtn.getIcon() === "sap-icon://appointment-2" && oBtn.getVisible();
                        },
                        actions: new Press(),
                        errorMessage: "Book button not found in the profile dialog"
                    });
                },

                /**
                 * MockServer seeds hhOnboarded so the dialog never blocks the other
                 * journeys; open it explicitly through the controller instead.
                 */
                iOpenOnboarding: function () {
                    return this.waitFor({
                        id: "bookingsList",
                        viewName: DASHBOARD_VIEW,
                        success: function (oCtrl) {
                            var oView = oCtrl;
                            while (oView && !oView.isA("sap.ui.core.mvc.View")) {
                                oView = oView.getParent();
                            }
                            var oController = oView.getController();
                            localStorage.removeItem("hhOnboarded");
                            oController._checkOnboarding();
                            Opa5.assert.ok(true, "Onboarding dialog requested");
                        },
                        errorMessage: "Could not reach the Dashboard controller"
                    });
                },

                iPressOnboardingNext: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("onboardingDialog") >= 0; },
                        success: function (aDialogs) {
                            var aBtns = aDialogs[0].getButtons().filter(function (b) { return b.getVisible(); });
                            // Last visible footer button is always Next / Get started.
                            aBtns[aBtns.length - 1].firePress();
                            Opa5.assert.ok(true, "Pressed the onboarding Next button");
                        },
                        errorMessage: "Onboarding dialog not open"
                    });
                },

                /**
                 * Onboarding is modal: leaving it open makes every later test fail
                 * with "hidden behind a blocking popup layer". Always finish with
                 * this, which also restores the flag MockServer seeds.
                 */
                iDismissOnboarding: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("onboardingDialog") >= 0; },
                        success: function (aDialogs) {
                            aDialogs[0].close();
                            localStorage.setItem("hhOnboarded", "1");
                            Opa5.assert.ok(true, "Onboarding dialog dismissed");
                        },
                        errorMessage: "Onboarding dialog not open"
                    });
                },

                iPressOnboardingBack: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("onboardingDialog") >= 0; },
                        success: function (aDialogs) {
                            var aBack = aDialogs[0].getButtons().filter(function (b) {
                                return b.getVisible() && b.getType() === "Transparent";
                            });
                            Opa5.assert.ok(aBack.length === 1,
                                "Exactly one Transparent footer button visible (Back) beyond step 1");
                            aBack[0].firePress();
                        },
                        errorMessage: "Onboarding dialog not open"
                    });
                }
            },

            assertions: {
                /**
                 * The regression this guards: the dialog previously showed service,
                 * date, time and message but no price at all.
                 */
                iSeeTheHelperRate: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("bookingDialog") >= 0; },
                        success: function (aDialogs) {
                            var aRate = findIn(aDialogs[0], function (c) {
                                return c.isA("sap.m.ObjectStatus");
                            });
                            Opa5.assert.ok(aRate.length >= 1,
                                "Booking dialog renders an ObjectStatus for the rate");
                            var sText = aRate[0].getText();
                            Opa5.assert.ok(!!sText,
                                "Rate field is not blank (got: '" + sText + "')");

                            var vRate = aDialogs[0].getModel("appData").getProperty("/selectedProfile/rate");
                            if (vRate) {
                                Opa5.assert.ok(
                                    sText.indexOf(String(vRate)) >= 0 && /\/hr$/.test(sText),
                                    "Rate shows the helper's actual rate with a per-hour suffix " +
                                    "(rate " + vRate + ", got '" + sText + "')");
                            }
                        },
                        errorMessage: "Booking dialog did not open"
                    });
                },

                /**
                 * Free-text time entry let people type anything ("3pm", "afternoon")
                 * straight into the database.
                 */
                iSeeATimePicker: function () {
                    return this.waitFor({
                        id: "bookingTime",
                        viewName: DASHBOARD_VIEW,
                        success: function (oCtrl) {
                            Opa5.assert.ok(oCtrl.isA("sap.m.TimePicker"),
                                "Preferred time is a TimePicker, not a free-text Input");
                        },
                        errorMessage: "bookingTime control not found"
                    });
                },

                /**
                 * Step 3 must be driven by ServiceConstants (localised through i18n),
                 * not a second hardcoded English list that drifts from the catalogue.
                 */
                iSeeInterestChipsFromTheCatalogue: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("onboardingDialog") >= 0; },
                        success: function (aDialogs) {
                            var aChips = findIn(aDialogs[0], function (c) {
                                return c.isA("sap.m.Button") && !!c.data("interestKey");
                            });
                            Opa5.assert.strictEqual(aChips.length, ServiceConstants.length,
                                "Onboarding shows exactly " + ServiceConstants.length +
                                " interest chips, one per catalogue category");

                            var aKeys = aChips.map(function (c) { return c.data("interestKey"); }).sort();
                            var aExpected = ServiceConstants.map(function (s) { return s.name; }).sort();
                            Opa5.assert.deepEqual(aKeys, aExpected,
                                "Chip keys are exactly the ServiceConstants category names");

                            var bAllLabelled = aChips.every(function (c) { return !!c.getText(); });
                            Opa5.assert.ok(bAllLabelled,
                                "Every chip has a label resolved from the i18n bundle");
                        },
                        errorMessage: "Onboarding dialog not open"
                    });
                },

                iSeeOnboardingStep: function (iStep) {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("onboardingDialog") >= 0; },
                        success: function (aDialogs) {
                            var oModel = aDialogs[0].getModel("appData");
                            Opa5.assert.strictEqual(oModel.getProperty("/onboarding/step"), iStep,
                                "Onboarding is on step " + iStep);
                        },
                        errorMessage: "Onboarding dialog not open"
                    });
                }
            }
        }
    });
});
