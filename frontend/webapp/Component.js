sap.ui.define([
    "sap/ui/core/UIComponent",
    "helphub/model/models",
    "helphub/config"
], (UIComponent, models, Config) => {
    "use strict";

    var API_BASE = Config.API_BASE; // TODO: replace with production URL before release

    // ── StorageHelper ──────────────────────────────────────────────────────────
    // Uses Cordova NativeStorage (iOS/Android) when available, falls back to
    // localStorage for browser/dev. Swap NativeStorage → cordova-plugin-secure-key-store
    // for encrypted Keychain/Keystore storage in production.
    // Synchronous mirror of the access token. StorageHelper.get is callback-based
    // (NativeStorage is async on Cordova), but the fetch wrapper below has to
    // attach the Authorization header synchronously, so every read and write of
    // the token keeps this in step.
    var _sAccessToken = null;
    try { _sAccessToken = localStorage.getItem("helpmate_token"); } catch (e) { /* ignore */ }

    var StorageHelper = {
        set: function(k, v) {
            if (k === "helpmate_token") { _sAccessToken = v; }
            if (window.NativeStorage) {
                window.NativeStorage.setItem(k, v, function() {}, function() {});
            } else {
                localStorage.setItem(k, v);
            }
        },
        get: function(k, cb) {
            function done(v) {
                if (k === "helpmate_token") { _sAccessToken = v; }
                cb(v);
            }
            if (window.NativeStorage) {
                window.NativeStorage.getItem(k, done, function() { done(null); });
            } else {
                done(localStorage.getItem(k));
            }
        },
        remove: function(k) {
            if (k === "helpmate_token") { _sAccessToken = null; }
            if (window.NativeStorage) {
                window.NativeStorage.remove(k, function() {}, function() {});
            } else {
                localStorage.removeItem(k);
            }
        },
        clear: function() {
            ["helpmate_token", "helphub_refresh_token", "helpmate_user_id"].forEach(function(k) {
                StorageHelper.remove(k);
            });
        }
    };

    return UIComponent.extend("helphub.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
            UIComponent.prototype.init.apply(this, arguments);

            // ── Authenticate every API call ────────────────────────────────────
            // The API used to take the caller's identity from the URL or request
            // body, so nothing needed a token. Now that it verifies a JWT, all 42
            // call sites need one — wrapping fetch once here does that without
            // touching each of them, and gives them refresh-on-401 too. Access
            // tokens last 15 minutes, so without the retry the app would start
            // failing a quarter of an hour into every session.
            if (!window.__hhFetchAuthPatched) {
                window.__hhFetchAuthPatched = true;
                var _fetch = window.fetch;

                function isApiCall(sUrl) {
                    return typeof sUrl === "string" &&
                        sUrl.indexOf("/api/") !== -1 &&
                        sUrl.indexOf("/api/auth/") === -1;
                }

                function withAuth(oInit, sToken) {
                    var oNext = Object.assign({}, oInit || {});
                    var oHeaders = Object.assign({}, (oInit && oInit.headers) || {});
                    // Never overwrite a header a caller set deliberately.
                    if (sToken && !oHeaders.Authorization && !oHeaders.authorization) {
                        oHeaders.Authorization = "Bearer " + sToken;
                    }
                    oNext.headers = oHeaders;
                    return oNext;
                }

                var pRefresh = null;   // shared so a burst of 401s refreshes once

                function refreshOnce() {
                    if (pRefresh) { return pRefresh; }
                    pRefresh = new Promise(function (resolve) {
                        StorageHelper.get("helphub_refresh_token", function (sRefresh) {
                            if (!sRefresh) { return resolve(null); }
                            _fetch(API_BASE + "/api/auth/refresh", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ refreshToken: sRefresh })
                            })
                            .then(function (r) { return r.json(); })
                            .then(function (d) {
                                if (d && d.success && d.accessToken) {
                                    StorageHelper.set("helpmate_token", d.accessToken);
                                    resolve(d.accessToken);
                                } else {
                                    StorageHelper.clear();
                                    resolve(null);
                                }
                            })
                            .catch(function () { resolve(null); });
                        });
                    }).then(function (sToken) {
                        pRefresh = null;
                        return sToken;
                    });
                    return pRefresh;
                }

                window.fetch = function (input, init) {
                    if (!isApiCall(input)) {
                        return _fetch.call(this, input, init);
                    }
                    var that = this;
                    return _fetch.call(that, input, withAuth(init, _sAccessToken))
                        .then(function (oRes) {
                            if (oRes.status !== 401) { return oRes; }
                            return refreshOnce().then(function (sToken) {
                                if (!sToken) { return oRes; }
                                return _fetch.call(that, input, withAuth(init, sToken));
                            });
                        });
                };
            }

            // Hide the bottom navigation bar whenever ANY dialog is open. Even a
            // full-screen (stretch) dialog was letting the fixed bottom nav show
            // through/underneath. Toggle a body class on Dialog open/close; CSS then
            // hides .hhBottomNav while a dialog is up. Counter handles stacked dialogs.
            sap.ui.require(["sap/m/Dialog", "sap/m/InstanceManager"], function (Dialog, InstanceManager) {
                // Patch the prototype once only. init() runs for every component
                // instance, so re-wrapping stacked wrappers each with their own
                // private counter.
                if (Dialog.prototype._hhNavTogglePatched) { return; }
                Dialog.prototype._hhNavTogglePatched = true;

                // Derive the state from the dialogs that are actually open rather
                // than from a counter. A dialog that is destroyed instead of closed
                // never ran close(), so the old counter never returned to zero and
                // the bottom nav stayed hidden until a reload. Destroyed instances
                // can linger in InstanceManager, so filter them out explicitly.
                function syncBottomNav() {
                    var bAnyOpen = InstanceManager.getOpenDialogs().some(function (oDialog) {
                        return oDialog && !oDialog.bIsDestroyed &&
                            typeof oDialog.isOpen === "function" && oDialog.isOpen();
                    });
                    document.body.classList.toggle("hhDialogOpen", bAnyOpen);
                }

                var fnOpen = Dialog.prototype.open;
                var fnExit = Dialog.prototype.exit;

                Dialog.prototype.open = function () {
                    // afterClose fires once the close animation has finished and the
                    // dialog has left InstanceManager — more reliable than wrapping
                    // close(), which runs before either happens.
                    this.attachEventOnce("afterClose", syncBottomNav);
                    var vResult = fnOpen.apply(this, arguments);
                    syncBottomNav();
                    return vResult;
                };

                Dialog.prototype.exit = function () {
                    var vResult = fnExit ? fnExit.apply(this, arguments) : undefined;
                    syncBottomNav();
                    return vResult;
                };
            });

            // Android hardware Back button (Cordova). Default behaviour popped the
            // router history back to the login page. Handle it: close an open
            // dialog/popover first, then step back within the in-app NavContainer,
            // and on the main page require a double-tap to exit — never navigate to login.
            sap.ui.require([
                "sap/m/InstanceManager", "sap/ui/core/Element", "sap/m/MessageToast"
            ], function (InstanceManager, Element, MessageToast) {
                var iLastBack = 0;
                document.addEventListener("backbutton", function () {
                    if (InstanceManager.hasOpenDialog()) {
                        var aDlg = InstanceManager.getOpenDialogs();
                        aDlg[aDlg.length - 1].close();
                        return;
                    }
                    if (InstanceManager.hasOpenPopover()) {
                        InstanceManager.closeAllPopovers();
                        return;
                    }
                    var oNav = Element.registry.filter(function (el) {
                        return el.isA && el.isA("sap.m.NavContainer");
                    })[0];
                    if (oNav && oNav.getCurrentPage() &&
                        oNav.getCurrentPage().getId().indexOf("dashboardPage") === -1) {
                        oNav.back();
                        return;
                    }
                    var iNow = Date.now();
                    if (iNow - iLastBack < 2000) {
                        if (navigator.app && navigator.app.exitApp) { navigator.app.exitApp(); }
                    } else {
                        iLastBack = iNow;
                        MessageToast.show("Press back again to exit");
                    }
                }, false);
            });

            const oDeviceModel = models.createDeviceModel();
            this.setModel(oDeviceModel, "device");

            // Cordova WebView (the packaged APK) does not reliably report as a "phone",
            // so dialogs bound to stretch="{device>/system/phone}" stayed as floating
            // modals (bottom nav showing through, content clipped). Force phone mode once
            // Cordova is ready — deviceready always fires in the APK — and also on resize
            // for narrow non-Cordova viewports. setProperty re-evaluates the bindings, so
            // even already-loaded dialogs update.
            const forcePhone = function () {
                oDeviceModel.setProperty("/system/phone", true);
                oDeviceModel.setProperty("/system/desktop", false);
            };
            document.addEventListener("deviceready", forcePhone, false);
            const applyNarrow = function () {
                if (window.cordova || (window.innerWidth && window.innerWidth <= 820)) forcePhone();
            };
            applyNarrow();
            window.addEventListener("resize", applyNarrow);

            // Create appData BEFORE router so the magic-link flag is readable
            // by Login.view the moment the router renders it.
            const oAppData = models.createAppDataModel();
            this.setModel(oAppData, "appData");

            // Overwrite service icons with sap-icon:// paths regardless of what models.js cached
            var SERVICE_ICONS = {
                "Cleaning":     "sap-icon://home-share",
                "Gardening":    "sap-icon://tree",
                "Handyman":     "sap-icon://wrench",
                "Babysitting":  "sap-icon://group",
                "Elder Care":   "sap-icon://heart",
                "Pet Care":     "sap-icon://customer",
                "Transport":    "sap-icon://car-rental",
                "Groceries":    "sap-icon://basket",
                "Cooking":      "sap-icon://meal",
                "Massage":      "sap-icon://physical-activity",
                "Math Tuition": "sap-icon://education",
                "IT Support":   "sap-icon://laptop"
            };
            var aServices = oAppData.getProperty("/services") || [];
            aServices.forEach(function(s) {
                if (SERVICE_ICONS[s.name]) s.icon = SERVICE_ICONS[s.name];
            });
            oAppData.setProperty("/services", aServices);

            // Expose StorageHelper globally so all controllers can use it
            window.HelpHubStorage = StorageHelper;

            // ── Session check + magic-link pick-up (BEFORE router.initialize) ──
            // Always set magicLinkProcessing=true so the Login view shows a
            // "Resuming your session…" screen instead of flashing the email form
            // while the async token check runs. It is cleared to false as soon as
            // we know whether the user has a valid session or not.
            oAppData.setProperty("/magicLinkProcessing", true);

            var oUrlParams    = new URLSearchParams(window.location.search);
            var sMagicAccess  = oUrlParams.get("accessToken");
            var sMagicRefresh = oUrlParams.get("refreshToken");
            if (sMagicAccess) {
                StorageHelper.set("helpmate_token", sMagicAccess);
                if (sMagicRefresh) StorageHelper.set("helphub_refresh_token", sMagicRefresh);
                window.history.replaceState({}, "", window.location.pathname);
            }

            this.getRouter().initialize();

            var oRouter = this.getRouter();

            // ── Apply user data to model after successful auth ─────────────────
            function applyUser(u) {
                var sAvatar = u.avatar || "";
                if (sAvatar) {
                    if (sAvatar.indexOf("://") === -1) {
                        sAvatar = API_BASE + sAvatar;
                    } else if (sAvatar.indexOf("localhost") !== -1 || sAvatar.indexOf("127.0.0.1") !== -1) {
                        try { sAvatar = API_BASE + new URL(sAvatar).pathname; } catch(e) { sAvatar = ""; }
                    }
                }

                // Derive initials from the user's display name so the header
                // Avatar always shows something meaningful when no photo is set.
                var sName     = u.name || "";
                var sInitials = sName
                    .split(" ")
                    .filter(Boolean)
                    .map(function(p) { return p[0].toUpperCase(); })
                    .join("")
                    .substring(0, 2) || "?";

                oAppData.setProperty("/user/id",       u.id || "");
                oAppData.setProperty("/user/name",     sName);
                oAppData.setProperty("/user/email",    u.email || "");
                oAppData.setProperty("/user/photo",    sAvatar);
                oAppData.setProperty("/user/initials", sInitials);
                oAppData.setProperty("/user/bio",      u.bio       || "");
                oAppData.setProperty("/user/phone",    u.phone     || "");
                oAppData.setProperty("/user/languages", u.languages || "");
                oAppData.setProperty("/user/years",    u.years     || 0);
                oAppData.setProperty("/user/rate",     u.rate      || 0);
                oAppData.setProperty("/user/availability",      (u.availability       || "").split(",").filter(Boolean));
                oAppData.setProperty("/user/serviceCategories", (u.service_categories || "").split(",").filter(Boolean));
                oAppData.setProperty("/user/address/street",      u.street_name   || "");
                oAppData.setProperty("/user/address/houseNumber", u.street_number || "");
                oAppData.setProperty("/user/address/city",        u.city          || "");
                oAppData.setProperty("/user/address/state",       u.state         || "");
                oAppData.setProperty("/user/address/country",     u.country       || "");
                oAppData.setProperty("/user/address/postalCode",  u.pincode       || "");
                oAppData.setProperty("/user/role",           u.role          || "Customer");
                oAppData.setProperty("/user/terms_accepted_at", u.terms_accepted_at || "");
                oAppData.setProperty("/user/terms_version",     u.terms_version     || "");
                oAppData.setProperty("/isLoggedIn",           true);
                oAppData.setProperty("/magicLinkProcessing", false);
                oRouter.navTo("dashboard", {}, true);
            }

            // ── Try silent refresh when access token is expired ────────────────
            function trySilentRefresh() {
                StorageHelper.get("helphub_refresh_token", function(sRefresh) {
                    if (!sRefresh) {
                        StorageHelper.clear();
                        oAppData.setProperty("/magicLinkProcessing", false);
                        return;
                    }
                    fetch(API_BASE + "/api/auth/refresh", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ refreshToken: sRefresh })
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(d) {
                        if (d.success && d.accessToken) {
                            StorageHelper.set("helpmate_token", d.accessToken);
                            // Retry /me with new token
                            return fetch(API_BASE + "/api/auth/me", {
                                headers: { "Authorization": "Bearer " + d.accessToken }
                            }).then(function(r) { return r.json(); })
                              .then(function(oData) {
                                  if (oData.success) applyUser(oData.user);
                                  else {
                                      StorageHelper.clear();
                                      oAppData.setProperty("/magicLinkProcessing", false);
                                  }
                              });
                        }
                        StorageHelper.clear();
                        oAppData.setProperty("/magicLinkProcessing", false);
                    })
                    .catch(function() {
                        StorageHelper.clear();
                        oAppData.setProperty("/magicLinkProcessing", false);
                    });
                });
            }

            // ── Auto-login on app open ─────────────────────────────────────────
            StorageHelper.get("helpmate_token", function(sToken) {
                if (!sToken) {
                    oAppData.setProperty("/magicLinkProcessing", false);
                    return; // no session — stay on login
                }
                fetch(API_BASE + "/api/auth/me", {
                    headers: { "Authorization": "Bearer " + sToken }
                })
                .then(function(r) {
                    if (r.status === 401) { trySilentRefresh(); return null; }
                    return r.json();
                })
                .then(function(oData) {
                    if (!oData || !oData.success) {
                        oAppData.setProperty("/magicLinkProcessing", false);
                        return;
                    }
                    applyUser(oData.user);
                })
                .catch(function() { trySilentRefresh(); });
            });

            // Geolocation
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(function(pos) {
                    oAppData.setProperty("/user/location", {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude
                    });
                });
            }
        }
    });
});