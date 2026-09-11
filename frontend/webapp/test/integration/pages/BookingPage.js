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

                /**
                 * Safety used to hide behind a ⋯ overflow menu that opened an
                 * ActionSheet. Both are gone: the two actions are named links at the
                 * foot of the profile, each opening its own dialog in one tap.
                 */
                /**
                 * The four fact rows (Rate / Experience / Language / Location) used
                 * StandardListItem, which sizes its icon box but lets the glyph inherit
                 * the app line-height — on a phone at 1.3x font scale that clipped every
                 * one of them. It also let each glyph keep its own natural width, so the
                 * icons did not start on a common vertical line.
                 */
                iSeeAlignedFactIcons: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("profileDialog") >= 0; },
                        success: function (aDialogs) {
                            var oList;
                            aDialogs[0].findAggregatedObjects(true, function (c) {
                                if (!oList && c.isA("sap.m.List")) { oList = c; }
                                return false;
                            });
                            Opa5.assert.ok(oList, "The facts list is present");

                            var aIcons = [];
                            oList.findAggregatedObjects(true, function (c) {
                                if (c.isA("sap.ui.core.Icon")) { aIcons.push(c); }
                                return false;
                            });
                            Opa5.assert.strictEqual(aIcons.length, 4, "Four fact icons render");

                            // A shared explicit width is what puts the glyphs on one line;
                            // without it each icon falls back to its own natural width.
                            var aWidths = aIcons.map(function (o) { return o.getWidth(); });
                            var aUnique = aWidths.filter(function (w, i) { return aWidths.indexOf(w) === i; });
                            Opa5.assert.strictEqual(aUnique.length, 1,
                                "All four icons share one box width (" + aWidths.join(", ") + ")");
                            Opa5.assert.ok(aUnique[0],
                                "That width is set explicitly rather than left to the glyph");

                            aIcons.forEach(function (oIcon) {
                                Opa5.assert.strictEqual(oIcon.getColor(), "#2E8B57",
                                    oIcon.getSrc() + " uses the brand green");
                            });

                            // The list used to run edge to edge while About/Reviews were
                            // inset, so nothing in the dialog lined up.
                            Opa5.assert.ok(oList.hasStyleClass("sapUiMediumMarginBeginEnd"),
                                "The list carries the same side margin as the About block");
                        },
                        errorMessage: "Profile dialog facts list not found"
                    });
                },

                /**
                 * The ratings were sap.m.RatingIndicators. That control sizes each star's
                 * slot from the unscaled iconSize while Android's WebView text zoom
                 * multiplies the glyph on top, so every star was clipped at its slot edge
                 * and overlapped its neighbour — 23px of glyph in a 21px slot, measured on
                 * device, at any iconSize. They are five plain Icons now.
                 */
                iSeeASizedProfileRating: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("profileDialog") >= 0; },
                        success: function (aDialogs) {
                            var aStars = [];
                            var bRatingIndicator = false;
                            aDialogs[0].findAggregatedObjects(true, function (c) {
                                if (c.isA("sap.m.RatingIndicator")) { bRatingIndicator = true; }
                                if (c.isA("sap.ui.core.Icon") &&
                                    /favorite|unfavorite/.test(c.getSrc() || "")) { aStars.push(c); }
                                return false;
                            });

                            Opa5.assert.notOk(bRatingIndicator,
                                "No RatingIndicator remains — its stars clip under font scaling");
                            Opa5.assert.strictEqual(aStars.length % 5, 0,
                                "Stars come in rows of five (" + aStars.length + " found)");
                            Opa5.assert.ok(aStars.length >= 5, "The header rating renders five stars");

                            aStars.forEach(function (oStar) {
                                // No fixed width: a box in any unit is eventually overrun by
                                // the zoomed glyph and clips it. Unset, the star is as wide
                                // as it draws.
                                Opa5.assert.strictEqual(oStar.getWidth(), "",
                                    "Star has no fixed box width to clip against");
                                Opa5.assert.ok(oStar.getSize(),
                                    "Star glyph size is set rather than inherited");
                            });
                        },
                        errorMessage: "Profile dialog rating not found"
                    });
                },

                iSeeTwoDirectSafetyLinks: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("profileDialog") >= 0; },
                        success: function (aDialogs) {
                            var oDialog = aDialogs[0];

                            var aOverflow = [];
                            var aSafety   = [];
                            oDialog.findAggregatedObjects(true, function (c) {
                                if (!c.isA || !c.isA("sap.m.Button")) { return false; }
                                if (c.getIcon() === "sap-icon://overflow") { aOverflow.push(c); }
                                var sText = c.getText();
                                if (sText && /report|block|melden|blockieren|bildir|engelle/i.test(sText)) {
                                    aSafety.push(c);
                                }
                                return false;
                            });

                            Opa5.assert.strictEqual(aOverflow.length, 0,
                                "No overflow (⋯) button remains on the profile");
                            Opa5.assert.strictEqual(aSafety.length, 2,
                                "Report and Block are two separate named links (found " +
                                aSafety.map(function (b) { return b.getText(); }).join(", ") + ")");

                            var bLabelled = aSafety.every(function (b) {
                                var t = b.getText();
                                return t && t !== "reportThisHelper" && t !== "blockThisHelper";
                            });
                            Opa5.assert.ok(bLabelled, "Both links resolve through the i18n bundle");
                            Opa5.assert.ok(aSafety.every(function (b) { return b.getType() === "Transparent"; }),
                                "Both stay muted, so they do not compete with Book and Message");
                        },
                        errorMessage: "Profile dialog not open"
                    });
                },

                iSeeOnlyTheRightProfileActions: function () {
                    return this.waitFor({
                        controlType: "sap.m.Dialog",
                        matchers: function (oDialog) { return oDialog.getId().indexOf("profileDialog") >= 0; },
                        success: function (aDialogs) {
                            var oDialog = aDialogs[0];
                            var oModel  = oDialog.getModel("appData");
                            var bOwn    = oModel.getProperty("/isOwnProfile");

                            var aRows = [];
                            oDialog.findAggregatedObjects(true, function (c) {
                                if (c.isA("sap.m.HBox")) {
                                    var sKids = c.getItems().map(function (i) {
                                        return i.getText ? i.getText() : "";
                                    }).filter(Boolean).join("/");
                                    if (sKids) { aRows.push({ kids: sKids, visible: c.getVisible() }); }
                                }
                                return false;
                            });

                            var oEdit  = aRows.filter(function (r) { return /Edit/i.test(r.kids); })[0];
                            var oOther = aRows.filter(function (r) { return /Book|Message/i.test(r.kids); })[0];
                            Opa5.assert.ok(oEdit && oOther, "Both action rows exist in the dialog");
                            Opa5.assert.ok(!(oEdit.visible && oOther.visible),
                                "Book/Message and Edit Profile are never both visible " +
                                "(edit=" + oEdit.visible + ", other=" + oOther.visible + ")");
                            Opa5.assert.strictEqual(oEdit.visible, !!bOwn,
                                "Edit Profile shows only on your own profile (isOwnProfile=" + bOwn + ")");
                        },
                        errorMessage: "Profile dialog not open"
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
