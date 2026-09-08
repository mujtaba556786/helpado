sap.ui.define([
    "helphub/controller/mixins/MapMixin"
], function (MapMixin) {
    "use strict";

    // Shared user location (Berlin centre)
    var USER_LOC = { lat: 52.520, lng: 13.405 };

    // Helper: build a minimal context that provides the appData model
    function makeCtx(oModelData) {
        return {
            _calculateDistanceKm: MapMixin._calculateDistanceKm,
            _isAvailableNow:      MapMixin._isAvailableNow,
            getModel: function () {
                return {
                    getProperty: function (sPath) {
                        if (sPath === "/user/location")    { return oModelData.location || USER_LOC; }
                        if (sPath === "/filters/distance") { return oModelData.distance || 10; }
                        return null;
                    }
                };
            }
        };
    }

    // ── _calculateDistanceKm ──────────────────────────────────────────────────

    QUnit.module("MapMixin — _calculateDistanceKm");

    QUnit.test("same point returns 0 km", function (assert) {
        var dist = MapMixin._calculateDistanceKm(USER_LOC, USER_LOC);
        assert.strictEqual(dist, 0, "same coordinates = 0 km");
    });

    QUnit.test("Berlin to Munich is approximately 504 km", function (assert) {
        var oMunich = { lat: 48.137, lng: 11.576 };
        var dist = MapMixin._calculateDistanceKm(USER_LOC, oMunich);
        assert.ok(dist > 490 && dist < 520, "Berlin→Munich ≈ 504 km (got " + dist.toFixed(1) + ")");
    });

    QUnit.test("returns 999 when first point is null", function (assert) {
        var dist = MapMixin._calculateDistanceKm(null, USER_LOC);
        assert.strictEqual(dist, 999, "null oA returns 999");
    });

    QUnit.test("returns 999 when second point is null", function (assert) {
        var dist = MapMixin._calculateDistanceKm(USER_LOC, null);
        assert.strictEqual(dist, 999, "null oB returns 999");
    });

    QUnit.test("nearby provider (< 1 km) returns small distance", function (assert) {
        var oNearby = { lat: 52.521, lng: 13.406 };
        var dist = MapMixin._calculateDistanceKm(USER_LOC, oNearby);
        assert.ok(dist < 1, "nearby point is < 1 km (got " + dist.toFixed(3) + ")");
    });

    // ── _isAvailableNow ───────────────────────────────────────────────────────

    QUnit.module("MapMixin — _isAvailableNow");

    QUnit.test("all_day always returns true", function (assert) {
        assert.ok(MapMixin._isAvailableNow("all_day"), "all_day → true");
    });

    QUnit.test("all_day in comma-separated list returns true", function (assert) {
        assert.ok(MapMixin._isAvailableNow("weekdays,all_day,morning"), "contains all_day → true");
    });

    QUnit.test("empty string returns false", function (assert) {
        assert.notOk(MapMixin._isAvailableNow(""), "empty string → false");
    });

    QUnit.test("null/undefined returns false", function (assert) {
        assert.notOk(MapMixin._isAvailableNow(null), "null → false");
        assert.notOk(MapMixin._isAvailableNow(undefined), "undefined → false");
    });

    QUnit.test("morning matches hour 6–11", function (assert) {
        // Test with a date we control by checking logic with known hours
        // We mock Date by checking the implementation: morning = hour >= 6 && hour < 12
        // Since we can't mock Date.getHours() cleanly, we verify the logic boundary
        // by checking that if today IS morning, "morning" returns true
        var iHour = new Date().getHours();
        var bIsMorning = iHour >= 6 && iHour < 12;
        var result = MapMixin._isAvailableNow("morning");
        assert.strictEqual(result, bIsMorning, "morning matches current hour " + iHour);
    });

    QUnit.test("afternoon matches hour 12–16", function (assert) {
        var iHour = new Date().getHours();
        var bIsAfternoon = iHour >= 12 && iHour < 17;
        var result = MapMixin._isAvailableNow("afternoon");
        assert.strictEqual(result, bIsAfternoon, "afternoon matches current hour " + iHour);
    });

    QUnit.test("evening matches hour 17–21", function (assert) {
        var iHour = new Date().getHours();
        var bIsEvening = iHour >= 17 && iHour < 22;
        var result = MapMixin._isAvailableNow("evening");
        assert.strictEqual(result, bIsEvening, "evening matches current hour " + iHour);
    });

    QUnit.test("weekdays matches Mon–Fri only", function (assert) {
        var iDay = new Date().getDay();
        var bIsWeekday = iDay >= 1 && iDay <= 5;
        // weekdays with no time slot = time always matches, only day matters
        var result = MapMixin._isAvailableNow("weekdays");
        assert.strictEqual(result, bIsWeekday, "weekdays matches Mon–Fri (today day=" + iDay + ")");
    });

    QUnit.test("weekends matches Sat–Sun only", function (assert) {
        var iDay = new Date().getDay();
        var bIsWeekend = iDay === 0 || iDay === 6;
        var result = MapMixin._isAvailableNow("weekends");
        assert.strictEqual(result, bIsWeekend, "weekends matches Sat–Sun (today day=" + iDay + ")");
    });

    // ── formatPriceDisplay ────────────────────────────────────────────────────

    QUnit.module("MapMixin — formatPriceDisplay");

    // These asserted "EUR25/hr" and a "$" default, which predates the currency
    // symbol map in MapMixin — the app has shown symbols and defaulted to EUR
    // since then, so the tests were stale, not the code.
    QUnit.test("formats rate with the currency symbol", function (assert) {
        var result = MapMixin.formatPriceDisplay({ currency: "EUR", rate: 25 });
        assert.strictEqual(result, "\u20ac25/hr", "EUR renders as \u20ac25/hr");
    });

    QUnit.test("USD renders with its own symbol", function (assert) {
        var result = MapMixin.formatPriceDisplay({ currency: "USD", rate: 40 });
        assert.strictEqual(result, "$40/hr", "USD renders as $40/hr");
    });

    QUnit.test("defaults to EUR when currency missing", function (assert) {
        var result = MapMixin.formatPriceDisplay({ rate: 30 });
        assert.strictEqual(result, "\u20ac30/hr", "defaults to \u20ac30/hr");
    });

    QUnit.test("returns empty string for null provider", function (assert) {
        assert.strictEqual(MapMixin.formatPriceDisplay(null), "", "null \u2192 empty string");
    });

    QUnit.test("shows a dash for a provider with no rate set", function (assert) {
        assert.strictEqual(MapMixin.formatPriceDisplay({ rate: 0 }), "\u2014",
            "no rate \u2192 em dash, not \u20ac0/hr");
    });

    // ── formatAvailabilityStatus / formatAvailabilityState ────────────────────

    QUnit.module("MapMixin — formatAvailabilityStatus / formatAvailabilityState");

    QUnit.test("formatAvailabilityStatus returns 'Available' for all_day", function (assert) {
        var oCtx = Object.assign({}, MapMixin);
        var result = MapMixin.formatAvailabilityStatus.call(oCtx, { availability: "all_day" });
        assert.strictEqual(result, "Available", "all_day → Available");
    });

    QUnit.test("formatAvailabilityState returns 'Success' for all_day", function (assert) {
        var oCtx = Object.assign({}, MapMixin);
        var result = MapMixin.formatAvailabilityState.call(oCtx, { availability: "all_day" });
        assert.strictEqual(result, "Success", "all_day → Success");
    });

    QUnit.test("formatAvailabilityState returns 'None' for null provider", function (assert) {
        var oCtx = Object.assign({}, MapMixin);
        var result = MapMixin.formatAvailabilityState.call(oCtx, null);
        assert.strictEqual(result, "None", "null → None");
    });
});
