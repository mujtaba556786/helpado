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

        _loadTasksFeed: function() {
            var oModel    = this.getModel("appData");
            var sSearch   = oModel.getProperty("/taskSearchQuery") || "";
            var sCategory = oModel.getProperty("/taskCategoryFilter") || "";
            var sUrl = API_BASE + "/api/tasks?status=open";
            if (sCategory) { sUrl += "&category=" + encodeURIComponent(sCategory); }
            if (sSearch)   { sUrl += "&search="   + encodeURIComponent(sSearch); }

            fetch(sUrl)
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success) {
                        oModel.setProperty("/_allTasksFeed", oData.tasks);
                        oModel.setProperty("/openTaskCount", oData.tasks.length || 0);
                        this._updateTaskMarkers(oData.tasks);
                        this._applyTaskFilters();
                    }
                }.bind(this))
                .catch(function() { /* silent */ });
        },

        _loadMyTasks: function() {
            var oModel  = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;

            fetch(API_BASE + "/api/tasks?poster_id=" + encodeURIComponent(sUserId))
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success) {
                        oModel.setProperty("/myTasks", oData.tasks);
                    }
                })
                .catch(function() { /* silent */ });
        },

        onToggleTaskView: function(oEvent) {
            var sMode  = oEvent.getSource().data("mode");
            var oModel = this.getModel("appData");
            oModel.setProperty("/taskViewMode", sMode);
            if (sMode === "mine") {
                this._loadMyTasks();
            } else {
                this._loadTasksFeed();
            }
        },

        onTaskSearch: function(oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue") || "";
            this.getModel("appData").setProperty("/taskSearchQuery", sQuery.trim());
            clearTimeout(this._taskSearchTimer);
            var that = this;
            this._taskSearchTimer = setTimeout(function() { that._loadTasksFeed(); }, 300);
        },

        onTaskCategoryFilter: function(oEvent) {
            var sCat = oEvent.getSource().data("cat");
            this.getModel("appData").setProperty("/taskCategoryFilter", sCat);
            this._loadTasksFeed();
        },

        onTaskCategoryMore: function(oEvent) {
            var oModel   = this.getModel("appData");
            var oBundle  = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var that     = this;
            var sCurrent = oModel.getProperty("/taskCategoryFilter") || "";

            var aServices = oModel.getProperty("/services") || [];
            var aCategories = [
                { label: oBundle.getText("serviceAllTasks"), value: "", icon: "sap-icon://filter" }
            ].concat(aServices.map(function(svc) {
                return { label: svc.label, value: svc.name, icon: svc.icon };
            }));

            var oList = new List({
                mode: "SingleSelectMaster",
                showSeparators: "None",
                // In SingleSelectMaster the item "press" event doesn't fire on tap
                // (selection consumes it), so the filter did nothing. Use the list's
                // selectionChange and read the category from the item's custom data.
                selectionChange: function(oEvt) {
                    var oItem = oEvt.getParameter("listItem");
                    oModel.setProperty("/taskCategoryFilter", oItem.data("cat"));
                    that._loadTasksFeed();
                    oPopover.close();
                },
                items: aCategories.map(function(cat) {
                    var oLI = new StandardListItem({
                        title: cat.label,
                        icon:  cat.icon,
                        selected: cat.value === sCurrent
                    });
                    oLI.data("cat", cat.value);
                    return oLI;
                })
            });

            var oPopover = new Popover({
                title:        oBundle.getText("taskFilterByCategory"),
                placement:    "Bottom",
                contentWidth: "220px",
                content:      [oList],
                afterClose:   function() { oPopover.destroy(); }
            });
            oPopover.openBy(oEvent.getSource());
        },

        onOpenPostTask: function() {
            var oModel = this.getModel("appData");
            oModel.setProperty("/taskForm", {
                title: "", description: "", category: "", budget: "", task_date: "", location: ""
            });
            this._getPostTaskDialog().then(function(d) { d.open(); }.bind(this));
        },

        // ── Inline label formatters ──────────────────────────────────────────
        // These strings used to sit as English literals inside {= } expression
        // bindings in the views ('Open budget', 'Flexible', 'OPEN', 'Posted by '
        // + name). Literals inside an expression are invisible to a grep for
        // hardcoded text and to the i18n coverage test, which is how they
        // survived the sweep. Concatenating a name is also wrong in any language
        // whose word order differs, so it goes through a {0} placeholder.
        formatTaskStatusLabel: function (sStatus) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (sStatus === "open")     { return oBundle.getText("taskStatusOpen"); }
            if (sStatus === "assigned") { return oBundle.getText("taskStatusAssigned"); }
            return oBundle.getText("taskStatusClosed");
        },

        formatTaskBudget: function (vBudget) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return vBudget ? this.formatCurrency(vBudget) : oBundle.getText("taskOpenBudget");
        },

        formatTaskDate: function (sDate) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return sDate || oBundle.getText("taskFlexible");
        },

        formatTaskLocation: function (sLocation) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return sLocation || oBundle.getText("taskNotSpecified");
        },

        formatPostedBy: function (sName) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            return oBundle.getText("taskPostedBy", [sName || ""]);
        },

        formatTaskCategoryFilter: function (sCategory) {
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            // The ✕ signals "tap to clear" and stays out of the bundle so
            // translators cannot lose it.
            return sCategory
                ? oBundle.getText("taskFilterCategoryPrefix", [sCategory]) + " \u2715"
                : oBundle.getText("taskFilterCategory");
        },

        onConfirmPostTask: function() {
            var oModel  = this.getModel("appData");
            var oForm   = oModel.getProperty("/taskForm");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");

            if (!oForm.title || !oForm.title.trim()) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskErrNoTitle")); return; }
            if (!oForm.category) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskErrNoCategory")); return; }
            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }

            var that     = this;
            var oUserLoc = oModel.getProperty("/user/location");
            fetch(API_BASE + "/api/tasks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    poster_id:   sUserId,
                    title:       oForm.title.trim(),
                    description: oForm.description,
                    category:    oForm.category,
                    budget:      oForm.budget ? parseFloat(oForm.budget) : null,
                    task_date:   oForm.task_date || null,
                    location:    oForm.location,
                    lat:         oUserLoc ? oUserLoc.lat : null,
                    lng:         oUserLoc ? oUserLoc.lng : null
                })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    that._getPostTaskDialog().then(function(d) { d.close(); });
                    MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskPosted"));
                    that._loadTasksFeed();
                    that._loadMyTasks();
                } else {
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle()
                        .getText("errFailed", [oData.error || ""]));
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
        },

        onClosePostTask: function() {
            this._getPostTaskDialog().then(function(d) { d.close(); }.bind(this));
        },

        onTaskPress: function(oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oTask  = oCtx.getObject();
            var oModel = this.getModel("appData");
            oModel.setProperty("/selectedTask", oTask);
            oModel.setProperty("/taskApplications", []);

            var that = this;
            fetch(API_BASE + "/api/tasks/" + encodeURIComponent(oTask.id))
                .then(function(r) { return r.json(); })
                .then(function(oData) {
                    if (oData.success) {
                        oModel.setProperty("/selectedTask", oData.task);
                        oModel.setProperty("/taskApplications", oData.applications || []);
                    }
                    that._getTaskDetailDialog().then(function(d) { d.open(); });
                })
                .catch(function() { that._getTaskDetailDialog().then(function(d) { d.open(); }); });
        },

        onApplyToTask: function() {
            var oModel  = this.getModel("appData");
            var sTaskId = oModel.getProperty("/selectedTask/id");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");

            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }

            var that = this;
            fetch(API_BASE + "/api/tasks/" + encodeURIComponent(sTaskId) + "/apply", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider_id: sUserId })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskApplied"));
                    that._getTaskDetailDialog().then(function(d) { d.close(); });
                    that._loadTasksFeed();
                } else {
                    MessageToast.show(oData.error || "Could not apply.");
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
        },

        onAssignProvider: function(oEvent) {
            var oCtx = oEvent.getSource().getParent().getParent().getBindingContext("appData");
            if (!oCtx) return;
            var sProviderId = oCtx.getObject().provider_id;
            var oModel      = this.getModel("appData");
            var sTaskId     = oModel.getProperty("/selectedTask/id");

            var that = this;
            fetch(API_BASE + "/api/tasks/" + encodeURIComponent(sTaskId) + "/assign", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider_id: sProviderId })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskAssigned"));
                    that._getTaskDetailDialog().then(function(d) { d.close(); });
                    that._loadTasksFeed();
                    that._loadMyTasks();
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskAssignFailed")); });
        },

        onCompleteTask: function() {
            var oModel  = this.getModel("appData");
            var sTaskId = oModel.getProperty("/selectedTask/id");

            var that = this;
            fetch(API_BASE + "/api/tasks/" + encodeURIComponent(sTaskId) + "/status", {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "completed" })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    MessageToast.show(that.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskCompleted"));
                    that._getTaskDetailDialog().then(function(d) { d.close(); });
                    that._loadTasksFeed();
                    that._loadMyTasks();
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskUpdateFailed")); });
        },

        onDeleteTask: function() {
            var oModel  = this.getModel("appData");
            var sTaskId = oModel.getProperty("/selectedTask/id");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var sTitle  = oModel.getProperty("/selectedTask/title") || "this task";

            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }

            var that = this;
            MessageBox.confirm(oBundle.getText("taskDeleteConfirm", [sTitle]), {
                title: oBundle.getText("taskDeleteTitle"),
                onClose: function(sAction) {
                    if (sAction !== MessageBox.Action.OK) return;
                    fetch(API_BASE + "/api/tasks/" + encodeURIComponent(sTaskId), {
                        method: "DELETE",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ user_id: sUserId })
                    })
                    .then(function(r) { return r.json(); })
                    .then(function(oData) {
                        if (oData.success) {
                            MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskDeleted"));
                            that._getTaskDetailDialog().then(function(d) { d.close(); });
                            that._loadTasksFeed();
                            that._loadMyTasks();
                        } else {
                            MessageToast.show(oData.error || "Could not delete task.");
                        }
                    })
                    .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
                }
            });
        },

        onCloseTaskDetail: function() {
            this._getTaskDetailDialog().then(function(d) { d.close(); }.bind(this));
        },

        onMessageTaskPoster: function() {
            var oModel      = this.getModel("appData");
            var sUserId     = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var sPosterId   = oModel.getProperty("/selectedTask/poster_id");
            var sPosterName = oModel.getProperty("/selectedTask/poster_name") || "Task Poster";

            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }
            if (sUserId === sPosterId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("taskOwnTask")); return; }

            var that = this;
            this._getTaskDetailDialog().then(function(d) { d.close(); }.bind(this));
            fetch(API_BASE + "/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user1_id: sUserId, user2_id: sPosterId })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    that._currentConvoId = oData.conversation.id;
                    that._currentConvoOtherName = sPosterName;
                    that._currentConvoOtherId = sPosterId;
                    that._openDmChatForConversation(oData.conversation.id, sPosterName);
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("dmStartFailed")); });
        },

        onMessageApplicant: function(oEvent) {
            var oCtx = oEvent.getSource().getParent().getParent().getParent().getBindingContext("appData");
            if (!oCtx) return;
            var oApplicant    = oCtx.getObject();
            var oModel        = this.getModel("appData");
            var sUserId       = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var sProviderId   = oApplicant.provider_id;
            var sProviderName = oApplicant.provider_name || "Applicant";

            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }

            var that = this;
            this._getTaskDetailDialog().then(function(d) { d.close(); }.bind(this));
            fetch(API_BASE + "/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user1_id: sUserId, user2_id: sProviderId })
            })
            .then(function(r) { return r.json(); })
            .then(function(oData) {
                if (oData.success) {
                    that._currentConvoId = oData.conversation.id;
                    that._currentConvoOtherName = sProviderName;
                    that._currentConvoOtherId = sProviderId;
                    that._openDmChatForConversation(oData.conversation.id, sProviderName);
                }
            })
            .catch(function() { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("dmStartFailed")); });
        },

        formatTaskState: function(sStatus) {
            switch (sStatus) {
                case "open":      return "Success";
                case "assigned":  return "Warning";
                case "completed": return "None";
                default:          return "Information";
            }
        },

        formatPostedTime: function(sCreatedAt) {
            if (!sCreatedAt) return "";
            var oNow  = new Date();
            var oDate = new Date(sCreatedAt);
            var iDiff = Math.floor((oNow - oDate) / 1000); // seconds
            if (iDiff < 60)   return "Just now";
            if (iDiff < 3600) return Math.floor(iDiff / 60) + " min ago";
            if (iDiff < 86400) return Math.floor(iDiff / 3600) + " hr ago";
            if (iDiff < 172800) return "Yesterday";
            if (iDiff < 604800) return Math.floor(iDiff / 86400) + " days ago";
            return oDate.toLocaleDateString([], { month: "short", day: "numeric" });
        },

        formatTaskDue: function(sDate) {
            if (!sDate) return "";
            var oNow  = new Date();
            var oDue  = new Date(sDate);
            var iDiff = Math.floor((oDue - oNow) / 86400000);
            if (iDiff === 0)  return "Today";
            if (iDiff === 1)  return "Tomorrow";
            if (iDiff < 0)   return "Overdue";
            if (iDiff < 7)   return "In " + iDiff + " days";
            return oDue.toLocaleDateString([], { month: "short", day: "numeric" });
        },

        onTaskFilterMenu: function(oEvent) {
            var oModel  = this.getModel("appData");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var that    = this;
            sap.ui.require(["sap/m/ActionSheet", "sap/m/Button"], function(ActionSheet, Button) {
                var sBudget = oModel.getProperty("/taskBudgetFilter") || "";
                var sSort   = oModel.getProperty("/taskSort") || "newest";
                var oSheet  = new ActionSheet({
                    title: "Filter & Sort",
                    showCancelButton: true,
                    buttons: [
                        new Button({ text: oBundle.getText("taskBudgetAny"),    icon: sBudget === ""       ? "sap-icon://accept" : "sap-icon://money-bills",  type: sBudget === ""       ? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskBudgetFilter", "");       that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskBudgetUnder50"),icon: sBudget === "<€50"   ? "sap-icon://accept" : "sap-icon://money-bills",  type: sBudget === "<€50"   ? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskBudgetFilter", "<€50");   that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskBudget50to100"),icon: sBudget === "€50–100"? "sap-icon://accept" : "sap-icon://money-bills",  type: sBudget === "€50–100"? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskBudgetFilter", "€50–100"); that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskBudgetOver100"),icon: sBudget === ">€100"  ? "sap-icon://accept" : "sap-icon://money-bills",  type: sBudget === ">€100"  ? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskBudgetFilter", ">€100");   that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskSortNewest"),     icon: sSort === "newest"      ? "sap-icon://accept" : "sap-icon://sort-descending", type: sSort === "newest"      ? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskSort", "newest");      that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskSortHighestPay"), icon: sSort === "budget_high" ? "sap-icon://accept" : "sap-icon://high-priority",   type: sSort === "budget_high" ? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskSort", "budget_high"); that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskSortLowestPay"),  icon: sSort === "budget_low"  ? "sap-icon://accept" : "sap-icon://down",             type: sSort === "budget_low"  ? "Emphasized" : "Default", press: function() { oModel.setProperty("/taskSort", "budget_low");  that._applyTaskFilters(); oSheet.close(); } })
                    ]
                });
                oSheet.openBy(oEvent.getSource());
            });
        },

        onTaskBudgetMenu: function(oEvent) {
            var oModel  = this.getModel("appData");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var that    = this;
            sap.ui.require(["sap/m/ActionSheet", "sap/m/Button"], function(ActionSheet, Button) {
                var sBudget = oModel.getProperty("/taskBudgetFilter") || "";
                var oSheet = new ActionSheet({
                    title: oBundle.getText("taskBudgetAny"),
                    showCancelButton: true,
                    buttons: [
                        new Button({ text: oBundle.getText("taskBudgetAny"),     icon: "sap-icon://money-bills", press: function() { oModel.setProperty("/taskBudgetFilter", "");       that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskBudgetUnder50"), icon: "sap-icon://money-bills", press: function() { oModel.setProperty("/taskBudgetFilter", "<€50");   that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskBudget50to100"), icon: "sap-icon://money-bills", press: function() { oModel.setProperty("/taskBudgetFilter", "€50–100"); that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskBudgetOver100"), icon: "sap-icon://money-bills", press: function() { oModel.setProperty("/taskBudgetFilter", ">€100");   that._applyTaskFilters(); oSheet.close(); } })
                    ]
                });
                oSheet.openBy(oEvent.getSource());
            });
        },

        onTaskSortMenu: function(oEvent) {
            var oModel  = this.getModel("appData");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var that    = this;
            sap.ui.require(["sap/m/ActionSheet", "sap/m/Button"], function(ActionSheet, Button) {
                var oSheet = new ActionSheet({
                    title: "Sort Tasks",
                    showCancelButton: true,
                    buttons: [
                        new Button({ text: oBundle.getText("taskSortNewest"),     icon: "sap-icon://sort-descending", press: function() { oModel.setProperty("/taskSort", "newest");      that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskSortHighestPay"), icon: "sap-icon://high-priority",   press: function() { oModel.setProperty("/taskSort", "budget_high"); that._applyTaskFilters(); oSheet.close(); } }),
                        new Button({ text: oBundle.getText("taskSortLowestPay"),  icon: "sap-icon://down",            press: function() { oModel.setProperty("/taskSort", "budget_low");  that._applyTaskFilters(); oSheet.close(); } })
                    ]
                });
                oSheet.openBy(oEvent.getSource());
            });
        },

        _applyTaskFilters: function() {
            var oModel  = this.getModel("appData");
            var sBudget = oModel.getProperty("/taskBudgetFilter") || "";
            var sSort   = oModel.getProperty("/taskSort") || "newest";
            var aAll    = (oModel.getProperty("/_allTasksFeed") || []).slice();

            // Budget filter
            if (sBudget === "<€50") {
                aAll = aAll.filter(function(t) { return !t.budget || t.budget < 50; });
            } else if (sBudget === "€50–100") {
                aAll = aAll.filter(function(t) { return t.budget >= 50 && t.budget <= 100; });
            } else if (sBudget === ">€100") {
                aAll = aAll.filter(function(t) { return t.budget > 100; });
            }

            // Sort
            if (sSort === "budget_high") {
                aAll.sort(function(a, b) { return (b.budget || 0) - (a.budget || 0); });
            } else if (sSort === "budget_low") {
                aAll.sort(function(a, b) { return (a.budget || 0) - (b.budget || 0); });
            } else {
                aAll.sort(function(a, b) { return new Date(b.created_at || 0) - new Date(a.created_at || 0); });
            }

            oModel.setProperty("/tasksFeed", aAll);
        }

    };
});
