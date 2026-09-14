sap.ui.define([], function () {
    "use strict";

    return {
        API_BASE: "https://helphub-production.up.railway.app", // production URL
        // Where Contact Support sends mail. Kept here rather than inline in a
        // controller so it is changed in one place — note it ships in the client
        // and is therefore public, so use a support address, not a personal one.
        SUPPORT_EMAIL: "mujtabaahmed556@gmail.com",
        // Map tiles. Was tile.openstreetmap.org — a volunteer server whose usage
        // policy blocks apps that send no identifying User-Agent/Referer (the
        // Cordova WebView sends neither) and rate-limits the rest; the live site
        // started rendering 403 "Blocked" tiles. CARTO's OSM-based Voyager tiles
        // are key-free and allow this with attribution. One place to swap in a
        // keyed provider later.
        MAP_TILES: {
            url: "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
            attribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors &copy; <a href=\"https://carto.com/attributions\">CARTO</a>",
            subdomains: "abcd",
            maxZoom: 19
        }
    };
});
