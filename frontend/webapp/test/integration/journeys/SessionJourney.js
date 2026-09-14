/**
 * OPA5 Journey — the saved session survives everything except the server
 * saying "no".
 *
 * Access tokens last 15 minutes, so nearly every app open refreshes. The old
 * boot code cleared BOTH tokens whenever the refresh call failed for any
 * reason — a rejected fetch (offline, weak mobile link), a 5xx, or Railway's
 * 502 HTML page mid-redeploy — so the next open showed the login screen and
 * sent another code email. Only a 401/403 from the server may end a session.
 */
sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "helphub/test/mockdata/data",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, MockData, MockServer) {
    "use strict";

    var CTX;   // cheap way to reach the running component's appData model

    QUnit.module("Session — kept through network errors, ended only by the server", {
        before: function () {
            MockServer.start();
            window.__hhBootRetryMs = [50, 50, 50];   // 3 quick retries instead of 2s/4s/8s
        },
        beforeEach: function () { MockServer.clearOverrides(); },
        after: function () {
            MockServer.clearOverrides();
            delete window.__hhBootRetryMs;
            MockServer.stop();
        }
    });

    function tokensInStorage() {
        return { access: localStorage.getItem("helpmate_token"), refresh: localStorage.getItem("helphub_refresh_token") };
    }

    // Waits until Component.js has finished its auto-login attempt, i.e.
    // /magicLinkProcessing went back to false (or the user was applied).
    function whenBootSettled(Then, fnAssert) {
        Then.waitFor({
            controlType: "sap.ui.core.mvc.View",
            check: function (aViews) {
                var oModel = aViews[0] && aViews[0].getModel("appData");
                return !!oModel && oModel.getProperty("/magicLinkProcessing") === false;
            },
            success: function (aViews) { fnAssert(aViews[0].getModel("appData")); },
            errorMessage: "App never finished its auto-login attempt"
        });
    }

    opaTest("Server unreachable at open (network error): session is KEPT, login page shows, no logout", function (Given, When, Then) {
        localStorage.setItem("helpmate_token", MockData.ACCESS_TOKEN);
        localStorage.setItem("helphub_refresh_token", MockData.REFRESH_TOKEN);
        var iMeCalls = 0;
        MockServer.override("/api/auth/me",      function () { iMeCalls++; return MockServer.networkError(); });
        MockServer.override("/api/auth/refresh", function () { return MockServer.networkError(); });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        whenBootSettled(Then, function (oModel) {
            var o = tokensInStorage();
            Opa5.assert.strictEqual(o.refresh, MockData.REFRESH_TOKEN, "refresh token still in storage after the server could not be reached");
            Opa5.assert.strictEqual(o.access, MockData.ACCESS_TOKEN, "access token still in storage");
            Opa5.assert.ok(iMeCalls >= 4, "/me was retried with backoff before giving up (" + iMeCalls + " attempts)");
            Opa5.assert.ok(!oModel.getProperty("/user/id"), "no user applied — the app waits on the login page, session intact");
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Access token expired and the refresh answers 502 HTML (Railway mid-redeploy): session is KEPT", function (Given, When, Then) {
        localStorage.setItem("helpmate_token", MockData.ACCESS_TOKEN);
        localStorage.setItem("helphub_refresh_token", MockData.REFRESH_TOKEN);
        MockServer.override("/api/auth/me",      function () { return MockServer.respond({ success: false, error: "expired" }, 401); });
        MockServer.override("/api/auth/refresh", function () { return MockServer.respondHtml(502, "<html><body>Application failed to respond</body></html>"); });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        whenBootSettled(Then, function () {
            Opa5.assert.strictEqual(tokensInStorage().refresh, MockData.REFRESH_TOKEN, "a 502 with an HTML body does not end the session");
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Access token expired and the refresh answers 500 JSON: session is KEPT", function (Given, When, Then) {
        localStorage.setItem("helpmate_token", MockData.ACCESS_TOKEN);
        localStorage.setItem("helphub_refresh_token", MockData.REFRESH_TOKEN);
        MockServer.override("/api/auth/me",      function () { return MockServer.respond({ success: false }, 401); });
        MockServer.override("/api/auth/refresh", function () { return MockServer.respond({ success: false, error: "db down" }, 500); });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        whenBootSettled(Then, function () {
            Opa5.assert.strictEqual(tokensInStorage().refresh, MockData.REFRESH_TOKEN, "a 5xx does not end the session");
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("The server rejects the refresh token (401): session is CLEARED — the one case that must log out", function (Given, When, Then) {
        localStorage.setItem("helpmate_token", MockData.ACCESS_TOKEN);
        localStorage.setItem("helphub_refresh_token", MockData.REFRESH_TOKEN);
        MockServer.override("/api/auth/me",      function () { return MockServer.respond({ success: false }, 401); });
        MockServer.override("/api/auth/refresh", function () { return MockServer.respond({ success: false, error: "Refresh token revoked or expired" }, 401); });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        whenBootSettled(Then, function () {
            var o = tokensInStorage();
            Opa5.assert.strictEqual(o.refresh, null, "refresh token removed after the server refused it");
            Opa5.assert.strictEqual(o.access, null, "access token removed too");
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Access token expired and the refresh succeeds: signed in without any code", function (Given, When, Then) {
        localStorage.setItem("helpmate_token", "stale-access-token");
        localStorage.setItem("helphub_refresh_token", MockData.REFRESH_TOKEN);
        MockServer.override("/api/auth/me", function (sUrl, oOpts) {
            var sAuth = (oOpts && oOpts.headers && oOpts.headers.Authorization) || "";
            return sAuth.indexOf("stale-access-token") >= 0
                ? MockServer.respond({ success: false }, 401)
                : MockServer.respond({ success: true, user: MockData.USER });
        });

        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });

        Then.waitFor({
            controlType: "sap.ui.core.mvc.View",
            check: function (aViews) {
                var oModel = aViews[0] && aViews[0].getModel("appData");
                return !!oModel && oModel.getProperty("/user/id") === MockData.USER.id;
            },
            success: function () {
                Opa5.assert.strictEqual(localStorage.getItem("helpmate_token"), MockData.ACCESS_TOKEN, "new access token stored from the refresh");
                Opa5.assert.strictEqual(localStorage.getItem("helphub_refresh_token"), MockData.REFRESH_TOKEN, "refresh token kept");
            },
            errorMessage: "User was not signed in after a successful refresh"
        });
        Then.iTeardownMyUIComponent();
    });
});
