sap.ui.define([
    "sap/m/MessageToast",
    "helphub/config"
], function(MessageToast, Config) {
    "use strict";

    var API_BASE = Config.API_BASE;

    return {

        _checkOnboarding: function() {
            if (!localStorage.getItem("hhOnboarded")) {
                var oModel = this.getModel("appData");
                oModel.setProperty("/onboarding/step", 1);
                oModel.setProperty("/onboarding/interests", []);
                this._getOnboardingDialog().then(function(d) {
                    d.open();
                    this._syncOnboardingButtons();
                }.bind(this));
            }
        },

        /**
         * Re-opens the first-login tour from Help & Info. Starts on step 2 ("How it
         * works") because that is the content people come back for; Welcome is one
         * Back-press away and Interests one Next-press away. Step 3 is pre-selected
         * from hhInterests so it shows what is currently saved instead of a blank
         * grid — the toggle buttons carry their state imperatively (setType), not
         * via binding, so the model alone would not light them up.
         */
        onOpenHowItWorks: function() {
            var oModel = this.getModel("appData");
            var aSaved = [];
            try {
                aSaved = JSON.parse(localStorage.getItem("hhInterests") || "[]") || [];
            } catch (e) { aSaved = []; }

            oModel.setProperty("/onboarding/step", 2);
            oModel.setProperty("/onboarding/interests", aSaved.slice());

            if (this.onCloseSettings) { this.onCloseSettings(); }

            this._getOnboardingDialog().then(function(d) {
                d.findAggregatedObjects(true, function(oCtrl) {
                    return oCtrl.isA("sap.m.Button") && oCtrl.data("interestKey") !== null;
                }).forEach(function(oBtn) {
                    oBtn.setType(aSaved.indexOf(oBtn.data("interestKey")) >= 0 ? "Emphasized" : "Default");
                });
                d.open();
                this._syncOnboardingButtons();
            }.bind(this));
        },

        onOnboardingNext: function() {
            var oModel = this.getModel("appData");
            var iStep  = oModel.getProperty("/onboarding/step");
            if (iStep < 3) {
                oModel.setProperty("/onboarding/step", iStep + 1);
                this._syncOnboardingButtons();
            } else {
                this._finishOnboarding();
            }
        },

        onOnboardingBack: function() {
            var oModel = this.getModel("appData");
            var iStep  = oModel.getProperty("/onboarding/step");
            if (iStep > 1) {
                oModel.setProperty("/onboarding/step", iStep - 1);
                this._syncOnboardingButtons();
            }
        },

        /**
         * Skip belongs to step 1 only, Back to steps 2-3. Set here rather than
         * bound in the fragment because `visible` expression bindings are not
         * applied to buttons in the Dialog `buttons` aggregation.
         */
        _syncOnboardingButtons: function() {
            var iStep = this.getModel("appData").getProperty("/onboarding/step");
            var oSkip = this.byId("onboardSkipBtn");
            var oBack = this.byId("onboardBackBtn");
            if (oSkip) { oSkip.setVisible(iStep === 1); }
            if (oBack) { oBack.setVisible(iStep > 1); }
        },

        onOnboardingSkip: function() {
            this._finishOnboarding();
        },

        _finishOnboarding: function() {
            localStorage.setItem("hhOnboarded", "1");
            var aInterests = this.getModel("appData").getProperty("/onboarding/interests") || [];
            if (aInterests.length) {
                localStorage.setItem("hhInterests", JSON.stringify(aInterests));
            }
            // Reorder the dashboard tiles straight away, otherwise picking
            // interests would have no visible effect until the next reload.
            this._applyInterestOrder();
            this._getOnboardingDialog().then(function(d) { d.close(); }.bind(this));
        },

        onToggleInterest: function(oEvent) {
            var oBtn   = oEvent.getSource();
            var sKey   = oBtn.data("interestKey");
            var oModel = this.getModel("appData");
            var aInterests = (oModel.getProperty("/onboarding/interests") || []).slice();
            var iIdx = aInterests.indexOf(sKey);
            if (iIdx >= 0) {
                aInterests.splice(iIdx, 1);
                oBtn.setType("Default");
            } else {
                aInterests.push(sKey);
                oBtn.setType("Emphasized");
            }
            oModel.setProperty("/onboarding/interests", aInterests);
        },

        /**
         * Sorts appData>/services so the categories picked during onboarding come
         * first, keeping catalogue order within each group (stable sort). This is
         * what gives onboarding step 3 a purpose — before this, hhInterests was
         * written on finish and never read anywhere in the app.
         */
        _applyInterestOrder: function() {
            var oModel = this.getModel("appData");
            var aServices = oModel.getProperty("/services") || [];
            if (!aServices.length) { return; }

            var aInterests;
            try {
                aInterests = JSON.parse(localStorage.getItem("hhInterests") || "[]");
            } catch (e) {
                return;
            }
            if (!aInterests || !aInterests.length) { return; }

            var aSorted = aServices.map(function (svc, i) {
                return { svc: svc, i: i, picked: aInterests.indexOf(svc.name) >= 0 ? 0 : 1 };
            }).sort(function (a, b) {
                return a.picked - b.picked || a.i - b.i;
            }).map(function (o) { return o.svc; });

            oModel.setProperty("/services", aSorted);
            if (this._applyTileColors) {
                setTimeout(this._applyTileColors.bind(this), 150);
            }
        },

        _loadFavorites: function() {
            var oModel = this.getModel("appData");
            try {
                var aFavIds = JSON.parse(localStorage.getItem("hhFavorites") || "[]");
                oModel.setProperty("/favorites", aFavIds);
                this._syncFavoriteProviders();
            } catch(e) { /* ignore */ }
            try {
                var aRecent = JSON.parse(localStorage.getItem("hhRecentlyViewed") || "[]");
                oModel.setProperty("/recentlyViewed", aRecent);
            } catch(e) { /* ignore */ }
        },

        _syncFavoriteProviders: function() {
            var oModel = this.getModel("appData");
            var aIds   = oModel.getProperty("/favorites") || [];
            var aAll   = oModel.getProperty("/providers") || [];
            oModel.setProperty("/favoriteProviders", aAll.filter(function(p) {
                return aIds.indexOf(p.id) >= 0;
            }));
        },

        onToggleFavorite: function(oEvent) {
            var oModel  = this.getModel("appData");
            var oSource = oEvent.getSource();
            var oCtx    = oSource.getBindingContext("appData");
            if (!oCtx) {
                var oParent = oSource.getParent();
                while (oParent && !oCtx) {
                    oCtx = oParent.getBindingContext("appData");
                    oParent = oParent.getParent ? oParent.getParent() : null;
                }
            }
            if (!oCtx) return;
            var sId     = oCtx.getObject().id;
            var aFavs   = (oModel.getProperty("/favorites") || []).slice();
            var iIdx    = aFavs.indexOf(sId);
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (iIdx >= 0) {
                aFavs.splice(iIdx, 1);
                MessageToast.show(oBundle.getText("favRemoved"));
            } else {
                aFavs.push(sId);
                MessageToast.show(oBundle.getText("favAdded"));
            }
            oModel.setProperty("/favorites", aFavs);
            localStorage.setItem("hhFavorites", JSON.stringify(aFavs));
            this._syncFavoriteProviders();
        },

        onViewFavoriteProfile: function(oEvent) {
            this._openProfileFromEvent(oEvent);
        },

        onViewRecentProfile: function(oEvent) {
            this._openProfileFromEvent(oEvent);
        },

        _openProfileFromEvent: function(oEvent) {
            var oModel   = this.getModel("appData");
            var oControl = oEvent.getSource();
            var oCtx = null;
            while (oControl && !oCtx) {
                oCtx = oControl.getBindingContext("appData");
                oControl = oControl.getParent ? oControl.getParent() : null;
            }
            if (!oCtx) return;

            var oStub = oCtx.getObject();
            // Enrich with full provider data (has rate, years, languages, city, bio)
            var aProviders = oModel.getProperty("/providers") || [];
            var oFull = aProviders.filter(function(p) { return String(p.id) === String(oStub.id); })[0];
            var oProvider = Object.assign({}, oStub, oFull || {}, { reviews: [] });
            if (!oProvider.initials && oProvider.name) {
                oProvider.initials = oProvider.name.split(" ")
                    .map(function(p) { return p[0]; }).join("").substring(0, 2).toUpperCase();
            }
            oModel.setProperty("/selectedProfile", oProvider);
            this._trackRecentlyViewed(oProvider);

            this._resetRatingForm();

            this._getProfileDialog().then(function(oDialog) { oDialog.open(); }.bind(this));

            var that = this;
            fetch(API_BASE + "/api/providers/" + encodeURIComponent(oProvider.id) + "/ratings")
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success) {
                        oModel.setProperty("/selectedProfile/reviews", that._formatReviews(oData.ratings));
                    }
                })
                .catch(function() {});
        },

        _trackRecentlyViewed: function(oProvider) {
            var oModel  = this.getModel("appData");
            var aRecent = (oModel.getProperty("/recentlyViewed") || []).slice();
            aRecent = aRecent.filter(function(p) { return p.id !== oProvider.id; });
            aRecent.unshift({
                id:          oProvider.id,
                name:        oProvider.name,
                photo:       oProvider.photo,
                serviceType: oProvider.serviceType
            });
            if (aRecent.length > 5) { aRecent = aRecent.slice(0, 5); }
            oModel.setProperty("/recentlyViewed", aRecent);
            localStorage.setItem("hhRecentlyViewed", JSON.stringify(aRecent));
        }

    };
});
