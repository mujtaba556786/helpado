sap.ui.define([], function () {
    "use strict";

    return {

        _calculateDistanceKm: function (oA, oB) {
            if (!oA || !oB) { return 999; }
            var R = 6371;
            var dLat = (oB.lat - oA.lat) * Math.PI / 180;
            var dLon = (oB.lng - oA.lng) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(oA.lat * Math.PI / 180) * Math.cos(oB.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return R * c;
        },

        _initMap: function () {
            if (!window.L) return;

            var oModel = this.getModel("appData");
            var oUserLoc = oModel.getProperty("/user/location") || { lat: 52.52, lng: 13.405 };
            var iRadius = (oModel.getProperty("/filters/distance") || 10) * 1000;

            this._oMap = L.map("googleMap", { zoomControl: true }).setView(
                [oUserLoc.lat, oUserLoc.lng], 13
            );

            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
                maxZoom: 19
            }).addTo(this._oMap);

            this._oUserMarker = L.marker([oUserLoc.lat, oUserLoc.lng])
                .addTo(this._oMap)
                .bindPopup("<b>You are here</b>")
                .openPopup();

            this._oRadiusCircle = L.circle([oUserLoc.lat, oUserLoc.lng], {
                radius: iRadius,
                color: "#3b82f6",
                fillColor: "#3b82f6",
                fillOpacity: 0.08,
                weight: 2
            }).addTo(this._oMap);

            this._aProviderMarkers = [];

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (pos) {
                    var oRealLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    oModel.setProperty("/user/location", oRealLoc);
                    this._oMap.setView([oRealLoc.lat, oRealLoc.lng], 13);
                    this._oUserMarker.setLatLng([oRealLoc.lat, oRealLoc.lng]);
                    this._oRadiusCircle.setLatLng([oRealLoc.lat, oRealLoc.lng]);
                }.bind(this), function () {
                    // Permission denied or unavailable — keep Berlin default
                });
            }
        },

        _updateProviderMarkers: function (aProviders) {
            if (!this._oMap || !window.L) return;

            (this._aProviderMarkers || []).forEach(function (m) { m.remove(); });
            this._aProviderMarkers = [];

            var oModel = this.getModel("appData");
            var iRadius = (oModel.getProperty("/filters/distance") || 10) * 1000;
            if (this._oRadiusCircle) {
                this._oRadiusCircle.setRadius(iRadius);
            }

            (aProviders || []).forEach(function (p) {
                var oMarker = L.marker([p.lat, p.lng])
                    .addTo(this._oMap)
                    .bindPopup(
                        "<b>" + p.name + "</b><br>" +
                        (p.serviceType || "") + "<br>" +
                        this.formatCurrency(p.rate, p.currency) + "/hr • ⭐ " + (p.rating || "")
                    );
                this._aProviderMarkers.push(oMarker);
            }.bind(this));
        },

        _initTaskMap: function () {
            if (!window.L) return;
            if (!document.getElementById("taskMap")) return;
            var oModel = this.getModel("appData");
            var oUserLoc = oModel.getProperty("/user/location") || { lat: 52.52, lng: 13.405 };

            this._oTaskMap = L.map("taskMap", { zoomControl: true }).setView(
                [oUserLoc.lat, oUserLoc.lng], 13
            );
            L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                attribution: "© OpenStreetMap contributors",
                maxZoom: 19
            }).addTo(this._oTaskMap);

            L.marker([oUserLoc.lat, oUserLoc.lng])
                .addTo(this._oTaskMap)
                .bindPopup("<b>You are here</b>");

            this._aTaskMarkers = [];

            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function (pos) {
                    var oLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
                    oModel.setProperty("/user/location", oLoc);
                    this._oTaskMap.setView([oLoc.lat, oLoc.lng], 13);
                }.bind(this), function () { });
            }

            var aTasks = oModel.getProperty("/tasksFeed") || [];
            this._updateTaskMarkers(aTasks);

            setTimeout(function () {
                if (this._oTaskMap) { this._oTaskMap.invalidateSize(); }
            }.bind(this), 200);
        },

        _updateTaskMarkers: function (aTasks) {
            if (!this._oTaskMap || !window.L) return;
            (this._aTaskMarkers || []).forEach(function (m) { m.remove(); });
            this._aTaskMarkers = [];
            (aTasks || []).forEach(function (t) {
                if (!t.lat || !t.lng) return;
                var oMarker = L.marker([t.lat, t.lng])
                    .addTo(this._oTaskMap)
                    .bindPopup(
                        "<b>" + (t.title || "Task") + "</b><br>" +
                        (t.category || "") + "<br>" +
                        (t.budget ? "€" + t.budget : "Open budget") +
                        (t.location ? "<br>" + t.location : "")
                    );
                this._aTaskMarkers.push(oMarker);
            }.bind(this));
        },

        _isAvailableNow: function (sAvailability) {
            if (!sAvailability) return false;
            var aSlots = sAvailability.toLowerCase().split(",").map(function (s) { return s.trim(); });

            if (aSlots.indexOf("all_day") >= 0) return true;

            var now = new Date();
            var iHour = now.getHours();
            var iDay = now.getDay();
            var bWeekend = (iDay === 0 || iDay === 6);
            var bWeekday = !bWeekend;

            var bDayMatch = false;
            if (aSlots.indexOf("weekdays") >= 0 && bWeekday) bDayMatch = true;
            if (aSlots.indexOf("weekends") >= 0 && bWeekend) bDayMatch = true;
            if (aSlots.indexOf("weekdays") < 0 && aSlots.indexOf("weekends") < 0) bDayMatch = true;

            if (!bDayMatch) return false;

            var bTimeMatch = false;
            if (aSlots.indexOf("morning") >= 0 && iHour >= 6 && iHour < 12) bTimeMatch = true;
            if (aSlots.indexOf("afternoon") >= 0 && iHour >= 12 && iHour < 17) bTimeMatch = true;
            if (aSlots.indexOf("evening") >= 0 && iHour >= 17 && iHour < 22) bTimeMatch = true;
            if (aSlots.indexOf("night") >= 0 && (iHour >= 22 || iHour < 6)) bTimeMatch = true;
            if (aSlots.indexOf("morning") < 0 && aSlots.indexOf("afternoon") < 0 &&
                aSlots.indexOf("evening") < 0 && aSlots.indexOf("night") < 0) bTimeMatch = true;

            return bTimeMatch;
        },

        formatDistance: function (oProvider) {
            if (!oProvider || !oProvider.lat) return "Distance unknown";
            var oModel = this.getModel("appData");
            var userLoc = oModel ? oModel.getProperty("/user/location") : null;
            if (!userLoc) return "Calculating...";

            var R = 6371;
            var dLat = (oProvider.lat - userLoc.lat) * Math.PI / 180;
            var dLon = (oProvider.lng - userLoc.lng) * Math.PI / 180;
            var a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                Math.cos(userLoc.lat * Math.PI / 180) * Math.cos(oProvider.lat * Math.PI / 180) *
                Math.sin(dLon / 2) * Math.sin(dLon / 2);
            var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            return (R * c).toFixed(1) + " km away";
        },

        // Single source of truth for money. Providers store an ISO code
        // ("EUR"), which was being printed literally -> "EUR22/hr", and the
        // fallback was "$" on a euro-market app.
        CURRENCY_SYMBOLS: { EUR: "\u20ac", USD: "$", GBP: "\u00a3", CHF: "CHF\u00a0", TRY: "\u20ba" },

        formatCurrency: function (vAmount, sCode) {
            var sSym = this.CURRENCY_SYMBOLS[(sCode || "EUR").toUpperCase()] || "\u20ac";
            return sSym + (vAmount || 0);
        },

        formatPriceDisplay: function (oProvider) {
            if (!oProvider) return "";                    // nothing selected yet
            if (!oProvider.rate) return "\u2014";          // known helper, no rate set
            return this.formatCurrency(oProvider.rate, oProvider.currency) + "/hr";
        },

        formatAvailabilityStatus: function (oProvider) {
            if (!oProvider) return "";
            return this._isAvailableNow(oProvider.availability) ? "Available" : "Unavailable";
        },

        formatAvailabilityState: function (oProvider) {
            if (!oProvider) return "None";
            return this._isAvailableNow(oProvider.availability) ? "Success" : "None";
        }

    };
});
