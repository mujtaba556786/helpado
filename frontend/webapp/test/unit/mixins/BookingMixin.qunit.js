sap.ui.define([
    "helphub/controller/mixins/BookingMixin"
], function (BookingMixin) {
    "use strict";

    // ── formatCanRespond / formatCanCancel ────────────────────────────────────
    //
    // These replaced inline expression bindings that compared
    // String(${appData>/user/id}) with String(${appData>provider_id}). Mixing an
    // absolute path into a list row's relative context meant that while
    // auto-login was still in flight both ids were undefined, and
    // String(undefined) === String(undefined) is true — so BOTH the provider's
    // Accept/Decline pair and the customer's Cancel button showed on the same
    // booking. The empty-user cases below are the ones that mattered.

    QUnit.module("BookingMixin — booking action visibility");

    QUnit.test("provider sees accept/decline on their own pending booking", function (assert) {
        assert.strictEqual(BookingMixin.formatCanRespond("pending", "P1", "P1"), true);
    });

    QUnit.test("customer does not see accept/decline on their booking", function (assert) {
        assert.strictEqual(BookingMixin.formatCanRespond("pending", "P1", "C1"), false);
    });

    QUnit.test("customer sees cancel on their own pending booking", function (assert) {
        assert.strictEqual(BookingMixin.formatCanCancel("pending", "C1", "C1"), true);
    });

    QUnit.test("provider does not see cancel on a booking they received", function (assert) {
        assert.strictEqual(BookingMixin.formatCanCancel("pending", "C1", "P1"), false);
    });

    QUnit.test("neither action shows before the user id is known", function (assert) {
        ["", null, undefined].forEach(function (vUser) {
            assert.strictEqual(BookingMixin.formatCanRespond("pending", "P1", vUser), false,
                "no accept/decline for user id " + JSON.stringify(vUser));
            assert.strictEqual(BookingMixin.formatCanCancel("pending", "C1", vUser), false,
                "no cancel for user id " + JSON.stringify(vUser));
        });
    });

    QUnit.test("the two actions are never both offered on one booking", function (assert) {
        [["P1", "C1", "P1"], ["P1", "C1", "C1"], ["P1", "C1", "X9"],
         ["P1", "C1", ""],   ["P1", "C1", undefined]].forEach(function (a) {
            var bRespond = BookingMixin.formatCanRespond("pending", a[0], a[2]);
            var bCancel  = BookingMixin.formatCanCancel("pending", a[1], a[2]);
            assert.notOk(bRespond && bCancel,
                "provider=" + a[0] + " customer=" + a[1] + " viewer=" + JSON.stringify(a[2]));
        });
    });

    QUnit.test("nothing is offered once a booking is no longer pending", function (assert) {
        ["confirmed", "completed", "declined", "cancelled"].forEach(function (s) {
            assert.strictEqual(BookingMixin.formatCanRespond(s, "P1", "P1"), false, s + " → no respond");
            assert.strictEqual(BookingMixin.formatCanCancel(s, "C1", "C1"), false, s + " → no cancel");
        });
    });

    // ── formatBookingDate ─────────────────────────────────────────────────────

    QUnit.module("BookingMixin — formatBookingDate");

    QUnit.test("formats a valid ISO date string", function (assert) {
        var result = BookingMixin.formatBookingDate("2024-12-20");
        assert.ok(result.length > 0, "returns a non-empty string");
        assert.ok(result.indexOf("Dec") >= 0 || result.indexOf("20") >= 0, "contains date info");
    });

    QUnit.test("returns empty string for null input", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingDate(null), "", "null → empty string");
    });

    QUnit.test("returns empty string for undefined input", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingDate(undefined), "", "undefined → empty string");
    });

    QUnit.test("returns the original string for an invalid date", function (assert) {
        var result = BookingMixin.formatBookingDate("not-a-date");
        assert.strictEqual(result, "not-a-date", "invalid date → returns original string");
    });

    QUnit.test("formats full ISO timestamp", function (assert) {
        var result = BookingMixin.formatBookingDate("2024-06-15T08:30:00.000Z");
        assert.ok(result.length > 0, "ISO timestamp is formatted");
        assert.ok(result.indexOf("15") >= 0 || result.indexOf("Jun") >= 0, "contains day or month");
    });

    // ── formatBookingState ────────────────────────────────────────────────────

    QUnit.module("BookingMixin — formatBookingState");

    QUnit.test("confirmed → Success", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState("confirmed"), "Success");
    });

    QUnit.test("declined → Error", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState("declined"), "Error");
    });

    QUnit.test("cancelled → Error", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState("cancelled"), "Error");
    });

    QUnit.test("completed → None", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState("completed"), "None");
    });

    QUnit.test("pending (default) → Warning", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState("pending"), "Warning");
    });

    QUnit.test("unknown status → Warning", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState("something_else"), "Warning");
    });

    QUnit.test("undefined → Warning", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingState(undefined), "Warning");
    });
});
