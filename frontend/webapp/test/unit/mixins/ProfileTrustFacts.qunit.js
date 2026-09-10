sap.ui.define([
    "helphub/controller/mixins/ProfileMixin"
], function (ProfileMixin) {
    "use strict";

    // The profile used to show "Verified User" for anyone whose internal
    // moderation score passed 40 — account age, completed bookings, rating and
    // absence of reports. Nothing in the product checks identity, so the label
    // asserted something untrue exactly where a customer decides who to let
    // into their home. These formatters replaced it and may only state facts
    // the database can prove.

    function withBundle(mTexts) {
        return Object.assign(Object.create(ProfileMixin), {
            getOwnerComponent: function () {
                return {
                    getModel: function () {
                        return {
                            getResourceBundle: function () {
                                return {
                                    getText: function (sKey, aArgs) {
                                        var s = mTexts[sKey] || sKey;
                                        return aArgs ? s.replace("{0}", aArgs[0]) : s;
                                    }
                                };
                            }
                        };
                    }
                };
            }
        });
    }

    var TEXTS = {
        profileMemberSince: "Member since {0}",
        profileJobsCompleted: "{0} jobs completed"
    };

    QUnit.module("ProfileMixin — trust facts replace the Verified badge");

    QUnit.test("member-since renders a readable month and year", function (assert) {
        var oCtl = withBundle(TEXTS);
        var sOut = oCtl.formatMemberSince("2026-04-16T10:22:00.000Z");
        assert.ok(sOut.indexOf("2026") >= 0, "keeps the year (" + sOut + ")");
        assert.strictEqual(sOut.indexOf("T10:22"), -1, "no raw ISO leaks through");
        assert.ok(sOut.indexOf("Member since") === 0, "uses the translated pattern");
    });

    QUnit.test("member-since is blank rather than wrong when unknown", function (assert) {
        var oCtl = withBundle(TEXTS);
        assert.strictEqual(oCtl.formatMemberSince(""), "", "empty input");
        assert.strictEqual(oCtl.formatMemberSince(null), "", "null input");
        assert.strictEqual(oCtl.formatMemberSince("nonsense"), "", "unparseable input");
    });

    QUnit.test("completed jobs are shown only when there are any", function (assert) {
        var oCtl = withBundle(TEXTS);
        assert.strictEqual(oCtl.formatJobsCompleted(12), "12 jobs completed");
        assert.strictEqual(oCtl.formatJobsCompleted("7"), "7 jobs completed", "string count from JSON");
        // A brand-new helper must not be dressed up — no badge, no "0 jobs".
        assert.strictEqual(oCtl.formatJobsCompleted(0), "", "zero renders nothing");
        assert.strictEqual(oCtl.formatJobsCompleted(undefined), "", "unknown renders nothing");
    });

    QUnit.test("the old trust-label formatter is gone", function (assert) {
        // Guard against it being reintroduced: no code path may turn an internal
        // moderation level into a user-facing verification claim.
        assert.strictEqual(typeof ProfileMixin.formatTrustLabel, "undefined",
            "formatTrustLabel no longer exists");
    });
});
