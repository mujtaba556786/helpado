sap.ui.define([], function () {
    "use strict";

    return {
        API_BASE: "https://helphub-production.up.railway.app", // production URL
        // Where Contact Support sends mail. Kept here rather than inline in a
        // controller so it is changed in one place — note it ships in the client
        // and is therefore public, so use a support address, not a personal one.
        SUPPORT_EMAIL: "mujtabaahmed556@gmail.com"
    };
});
