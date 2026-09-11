sap.ui.define([
    "helphub/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/BusyDialog",
    "helphub/config",
    "helphub/model/models"
], function (BaseController, MessageToast, BusyDialog, Config, models) {
    "use strict";

    var API_BASE = Config.API_BASE;

    return BaseController.extend("helphub.controller.Login", {

        onInit: function () {
            this._oBusyDialog = new BusyDialog({ title: this.getResourceBundle().getText("pleaseWait") });
        },

        // ── Apply session data from backend response ────────────────────────────
        _applySession: function (oData) {
            var sAccessToken = oData.accessToken || oData.token;
            window.HelpHubStorage.set("helpmate_token", sAccessToken);
            if (oData.refreshToken) {
                window.HelpHubStorage.set("helphub_refresh_token", oData.refreshToken);
            }
            if (oData.user && oData.user.id) {
                window.HelpHubStorage.set("helpmate_user_id", String(oData.user.id));
            }

            var oModel = this.getModel("appData");
            var oUser  = oData.user || {};

            oModel.setProperty("/user/id",    oUser.id    || "");
            oModel.setProperty("/user/name",  oUser.name  || "");
            oModel.setProperty("/user/email", oUser.email || "");
            var sAvatar = oUser.avatar || "";
            if (sAvatar && sAvatar.startsWith("/uploads/")) sAvatar = API_BASE + sAvatar;
            oModel.setProperty("/user/photo", sAvatar);
            var sInitials = (oUser.name || "?")
                .split(" ").filter(Boolean)
                .map(function(w) { return w[0]; })
                .join("").substring(0, 2).toUpperCase();
            oModel.setProperty("/user/initials", sInitials);
            oModel.setProperty("/user/bio",      oUser.bio       || "");
            oModel.setProperty("/user/phone",    oUser.phone     || "");
            oModel.setProperty("/user/languages", oUser.languages || "");
            oModel.setProperty("/user/years",    oUser.years     || 0);
            oModel.setProperty("/user/rate",     oUser.rate      || 0);
            var aAvail = (oUser.availability || "").split(",").filter(Boolean);
            oModel.setProperty("/user/availability", aAvail);
            oModel.setProperty("/user/serviceCategories",(oUser.service_categories || "").split(",").filter(Boolean));

            oModel.setProperty("/user/availabilityFlags", models.availabilityFlags(aAvail));

            oModel.setProperty("/user/address/street",      oUser.street_name   || "");
            oModel.setProperty("/user/address/houseNumber", oUser.street_number || "");
            oModel.setProperty("/user/address/city",        oUser.city          || "");
            oModel.setProperty("/user/address/state",       oUser.state         || "");
            oModel.setProperty("/user/address/country",     oUser.country       || "");
            oModel.setProperty("/user/address/postalCode",  oUser.pincode       || "");
            oModel.setProperty("/user/terms_accepted_at",  oUser.terms_accepted_at || null);
            oModel.setProperty("/user/trust_level",        oUser.trust_level   || "new_user");
            oModel.setProperty("/user/trust_score",        oUser.trust_score   || 0);

            oModel.setProperty("/isLoggedIn", true);

            MessageToast.show(this.getResourceBundle().getText("loginWelcome", [oUser.name || ""]));
            // Replace (not push) so the Back button can't return to the login page.
            this.navTo("dashboard", {}, true);
        },

        // ── Send magic link to email ───────────────────────────────────────────
        onSendMagicLink: function () {
            var sEmail = this.byId("emailInput").getValue().trim();
            if (!sEmail) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("loginErrNoEmail"));
                return;
            }

            var that = this;
            this._oBusyDialog.open();

            // 20-second hard timeout — prevents BusyDialog getting stuck if
            // SMTP is misconfigured on the server and nodemailer hangs.
            var oAbort   = new AbortController();
            var oTimeout = setTimeout(function() { oAbort.abort(); }, 20000);

            fetch(API_BASE + "/api/auth/send-magic-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: sEmail }),
                signal: oAbort.signal
            })
            .then(function(r) { clearTimeout(oTimeout); return r.json(); })
            .then(function(oData) {
                that._oBusyDialog.close();
                if (!oData.success) {
                    MessageToast.show(oData.error || "Could not send link. Try again.");
                    return;
                }
                if (oData.directLogin) {
                    // The server listed this address in TEST_AUTO_LOGIN_EMAILS and
                    // signed us in without sending anything. Only reachable while
                    // that variable is deliberately set.
                    that._applySession(oData);
                    return;
                }
                // Link + 6-digit code emailed. Show the "check inbox / enter code"
                // step. Ordinary logins have no shortcut — they prove ownership of
                // the address via the link or the code.
                that._pendingEmail = sEmail;
                that.byId("stepEmail").setVisible(false);
                that.byId("stepLinkSent").setVisible(true);
                var sHint = that.getResourceBundle().getText("loginLinkSentHint", [sEmail]);
                that.byId("linkSentHint").setText(sHint);
            })
            .catch(function(err) {
                clearTimeout(oTimeout);
                that._oBusyDialog.close();
                var sMsg = (err && err.name === "AbortError")
                    ? "Request timed out — please try again."
                    : "Could not reach the server. Please try again.";
                MessageToast.show(sMsg);
            });
        },

        // ── Resend magic link to same email ───────────────────────────────────
        onResendMagicLink: function () {
            this.byId("linkSentHint").setText("");
            this.onSendMagicLink();
        },

        // ── Back to email step ─────────────────────────────────────────────────
        onBackToEmail: function () {
            this.byId("stepLinkSent").setVisible(false);
            this.byId("stepEmail").setVisible(true);
        },

        // ── Verify 6-digit code from email (works on web + mobile app) ──────────
        onVerifyOtp: function () {
            var sCode  = this.byId("otpInput").getValue().trim();
            var sEmail = this._pendingEmail || this.byId("emailInput").getValue().trim();
            if (!/^\d{6}$/.test(sCode)) {
                MessageToast.show(this.getResourceBundle().getText("loginCodeInvalid"));
                return;
            }

            var that = this;
            this._oBusyDialog.open();

            fetch(API_BASE + "/api/auth/verify-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: sEmail, code: sCode })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                that._oBusyDialog.close();
                if (oData.success) {
                    that._applySession(oData);
                } else {
                    MessageToast.show(oData.error || that.getResourceBundle().getText("loginCodeInvalid"));
                }
            })
            .catch(function() {
                that._oBusyDialog.close();
                MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer"));
            });
        }
    });
});
