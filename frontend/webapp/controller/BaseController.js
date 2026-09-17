sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/routing/History",
    "sap/ui/core/UIComponent"
], function (Controller, History, UIComponent) {
    "use strict";

    // Absorbs model calls after a controller's view is destroyed (e.g. OPA5 teardown race)
    var _oNullModel = { getProperty: function () { return null; }, setProperty: function () {}, refresh: function () {} };

    return Controller.extend("helphub.controller.BaseController", {
        /**
         * Convenience method for getting the router.
         * Using getOwnerComponent().getRouter() is the standard for Component-based apps.
         * @returns {sap.m.routing.Router} the router for this component
         */
        getRouter: function () {
            return this.getOwnerComponent().getRouter();
        },

        /**
         * Convenience method for getting the view model by name
         * @param {string} sName the model name
         * @returns {sap.ui.model.Model} the model instance
         */
        getModel: function (sName) {
            var oView = this.getView();
            if (!oView) { return _oNullModel; }
            var oComp = this.getOwnerComponent();
            return oView.getModel(sName) || (oComp && oComp.getModel(sName)) || _oNullModel;
        },

        /**
         * Convenience method for setting the view model
         * @param {sap.ui.model.Model} oModel the model instance
         * @param {string} sName the model name
         * @returns {sap.ui.mvc.View} the view instance
         */
        setModel: function (oModel, sName) {
            return this.getView().setModel(oModel, sName);
        },

        /**
         * Standard navigation method
         */
        navTo: function (psTarget, pmParameters, pbReplace) {
            this.getRouter().navTo(psTarget, pmParameters, pbReplace);
        },

        /**
         * Handles the back navigation logic
         */
        onNavBack: function () {
            var sPreviousHash = History.getInstance().getPreviousHash();

            if (sPreviousHash !== undefined) {
                window.history.go(-1);
            } else {
                this.getRouter().navTo("login", {}, true);
            }
        },

        /**
         * Authenticated fetch with automatic silent token refresh on 401.
         * On refresh failure, clears storage and redirects to login.
         *
         * @param {string} sUrl - Full URL to fetch
         * @param {object} [oOptions] - Standard fetch options (method, body, headers, etc.)
         * @returns {Promise<object>} Parsed JSON response
         */
        /**
         * Login.controller.js has always called this — on the main path, right
         * after the magic link is sent — but it was never defined, so it threw
         * and the .catch() below it reported "Could not reach the server." on a
         * send that had actually succeeded.
         */
        // Opens one of the static pages under /legal. Cordova gets the
        // InAppBrowser; the web build gets a Dialog with an iframe. Shared by
        // Dashboard (Settings → Legal) and Login (Impressum/Privacy footer),
        // since § 5 DDG needs the Impressum reachable before sign-in.
        _openLegalPage: function(sTitle, sPath) {
            // Absolute URLs pass through: /sicherheit is an Express route on the
            // server, not a bundled file, so the APK has to open it on API_BASE.
            var sUrl = /^https?:\/\//.test(sPath) ? sPath : window.location.origin + sPath;
            var that  = this;

            // ── Cordova InAppBrowser (when packaged with cordova-plugin-inappbrowser)
            if (window.cordova && window.cordova.InAppBrowser) {
                window.cordova.InAppBrowser.open(
                    sUrl, "_blank",
                    "location=no,toolbar=yes,toolbarcolor=#4FB584," +
                    "closebuttoncaption=Close,closebuttoncolor=#ffffff," +
                    "zoom=no,hardwareback=yes"
                );
                return;
            }

            // ── Web fallback: full-screen Dialog with iframe ──────────────────
            // Build the dialog once; on subsequent calls just swap the src.
            if (!this._oLegalDialog) {
                // Placeholder div — real iframe injected after dialog opens to
                // guarantee the element is in the DOM before src is assigned.
                this._oLegalWrap = new sap.ui.core.HTML({
                    content: '<div style="width:100%;height:100%;"></div>',
                    preferDOM: true          // keep the DOM node across re-renders
                });

                this._oLegalDialog = new sap.m.Dialog({
                    title: sTitle,
                    contentWidth: "92%",
                    contentHeight: "82%",
                    stretch: sap.ui.Device.system.phone,
                    verticalScrolling: false,
                    content: [this._oLegalWrap],
                    afterOpen: function() {
                        // First open: create the iframe and remember it
                        if (!that._oLegalFrameEl) {
                            var oWrap = that._oLegalWrap.getDomRef();
                            if (oWrap) {
                                var oFrame = document.createElement("iframe");
                                oFrame.style.cssText = "width:100%;height:100%;min-height:500px;border:none;display:block;";
                                oFrame.setAttribute("frameborder", "0");
                                oWrap.style.cssText = "width:100%;height:100%;";
                                oWrap.appendChild(oFrame);
                                that._oLegalFrameEl = oFrame;
                            }
                        }
                        // Always set/update src when the dialog opens
                        if (that._oLegalFrameEl) {
                            that._oLegalFrameEl.src = that._sPendingLegalUrl;
                        }
                    },
                    endButton: new sap.m.Button({
                        text: "Close",
                        press: function() { that._oLegalDialog.close(); }
                    })
                });

                this.getView().addDependent(this._oLegalDialog);
            }

            // Store the URL so afterOpen can read it (needed because afterOpen
            // fires asynchronously after open() is called).
            this._sPendingLegalUrl = sUrl;
            this._oLegalDialog.setTitle(sTitle);

            // If the dialog is already open (user switches Terms ↔ Privacy),
            // update the iframe src directly — no need to reopen.
            if (this._oLegalDialog.isOpen()) {
                if (this._oLegalFrameEl) { this._oLegalFrameEl.src = sUrl; }
                return;
            }

            this._oLegalDialog.open();
        },

        getResourceBundle: function () {
            return this.getOwnerComponent().getModel("i18n").getResourceBundle();
        },

        apiFetch: function (sUrl, oOptions) {
            var oRouter = this.getRouter();
            var that    = this;
            // Resolved lazily, and only on the expired-session path: `this` is not
            // the controller inside the callbacks below, and looking the bundle up
            // eagerly would make every API call depend on a component being
            // present — which it is not in the unit tests.
            function sessionExpiredText() {
                return that.getResourceBundle().getText("sessionExpiredShort");
            }
            oOptions = oOptions || {};

            function doFetch(sToken) {
                var oHeaders = Object.assign({ "Content-Type": "application/json" }, oOptions.headers || {});
                if (sToken) oHeaders["Authorization"] = "Bearer " + sToken;
                return fetch(sUrl, Object.assign({}, oOptions, { headers: oHeaders }));
            }

            return new Promise(function (resolve, reject) {
                window.HelpHubStorage.get("helpmate_token", function (sToken) {
                    doFetch(sToken)
                        .then(function (r) {
                            if (r.status !== 401) return resolve(r.json());

                            // Silent refresh
                            window.HelpHubStorage.get("helphub_refresh_token", function (sRefresh) {
                                if (!sRefresh) {
                                    window.HelpHubStorage.clear();
                                    sap.m.MessageToast.show(sessionExpiredText());
                                    oRouter.navTo("login", {}, true);
                                    return reject(new Error("Session expired"));
                                }
                                fetch(sUrl.replace(/\/api\/.*/, "") + "/api/auth/refresh", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ refreshToken: sRefresh })
                                })
                                .then(function (rr) { return rr.json(); })
                                .then(function (d) {
                                    if (d.success && d.accessToken) {
                                        window.HelpHubStorage.set("helpmate_token", d.accessToken);
                                        return doFetch(d.accessToken).then(function (r2) { resolve(r2.json()); });
                                    }
                                    window.HelpHubStorage.clear();
                                    sap.m.MessageToast.show(sessionExpiredText());
                                    oRouter.navTo("login", {}, true);
                                    reject(new Error("Refresh failed"));
                                })
                                .catch(function (e) {
                                    window.HelpHubStorage.clear();
                                    oRouter.navTo("login", {}, true);
                                    reject(e);
                                });
                            });
                        })
                        .catch(reject);
                });
            });
        }
    });
});