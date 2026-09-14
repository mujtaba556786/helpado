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

    // ── formatCanMarkCompleted ────────────────────────────────────────────────
    //
    // The API returns the DATE column as "YYYY-MM-DDT00:00:00.000Z". new Date()
    // of that is 02:00 local in Berlin — later than local midnight — so for any
    // user east of UTC "Mark as completed" only appeared the day AFTER the
    // booking. Found on the live site with a same-day confirmed booking.

    QUnit.module("BookingMixin — formatCanMarkCompleted");

    function todayIso() {
        var d = new Date();
        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }

    QUnit.test("a confirmed booking dated today (UTC-midnight form) can be completed", function (assert) {
        assert.strictEqual(
            BookingMixin.formatCanMarkCompleted("confirmed", "C1", todayIso() + "T00:00:00.000Z", "C1"),
            true);
    });

    QUnit.test("a confirmed booking dated today (plain form) can be completed", function (assert) {
        assert.strictEqual(
            BookingMixin.formatCanMarkCompleted("confirmed", "C1", todayIso(), "C1"), true);
    });

    QUnit.test("a confirmed booking dated tomorrow cannot be completed yet", function (assert) {
        var d = new Date(); d.setDate(d.getDate() + 1);
        var sTomorrow = d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
        assert.strictEqual(
            BookingMixin.formatCanMarkCompleted("confirmed", "C1", sTomorrow + "T00:00:00.000Z", "C1"),
            false);
    });

    QUnit.test("only the customer of a confirmed booking may complete it", function (assert) {
        var sToday = todayIso();
        assert.strictEqual(BookingMixin.formatCanMarkCompleted("confirmed", "C1", sToday, "P1"), false, "provider");
        assert.strictEqual(BookingMixin.formatCanMarkCompleted("pending",   "C1", sToday, "C1"), false, "pending");
        assert.strictEqual(BookingMixin.formatCanMarkCompleted("confirmed", "C1", "",     "C1"), false, "no date");
        assert.strictEqual(BookingMixin.formatCanMarkCompleted("confirmed", "C1", "nope", "C1"), false, "bad date");
    });

    // ── _updateBookingStatus ──────────────────────────────────────────────────
    //
    // The success handler used `that`, which was never defined in the function,
    // so every accept/decline threw a TypeError *after* the server had already
    // changed the status — no toast, no list refresh. Run the handler against a
    // stubbed controller and a stubbed fetch and require the happy path to
    // complete and reload the schedule.

    QUnit.module("BookingMixin — _updateBookingStatus", {
        beforeEach: function () {
            this.origFetch = window.fetch;
            this.calls = [];
            var that = this;
            window.fetch = function (sUrl, oInit) {
                that.calls.push({ url: sUrl, body: JSON.parse(oInit.body) });
                return Promise.resolve({ json: function () { return Promise.resolve({ success: true }); } });
            };
            this.reloaded = 0;
            this.ctrl = Object.assign({}, BookingMixin, {
                getModel: function () { return { getProperty: function () { return "P1"; } }; },
                getOwnerComponent: function () {
                    var oBundle = { getText: function (k) { return k; } };
                    var oI18n   = { getResourceBundle: function () { return oBundle; } };
                    return { getModel: function () { return oI18n; } };
                },
                _loadSchedule: function () { that.reloaded++; }
            });
            var oCtx = { getObject: function () { return { id: "B2" }; } };
            var oSrc = { getBindingContext: function () { return oCtx; } };
            this.event = { getSource: function () { return oSrc; } };
        },
        afterEach: function () { window.fetch = this.origFetch; }
    });

    QUnit.test("accepting a booking PUTs the status and reloads the schedule without throwing", function (assert) {
        var that = this;
        return this.ctrl._updateBookingStatus(this.event, "confirmed").then(function () {
            assert.strictEqual(that.calls.length, 1, "one status request");
            assert.ok(/\/api\/bookings\/B2\/status$/.test(that.calls[0].url), "request targets the booking");
            assert.deepEqual(that.calls[0].body, { status: "confirmed", user_id: "P1" });
            assert.strictEqual(that.reloaded, 1, "schedule reloaded after success");
        });
    });

    QUnit.test("declining a booking reloads the schedule too", function (assert) {
        var that = this;
        return this.ctrl._updateBookingStatus(this.event, "declined").then(function () {
            assert.strictEqual(that.calls[0].body.status, "declined");
            assert.strictEqual(that.reloaded, 1);
        });
    });
});
