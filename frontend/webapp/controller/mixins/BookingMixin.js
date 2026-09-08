sap.ui.define([
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/m/Popover",
    "sap/m/List",
    "sap/m/StandardListItem",
    "helphub/config"
], function(MessageToast, MessageBox, Popover, List, StandardListItem, Config) {
    "use strict";

    var API_BASE = Config.API_BASE;

    return {

        onOpenBooking: function() {
            var oModel = this.getModel("appData");
            oModel.setProperty("/bookingForm/date", "");
            oModel.setProperty("/bookingForm/time", "");
            oModel.setProperty("/bookingForm/message", "");
            Promise.all([this._getProfileDialog(), this._getBookingDialog()]).then(function(aDialogs) {
                aDialogs[0].close();
                aDialogs[1].open();
            }.bind(this));
        },

        onCloseBooking: function() {
            this._getBookingDialog().then(function(d) { d.close(); }.bind(this));
        },

        /**
         * Booking status was rendered straight from the database column, so the
         * schedule showed the English words "pending" / "confirmed" in every
         * language, and the status toast read "Booking confirmed." regardless of
         * locale.
         */
        formatStatusLabel: function (sStatus) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var mKeys = {
                pending:   "statusPending",
                confirmed: "statusConfirmed",
                completed: "statusCompleted",
                declined:  "statusDeclined",
                cancelled: "statusCancelled"
            };
            var sKey = mKeys[String(sStatus).toLowerCase()];
            return sKey ? oBundle.getText(sKey) : (sStatus || "");
        },

        onConfirmBooking: function() {
            var oModel      = this.getModel("appData");
            var sDate       = oModel.getProperty("/bookingForm/date");
            var sTime       = oModel.getProperty("/bookingForm/time");
            var sMessage    = oModel.getProperty("/bookingForm/message");
            var sProviderId = oModel.getProperty("/selectedProfile/id");
            var sService    = oModel.getProperty("/selectedProfile/serviceType");
            var sCustomerId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");

            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            if (!sDate) { MessageToast.show(oBundle.getText("bookingErrNoDate")); return; }
            if (!sCustomerId) { MessageToast.show(oBundle.getText("bookingErrNotLoggedIn")); return; }

            fetch(API_BASE + "/api/bookings", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    customer_id:    sCustomerId,
                    provider_id:    sProviderId,
                    service:        sService,
                    scheduled_date: sDate,
                    scheduled_time: sTime,
                    message:        sMessage
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    var sProviderName = oModel.getProperty("/selectedProfile/name") ||
                        oBundle.getText("bookingTheHelper");
                    this._getBookingDialog().then(function(d) { d.close(); }.bind(this));
                    MessageBox.success(
                        oBundle.getText("bookingSentMsg", [sProviderName]),
                        {
                            title: oBundle.getText("bookingSentTitle"),
                            onClose: function() {
                                this._loadSchedule();
                                oModel.setProperty("/currentTab", "mySchedule");
                                this._markBookingsSeen && this._markBookingsSeen();
                            }.bind(this)
                        }
                    );
                } else {
                    MessageToast.show(oBundle.getText("bookingFailed",
                        [oData.error || oBundle.getText("bookingUnknownError")]));
                }
            }.bind(this))
            .catch(function() { MessageToast.show(oBundle.getText("bookingNoServer")); });
        },

        onAcceptBooking: function(oEvent) {
            this._updateBookingStatus(oEvent, "confirmed");
        },

        onDeclineBooking: function(oEvent) {
            this._updateBookingStatus(oEvent, "declined");
        },

        onCancelBooking: function(oEvent) {
            // getBindingContext walks the parent tree automatically — no fragile getParent() chain
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oBooking = oCtx.getObject();
            var sBookingId = oBooking && oBooking.id;
            if (!sBookingId) return;
            var sUserId = this.getModel("appData").getProperty("/user/id");
            var that = this;

            // Use explicit actions so sAction reliably equals MessageBox.Action.OK on confirm
            MessageBox.confirm(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("bookingCancelConfirm"), {
                title: "Cancel Booking",
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.CANCEL,
                onClose: function(sAction) {
                    if (sAction !== MessageBox.Action.OK) return;
                    fetch(API_BASE + "/api/bookings/" + encodeURIComponent(sBookingId) + "/status", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "cancelled", user_id: sUserId })
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(oData) {
                        if (oData.success) {
                            MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("bookingCancelled"));
                            that._loadSchedule();
                        } else {
                            MessageToast.show(oData.error || "Could not cancel booking.");
                        }
                    })
                    .catch(function() { MessageToast.show(oBundle.getText("bookingNoServer")); });
                }
            });
        },

        /**
         * Whether the "Mark as completed" action applies to this booking.
         * Written as a formatter, not an expression binding: UI5 expression
         * bindings do not support `new Date(...)`, so the inline version silently
         * failed and the button appeared on every booking regardless of status.
         */
        formatCanMarkCompleted: function (sStatus, sCustomerId, sDate, sUserId) {
            if (String(sStatus) !== "confirmed") return false;
            if (!sUserId || String(sCustomerId) !== String(sUserId)) return false;
            if (!sDate) return false;
            var dScheduled = new Date(sDate);
            if (isNaN(dScheduled.getTime())) return false;
            var dToday = new Date();
            dToday.setHours(0, 0, 0, 0);
            return dScheduled <= dToday;
        },

        /**
         * Whether this booking's provider may accept or decline it.
         *
         * Was an inline expression binding comparing String(${appData>/user/id})
         * with String(${appData>provider_id}). That mixes an absolute path into a
         * list row's relative context, and when the row renders before auto-login
         * has populated /user/id, String(undefined) === String(undefined) is true —
         * the same latch that made Edit Profile appear on strangers' profiles. Here
         * it would have shown the customer an Accept/Decline pair on their own
         * booking. Computed per row instead, from an id with a storage fallback.
         */
        formatCanRespond: function (sStatus, sProviderId, sUserId) {
            return String(sStatus) === "pending" &&
                   !!sUserId && String(sProviderId) === String(sUserId);
        },

        /** Whether this booking's customer may still cancel it. */
        formatCanCancel: function (sStatus, sCustomerId, sUserId) {
            return String(sStatus) === "pending" &&
                   !!sUserId && String(sCustomerId) === String(sUserId);
        },

        /**
         * Customer confirms the work actually happened. This is the only path that
         * moves a booking to 'completed', which in turn is what unlocks reviewing
         * that helper — before this existed no booking had ever reached that state,
         * so nobody could review anyone.
         */
        onMarkBookingCompleted: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oBooking = oCtx.getObject();
            if (!oBooking || !oBooking.id) return;

            var sBookingId = oBooking.id;
            var sUserId    = this.getModel("appData").getProperty("/user/id");
            var oBundle    = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var that       = this;

            MessageBox.confirm(
                oBundle.getText("markCompletedConfirm",
                    [oBooking.provider_name || oBundle.getText("bookingTheHelper")]), {
                title: oBundle.getText("markCompleted"),
                actions: [MessageBox.Action.OK, MessageBox.Action.CANCEL],
                emphasizedAction: MessageBox.Action.OK,
                onClose: function (sAction) {
                    if (sAction !== MessageBox.Action.OK) return;
                    fetch(API_BASE + "/api/bookings/" + encodeURIComponent(sBookingId) + "/status", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ status: "completed", user_id: sUserId })
                    })
                    .then(function (r) { return r.json(); })
                    .then(function (oData) {
                        if (oData.success) {
                            MessageToast.show(oBundle.getText("bookingCompleted"));
                            that._loadSchedule();
                        } else {
                            MessageToast.show(oData.error || "Could not update this booking.");
                        }
                    })
                    .catch(function () { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
                }
            });
        },

        _updateBookingStatus: function(oEvent, sStatus) {
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var sBookingId = oCtx.getObject().id;
            var sUserId    = this.getModel("appData").getProperty("/user/id");

            fetch(API_BASE + "/api/bookings/" + encodeURIComponent(sBookingId) + "/status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: sStatus, user_id: sUserId })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle()
                        .getText("bookingStatusChanged", [that.formatStatusLabel(sStatus)]));
                    this._loadSchedule();
                }
            }.bind(this))
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("bookingUpdateFailed")); });
        },

        // Status options for the filter popover — order + icons mirror the old chip row.
        _aBookingStatusOptions: [
            { value: "all",       key: "filterAll",       icon: "sap-icon://filter" },
            { value: "pending",   key: "filterPending",   icon: "sap-icon://pending" },
            { value: "confirmed", key: "filterConfirmed", icon: "sap-icon://status-positive" },
            { value: "completed", key: "filterCompleted", icon: "sap-icon://sys-enter-2" },
            { value: "declined",  key: "filterDeclined",  icon: "sap-icon://status-negative" },
            { value: "cancelled", key: "filterCancelled", icon: "sap-icon://sys-cancel" }
        ],

        onBookingStatusMenu: function(oEvent) {
            var oModel   = this.getModel("appData");
            var oBundle  = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var that     = this;
            var sCurrent = oModel.getProperty("/bookingStatusFilter") || "all";

            var oList = new List({
                mode: "SingleSelectMaster",
                showSeparators: "None",
                // SingleSelectMaster consumes item "press"; read the status from
                // the list's selectionChange instead (same pattern as Tasks).
                selectionChange: function(oEvt) {
                    var oItem = oEvt.getParameter("listItem");
                    oModel.setProperty("/bookingStatusFilter", oItem.data("status"));
                    that._applyBookingFilter();
                    oPopover.close();
                },
                items: this._aBookingStatusOptions.map(function(opt) {
                    var oLI = new StandardListItem({
                        title:    oBundle.getText(opt.key),
                        icon:     opt.icon,
                        selected: opt.value === sCurrent
                    });
                    oLI.data("status", opt.value);
                    return oLI;
                })
            });

            var oPopover = new Popover({
                title:        oBundle.getText("bookingFilterByStatus"),
                placement:    "Bottom",
                contentWidth: "220px",
                content:      [oList],
                afterClose:   function() { oPopover.destroy(); }
            });
            oPopover.openBy(oEvent.getSource());
        },

        formatBookingFilterLabel: function(sFilter) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (!sFilter || sFilter === "all") {
                return oBundle.getText("bookingFilterByStatus") + " ▾";
            }
            var oOpt = this._aBookingStatusOptions.filter(function(o) { return o.value === sFilter; })[0];
            var sLabel = oOpt ? oBundle.getText(oOpt.key) : sFilter;
            return oBundle.getText("bookingFilterStatusPrefix") + " " + sLabel + " ✕";
        },

        _applyBookingFilter: function() {
            var oModel = this.getModel("appData");
            var sFilter = oModel.getProperty("/bookingStatusFilter") || "all";
            var aAll = oModel.getProperty("/upcomingBookings") || [];
            var aFiltered;
            if (sFilter === "all") {
                // Hide cancelled bookings from the default view — they are terminal
                aFiltered = aAll.filter(function(b) { return b.status !== "cancelled"; });
            } else {
                aFiltered = aAll.filter(function(b) { return b.status === sFilter; });
            }
            // Precompute the "can be marked completed" flag here rather than in the
            // view. Expression bindings cannot call new Date(), and a parts/formatter
            // binding on the HBox's visible silently did not apply at all (every row
            // stayed visible), so a plain boolean property is the reliable option.
            var sUserId = String(oModel.getProperty("/user/id") ||
                                 localStorage.getItem("helpmate_user_id") || "");
            aFiltered = aFiltered.map(function (b) {
                return Object.assign({}, b, {
                    canMarkCompleted: this.formatCanMarkCompleted(
                        b.status, b.customer_id, b.scheduled_date, sUserId
                    ),
                    canRespond: this.formatCanRespond(b.status, b.provider_id, sUserId),
                    canCancel:  this.formatCanCancel(b.status, b.customer_id, sUserId)
                });
            }.bind(this));

            oModel.setProperty("/filteredBookings", aFiltered);
        },

        _loadSchedule: function() {
            var oModel   = this.getModel("appData");
            var sUserId  = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;

            fetch(API_BASE + "/api/bookings/user/" + encodeURIComponent(sUserId))
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success) {
                        oModel.setProperty("/upcomingBookings", oData.bookings);
                        oModel.setProperty("/bookingCount", oData.newCount || 0);
                        this._applyBookingFilter();
                    }
                }.bind(this))
                .catch(function() { /* keep empty */ });
        },

        _markBookingsSeen: function() {
            var oModel  = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;
            fetch(API_BASE + "/api/bookings/user/" + encodeURIComponent(sUserId) + "/mark-seen", { method: "PUT" })
                .then(function() {
                    oModel.setProperty("/bookingCount", 0);
                })
                .catch(function() { /* silent */ });
        },

        formatBookingDate: function(sDate) {
            if (!sDate) return "";
            try {
                var d = new Date(sDate);
                if (isNaN(d.getTime())) return sDate;
                return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
            } catch (e) { return sDate; }
        },

        formatBookingState: function(sStatus) {
            switch (sStatus) {
                case "confirmed":  return "Success";
                case "declined":   return "Error";
                case "cancelled":  return "Error";
                case "completed":  return "None";
                default:           return "Warning"; // pending
            }
        }

    };
});
