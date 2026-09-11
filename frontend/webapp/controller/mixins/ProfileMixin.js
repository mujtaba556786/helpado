sap.ui.define([
    "sap/m/MessageToast",
    "helphub/config",
    "sap/ui/core/format/DateFormat"
], function(MessageToast, Config, DateFormat) {
    "use strict";

    var API_BASE = Config.API_BASE;

    return {

        // Compute average rating (rounded to 1 dp) from a reviews array; returns null for empty input.
        _computeAvgRating: function(aReviews) {
            if (!aReviews || !aReviews.length) { return null; }
            var fSum = aReviews.reduce(function(s, r) { return s + (r.stars || 0); }, 0);
            return Math.round((fSum / aReviews.length) * 10) / 10;
        },

        // Fetch ratings for a provider and update both the reviews list and header rating.
        // Rating is set before reviews so the expression binding updates even if _formatReviews throws.
        _loadProfileRatings: function(sProviderId) {
            var oModel = this.getModel("appData");
            fetch(API_BASE + "/api/providers/" + encodeURIComponent(sProviderId) + "/ratings")
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (!oData.success) return;
                    var aReviews = oData.ratings || [];
                    var fAvg = this._computeAvgRating(aReviews);
                    if (fAvg !== null) {
                        oModel.setProperty("/selectedProfile/rating", fAvg);
                    }
                    oModel.setProperty("/selectedProfile/reviews", this._formatReviews(aReviews));
                }.bind(this))
                .catch(function() {});
        },

        // Shared helper — exposed as this.this._formatReviews() so other mixins can use it
        _formatReviews: function(aRatings) {
            var now = new Date();
            return (aRatings || []).map(function(r) {
                var sName     = r.reviewer_name || "Anonymous";
                var sInitials = r.reviewer_name
                    ? (sName.split(" ").map(function(p) { return p[0] || ""; })
                        .join("").substring(0, 2).toUpperCase() || "?")
                    : "AN";

                var d = r.created_at ? new Date(r.created_at) : null;
                var sRelative = "";
                if (d && !isNaN(d.getTime())) {
                    var iDiff = Math.floor((now - d) / 1000);
                    if (iDiff < 60)           { sRelative = "just now"; }
                    else if (iDiff < 3600)    { sRelative = Math.floor(iDiff / 60) + " min ago"; }
                    else if (iDiff < 86400)   { sRelative = Math.floor(iDiff / 3600) + " hr ago"; }
                    else if (iDiff < 2592000) { sRelative = Math.floor(iDiff / 86400) + " days ago"; }
                    else {
                        sRelative = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
                    }
                }
                return Object.assign({}, r, {
                    reviewer_initials:  sInitials,
                    created_at_relative: sRelative
                });
            });
        },

        onViewProfile: function(oEvent) {
            // Button → HBox(hhExpertActions) → VBox(hhExpertCard) → CustomListItem
            var oListItem = oEvent.getSource().getParent().getParent().getParent();
            var oCtx = oListItem.getBindingContext("appData");
            if (!oCtx) return;

            var oProvider = Object.assign({}, oCtx.getObject());
            if (oProvider.name && !oProvider.initials) {
                oProvider.initials = oProvider.name
                    .split(" ").map(function(p) { return p[0]; })
                    .join("").substring(0, 2).toUpperCase();
            }
            // Resolve photo URLs — relative paths, and localhost URLs from local dev uploads
            if (oProvider.photo) {
                if (oProvider.photo.indexOf("://") === -1) {
                    oProvider.photo = API_BASE + oProvider.photo;
                } else if (oProvider.photo.indexOf("localhost") !== -1 || oProvider.photo.indexOf("127.0.0.1") !== -1) {
                    try { oProvider.photo = API_BASE + new URL(oProvider.photo).pathname; } catch(e) { oProvider.photo = ""; }
                }
            }

            // Normalise any embedded mock reviews (format: {user, stars, comment})
            // so the dialog has something to show while the API fetch is in-flight.
            var aEmbedded = (oProvider.reviews || []).map(function(r) {
                var sName = r.reviewer_name || r.user || "Anonymous";
                var sInitials = sName.split(" ")
                    .map(function(p) { return p[0] || ""; })
                    .join("").substring(0, 2).toUpperCase() || "?";
                return {
                    reviewer_name:     sName,
                    reviewer_initials: sInitials,
                    stars:             r.stars || 0,
                    comment:           r.comment || "",
                    created_at_relative: r.created_at_relative || ""
                };
            });
            oProvider.reviews = aEmbedded;

            var oModel = this.getModel("appData");
            oModel.setProperty("/selectedProfile", oProvider);
            this._trackRecentlyViewed(oProvider);

            var oStars   = this.byId("newRatingStars");
            var oComment = this.byId("newRatingComment");
            if (oStars)   oStars.setValue(0);
            if (oComment) oComment.setValue("");

            this._setRatingEligibility();
            this._getProfileDialog().then(function(oDialog) { oDialog.open(); }.bind(this));
            this._loadProfileRatings(oProvider.id);
        },

        onSubmitRating: function() {
            var oModel   = this.getModel("appData");
            var oStars   = this.byId("newRatingStars");
            var oComment = this.byId("newRatingComment");
            var iStars   = oStars ? oStars.getValue() : 0;

            if (!iStars || iStars < 1) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ratingErrNoStars"));
                return;
            }

            var sProviderId = oModel.getProperty("/selectedProfile/id");
            var sUserId     = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var sName       = oModel.getProperty("/user/name") || "Anonymous";
            var sComment    = oComment ? oComment.getValue().trim() : "";

            fetch(API_BASE + "/api/ratings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    provider_id:   sProviderId,
                    user_id:       sUserId,
                    reviewer_name: sName,
                    stars:         iStars,
                    comment:       sComment
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("ratingSubmitted"));
                    if (oStars)   oStars.setValue(0);
                    if (oComment) oComment.setValue("");
                    this.onCloseRatingDialog();
                    // Note: average and review list only update after admin approval
                    var sId = oModel.getProperty("/selectedProfile/id");
                    this._loadProfileRatings(sId);
                } else {
                    MessageToast.show(oData.error || "Could not submit rating.");
                }
            }.bind(this))
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
        },

        onOpenMyProfile: function() {
            var oModel = this.getModel("appData");
            var oUser  = oModel.getProperty("/user") || {};
            var oProfile = Object.assign({}, oUser);

            if (oProfile.name && !oProfile.initials) {
                oProfile.initials = oProfile.name
                    .split(" ").map(function(p) { return p[0]; })
                    .join("").substring(0, 2).toUpperCase();
            }
            oProfile.reviews = oProfile.reviews || [];
            oProfile.rating  = oProfile.rating  || null;

            // Flatten nested address object into a plain city string so the
            // profile dialog's {appData>/selectedProfile/city} binding works.
            if (!oProfile.city && oProfile.address && oProfile.address.city) {
                oProfile.city = oProfile.address.city;
            }

            oModel.setProperty("/selectedProfile", oProfile);

            var oStars   = this.byId("newRatingStars");
            var oComment = this.byId("newRatingComment");
            if (oStars)   oStars.setValue(0);
            if (oComment) oComment.setValue("");

            this._setRatingEligibility();
            this._getProfileDialog().then(function(oDialog) { oDialog.open(); }.bind(this));

            if (oProfile.id) {
                this._loadProfileRatings(oProfile.id);
            }
        },

        onEditProfileFromDialog: function() {
            var that = this;
            this._getProfileDialog().then(function(d) {
                d.close();
                that.onEditProfile();
            });
        },

        onViewBookingProfile: function(oEvent) {
            // getBindingContext propagates up the tree automatically — no fragile getParent() chain
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oBooking = oCtx.getObject();
            var sProviderId = oBooking.provider_id;
            if (!sProviderId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("providerNotFound")); return; }

            var oModel = this.getModel("appData");
            // If the user is the provider of this booking, open their own profile
            if (String(sProviderId) === String(oModel.getProperty("/user/id"))) {
                this.onOpenMyProfile();
                return;
            }

            var aProviders = oModel.getProperty("/providers") || [];
            var oKnown = aProviders.filter(function(p) { return String(p.id) === String(sProviderId); })[0];

            // Build profile — use full providers-list data if available (has bio, rate, years, etc.)
            var oProfile = oKnown
                ? Object.assign({}, oKnown, { reviews: [] })
                : {
                    id:          sProviderId,
                    name:        oBooking.provider_name || "Provider",
                    serviceType: oBooking.service || "",
                    reviews:     []
                  };

            if (!oProfile.initials && oProfile.name) {
                oProfile.initials = oProfile.name
                    .split(" ").map(function(p) { return p[0]; })
                    .join("").substring(0, 2).toUpperCase();
            }

            oModel.setProperty("/selectedProfile", oProfile);
            this._trackRecentlyViewed(oProfile);

            var oStars   = this.byId("newRatingStars");
            var oComment = this.byId("newRatingComment");
            if (oStars)   oStars.setValue(0);
            if (oComment) oComment.setValue("");

            this._setRatingEligibility();
            this._getProfileDialog().then(function(oDialog) { oDialog.open(); }.bind(this));
            this._loadProfileRatings(sProviderId);
        },

        // ── Profile overflow (safety actions) ─────────────────────────────
        /**
         * Replaces formatTrustLabel, which printed "Verified User" for anyone
         * whose internal moderation score passed 40 — a number made of account
         * age, completed bookings, rating and absence of reports. No identity
         * check exists anywhere in the product, so the label claimed something
         * untrue at the exact moment a customer decides who to let into their
         * home. These two formatters state only what the database can prove.
         */
        formatMemberSince: function (vCreatedAt) {
            if (!vCreatedAt) { return ""; }
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oDate = new Date(vCreatedAt);
            if (isNaN(oDate.getTime())) { return ""; }
            var sWhen = DateFormat.getDateInstance({ pattern: "MMMM yyyy" }).format(oDate);
            return oBundle.getText("profileMemberSince", [sWhen]);
        },

        formatJobsCompleted: function (vCount) {
            var iCount = parseInt(vCount, 10);
            if (!iCount || iCount < 1) { return ""; }
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return oBundle.getText("profileJobsCompleted", [iCount]);
        },

        formatBio: function (sBio) {
            return sBio || this.getOwnerComponent().getModel("i18n")
                .getResourceBundle().getText("profileNoBio");
        },

        // ── Focused rating dialog ─────────────────────────────────────────
        onOpenRatingDialog: function () {
            this._getRatingDialog().then(function (d) { d.open(); });
        },

        onCloseRatingDialog: function () {
            if (this._pRatingDialog) {
                this._getRatingDialog().then(function (d) { d.close(); });
            }
        },

        _getRatingDialog: function () {
            if (!this._pRatingDialog) {
                var Fragment = sap.ui.require("sap/ui/core/Fragment");
                this._pRatingDialog = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "helphub.view.fragments.RatingDialog",
                    controller: this
                }).then(function (oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pRatingDialog;
        },

        /**
         * Whether the logged-in user may review the profile currently open.
         * Only after a booking with that helper has actually completed —
         * previously the form appeared on every profile, so anyone could rate
         * anyone they had never met. The server enforces the same rule; this
         * just keeps the form from appearing when it would be rejected.
         */
        _setRatingEligibility: function () {
            var oModel = this.getModel("appData");
            if (!oModel) return;

            var sProfileId = String(oModel.getProperty("/selectedProfile/id") || "");
            var sUserId    = String(oModel.getProperty("/user/id") ||
                                    localStorage.getItem("helpmate_user_id") || "");
            var aBookings  = oModel.getProperty("/upcomingBookings") || [];

            var bEligible = !!sProfileId && !!sUserId && sProfileId !== sUserId &&
                aBookings.some(function (b) {
                    return String(b.provider_id) === sProfileId &&
                           String(b.customer_id) === sUserId &&
                           String(b.status).toLowerCase() === "completed";
                });

            oModel.setProperty("/canRateSelectedProfile", bEligible);
        },

        onCloseProfile: function() {
            this._getProfileDialog().then(function(d) { d.close(); }.bind(this));
        },

        // Opens the Help & Info dialog (legal, support, tour, about)
        onOpenSettings: function() {
            this._getSettingsDialog().then(function(oDialog) {
                oDialog.open();
            }.bind(this));
        },

        onCloseSettings: function() {
            this._getSettingsDialog().then(function(oDialog) {
                oDialog.close();
            }.bind(this));
        },

        _getSettingsDialog: function() {
            if (!this._pSettingsDialog) {
                var Fragment = sap.ui.require("sap/ui/core/Fragment");
                this._pSettingsDialog = Fragment.load({
                    id:         this.getView().getId(),
                    name:       "helphub.view.fragments.SettingsDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pSettingsDialog;
        }

    };
});
