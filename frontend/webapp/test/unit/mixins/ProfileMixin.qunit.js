sap.ui.define([
    "helphub/controller/mixins/ProfileMixin"
], function (ProfileMixin) {
    "use strict";

    // ── _computeAvgRating ─────────────────────────────────────────────────────

    QUnit.module("ProfileMixin — _computeAvgRating");

    QUnit.test("returns null for null input", function (assert) {
        assert.strictEqual(ProfileMixin._computeAvgRating(null), null, "null → null");
    });

    QUnit.test("returns null for undefined input", function (assert) {
        assert.strictEqual(ProfileMixin._computeAvgRating(undefined), null, "undefined → null");
    });

    QUnit.test("returns null for empty array", function (assert) {
        assert.strictEqual(ProfileMixin._computeAvgRating([]), null, "[] → null");
    });

    QUnit.test("single 5-star review returns 5", function (assert) {
        assert.strictEqual(ProfileMixin._computeAvgRating([{ stars: 5 }]), 5, "one 5-star → 5");
    });

    QUnit.test("single 3-star review returns 3", function (assert) {
        assert.strictEqual(ProfileMixin._computeAvgRating([{ stars: 3 }]), 3, "one 3-star → 3");
    });

    QUnit.test("two 5-star reviews return 5", function (assert) {
        assert.strictEqual(
            ProfileMixin._computeAvgRating([{ stars: 5 }, { stars: 5 }]),
            5, "5+5 / 2 → 5"
        );
    });

    QUnit.test("4-star + 5-star returns 4.5", function (assert) {
        assert.strictEqual(
            ProfileMixin._computeAvgRating([{ stars: 4 }, { stars: 5 }]),
            4.5, "(4+5)/2 → 4.5"
        );
    });

    QUnit.test("rounds to 1 decimal place", function (assert) {
        // (4+5+4) / 3 = 4.333... → rounds to 4.3
        assert.strictEqual(
            ProfileMixin._computeAvgRating([{ stars: 4 }, { stars: 5 }, { stars: 4 }]),
            4.3, "(4+5+4)/3 = 4.333 → 4.3"
        );
    });

    QUnit.test("missing stars field treated as 0", function (assert) {
        // ({stars: 4} + {no stars}) / 2 = 2.0
        assert.strictEqual(
            ProfileMixin._computeAvgRating([{ stars: 4 }, {}]),
            2, "missing stars defaults to 0"
        );
    });

    QUnit.test("result is always between 0 and 5", function (assert) {
        var fAvg = ProfileMixin._computeAvgRating([{ stars: 1 }, { stars: 5 }, { stars: 3 }]);
        assert.ok(fAvg >= 0 && fAvg <= 5, "average is within [0, 5] range (got: " + fAvg + ")");
    });

    // ── _formatReviews ────────────────────────────────────────────────────────

    QUnit.module("ProfileMixin — _formatReviews");

    QUnit.test("returns empty array for null input", function (assert) {
        var aResult = ProfileMixin._formatReviews(null);
        assert.deepEqual(aResult, [], "null → []");
    });

    QUnit.test("returns empty array for undefined input", function (assert) {
        var aResult = ProfileMixin._formatReviews(undefined);
        assert.deepEqual(aResult, [], "undefined → []");
    });

    QUnit.test("returns empty array for empty array input", function (assert) {
        var aResult = ProfileMixin._formatReviews([]);
        assert.deepEqual(aResult, [], "[] → []");
    });

    QUnit.test("preserves original review fields (stars, comment)", function (assert) {
        var aInput = [{ reviewer_name: "Alice", stars: 4, comment: "Great!", created_at: new Date().toISOString() }];
        var aResult = ProfileMixin._formatReviews(aInput);
        assert.strictEqual(aResult[0].stars, 4, "stars preserved");
        assert.strictEqual(aResult[0].comment, "Great!", "comment preserved");
        assert.strictEqual(aResult[0].reviewer_name, "Alice", "reviewer_name preserved");
    });

    QUnit.test("derives initials from reviewer_name (two-word name)", function (assert) {
        var aInput = [{ reviewer_name: "John Doe", stars: 3, created_at: new Date().toISOString() }];
        var aResult = ProfileMixin._formatReviews(aInput);
        assert.strictEqual(aResult[0].reviewer_initials, "JD", "John Doe → JD");
    });

    QUnit.test("derives initials from single-word reviewer_name", function (assert) {
        var aInput = [{ reviewer_name: "Alice", stars: 5, created_at: new Date().toISOString() }];
        var aResult = ProfileMixin._formatReviews(aInput);
        assert.strictEqual(aResult[0].reviewer_initials, "A", "Alice → A");
    });

    QUnit.test("uses 'Anonymous' and '?' initials when reviewer_name is missing", function (assert) {
        var aInput = [{ stars: 2, created_at: new Date().toISOString() }];
        var aResult = ProfileMixin._formatReviews(aInput);
        assert.strictEqual(aResult[0].reviewer_initials, "AN", "no name → AN (Anonymous)");
    });

    QUnit.test("created_at < 60 seconds ago → 'just now'", function (assert) {
        var sTs = new Date(Date.now() - 30000).toISOString(); // 30 s ago
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: sTs }]);
        assert.strictEqual(aResult[0].created_at_relative, "just now", "30s → just now");
    });

    QUnit.test("created_at 5 minutes ago → 'X min ago'", function (assert) {
        var sTs = new Date(Date.now() - 300000).toISOString(); // 5 min ago
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: sTs }]);
        var sRel = aResult[0].created_at_relative;
        assert.ok(sRel.indexOf("min ago") >= 0, "5 min ago contains 'min ago' (got: " + sRel + ")");
        assert.ok(sRel.indexOf("5") >= 0, "shows 5 minutes");
    });

    QUnit.test("created_at 3 hours ago → 'X hr ago'", function (assert) {
        var sTs = new Date(Date.now() - 10800000).toISOString(); // 3 hr ago
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: sTs }]);
        var sRel = aResult[0].created_at_relative;
        assert.ok(sRel.indexOf("hr ago") >= 0, "3hr → 'hr ago' (got: " + sRel + ")");
        assert.ok(sRel.indexOf("3") >= 0, "shows 3 hours");
    });

    QUnit.test("created_at 5 days ago → 'X days ago'", function (assert) {
        var sTs = new Date(Date.now() - 432000000).toISOString(); // 5 days ago
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: sTs }]);
        var sRel = aResult[0].created_at_relative;
        assert.ok(sRel.indexOf("days ago") >= 0, "5 days → 'days ago' (got: " + sRel + ")");
    });

    QUnit.test("created_at > 30 days ago → formatted date string", function (assert) {
        var sTs = new Date(Date.now() - 5184000000).toISOString(); // 60 days ago
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: sTs }]);
        var sRel = aResult[0].created_at_relative;
        assert.ok(sRel.length > 0, "returns non-empty string");
        assert.notOk(sRel.indexOf("days ago") >= 0, "does NOT show 'days ago' for very old date");
        assert.notOk(sRel.indexOf("hr ago") >= 0, "does NOT show 'hr ago' for very old date");
    });

    QUnit.test("null created_at → empty relative string", function (assert) {
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: null }]);
        assert.strictEqual(aResult[0].created_at_relative, "", "null date → empty relative");
    });

    QUnit.test("invalid created_at → empty relative string", function (assert) {
        var aResult = ProfileMixin._formatReviews([{ reviewer_name: "X", stars: 1, created_at: "not-a-date" }]);
        assert.strictEqual(aResult[0].created_at_relative, "", "invalid date → empty relative");
    });

    QUnit.test("processes multiple reviews independently", function (assert) {
        var aInput = [
            { reviewer_name: "Alice Smith", stars: 5, comment: "Excellent", created_at: new Date(Date.now() - 30000).toISOString() },
            { reviewer_name: "Bob Jones",  stars: 3, comment: "OK",        created_at: new Date(Date.now() - 10800000).toISOString() }
        ];
        var aResult = ProfileMixin._formatReviews(aInput);
        assert.strictEqual(aResult.length, 2, "two inputs → two outputs");
        assert.strictEqual(aResult[0].reviewer_initials, "AS", "Alice Smith → AS");
        assert.strictEqual(aResult[1].reviewer_initials, "BJ", "Bob Jones → BJ");
        assert.strictEqual(aResult[0].created_at_relative, "just now", "first → just now");
        assert.ok(aResult[1].created_at_relative.indexOf("hr ago") >= 0, "second → hr ago");
    });

    // ── formatServiceList ─────────────────────────────────────────────────────
    // Categories are stored as raw comma-joined API keys ("Transport,Gardening")
    // and a booking copies the string; rendered unformatted it showed exactly
    // that, in English in every locale.

    QUnit.module("ProfileMixin — formatServiceList", {
        beforeEach: function () {
            // Bundle that "translates" by prefixing the key, so we can see which
            // key was looked up.
            this.ctrl = Object.assign({}, ProfileMixin, {
                getOwnerComponent: function () {
                    var oBundle = { getText: function (k) { return "t:" + k; } };
                    return { getModel: function () { return { getResourceBundle: function () { return oBundle; } }; } };
                }
            });
        }
    });

    QUnit.test("splits on commas, localises each known category, joins with ', '", function (assert) {
        assert.strictEqual(this.ctrl.formatServiceList("Transport,Gardening"),
            "t:serviceTransport, t:serviceGardening", "no space after the comma in the input, one in the output");
        assert.strictEqual(this.ctrl.formatServiceList("Elder Care, Pet Care"),
            "t:serviceElderCare, t:servicePetCare", "tolerates a space after the comma; multi-word names resolve");
    });

    QUnit.test("single value and unknown names pass through unchanged", function (assert) {
        assert.strictEqual(this.ctrl.formatServiceList("Cleaning"), "t:serviceCleaning", "single category");
        assert.strictEqual(this.ctrl.formatServiceList("Babysitting"), "Babysitting", "a name that is not a category is shown as stored");
        assert.strictEqual(this.ctrl.formatServiceList("Cleaning,,Babysitting,"), "t:serviceCleaning, Babysitting", "empty segments dropped");
    });

    QUnit.test("empty input renders nothing", function (assert) {
        assert.strictEqual(this.ctrl.formatServiceList(""), "");
        assert.strictEqual(this.ctrl.formatServiceList(null), "");
        assert.strictEqual(this.ctrl.formatServiceList(undefined), "");
    });
});
