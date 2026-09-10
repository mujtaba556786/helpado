sap.ui.define([
    "helphub/controller/BaseController",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "helphub/model/countryStates",
    "helphub/model/ServiceConstants",
    "helphub/controller/mixins/NotificationMixin",
    "helphub/controller/mixins/MapMixin",
    "helphub/controller/mixins/FilterMixin",
    "helphub/controller/mixins/BookingMixin",
    "helphub/controller/mixins/AiChatMixin",
    "helphub/controller/mixins/DmMixin",
    "helphub/controller/mixins/OnboardingFavoritesMixin",
    "helphub/controller/mixins/ProfileMixin",
    "helphub/controller/mixins/TaskMixin",
    "helphub/controller/mixins/TrustSafetyMixin",
    "helphub/config"
], function(
    BaseController, MessageToast, MessageBox, Fragment, CountryStates, ServiceConstants,
    NotificationMixin, MapMixin, FilterMixin, BookingMixin, AiChatMixin,
    DmMixin, OnboardingFavoritesMixin, ProfileMixin, TaskMixin, TrustSafetyMixin,
    Config
) {
    "use strict";

    var API_BASE = Config.API_BASE;

    var DashboardController = BaseController.extend("helphub.controller.Dashboard", {

        onInit: function() {
            var oRouter = this.getRouter();
            if (oRouter) {
                oRouter.getRoute("dashboard").attachPatternMatched(this._onRouteMatched, this);
            }

            this.getView().addEventDelegate({
                onAfterRendering: function() {
                    var aTiles = document.querySelectorAll(".customServiceTile");
                    aTiles.forEach((el) => {
                        el.onclick = (e) => {
                            var oTile = sap.ui.getCore().byId(el.id);
                            if (oTile) {
                                this.onServicePress({ tile: oTile });
                            }
                        };
                    });

                    // Apply service tile colors — small delay so list items are in DOM
                    setTimeout(this._applyTileColors.bind(this), 100);

                    // Map is initialized lazily on first navigate to searchPage
                }.bind(this)
            }, this);
        },

        _onRouteMatched: function() {
            this._oModel = this.getModel("appData");
            // Default to Find Help tab on every route match
            if (!this._oModel.getProperty("/currentTab")) {
                this._oModel.setProperty("/currentTab", "findHelp");
            }
            // Ensure user id is in model (may only be in storage after page reload)
            if (!this._oModel.getProperty("/user/id")) {
                window.HelpHubStorage.get("helpmate_user_id", function(sSid) {
                    if (sSid) { this._oModel.setProperty("/user/id", sSid); }
                }.bind(this));
            }
            this._loadProvidersFromApi();
            this._initServicesFromConstants();
            this._applyInterestOrder();
            this._oModel.setProperty("/appVersionLabel",
                this.getOwnerComponent().getModel("i18n").getResourceBundle()
                    .getText("versionLabel", [window._HH_BUILD || "dev"]));
            this._loadSchedule();
            this._loadFavorites();
            this._loadUnreadDmCount();
            this._loadTasksFeed();
            this._loadHomeActivity();
            this._loadSubscriptionStatus();
            if (!this._notifInterval) {
                this._startNotificationPolling();
            }
            // Pre-warm all fragment dialogs so chains are instant on first interaction
            this._getProfileDialog();
            this._getBookingDialog();
            this._getAiChatDialog();
            this._getDmChatDialog();
            this._getPostTaskDialog();
            this._getTaskDetailDialog();
            this._getNotificationsDialog();
            this._getOnboardingDialog();
            this._getTermsDialog(); // pre-warm so it shows instantly if needed
            // Terms checked first — onboarding only runs after terms are confirmed
            // (see TrustSafetyMixin._checkTermsAccepted and onAcceptTerms)
            setTimeout(this._checkTermsAccepted.bind(this), 350);
        },

        /**
         * Computes appData>/selectedProfile/rateDisplay before a dialog opens.
         *
         * Seven different places assign /selectedProfile, and a property binding
         * with `formatter` against the object path renders empty (the same class
         * of silent binding failure as the mark-completed button). Computing the
         * string in JS and binding a plain property is the pattern that works.
         */
        /**
         * Who owns the task being viewed. The fragment gated its action row on
         *   visible="{= ${appData>/selectedTask/poster_id} !== ${appData>/user/id}}"
         * and the applicants list on the inverse. This dialog is pre-warmed at
         * startup, before /user/id exists, and undefined !== undefined is false —
         * the same latch that showed Edit Profile on strangers' profiles. Effect
         * here: no Apply button on someone else's task, and an Applicants heading
         * that is not yours. Computed on every open instead.
         */
        _refreshTaskOwnership: function() {
            var oModel = this.getModel("appData");
            var oTask  = oModel.getProperty("/selectedTask");
            var sUser  = oModel.getProperty("/user/id") ||
                         localStorage.getItem("helpmate_user_id");
            var bOwn   = !!(oTask && oTask.poster_id) && !!sUser &&
                         String(oTask.poster_id) === String(sUser);
            oModel.setProperty("/isOwnTask",   bOwn);
            oModel.setProperty("/isOtherTask", !!(oTask && oTask.poster_id) && !bOwn);
        },

        _refreshRateDisplay: function() {
            var oModel = this.getModel("appData");
            var oProfile = oModel.getProperty("/selectedProfile");
            if (oProfile) {
                oModel.setProperty("/selectedProfile/rateDisplay", this.formatPriceDisplay(oProfile));
                // Was an inline expression that concatenated String(rating) with
                // ' / 5' and fell back to the literal 'No rating' — the last
                // untranslated string in the views.
                var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
                oModel.setProperty("/selectedProfile/ratingLabel",
                    oProfile.rating ? oProfile.rating + " / 5" : oBundle.getText("noRating"));
            }

            // Whose profile is this? The fragment used
            //   visible="{= String(${.../selectedProfile/id}) === String(${.../user/id})}"
            // on the Edit-Profile row and its negation on Book/Message. Both rows
            // rendered at once: the dialogs are pre-warmed before either id exists,
            // String(undefined) === String(undefined) evaluated true, and that row
            // never re-evaluated. So you could Book and Message yourself, and see
            // Edit Profile on a stranger. Computing the flags here — on every open —
            // removes the dependency on when the expression happens to run.
            var sSelected = oProfile && oProfile.id;
            var sUser     = oModel.getProperty("/user/id") ||
                            localStorage.getItem("helpmate_user_id");
            var bOwn      = !!sSelected && !!sUser && String(sSelected) === String(sUser);
            oModel.setProperty("/isOwnProfile",   bOwn);
            oModel.setProperty("/isOtherProfile", !!sSelected && !bOwn);
        },

        // ── FRAGMENT DIALOG FACTORIES ────────────────────────────────────────────
        _getHelpFaqDialog: function() {
            if (!this._pHelpFaqDialog) {
                this._pHelpFaqDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.HelpFaqDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pHelpFaqDialog;
        },

        _getProfileDialog: function() {
            if (!this._pProfileDialog) {
                this._pProfileDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.ProfileDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    oDialog.attachBeforeOpen(this._refreshRateDisplay, this);
                    return oDialog;
                }.bind(this));
            }
            return this._pProfileDialog;
        },

        _getBookingDialog: function() {
            if (!this._pBookingDialog) {
                this._pBookingDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.BookingDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    oDialog.attachBeforeOpen(this._refreshRateDisplay, this);
                    return oDialog;
                }.bind(this));
            }
            return this._pBookingDialog;
        },

        _getAiChatDialog: function() {
            if (!this._pAiChatDialog) {
                this._pAiChatDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.AiChatDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pAiChatDialog;
        },

        _getDmChatDialog: function() {
            if (!this._pDmChatDialog) {
                this._pDmChatDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.DmChatDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pDmChatDialog;
        },

        _getPostTaskDialog: function() {
            if (!this._pPostTaskDialog) {
                this._pPostTaskDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.PostTaskDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pPostTaskDialog;
        },

        _getTaskDetailDialog: function() {
            if (!this._pTaskDetailDialog) {
                this._pTaskDetailDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.TaskDetailDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    oDialog.attachBeforeOpen(this._refreshTaskOwnership, this);
                    return oDialog;
                }.bind(this));
            }
            return this._pTaskDetailDialog;
        },

        _getNotificationsDialog: function() {
            if (!this._pNotificationsDialog) {
                this._pNotificationsDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.NotificationsDialogV2",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pNotificationsDialog;
        },

        _getOnboardingDialog: function() {
            if (!this._pOnboardingDialog) {
                this._pOnboardingDialog = Fragment.load({
                    id: this.getView().getId(),
                    name: "helphub.view.fragments.OnboardingDialog",
                    controller: this
                }).then(function(oDialog) {
                    this.getView().addDependent(oDialog);
                    return oDialog;
                }.bind(this));
            }
            return this._pOnboardingDialog;
        },

        onBottomNavSelect: function(oEvent) {
            var sKey = oEvent.getSource().data("tab");
            this.getModel("appData").setProperty("/currentTab", sKey);
            if (sKey === "mySchedule") {
                this._markBookingsSeen();
            } else if (sKey === "messages") {
                this._loadConversations();
            } else if (sKey === "tasks") {
                this._loadTasksFeed();
                this._loadMyTasks();
                if (!this._taskMapInitialized) {
                    // Retry until the taskMap div is in the DOM (SAP UI5 renders async)
                    var nTry = 0, that = this;
                    var fnTryMap = function() {
                        if (document.getElementById("taskMap")) {
                            that._initTaskMap();
                            that._taskMapInitialized = true;
                        } else if (nTry++ < 10) {
                            setTimeout(fnTryMap, 150);
                        }
                    };
                    setTimeout(fnTryMap, 150);
                }
            }
        },

        onTabSelect: function(oEvent) {
            this.onBottomNavSelect(oEvent);
        },

        _applyTileColors: function() {
            var aServices = this.getModel("appData").getProperty("/services") || [];

            var oStyle = document.getElementById("__hh-tile-colors");
            if (!oStyle) {
                oStyle = document.createElement("style");
                oStyle.id = "__hh-tile-colors";
                document.head.appendChild(oStyle);
            }
            var sCss = "";
            aServices.forEach(function(svc, i) {
                if (svc && svc.color) {
                    sCss += ".serviceTilesContainer > *:nth-child(" + (i + 1) + ") .circleButton {" +
                            "background-color: " + svc.color + " !important; }\n";
                }
            });
            oStyle.textContent = sCss;
        },

        /** Toggle the small orange dot above the bell icon */
        _setNotifDot: function(bShow) {
            var oBtn = this.byId("notifBtn");
            if (!oBtn) return;
            var apply = function() {
                var oDom = oBtn.getDomRef();
                if (oDom) {
                    oDom.classList.toggle("notifDot", !!bShow);
                } else {
                    setTimeout(apply, 150);
                }
            };
            apply();
        },

        _loadHomeActivity: function() {
            var oModel  = this.getModel("appData");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            fetch(API_BASE + "/api/home/activity")
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success) {
                        var aRecent = oData.recent || [];
                        var sCity   = aRecent[0] && aRecent[0].city;
                        oModel.setProperty("/homeActivity", {
                            helpers: oData.helpers || 0,
                            requests: oData.requests || 0,
                            recent: aRecent,
                            // Built here rather than concatenated in the view: an i18n
                            // string cannot wrap a binding inside an XML attribute, and
                            // word order differs by language.
                            activeInLabel: sCity ? oBundle.getText("activeIn", [sCity]) : ""
                        });
                    }
                })
                .catch(function() { /* non-critical — stay silent */ });
        },

        _loadSubscriptionStatus: function() {
            var oModel  = this.getModel("appData");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var sRole   = oModel.getProperty("/user/role");
            if (sRole !== "provider") { return; }
            this.apiFetch(API_BASE + "/api/subscription/status")
                .then(function(oData) {
                    if (oData.success) {
                        oModel.setProperty("/subscriptionStatus", Object.assign({}, oData, {
                            earnedLabel: oBundle.getText("earnedThisMonth",
                                [oData.monthly_booking_value || 0])
                        }));
                    }
                })
                .catch(function() { /* non-critical */ });
        },

        _loadProvidersFromApi: function() {
            var oModel = this.getModel("appData");
            fetch(API_BASE + "/api/providers")
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success && oData.providers.length) {
                        oModel.setProperty("/providers", oData.providers);
                    }
                })
                .catch(function() { /* keep mock data on network error */ });
        },

        /**
         * Fetch the service catalogue from the backend and update the tile grid.
         * Falls back to the hardcoded list in models.js if the API is unreachable.
         * Maps backend fields:  id, name, icon, category, description, status
         *           → model fields: id, name, icon, sector, color, description
         */
        /**
         * Initialises appData>/services from the frontend ServiceConstants.
         * No backend fetch — names, icons and colours are all defined in
         * model/ServiceConstants.js. Translated labels are resolved from the
         * i18n resource bundle so they update automatically on language change.
         */
        _initServicesFromConstants: function() {
            var oModel   = this.getModel("appData");
            var oBundle  = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            var aServices = ServiceConstants.map(function(svc) {
                return {
                    name:    svc.name,           // API key — never translated
                    icon:    svc.icon,           // sap-icon:// URI
                    label:   oBundle.getText(svc.key) || svc.name,  // localised label
                    color:   svc.color,
                    is_hero: svc.is_hero,
                    // Optional tile artwork for categories the icon font cannot
                    // express. Resolved through the module path because a bare
                    // "img/..." resolves against the wrong folder in the OPA harness.
                    img:     svc.img ? sap.ui.require.toUrl("helphub/" + svc.img) : "",
                    // What the compact surfaces render — the task category
                    // filter, Post Task select, onboarding chips and a helper's
                    // own picker. Prefers the drawn artwork, falls back to the
                    // font glyph for categories that do not have any.
                    display: svc.img ? sap.ui.require.toUrl("helphub/" + svc.img) : svc.icon
                };
            });

            oModel.setProperty("/services", aServices);
            setTimeout(this._applyTileColors.bind(this), 150);
        },

        onHeaderAvatarMenu: function() {
            // Tap avatar → go straight to Edit Profile.
            // Sign Out lives in the editPage header (always visible, no i18n timing issues).
            this.onEditProfile();
        },

        onNavToAdmin: function() {
            this.navTo("admin");
        },

        // ── LEGAL & SUPPORT ───────────────────────────────────────────────────

        /**
         * Opens a legal page using Cordova InAppBrowser when wrapped in Cordova,
         * or an in-app Dialog with a lazily-injected iframe on plain web.
         *
         * The iframe src is set only AFTER the dialog reports afterOpen so the
         * frame is guaranteed to be in the DOM before we assign the URL.
         */
        _openLegalPage: function(sTitle, sPath) {
            var sUrl = window.location.origin + sPath;
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

        onViewTerms: function() {
            this._openLegalPage("Terms & Conditions", "/legal/terms.html");
        },

        onViewPrivacy: function() {
            this._openLegalPage("Privacy Policy (GDPR)", "/legal/privacy.html");
        },

        // Called from TermsAcceptanceDialog inline buttons
        onViewTermsInline: function() {
            this._openLegalPage("Terms & Conditions", "/legal/terms.html");
        },

        onViewPrivacyInline: function() {
            this._openLegalPage("Privacy Policy (GDPR)", "/legal/privacy.html");
        },

        /**
         * Help & FAQ opens the actual FAQ. It used to open an empty mail draft,
         * which made the item's own description ("Answers to common questions")
         * untrue, and made it a duplicate of Contact Support.
         */
        onOpenHelp: function() {
            this._getHelpFaqDialog().then(function(oDialog) { oDialog.open(); });
        },

        onCloseHelpFaq: function() {
            this._getHelpFaqDialog().then(function(oDialog) { oDialog.close(); });
        },

        onContactSupport: function() {
            var sUrl = "mailto:" + Config.SUPPORT_EMAIL +
                       "?subject=" + encodeURIComponent("Helpado support request");
            // "_system" hands the mailto: to the OS mail app. Assigning
            // window.location.href inside the Cordova WebView can silently do
            // nothing, which is how this looked broken on the phone.
            if (window.cordova && window.cordova.InAppBrowser) {
                window.cordova.InAppBrowser.open(sUrl, "_system");
                return;
            }
            window.location.href = sUrl;
        },

        onLanguageMenu: function(oEvent) {
            var that    = this;
            var oSource = oEvent.getSource();   // globe button — used to anchor the popover

            if (!this._oLangPopover) {
                this._oLangPopover = new sap.m.Popover({
                    showHeader: false,
                    placement: "Bottom",
                    content: [
                        new sap.m.List({
                            showSeparators: "None",
                            items: [
                                new sap.m.StandardListItem({ title: "🇬🇧  English",  type: "Active", press: that._applyLanguage.bind(that, "en") }),
                                new sap.m.StandardListItem({ title: "🇩🇪  Deutsch",  type: "Active", press: that._applyLanguage.bind(that, "de") }),
                                new sap.m.StandardListItem({ title: "🇹🇷  Türkçe",   type: "Active", press: that._applyLanguage.bind(that, "tr") }),
                                new sap.m.StandardListItem({ title: "🇸🇦  العربية",  type: "Active", press: that._applyLanguage.bind(that, "ar") })
                            ]
                        })
                    ]
                });
                this.getView().addDependent(this._oLangPopover);
            }
            this._oLangPopover.openBy(oSource);
        },

        _applyLanguage: function(sLang) {
            localStorage.setItem("helpmate_lang", sLang);
            window.location.reload();
        },

        onLogout: function() {
            var oModel = this.getModel("appData");
            // Revoke refresh token on backend (fire-and-forget — clear locally regardless)
            window.HelpHubStorage.get("helphub_refresh_token", function(sRefresh) {
                if (sRefresh) {
                    window.HelpHubStorage.get("helpmate_token", function(sToken) {
                        fetch(API_BASE + "/api/auth/logout", {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                "Authorization": "Bearer " + (sToken || "")
                            },
                            body: JSON.stringify({ refreshToken: sRefresh })
                        }).catch(function() {});
                    });
                }
            });
            window.HelpHubStorage.clear();
            oModel.setProperty("/isLoggedIn", false);
            this.getOwnerComponent().getRouter().navTo("login", {}, true);
        },

        onServicePress: function(oEvent) {
            var oTile = oEvent.getSource();
            var oContext = oTile.getBindingContext("appData");
            if (!oContext) return;

            var oService = oContext.getObject();

            var $circle = oTile.$().find(".circleButton");
            $circle.addClass("circleActive");

            setTimeout(() => {
                $circle.removeClass("circleActive");
                this._navigateToResults(oService);
            }, 450);
        },

        _navigateToResults: function(oService) {
            var oModel = this.getModel("appData");
            if (!oModel) { return; }

            oModel.setProperty("/selectedCategoryName", oService.name);

            var aFiltered = this._applyFiltersForService(oService.name);
            oModel.setProperty("/filteredProviders", aFiltered);

            var oNav = this.byId("navContainer");
            if (oNav) {
                oNav.to(this.byId("searchPage"));
                if (!this._mapInitialized) {
                    setTimeout(function() {
                        this._initMap();
                        this._mapInitialized = true;
                        this._updateProviderMarkers(aFiltered);
                        if (this._oMap) {
                            setTimeout(function() {
                                this._oMap.invalidateSize();
                            }.bind(this), 200);
                        }
                    }.bind(this), 400);
                } else {
                    this._updateProviderMarkers(aFiltered);
                }
            }
        },

        // ── PROFILE EDITING ───────────────────────────────────────────────────
        onEditProfile: function() {
            var oModel = this.getModel("appData");

            if (!(oModel.getProperty("/countries") || []).length) {
                oModel.setProperty("/countries", CountryStates.getCountries());
            }

            var sCountry = oModel.getProperty("/user/address/country");
            if (!sCountry) {
                sCountry = CountryStates.detectCountryCode();
                oModel.setProperty("/user/address/country", sCountry);
            }

            oModel.setProperty("/stateOptions", CountryStates.getStates(sCountry));

            this.byId("navContainer").to(this.byId("editPage"));
        },

        onAvailabilityToggle: function(oEvent) {
            var oModel = this.getModel("appData");
            var sKey   = oEvent.getSource().data("availKey");
            var oFlags = Object.assign({}, oModel.getProperty("/user/availabilityFlags"));

            if (sKey === "all_day") {
                var bOn = !oFlags.all_day;
                oFlags.all_day = oFlags.weekdays = oFlags.weekends =
                    oFlags.morning = oFlags.afternoon = oFlags.evening = oFlags.night = bOn;
            } else {
                oFlags[sKey] = !oFlags[sKey];
                oFlags.all_day = oFlags.weekdays && oFlags.weekends &&
                    oFlags.morning && oFlags.afternoon && oFlags.evening && oFlags.night;
            }

            oModel.setProperty("/user/availabilityFlags", oFlags);

            var aKeys = ["weekdays","weekends","morning","afternoon","evening","night"]
                .filter(function(k) { return oFlags[k]; });
            if (oFlags.all_day) aKeys.unshift("all_day");
            oModel.setProperty("/user/availability", aKeys);
        },

        onCountryChange: function(oEvent) {
            var sCode  = oEvent.getParameter("selectedItem").getKey();
            var oModel = this.getModel("appData");
            oModel.setProperty("/user/address/country", sCode);
            oModel.setProperty("/stateOptions", CountryStates.getStates(sCode));
            oModel.setProperty("/user/address/state", "");
        },

        // Opens a native file picker on button press — avoids sap.ui.unified.FileUploader
        // whose internal button text is invisible in the custom helpmate theme.
        onChangePhotoPress: function() {
            var that   = this;
            var oInput = document.createElement("input");
            oInput.type   = "file";
            oInput.accept = "image/jpeg,image/png,image/gif,image/webp";
            oInput.addEventListener("change", function() {
                var oFile = oInput.files && oInput.files[0];
                if (oFile) { that._uploadAvatarFile(oFile); }
            });
            oInput.click();
        },

        _uploadAvatarFile: function(oFile) {
            var that = this;

            if (oFile.size > 5 * 1024 * 1024) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("avatarTooLarge"));
                return;
            }

            // Show preview immediately via FileReader
            var oReader = new FileReader();
            oReader.onload = function(e) {
                that.getModel("appData").setProperty("/user/photo", e.target.result);
            };
            oReader.readAsDataURL(oFile);

            var sUserId = that.getModel("appData").getProperty("/user/id");
            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("avatarErrLogin")); return; }

            var oForm = new FormData();
            oForm.append("avatar", oFile);

            fetch(API_BASE + "/api/users/" + encodeURIComponent(sUserId) + "/avatar", {
                method: "POST",
                body: oForm
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    // avatarUrl is a full https URL (Cloudinary) OR a "/uploads/…" path.
                    // Only prepend API_BASE to relative paths — prepending it to a full
                    // URL produced a broken src, so the new photo never showed.
                    var sUrl = oData.avatarUrl || "";
                    if (sUrl && !/^https?:\/\//i.test(sUrl)) { sUrl = API_BASE + sUrl; }
                    that.getModel("appData").setProperty("/user/photo", sUrl);
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("avatarUpdated"));
                } else {
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle()
                        .getText("avatarUploadFailed", [oData.error || ""]));
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
        },

        onTabToTasks: function() {
            var oNav = this.byId("navContainer");
            if (oNav) { oNav.back(); }
            this.getModel("appData").setProperty("/currentTab", "tasks");
            this._loadTasksFeed();
            this._loadMyTasks();
        },

        onToggleMap: function() {
            var oModel = this.getModel("appData");
            var bExpanded = oModel.getProperty("/mapExpanded");
            oModel.setProperty("/mapExpanded", !bExpanded);
        },

        onNavBack: function() {
            var oNavContainer  = this.byId("navContainer");
            var sCurrentPageId = oNavContainer.getCurrentPage().getId();

            if (!sCurrentPageId.includes("dashboardPage")) {
                oNavContainer.back();
            } else {
                BaseController.prototype.onNavBack.apply(this);
            }
        },

        onSaveProfile: function() {
            var oModel = this.getModel("appData");
            var oUser  = oModel.getProperty("/user");
            var oAddr  = oUser.address || {};

            var oVal = { name: "None", street: "None", houseNumber: "None", city: "None", state: "None", postalCode: "None", country: "None" };
            var bValid = true;

            // Name is the only required field; all address fields are individually optional.
            if (!oUser.name || !oUser.name.trim()) { oVal.name = "Error"; bValid = false; }

            // Validate postal code format only when the user has actually filled it in.
            var sPostal = (oAddr.postalCode || "").trim();
            if (sPostal && !/^[A-Za-z0-9\s\-]{3,10}$/.test(sPostal)) {
                oVal.postalCode = "Error"; bValid = false;
            }

            oModel.setProperty("/validation", oVal);

            if (!bValid) {
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("profileErrFields"));
                return;
            }

            var sUserId = oUser.id;
            if (!sUserId) {
                window.HelpHubStorage.get("helpmate_user_id", function(sid) {
                    if (sid) { oModel.setProperty("/user/id", sid); }
                });
                MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("sessionExpired")); return;
            }

            this.apiFetch(API_BASE + "/api/users/" + encodeURIComponent(sUserId), {
                method: "PUT",
                body: JSON.stringify({
                    name:              oUser.name,
                    bio:               oUser.bio,
                    languages:         oUser.languages,
                    years:             oUser.years,
                    phone:             oUser.phone,
                    rate:              oUser.rate,
                    availability:      oUser.availability,
                    serviceCategories: oUser.serviceCategories,
                    street_name:       oAddr.street      || undefined,
                    street_number:     oAddr.houseNumber  || undefined,
                    city:              oAddr.city         || undefined,
                    state:             oAddr.state        || undefined,
                    country:           oAddr.country      || undefined,
                    pincode:           oAddr.postalCode   || undefined
                })
            })
            .then(function(oData) {
                if (oData.success) {
                    MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("profileSaved"));

                    var sUserId    = oUser.id;
                    var aProviders = (oModel.getProperty("/providers") || []).slice();
                    var iIdx = -1;
                    for (var i = 0; i < aProviders.length; i++) {
                        if (aProviders[i].id === sUserId) { iIdx = i; break; }
                    }
                    if (iIdx >= 0) {
                        aProviders[iIdx] = Object.assign({}, aProviders[iIdx], {
                            name:         oUser.name,
                            languages:    oUser.languages || "",
                            years:        oUser.years || 0,
                            rate:         oUser.rate || 0,
                            availability: Array.isArray(oUser.availability)
                                ? oUser.availability.join(",")
                                : (oUser.availability || ""),
                            address: [oAddr.street, oAddr.houseNumber, oAddr.city]
                                .filter(Boolean).join(", ")
                        });
                        oModel.setProperty("/providers", aProviders);
                        this._refreshCurrentFilters();
                    }

                    this.onNavBack();
                } else {
                    MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle()
                        .getText("profileSaveFailed", [oData.error || ""]));
                }
            }.bind(this))
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
        }

    });

    // ── MIXIN MERGE ──────────────────────────────────────────────────────────────
    Object.assign(DashboardController.prototype,
        NotificationMixin,
        MapMixin,
        FilterMixin,
        BookingMixin,
        AiChatMixin,
        DmMixin,
        OnboardingFavoritesMixin,
        ProfileMixin,
        TaskMixin,
        TrustSafetyMixin
    );

    return DashboardController;
});
