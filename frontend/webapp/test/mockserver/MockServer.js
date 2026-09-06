/**
 * MockServer — stubs window.fetch so all /api/* calls return mock data.
 * Used by OPA5 integration tests and any unit test that triggers a fetch.
 * The real backend does NOT need to be running.
 *
 * Key fixes vs the original:
 *  - /api/services now returns a plain Array (matching what
 *    Dashboard.controller._loadServicesFromApi expects via Array.isArray check).
 *  - Notification unread-count uses MockData.NOTIFICATIONS_UNREAD_COUNT.
 *  - Individual provider GET /api/providers/:id is handled.
 *  - DELETE /api/tasks/:id is handled.
 */
sap.ui.define([
    "helphub/test/mockdata/data"
], function (MockData) {
    "use strict";

    var _originalFetch = null;
    var _started = false;

    function makeResponse(body, status) {
        var sBody = JSON.stringify(body);
        return Promise.resolve({
            ok: (status || 200) < 300,
            status: status || 200,
            json: function () { return Promise.resolve(body); },
            text: function () { return Promise.resolve(sBody); }
        });
    }

    function matchUrl(url, pattern) {
        return url.indexOf(pattern) >= 0;
    }

    function handleFetch(url, options) {
        var sMethod = (options && options.method) ? options.method.toUpperCase() : "GET";
        var sUrl = url.toString();

        // ── Auth ──────────────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/auth/me")) {
            return makeResponse({ success: true, user: MockData.USER });
        }
        if (matchUrl(sUrl, "/api/auth/send-magic-link")) {
            // New flow: link + 6-digit code emailed, no tokens returned here.
            return makeResponse({ success: true, directLogin: false, message: "Sign-in link & code sent — check your inbox." });
        }
        if (matchUrl(sUrl, "/api/auth/verify-otp") || matchUrl(sUrl, "/api/auth/passwordless")) {
            return makeResponse({ success: true, user: MockData.USER, accessToken: MockData.ACCESS_TOKEN, refreshToken: MockData.REFRESH_TOKEN });
        }
        if (matchUrl(sUrl, "/api/auth/refresh")) {
            return makeResponse({ success: true, accessToken: MockData.ACCESS_TOKEN });
        }
        if (matchUrl(sUrl, "/api/auth/logout")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/auth/accept-terms")) {
            return makeResponse({ success: true, version: "1.0" });
        }

        // ── Home activity ─────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/home/activity")) {
            return makeResponse(MockData.HOME_ACTIVITY);
        }

        // ── Subscription ──────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/subscription/status")) {
            return makeResponse(MockData.SUBSCRIPTION_STATUS);
        }
        if (matchUrl(sUrl, "/api/subscription") && sMethod !== "GET") {
            return makeResponse({ success: true });
        }

        // ── Providers ─────────────────────────────────────────────────────────
        // Individual provider profile (must be checked before the broader match)
        if (matchUrl(sUrl, "/api/providers/") && sUrl.indexOf("/ratings") < 0) {
            // Extract the id segment so we can look up the right provider
            var sProviderId = decodeURIComponent(sUrl.split("/api/providers/")[1].split("?")[0].split("/")[0]);
            var oFound = MockData.PROVIDERS.filter(function (p) { return p.id === sProviderId; })[0];
            if (oFound) {
                return makeResponse({ success: true, provider: oFound });
            }
            return makeResponse({ success: false, error: "Provider not found" }, 404);
        }
        // Provider ratings
        if (matchUrl(sUrl, "/api/providers") && matchUrl(sUrl, "/ratings")) {
            return makeResponse({ success: true, ratings: MockData.RATINGS });
        }
        // Provider list — honour ?category= filter so hero-category tests work
        if (matchUrl(sUrl, "/api/providers")) {
            var sCategory = sUrl.indexOf("category=") >= 0
                ? decodeURIComponent(sUrl.split("category=")[1].split("&")[0])
                : null;
            var aProviders = sCategory
                ? MockData.PROVIDERS.filter(function (p) {
                    return (p.service_categories || "").indexOf(sCategory) >= 0;
                  })
                : MockData.PROVIDERS;
            return makeResponse({ success: true, providers: aProviders });
        }

        // ── Services ──────────────────────────────────────────────────────────
        // NOTE: Dashboard.controller._loadServicesFromApi expects a *plain array*
        // (it checks Array.isArray on the parsed body).  Return the array directly.
        if (matchUrl(sUrl, "/api/services")) {
            return makeResponse(MockData.SERVICES);
        }

        // ── Bookings ──────────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/bookings") && sMethod === "POST") {
            return makeResponse({ success: true, bookingId: "B_MOCK_" + Date.now() });
        }
        if (matchUrl(sUrl, "/api/bookings") && matchUrl(sUrl, "/mark-seen")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/bookings") && matchUrl(sUrl, "/status")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/bookings")) {
            return makeResponse({ success: true, bookings: MockData.BOOKINGS, newCount: MockData.BOOKINGS.filter(function (b) { return !b.is_seen; }).length });
        }

        // ── Notifications ─────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/unread-count") && matchUrl(sUrl, "/api/notifications")) {
            return makeResponse({ success: true, count: MockData.NOTIFICATIONS_UNREAD_COUNT });
        }
        if (matchUrl(sUrl, "/read-all")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/notifications") && matchUrl(sUrl, "/read") && sMethod === "PUT") {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/notifications")) {
            return makeResponse({ success: true, notifications: MockData.NOTIFICATIONS });
        }

        // ── Tasks ─────────────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/tasks") && sMethod === "POST" && !matchUrl(sUrl, "/apply") && !matchUrl(sUrl, "/assign") && !matchUrl(sUrl, "/status")) {
            return makeResponse({ success: true, taskId: "T_MOCK_" + Date.now() });
        }
        if (matchUrl(sUrl, "/api/tasks") && matchUrl(sUrl, "/apply")) {
            return makeResponse({ success: true, applicationId: "TA_MOCK" });
        }
        if (matchUrl(sUrl, "/api/tasks") && matchUrl(sUrl, "/assign")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/tasks") && matchUrl(sUrl, "/status") && sMethod === "PUT") {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/tasks") && sMethod === "DELETE") {
            return makeResponse({ success: true });
        }
        // Single task detail
        if (matchUrl(sUrl, "/api/tasks/")) {
            return makeResponse({ success: true, task: MockData.TASKS[0], applications: [] });
        }
        // Task list
        if (matchUrl(sUrl, "/api/tasks")) {
            return makeResponse({ success: true, tasks: MockData.TASKS });
        }

        // ── Messages / Conversations ──────────────────────────────────────────
        if (matchUrl(sUrl, "/api/conversations") && sMethod === "POST") {
            return makeResponse({ success: true, conversation: { id: "CONV_MOCK", participant_1: MockData.USER.id, participant_2: "p1" }, created: true });
        }
        if (matchUrl(sUrl, "/api/conversations")) {
            return makeResponse({ success: true, conversations: MockData.CONVERSATIONS, totalUnread: MockData.DM_UNREAD_COUNT });
        }
        if (matchUrl(sUrl, "/api/messages") && matchUrl(sUrl, "/read")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/messages") && matchUrl(sUrl, "unread-count")) {
            return makeResponse({ success: true, count: MockData.DM_UNREAD_COUNT });
        }
        if (matchUrl(sUrl, "/api/messages") && sMethod === "POST") {
            return makeResponse({ success: true, messageId: "DM_MOCK_" + Date.now() });
        }
        if (matchUrl(sUrl, "/api/messages")) {
            return makeResponse({ success: true, messages: [] });
        }

        // ── Ratings ───────────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/ratings")) {
            return makeResponse({ success: true, newAverage: 4.9 });
        }

        // ── Reports / Blocks ──────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/reports")) {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/users") && matchUrl(sUrl, "/block")) {
            return makeResponse({ success: true });
        }

        // ── Users ─────────────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/users") && matchUrl(sUrl, "/subscription") && sMethod === "PATCH") {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/users") && sMethod === "PUT") {
            return makeResponse({ success: true });
        }
        if (matchUrl(sUrl, "/api/users") && matchUrl(sUrl, "/avatar")) {
            return makeResponse({ success: true, avatarUrl: "/uploads/mock-avatar.jpg" });
        }
        if (matchUrl(sUrl, "/api/users") && matchUrl(sUrl, "/onboard")) {
            return makeResponse({ success: true, status: "Active" });
        }

        // ── Chat (SSE / AI) ───────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/chat")) {
            return makeResponse({ success: true, reply: "This is a mock AI response." });
        }

        // ── Push token ────────────────────────────────────────────────────────
        if (matchUrl(sUrl, "/api/notifications/device-token")) {
            return makeResponse({ success: true });
        }

        // Unknown — return 404
        console.warn("[MockServer] Unmatched request:", sMethod, sUrl);
        return makeResponse({ success: false, error: "Not found in mock" }, 404);
    }

    return {
        start: function () {
            if (_started) return;

            // Pre-seed localStorage so Component.js auto-login finds a token
            // and navigates to the dashboard instead of staying on login.
            localStorage.setItem("helpmate_token",        MockData.ACCESS_TOKEN);
            localStorage.setItem("helphub_refresh_token", MockData.REFRESH_TOKEN);
            localStorage.setItem("helpmate_user_id",      MockData.USER.id);
            // Suppress the first-run onboarding dialog so it never blocks OPA5.
            localStorage.setItem("hhOnboarded", "1");

            _originalFetch = window.fetch;
            window.fetch = function (url, options) {
                return handleFetch(url, options);
            };
            _started = true;
            jQuery && jQuery.sap && jQuery.sap.log
                ? jQuery.sap.log.info("[MockServer] Started — all /api/* calls mocked")
                : console.info("[MockServer] Started — all /api/* calls mocked");
        },

        stop: function () {
            if (!_started) return;
            window.fetch = _originalFetch;
            _originalFetch = null;
            localStorage.removeItem("helpmate_token");
            localStorage.removeItem("helphub_refresh_token");
            localStorage.removeItem("helpmate_user_id");
            localStorage.removeItem("hhOnboarded");
            _started = false;
        },

        isStarted: function () { return _started; }
    };
});
