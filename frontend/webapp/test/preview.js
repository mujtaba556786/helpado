sap.ui.define([
    "sap/ui/core/ComponentContainer",
    "helphub/test/mockserver/MockServer"
], function (ComponentContainer, MockServer) {
    "use strict";
    // Local visual-review fixture. All API traffic uses the existing sample data.
    MockServer.start();
    new ComponentContainer({
        name: "helphub",
        manifest: true,
        async: true,
        height: "100%",
        width: "100%"
    }).placeAt("content");
});
