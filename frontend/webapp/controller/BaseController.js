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