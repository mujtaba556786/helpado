sap.ui.define([
    "helphub/controller/mixins/FilterMixin",
    "helphub/controller/mixins/MapMixin",
    "helphub/test/mockdata/data"
], function (FilterMixin, MapMixin, MockData) {
    "use strict";

    var USER_LOC = { lat: 52.520, lng: 13.405 };

    // Default filter state
    var DEFAULT_FILTERS = {
        distance: 50,          // wide radius so distance never excludes
        priceCategory: "all",
        minRating: 0,
        maxPrice: 200,
        availableNow: false,
        language: "",
        activeCount: 0
    };

    // Build a controller context with controllable model state
    function makeCtx(oOverrides) {
        var oFilters   = Object.assign({}, DEFAULT_FILTERS, oOverrides && oOverrides.filters);
        var aProviders = (oOverrides && oOverrides.providers) || MockData.PROVIDERS;
        var sQuery     = (oOverrides && oOverrides.searchQuery) || "";
        var sPlan      = (oOverrides && oOverrides.plan) || "free";

        return Object.assign({}, FilterMixin, MapMixin, {
            getModel: function () {
                return {
                    getProperty: function (sPath) {
                        if (sPath === "/providers")               { return aProviders; }
                        if (sPath === "/filters")                 { return oFilters; }
                        if (sPath === "/filters/distance")        { return oFilters.distance; }
                        if (sPath === "/user/location")           { return USER_LOC; }
                        if (sPath === "/searchQuery")             { return sQuery; }
                        if (sPath === "/user/subscription_plan")  { return sPlan; }
                        return null;
                    },
                    setProperty: function () {}
                };
            },
            _updateProviderMarkers: function () {}
        });
    }

    // Build 18 fake provider objects for a given category (enough to trigger 3 ad slots)
    function makeFakeProviders(sCategory, iCount) {
        var aList = [];
        for (var i = 0; i < iCount; i++) {
            aList.push({
                id: "fp" + i, name: "Helper " + i,
                serviceType: sCategory, service_categories: sCategory,
                lat: 52.520 + i * 0.001, lng: 13.405 + i * 0.001,
                rate: 15, rating: 4.5, availability: "all_day", languages: "EN",
                years: 1, subscription_plan: "free", featured_until: null
            });
        }
        return aList;
    }

    // ── _updateActiveFilterCount ──────────────────────────────────────────────

    QUnit.module("FilterMixin — _updateActiveFilterCount");

    QUnit.test("count is 0 for all defaults", function (assert) {
        var oCtx = makeCtx();
        var iCount = 0;
        oCtx.getModel = function () {
            return {
                getProperty: function () { return Object.assign({}, DEFAULT_FILTERS); },
                setProperty: function (sPath, val) { if (sPath === "/filters/activeCount") iCount = val; }
            };
        };
        FilterMixin._updateActiveFilterCount.call(oCtx);
        assert.strictEqual(iCount, 0, "no active filters = 0");
    });

    QUnit.test("count increments for each active filter", function (assert) {
        var iCount = 0;
        var oFilters = {
            priceCategory: "top",    // +1
            availableNow:  true,     // +1
            minRating:     4,        // +1
            maxPrice:      50,       // +1
            language:      "EN",     // +1
            activeCount:   0
        };
        var oCtx = {
            getModel: function () {
                return {
                    getProperty: function () { return oFilters; },
                    setProperty: function (sPath, val) { if (sPath === "/filters/activeCount") iCount = val; }
                };
            }
        };
        FilterMixin._updateActiveFilterCount.call(oCtx);
        assert.strictEqual(iCount, 5, "all 5 filters active = count 5");
    });

    QUnit.test("maxPrice 200 does NOT count as active", function (assert) {
        var iCount = 0;
        var oFilters = Object.assign({}, DEFAULT_FILTERS, { maxPrice: 200 });
        var oCtx = {
            getModel: function () {
                return {
                    getProperty: function () { return oFilters; },
                    setProperty: function (sPath, val) { if (sPath === "/filters/activeCount") iCount = val; }
                };
            }
        };
        FilterMixin._updateActiveFilterCount.call(oCtx);
        assert.strictEqual(iCount, 0, "maxPrice=200 is default, not counted");
    });

    // ── _applyFiltersForService ───────────────────────────────────────────────

    QUnit.module("FilterMixin — _applyFiltersForService");

    QUnit.test("returns only providers matching the service category", function (assert) {
        var oCtx = makeCtx();
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Gardening");
        var bAll = aResult.every(function (p) { return p.serviceType === "Gardening"; });
        assert.ok(aResult.length > 0, "at least one Gardening provider found");
        assert.ok(bAll, "all results are Gardening providers");
    });

    QUnit.test("returns empty array for unknown category", function (assert) {
        var oCtx = makeCtx();
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "ZZZ_UNKNOWN");
        assert.strictEqual(aResult.length, 0, "no results for unknown category");
    });

    QUnit.test("filters by minimum rating", function (assert) {
        var oCtx = makeCtx({ filters: { minRating: 5.0, distance: 50, priceCategory: "all", maxPrice: 200, availableNow: false, language: "" } });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Babysitting");
        aResult.forEach(function (p) {
            assert.ok(p.rating >= 5.0, p.name + " has rating >= 5.0");
        });
    });

    QUnit.test("filters by language", function (assert) {
        var oCtx = makeCtx({ filters: Object.assign({}, DEFAULT_FILTERS, { language: "DE" }) });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Gardening");
        aResult.forEach(function (p) {
            assert.ok(
                (p.languages || "").toLowerCase().indexOf("de") >= 0,
                p.name + " speaks DE"
            );
        });
    });

    QUnit.test("filters by maxPrice", function (assert) {
        var oCtx = makeCtx({ filters: Object.assign({}, DEFAULT_FILTERS, { maxPrice: 22, distance: 50 }) });
        var aAll = makeCtx().getModel().getProperty("/providers");
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Babysitting");
        aResult.forEach(function (p) {
            assert.ok(p.rate <= 22, p.name + " rate (" + p.rate + ") <= 22");
        });
    });

    QUnit.test("budget filter excludes providers with rate > 25", function (assert) {
        var aMixed = [
            { id: "bp1", name: "Cheap Cook",  serviceType: "Cooking", service_categories: "Cooking",
              lat: 52.520, lng: 13.405, rate: 20, rating: 4.5, availability: "all_day", languages: "EN",
              years: 1, subscription_plan: "pro", featured_until: null },
            { id: "bp2", name: "Pricey Cook", serviceType: "Cooking", service_categories: "Cooking",
              lat: 52.521, lng: 13.406, rate: 30, rating: 4.5, availability: "all_day", languages: "EN",
              years: 2, subscription_plan: "pro", featured_until: null }
        ];
        var oCtx = makeCtx({ providers: aMixed, plan: "pro",
            filters: Object.assign({}, DEFAULT_FILTERS, { priceCategory: "budget" }) });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Cooking");
        assert.ok(aResult.length > 0, "at least one budget provider returned");
        aResult.forEach(function (p) {
            assert.ok(p.rate <= 25, p.name + " rate is budget-friendly");
        });
    });

    QUnit.test("top-rated filter excludes providers with rating < 4.8", function (assert) {
        var oCtx = makeCtx({ filters: Object.assign({}, DEFAULT_FILTERS, { priceCategory: "top" }) });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Gardening");
        aResult.forEach(function (p) {
            assert.ok(p.rating >= 4.8, p.name + " rating >= 4.8");
        });
    });

    // A Bonn provider (~478 km from the Berlin USER_LOC) used across the distance tests.
    function makeBonnProvider() {
        return [{
            id: "bonn1", name: "Bonn Helper", serviceType: "Cleaning", service_categories: "Cleaning",
            lat: 50.7374, lng: 7.0982, rate: 20, rating: 4.5, availability: "all_day",
            languages: "EN", years: 1, subscription_plan: "pro", featured_until: null
        }];
    }

    QUnit.test("provider beyond the selected radius is excluded (no distance fallback)", function (assert) {
        var oCtx = makeCtx({ providers: makeBonnProvider(), plan: "pro",
            filters: Object.assign({}, DEFAULT_FILTERS, { distance: 50 }) });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Cleaning");
        assert.strictEqual(aResult.length, 0,
            "Bonn helper (~478 km) is NOT shown to a Berlin user at a 50 km radius");
    });

    QUnit.test("hard 100 km ceiling excludes very distant providers even at an unbounded radius", function (assert) {
        var oCtx = makeCtx({ providers: makeBonnProvider(), plan: "pro",
            filters: Object.assign({}, DEFAULT_FILTERS, { distance: 999 }) });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Cleaning");
        assert.strictEqual(aResult.length, 0,
            "Bonn helper excluded by the 100 km ceiling even with a 999 km selected radius");
    });

    QUnit.test("search query filters by provider name", function (assert) {
        var oCtx = makeCtx({ searchQuery: "sarah" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Gardening");
        assert.ok(
            aResult.some(function (p) { return p.name.toLowerCase().indexOf("sarah") >= 0; }),
            "Sarah appears in results"
        );
    });

    QUnit.test("results are sorted by distance ascending", function (assert) {
        var aMulti = [
            { id: "s1", name: "Near Gardener",  serviceType: "Gardening", service_categories: "Gardening",
              lat: 52.521, lng: 13.406, rate: 20, rating: 4.5, availability: "all_day", languages: "EN",
              years: 1, subscription_plan: "pro", featured_until: null },
            { id: "s2", name: "Mid Gardener",   serviceType: "Gardening", service_categories: "Gardening",
              lat: 52.530, lng: 13.415, rate: 22, rating: 4.6, availability: "all_day", languages: "EN",
              years: 2, subscription_plan: "pro", featured_until: null },
            { id: "s3", name: "Far Gardener",   serviceType: "Gardening", service_categories: "Gardening",
              lat: 52.560, lng: 13.440, rate: 25, rating: 4.7, availability: "all_day", languages: "EN",
              years: 3, subscription_plan: "pro", featured_until: null }
        ];
        var oCtx = makeCtx({ providers: aMulti, plan: "pro" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Gardening");
        assert.ok(aResult.length >= 2, "at least 2 results to compare distances");
        for (var i = 1; i < aResult.length; i++) {
            var d1 = MapMixin._calculateDistanceKm(USER_LOC, aResult[i - 1]);
            var d2 = MapMixin._calculateDistanceKm(USER_LOC, aResult[i]);
            assert.ok(d1 <= d2, "result[" + (i - 1) + "] is closer than result[" + i + "]");
        }
    });

    // ── Ad injection (free vs pro) ────────────────────────────────────────────

    QUnit.module("FilterMixin — ad injection");

    QUnit.test("free user: ad slot injected after every 6 providers", function (assert) {
        var aProviders = makeFakeProviders("Plumbing", 12);
        var oCtx = makeCtx({ providers: aProviders, plan: "free" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Plumbing");
        // 12 providers → 2 ad slots at positions 6 and 13 (0-indexed)
        assert.strictEqual(aResult[6].isAd,  true, "ad at index 6");
        assert.strictEqual(aResult[13].isAd, true, "ad at index 13");
        assert.strictEqual(aResult.filter(function (p) { return p.isAd; }).length, 2,
            "exactly 2 ads for 12 providers");
    });

    QUnit.test("free user: max 4 ad slots regardless of list length", function (assert) {
        var aProviders = makeFakeProviders("Plumbing", 30);
        var oCtx = makeCtx({ providers: aProviders, plan: "free" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Plumbing");
        var iAdCount = aResult.filter(function (p) { return p.isAd; }).length;
        assert.strictEqual(iAdCount, 4, "never more than 4 ads even with 30 providers");
    });

    QUnit.test("pro user: zero ad slots injected", function (assert) {
        var aProviders = makeFakeProviders("Plumbing", 12);
        var oCtx = makeCtx({ providers: aProviders, plan: "pro" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Plumbing");
        var iAdCount = aResult.filter(function (p) { return p.isAd; }).length;
        assert.strictEqual(iAdCount, 0, "pro users see zero ads");
    });

    QUnit.test("fewer than 6 providers: no ad slots injected", function (assert) {
        var aProviders = makeFakeProviders("Plumbing", 3);
        var oCtx = makeCtx({ providers: aProviders, plan: "free" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Plumbing");
        var iAdCount = aResult.filter(function (p) { return p.isAd; }).length;
        assert.strictEqual(iAdCount, 0, "3 providers → no ad slot");
    });

    QUnit.test("ad objects do not contain provider fields", function (assert) {
        var aProviders = makeFakeProviders("Plumbing", 6);
        var oCtx = makeCtx({ providers: aProviders, plan: "free" });
        var aResult = FilterMixin._applyFiltersForService.call(oCtx, "Plumbing");
        var oAd = aResult.find(function (p) { return p.isAd; });
        assert.ok(oAd, "ad slot present");
        assert.notOk(oAd.name,   "ad has no name field");
        assert.notOk(oAd.rating, "ad has no rating field");
    });
});
