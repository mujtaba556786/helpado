sap.ui.define([
    "sap/m/MessageToast",
    "sap/ui/core/Fragment",
    "helphub/config"
], function (MessageToast, Fragment, Config) {
    "use strict";

    var API_BASE = Config.API_BASE;

    /**
     * In-app feedback (Settings → Support → "Give feedback"): idea / problem /
     * praise plus free text, posted to /api/feedback. The sender is the token's
     * user; app build and platform ride along so a "problem" can be matched to
     * the version it happened on. Nothing here is shown to other users.
     */
    return {

        onOpenFeedback: function () {
            var oModel = this.getModel("appData");
            oModel.setProperty("/feedback", { type: "idea", message: "" });
            this._getFeedbackDialog().then(function (oDialog) { oDialog.open(); });
        },

        onSubmitFeedback: function () {
            var oBundle   = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oFeedback = this.getModel("appData").getProperty("/feedback") || {};
            var sMessage  = (oFeedback.message || "").trim();

            if (sMessage.length < 3) {
                MessageToast.show(oBundle.getText("feedbackTooShort"));
                return;
            }

            this.apiFetch(API_BASE + "/api/feedback", {
                method: "POST",
                body: JSON.stringify({
                    type:      oFeedback.type || "idea",
                    message:   sMessage,
                    app_build: String(window._HH_BUILD || ""),
                    platform:  window.cordova ? "android" : "web"
                })
            })
            .then(function (oData) {
                if (oData.success) {
                    this._getFeedbackDialog().then(function (oDialog) { oDialog.close(); });
                    MessageToast.show(oBundle.getText("feedbackSent"));
                } else {
                    MessageToast.show(oData.error || oBundle.getText("feedbackFailed"));
                }
            }.bind(this))
            .catch(function () {
                MessageToast.show(oBundle.getText("feedbackFailed"));
            });
        },

        onCloseFeedback: function () {
            this._getFeedbackDialog().then(function (oDialog) { oDialog.close(); });
        },

        _getFeedbackDialog: function () {
            if (!this._pFeedbackDialog) {
                this._pFeedbackDialog = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "helphub.view.fragments.FeedbackDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pFeedbackDialog;
        }
    };
});
