sap.ui.define([], function () {
    "use strict";

    return {

        onOpenExpertFilters: function (oEvent) {
            var oButton = oEvent.getSource();
            if (!this._pExpertFiltersPopover) {
                var Fragment = sap.ui.require("sap/ui/core/Fragment");
                this._pExpertFiltersPopover = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "helphub.view.fragments.ExpertFiltersPopover",
                    controller: this
                }).then(function (oPopover) {
                    this.getView().addDependent(oPopover);
                    return oPopover;
                }.bind(this));
            }
            this._pExpertFiltersPopover.then(function (oPopover) {
                oPopover.openBy(oButton);
            });
        },

        formatExpertFilterLabel: function (iCount) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var sBase   = oBundle.getText("filterButton");
            return iCount > 0 ? sBase + " (" + iCount + ")" : sBase;
        },

        // Distance preset chips (5/10/25/50 km) — key is the radius in km.
        onDistancePreset: function (oEvent) {
            var iVal = parseInt(oEvent.getParameter("item").getKey(), 10);
            var oModel = this.getModel("appData");
            oModel.setProperty("/filters/distance", iVal);
            oModel.setProperty("/filters/distanceLabel", "Within " + iVal + " km");

            if (this._oRadiusCircle) {
                this._oRadiusCircle.setRadius(iVal * 1000);
            }

            this._refreshCurrentFilters();
        },

        // Quality SegmentedButton (All / Top rated / Budget) — reads the chosen item key.
        onPriceCategorySelect: function (oEvent) {
            var oItem = oEvent.getParameter("item");
            this.getModel("appData").setProperty("/filters/priceCategory", oItem.getKey());
            this._updateActiveFilterCount();
            this._refreshCurrentFilters();
        },

        // Availability Switch — reads the new on/off state directly.
        onAvailableNowSwitch: function (oEvent) {
            this.getModel("appData").setProperty("/filters/availableNow", oEvent.getParameter("state"));
            this._updateActiveFilterCount();
            this._refreshCurrentFilters();
        },

        // Language Select — key is a language code (EN/DE/…) or "" for any.
        onLanguageSelect: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            this.getModel("appData").setProperty("/filters/language", oItem ? oItem.getKey() : "");
            this._updateActiveFilterCount();
            this._refreshCurrentFilters();
        },

        onRatingFilter: function (oEvent) {
            var sRating = oEvent.getSource().data("rating");
            this.getModel("appData").setProperty("/filters/minRating", parseFloat(sRating));
            this._updateActiveFilterCount();
            this._refreshCurrentFilters();
        },

        onPriceFilterChange: function (oEvent) {
            var iVal = oEvent.getParameter("value");
            this.getModel("appData").setProperty("/filters/maxPrice", iVal);
            this._updateActiveFilterCount();
            this._refreshCurrentFilters();
        },


        _updateActiveFilterCount: function () {
            var oModel = this.getModel("appData");
            var oFilters = oModel.getProperty("/filters") || {};
            var iCount = 0;
            if (oFilters.priceCategory !== "all") iCount++;
            if (oFilters.availableNow) iCount++;
            if (oFilters.minRating > 0) iCount++;
            if (oFilters.maxPrice < 200) iCount++;
            if (oFilters.language) iCount++;
            oModel.setProperty("/filters/activeCount", iCount);
        },

        _refreshCurrentFilters: function () {
            var oModel = this.getModel("appData");
            var sCategory = oModel.getProperty("/selectedCategoryName");
            if (sCategory) {
                var aFiltered = this._applyFiltersForService(sCategory);
                oModel.setProperty("/filteredProviders", aFiltered);
                this._updateProviderMarkers(aFiltered);
            }
        },

        _applyFiltersForService: function (sServiceName) {
            var oModel = this.getModel("appData");
            var aAll = oModel.getProperty("/providers") || [];
            var oFilters = oModel.getProperty("/filters") || {};
            // Fall back to Berlin centre when geolocation is unset, matching MapMixin —
            // otherwise every provider computes as 999 km and the distance filter is a no-op.
            var oUserLoc = oModel.getProperty("/user/location") || { lat: 52.52, lng: 13.405 };
            var that = this;

            var sQuery = (oModel.getProperty("/searchQuery") || "").toLowerCase();
            var fMinRating = parseFloat(oFilters.minRating) || 0;
            var sLangFilter = (oFilters.language || "").trim().toLowerCase();
            var iMaxPrice = parseFloat(oFilters.maxPrice);
            if (isNaN(iMaxPrice) || iMaxPrice >= 200) { iMaxPrice = Infinity; }
            var bAvailableNow = oFilters.availableNow;

            var aFiltered = aAll.filter(function (p) {
                var aCategories = (p.serviceType || '').split(',').map(function (s) { return s.trim(); });
                if (aCategories.indexOf(sServiceName) < 0) { return false; }

                var fDist = that._calculateDistanceKm(oUserLoc, { lat: p.lat, lng: p.lng });
                if (fDist > oFilters.distance) { return false; }

                if (oFilters.priceCategory === "budget" && p.rate > 25) { return false; }
                if (oFilters.priceCategory === "top" && p.rating < 4.8) { return false; }

                if (bAvailableNow && !that._isAvailableNow(p.availability)) { return false; }

                if (sQuery) {
                    var sName = (p.name || "").toLowerCase();
                    var sType = (p.serviceType || "").toLowerCase();
                    if (!sName.includes(sQuery) && !sType.includes(sQuery)) { return false; }
                }

                if (fMinRating > 0 && (!p.rating || p.rating < fMinRating)) { return false; }

                if (sLangFilter) {
                    var sProvLang = (p.languages || "").toLowerCase();
                    if (!sProvLang.includes(sLangFilter)) { return false; }
                }

                if (iMaxPrice < Infinity && p.rate > iMaxPrice) { return false; }

                return true;
            });

            if (!aFiltered.length) {
                aFiltered = aAll.filter(function (p) {
                    var aCategories = (p.serviceType || '').split(',').map(function (s) { return s.trim(); });
                    if (aCategories.indexOf(sServiceName) < 0) { return false; }
                    if (oFilters.priceCategory === "budget" && p.rate > 25) { return false; }
                    if (oFilters.priceCategory === "top" && p.rating < 4.8) { return false; }
                    if (bAvailableNow && !that._isAvailableNow(p.availability)) { return false; }
                    if (sQuery) {
                        var sName = (p.name || "").toLowerCase();
                        var sType = (p.serviceType || "").toLowerCase();
                        if (!sName.includes(sQuery) && !sType.includes(sQuery)) { return false; }
                    }
                    if (fMinRating > 0 && (!p.rating || p.rating < fMinRating)) { return false; }
                    if (sLangFilter) {
                        var sProvLang = (p.languages || "").toLowerCase();
                        if (!sProvLang.includes(sLangFilter)) { return false; }
                    }
                    if (iMaxPrice < Infinity && p.rate > iMaxPrice) { return false; }
                    return true;
                });
                oModel.setProperty("/filters/distanceLabel",
                    aFiltered.length
                        ? "No helpers within " + oFilters.distance + " km — showing all available helpers"
                        : "No helpers found for this category yet");
            }

            aFiltered.sort(function (a, b) {
                var da = that._calculateDistanceKm(oUserLoc, { lat: a.lat, lng: a.lng });
                var db = that._calculateDistanceKm(oUserLoc, { lat: b.lat, lng: b.lng });
                return da - db;
            });

            // Inject ad placeholders every 6th card for free users (max 4 per session)
            var sPlan = oModel.getProperty("/user/subscription_plan");
            if (sPlan !== "pro") {
                var iAdCount = 0, iAdMax = 4, aWithAds = [];
                aFiltered.forEach(function (p, i) {
                    aWithAds.push(p);
                    if ((i + 1) % 6 === 0 && iAdCount < iAdMax) {
                        aWithAds.push({ isAd: true });
                        iAdCount++;
                    }
                });
                return aWithAds;
            }

            return aFiltered;
        },

        onHelperSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("value") || "";
            this.getModel("appData").setProperty("/searchQuery", sQuery.trim().toLowerCase());
            this._refreshCurrentFilters();
        },

        onResetFilters: function () {
            var oModel = this.getModel("appData");
            oModel.setProperty("/filters/minRating", 0);
            oModel.setProperty("/filters/language", "");
            oModel.setProperty("/filters/maxPrice", 200);
            oModel.setProperty("/filters/priceCategory", "all");
            oModel.setProperty("/filters/availableNow", false);
            oModel.setProperty("/filters/activeCount", 0);
            this._refreshCurrentFilters();
        }

    };
});
