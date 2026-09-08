sap.ui.define([
    "sap/m/MessageToast",
    "helphub/config"
], function (MessageToast, Config) {
    "use strict";

    var API_BASE = Config.API_BASE;

    // Icon + colour per notification type
    var NOTIF_ICON = {
        task_application:  { icon: "sap-icon://task",           color: "#3b82f6" },
        task_assigned:     { icon: "sap-icon://accept",         color: "#16a34a" },
        booking_request:   { icon: "sap-icon://calendar",       color: "#f97316" },
        booking_accepted:  { icon: "sap-icon://appointment-2",  color: "#16a34a" },
        booking_confirmed: { icon: "sap-icon://appointment-2",  color: "#16a34a" },
        booking_declined:  { icon: "sap-icon://decline",        color: "#ef4444" },
        booking_completed: { icon: "sap-icon://star-filled",    color: "#eab308" },
        booking_cancelled: { icon: "sap-icon://sys-cancel-2",   color: "#94a3b8" },
        direct_message:    { icon: "sap-icon://discussion",     color: "#8b5cf6" },
        admin_warning:     { icon: "sap-icon://alert",          color: "#f97316" },
        chat:              { icon: "sap-icon://da",             color: "#06b6d4" }
    };

    return {

        /* ─────────────────────────────────────────────
           Polling
        ───────────────────────────────────────────── */
        _startNotificationPolling: function () {
            var that = this;
            this._loadNotificationCount();
            this._notifInterval = setInterval(function () {
                that._loadNotificationCount();
                that._loadUnreadDmCount();
            }, 30000);
        },

        _loadNotificationCount: function () {
            var oModel  = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;
            var iPrev = oModel.getProperty("/unreadCount") || 0;

            fetch(API_BASE + "/api/notifications/" + encodeURIComponent(sUserId) + "/unread-count")
                .then(function (r) { return r.json(); })
                .then(function (oData) {
                    if (oData.success) {
                        var iNew = oData.count || 0;
                        oModel.setProperty("/unreadCount", iNew);
                        if (iNew > iPrev) {
                            this._showInAppToast("sap-icon://bell", "New notification",
                                "You have " + iNew + " unread notification" + (iNew > 1 ? "s" : ""));
                            // Refresh the list so it's up-to-date when the dialog opens
                            var sUserId2 = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
                            if (sUserId2) {
                                fetch(API_BASE + "/api/notifications/" + encodeURIComponent(sUserId2))
                                    .then(function(r) { return r.json(); })
                                    .then(function(d) {
                                        if (d.success) {
                                            oModel.setProperty("/notifications", d.notifications || []);
                                            this._applyNotifFilter();
                                        }
                                    }.bind(this))
                                    .catch(function() {});
                            }
                        }
                    }
                }.bind(this))
                .catch(function () { /* silent */ });
        },

        /* ─────────────────────────────────────────────
           Open dialog
        ───────────────────────────────────────────── */
        onShowNotifications: function (oEvent) {
            var oModel  = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }

            var oSource = oEvent.getSource(); // bell button — Popover anchors here

            // Default filter
            if (!oModel.getProperty("/notifFilter")) {
                oModel.setProperty("/notifFilter", "all");
            }

            fetch(API_BASE + "/api/notifications/" + encodeURIComponent(sUserId))
                .then(function (r) { return r.json(); })
                .then(function (oData) {
                    if (oData.success) {
                        oModel.setProperty("/notifications", oData.notifications || []);
                        this._applyNotifFilter();
                    }
                    this._getNotificationsDialog().then(function (d) { d.openBy(oSource); }.bind(this));
                }.bind(this))
                .catch(function () {
                    this._getNotificationsDialog().then(function (d) { d.openBy(oSource); }.bind(this));
                }.bind(this));
        },

        /* ─────────────────────────────────────────────
           Filter: All / Today / Yesterday / Earlier
        ───────────────────────────────────────────── */
        onNotifFilter: function (oEvent) {
            var sFilter = oEvent.getSource().data("filter");
            this.getModel("appData").setProperty("/notifFilter", sFilter);
            this._applyNotifFilter();
        },

        _applyNotifFilter: function () {
            var oModel   = this.getModel("appData");
            var sFilter  = oModel.getProperty("/notifFilter") || "all";
            var aAll     = oModel.getProperty("/notifications") || [];

            var oNow       = new Date();
            var sToday     = oNow.toDateString();
            var oYest      = new Date(oNow); oYest.setDate(oYest.getDate() - 1);
            var sYesterday = oYest.toDateString();

            var aFiltered;
            if (sFilter === "today") {
                aFiltered = aAll.filter(function (n) {
                    return new Date(n.created_at).toDateString() === sToday;
                });
            } else if (sFilter === "yesterday") {
                aFiltered = aAll.filter(function (n) {
                    return new Date(n.created_at).toDateString() === sYesterday;
                });
            } else if (sFilter === "earlier") {
                aFiltered = aAll.filter(function (n) {
                    var d = new Date(n.created_at).toDateString();
                    return d !== sToday && d !== sYesterday;
                });
            } else {
                aFiltered = aAll;
            }

            oModel.setProperty("/filteredNotifications", aFiltered);
        },

        /* ─────────────────────────────────────────────
           Click a notification → navigate
        ───────────────────────────────────────────── */
        onNotifPress: function (oEvent) {
            var oCtx   = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oNotif = oCtx.getObject();

            // Mark as read
            if (!oNotif.is_read) {
                this._markOneRead(oNotif);
            }

            // Navigate based on type
            var oModel = this.getModel("appData");
            var sType  = oNotif.type;

            this.onCloseNotifications();

            // Navigate back to dashboardPage if on edit/search
            var oNavContainer = this.byId("navContainer");
            if (oNavContainer) {
                var oCurrent = oNavContainer.getCurrentPage();
                if (oCurrent && oCurrent.getId().indexOf("dashboardPage") === -1) {
                    oNavContainer.back();
                }
            }

            // Switch tab via model — same mechanism as onBottomNavSelect
            if (sType === "task_application" || sType === "task_assigned") {
                oModel.setProperty("/currentTab", "tasks");
                this._loadTasksFeed && this._loadTasksFeed();
                this._loadMyTasks  && this._loadMyTasks();

            } else if (sType === "booking_request" || sType === "booking_accepted" ||
                       sType === "booking_confirmed" || sType === "booking_declined" ||
                       sType === "booking_completed" || sType === "booking_cancelled") {
                oModel.setProperty("/currentTab", "mySchedule");
                this._markBookingsSeen && this._markBookingsSeen();

            } else if (sType === "direct_message" || sType === "chat") {
                oModel.setProperty("/currentTab", "messages");
                this._loadConversations && this._loadConversations();
            }
        },

        /* ─────────────────────────────────────────────
           Per-item mark read
        ───────────────────────────────────────────── */
        onNotifMarkOneRead: function (oEvent) {
            // stop the CustomListItem press from also firing
            oEvent.cancelBubble && oEvent.cancelBubble();
            var oBtn = oEvent.getSource();
            var oCtx = oBtn.getParent().getParent().getBindingContext("appData");
            if (!oCtx) return;
            this._markOneRead(oCtx.getObject());
        },

        _markOneRead: function (oNotif) {
            if (oNotif.is_read) return;
            var oModel = this.getModel("appData");

            fetch(API_BASE + "/api/notifications/" + encodeURIComponent(oNotif.id) + "/read", {
                method: "PUT"
            })
            .then(function (r) { return r.json(); })
            .then(function (oData) {
                if (oData.success) {
                    // Update in both arrays
                    ["notifications", "filteredNotifications"].forEach(function (sKey) {
                        var aList = (oModel.getProperty("/" + sKey) || []).slice();
                        var idx   = aList.findIndex(function (n) { return n.id === oNotif.id; });
                        if (idx > -1) { aList[idx] = Object.assign({}, aList[idx], { is_read: 1 }); }
                        oModel.setProperty("/" + sKey, aList);
                    });
                    var iCount = Math.max(0, (oModel.getProperty("/unreadCount") || 1) - 1);
                    oModel.setProperty("/unreadCount", iCount);
                }
            })
            .catch(function () { /* silent */ });
        },

        /* ─────────────────────────────────────────────
           Mark all read
        ───────────────────────────────────────────── */
        onMarkAllRead: function () {
            var oModel  = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;

            fetch(API_BASE + "/api/notifications/read-all/" + encodeURIComponent(sUserId), {
                method: "PUT"
            })
            .then(function (r) { return r.json(); })
            .then(function (oData) {
                if (oData.success) {
                    ["notifications", "filteredNotifications"].forEach(function (sKey) {
                        var aList = (oModel.getProperty("/" + sKey) || []).map(function (n) {
                            return Object.assign({}, n, { is_read: 1 });
                        });
                        oModel.setProperty("/" + sKey, aList);
                    });
                    oModel.setProperty("/unreadCount", 0);
                    MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("notifAllRead"));
                }
            }.bind(this))
            .catch(function () { /* silent */ });
        },

        /* ─────────────────────────────────────────────
           Formatters
        ───────────────────────────────────────────── */
        formatNotifTime: function (sCreatedAt) {
            if (!sCreatedAt) return "";
            var oNow  = new Date();
            var oDate = new Date(sCreatedAt);
            var iDiff = Math.floor((oNow - oDate) / 1000);
            if (iDiff < 60)    return "Just now";
            if (iDiff < 3600)  return Math.floor(iDiff / 60) + " min ago";
            if (iDiff < 86400) return Math.floor(iDiff / 3600) + " hr ago";
            if (iDiff < 172800) return "Yesterday";
            if (iDiff < 604800) return Math.floor(iDiff / 86400) + " days ago";
            return oDate.toLocaleDateString([], { month: "short", day: "numeric" });
        },

        formatNotifIconSrc: function (sType) {
            var cfg = NOTIF_ICON[sType] || { icon: "sap-icon://bell", color: "#94a3b8" };
            return cfg.icon;
        },

        formatNotifIconColor: function (sType) {
            var cfg = NOTIF_ICON[sType] || { icon: "sap-icon://bell", color: "#94a3b8" };
            return cfg.color;
        },

        /* ─────────────────────────────────────────────
           Close + cleanup
        ───────────────────────────────────────────── */
        onCloseNotifications: function () {
            this._getNotificationsDialog().then(function (d) { d.close(); }.bind(this));
        },

        onExit: function () {
            if (this._notifInterval) {
                clearInterval(this._notifInterval);
                this._notifInterval = null;
            }
        }

    };
});
