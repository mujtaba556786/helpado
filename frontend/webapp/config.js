sap.ui.define([], function () {
    "use strict";

    return {
        API_BASE: "https://helphub-production.up.railway.app", // production URL
        // Where Contact Support sends mail. Kept here rather than inline in a
        // controller so it is changed in one place — note it ships in the client
        // and is therefore public, so use a support address, not a personal one.
        SUPPORT_EMAIL: "mujtabaahmed556@gmail.com",
        // Map tiles. Two providers have already been burned, and both fail the
        // same way — a placeholder IMAGE served with HTTP 200, so a status check
        // proves nothing; look at the pixels:
        //   - tile.openstreetmap.org serves a "403 Access blocked" tile (plus an
        //     x-blocked header) to Chrome-family user agents that send no
        //     Referer, which is what the Android WebView did.
        //   - CARTO's basemaps now need an API key and watermark every tile
        //     with "API KEY REQUIRED".
        // Esri's World Street Map is key-free, needs neither UA nor Referer,
        // and asks only for attribution. Note the {z}/{y}/{x} order.
        MAP_TILES: {
            url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}",
            attribution: "Tiles &copy; <a href=\"https://www.esri.com/\">Esri</a> &mdash; Esri, HERE, Garmin, FAO, NOAA, USGS, &copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors",
            maxZoom: 19
        }
    };
});
