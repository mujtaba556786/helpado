sap.ui.define([
    "helphub/model/models"
], function (models) {
    "use strict";

    QUnit.module("model/models");

    // ── createDeviceModel ─────────────────────────────────────────────────────

    QUnit.test("createDeviceModel returns a JSONModel", function (assert) {
        var oModel = models.createDeviceModel();
        assert.ok(oModel, "model is defined");
        assert.ok(oModel.isA("sap.ui.model.json.JSONModel"), "is a JSONModel");
    });

    QUnit.test("createDeviceModel uses OneWay binding", function (assert) {
        var oModel = models.createDeviceModel();
        assert.strictEqual(
            oModel.getDefaultBindingMode(),
            sap.ui.model.BindingMode.OneWay,
            "binding mode is OneWay"
        );
    });

    // ── createAppDataModel ────────────────────────────────────────────────────

    QUnit.test("createAppDataModel returns a JSONModel", function (assert) {
        var oModel = models.createAppDataModel();
        assert.ok(oModel, "model is defined");
        assert.ok(oModel.isA("sap.ui.model.json.JSONModel"), "is a JSONModel");
    });

    QUnit.test("createAppDataModel has isLoggedIn = false by default", function (assert) {
        var oModel = models.createAppDataModel();
        assert.strictEqual(oModel.getProperty("/isLoggedIn"), false, "not logged in initially");
    });

    QUnit.test("createAppDataModel has user object with expected keys", function (assert) {
        var oModel = models.createAppDataModel();
        var oUser = oModel.getProperty("/user");
        assert.ok(oUser, "user property exists");
        assert.strictEqual(typeof oUser.id, "string", "user.id is a string");
        assert.strictEqual(typeof oUser.name, "string", "user.name is a string");
        assert.ok(oUser.location, "user.location exists");
        assert.ok(typeof oUser.availabilityFlags === "object", "availabilityFlags exists");
    });

    QUnit.test("createAppDataModel has non-empty services array", function (assert) {
        var oModel = models.createAppDataModel();
        var aServices = oModel.getProperty("/services");
        assert.ok(Array.isArray(aServices), "services is an array");
        assert.ok(aServices.length > 0, "services has entries");
    });

    QUnit.test("createAppDataModel has non-empty providers array", function (assert) {
        var oModel = models.createAppDataModel();
        var aProviders = oModel.getProperty("/providers");
        assert.ok(Array.isArray(aProviders), "providers is an array");
        assert.ok(aProviders.length > 0, "providers has entries");
    });

    QUnit.test("createAppDataModel has filters with correct defaults", function (assert) {
        var oModel = models.createAppDataModel();
        var oFilters = oModel.getProperty("/filters");
        assert.strictEqual(oFilters.distance, 10, "default distance is 10 km");
        assert.strictEqual(oFilters.priceCategory, "all", "default priceCategory is all");
        assert.strictEqual(oFilters.minRating, 0, "default minRating is 0");
        assert.strictEqual(oFilters.maxPrice, 200, "default maxPrice is 200");
        assert.strictEqual(oFilters.availableNow, false, "availableNow is false by default");
    });

    QUnit.test("createAppDataModel has empty tasks, bookings and conversations", function (assert) {
        var oModel = models.createAppDataModel();
        assert.ok(Array.isArray(oModel.getProperty("/tasksFeed")), "tasksFeed is array");
        assert.ok(Array.isArray(oModel.getProperty("/upcomingBookings")), "upcomingBookings is array");
        assert.ok(Array.isArray(oModel.getProperty("/conversations")), "conversations is array");
    });
    QUnit.test("Messages start with one empty state before any API response", function (assert) {
        var model = models.createAppDataModel();
        ["Pinned", "Today", "Yesterday", "Earlier"].forEach(function (group) {
            assert.strictEqual(model.getProperty("/msg" + group + "Visible"), false, group + " starts hidden");
            assert.deepEqual(model.getProperty("/msg" + group), [], group + " starts empty");
        });
        assert.strictEqual(model.getProperty("/msgEmptyNoConvos"), true, "Empty state is initialized");
        assert.strictEqual(model.getProperty("/msgEmptySearch"), false, "Search empty state is not shown initially");
        model.destroy();
    });

    // The profile availability buttons highlight off these flags. The server sends
    // a comma string, so a missed derivation shows every button unselected even
    // though the selection was saved — which is exactly what happened on reopen.
    QUnit.module("models.availabilityFlags");

    QUnit.test("Derives flags from the comma string the server stores", function (assert) {
        var oFlags = models.availabilityFlags("weekdays,morning,evening");
        assert.strictEqual(oFlags.weekdays, true,  "weekdays is on");
        assert.strictEqual(oFlags.morning,  true,  "morning is on");
        assert.strictEqual(oFlags.evening,  true,  "evening is on");
        assert.strictEqual(oFlags.weekends, false, "weekends stays off");
        assert.strictEqual(oFlags.night,    false, "night stays off");
        assert.strictEqual(oFlags.all_day,  false, "all_day stays off");
    });

    QUnit.test("Accepts the array form the model already holds", function (assert) {
        var oFlags = models.availabilityFlags(["weekends", "night"]);
        assert.strictEqual(oFlags.weekends, true,  "weekends is on");
        assert.strictEqual(oFlags.night,    true,  "night is on");
        assert.strictEqual(oFlags.morning,  false, "morning stays off");
    });

    QUnit.test("all_day round-trips, since the toggle stores it alongside the rest", function (assert) {
        var oFlags = models.availabilityFlags("all_day,weekdays,weekends,morning,afternoon,evening,night");
        Object.keys(oFlags).forEach(function (sKey) {
            assert.strictEqual(oFlags[sKey], true, sKey + " is on");
        });
    });

    QUnit.test("Empty, null and unknown keys yield all-false rather than throwing", function (assert) {
        [undefined, null, "", [], "nonsense,keys"].forEach(function (vInput) {
            var oFlags = models.availabilityFlags(vInput);
            assert.strictEqual(Object.keys(oFlags).length, 7, "always returns all 7 flags");
            var bAnyOn = Object.keys(oFlags).some(function (k) { return oFlags[k]; });
            assert.strictEqual(bAnyOn, false, "nothing is switched on for " + JSON.stringify(vInput));
        });
    });

    QUnit.test("Tolerates the spaces a hand-edited value can carry", function (assert) {
        var oFlags = models.availabilityFlags("weekdays, morning");
        assert.strictEqual(oFlags.weekdays, true, "weekdays is on");
        assert.strictEqual(oFlags.morning,  true, "morning survives the leading space");
    });
});
