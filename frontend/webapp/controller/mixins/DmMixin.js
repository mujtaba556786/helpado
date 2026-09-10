sap.ui.define([
    "sap/m/MessageToast",
    "helphub/config"
], function (MessageToast, Config) {
    "use strict";

    var API_BASE = Config.API_BASE;

    return {

        _loadConversations: function () {
            // Keep empty groups hidden even before a response or after a failed refresh.
            this._categorizeMsgConvos();
            var oModel = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;
            var that = this;

            fetch(API_BASE + "/api/conversations/" + encodeURIComponent(sUserId))
                .then(function (r) { return r.json(); })
                .then(function (oData) {
                    if (oData.success) {
                        oModel.setProperty("/conversations", oData.conversations);
                        oModel.setProperty("/unreadDmCount", oData.totalUnread || 0);
                        that._categorizeMsgConvos();
                    }
                })
                .catch(function () { /* silent */ });
        },

        _loadUnreadDmCount: function () {
            var oModel = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            if (!sUserId) return;

            fetch(API_BASE + "/api/messages/unread-count/" + encodeURIComponent(sUserId))
                .then(function (r) { return r.json(); })
                .then(function (oData) {
                    if (oData.success) {
                        oModel.setProperty("/unreadDmCount", oData.count || 0);
                    }
                })
                .catch(function () { /* silent */ });
        },

        onStartDm: function () {
            var oModel = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var sProviderId = oModel.getProperty("/selectedProfile/id");
            var sProviderName = oModel.getProperty("/selectedProfile/name") || "Helper";

            if (!sUserId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errLoginFirst")); return; }
            if (sUserId === sProviderId) { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("dmSelfMessage")); return; }

            var that = this;
            fetch(API_BASE + "/api/conversations", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user1_id: sUserId, user2_id: sProviderId })
            })
                .then(function (r) { return r.json(); })
                .then(function (oData) {
                    if (oData.success) {
                        that._getProfileDialog().then(function (d) { d.close(); });
                        that._currentConvoId = oData.conversation.id;
                        that._currentConvoOtherName = sProviderName;
                        that._currentConvoOtherId = sProviderId;
                        that._openDmChatForConversation(oData.conversation.id, sProviderName);
                    }
                })
                .catch(function () { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("dmStartFailed")); });
        },

        onOpenDmChat: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oConvo = oCtx.getObject();
            this._currentConvoId = oConvo.id;
            this._currentConvoOtherName = oConvo.other_name;
            this._currentConvoOtherId = oConvo.other_id;
            this._openDmChatForConversation(oConvo.id, oConvo.other_name);
        },

        _openDmChatForConversation: function (sConvoId, sOtherName) {
            var that = this;
            var oModel = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");

            oModel.setProperty("/currentDmOtherName", sOtherName || "");
            // Drop the previous conversation so it cannot flash in this one
            // while the new messages are still loading.
            this._dmMessages = [];
            oModel.setProperty("/dmMessages", []);

            this._getDmChatDialog().then(function (oDialog) {
                oDialog.open();
            }.bind(this));

            var fnLoadMessages = function () {
                fetch(API_BASE + "/api/messages/" + encodeURIComponent(sConvoId))
                    .then(function (r) { return r.json(); })
                    .then(function (oData) {
                        if (oData.success) {
                            var iPrev = (that._dmMessages || []).length;
                            that._dmMessages = oData.messages;
                            that._setDmMessages();
                            if (oData.messages.length > iPrev) {
                                fetch(API_BASE + "/api/messages/" + encodeURIComponent(sConvoId) + "/read", {
                                    method: "PUT",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ user_id: sUserId })
                                }).catch(function () { });
                                that._loadUnreadDmCount();
                            }
                        }
                    })
                    .catch(function () { if (!that._dmMessages) { that._dmMessages = []; that._setDmMessages(); } });
            };

            fnLoadMessages();
            // Auto-refresh messages while chat is open
            if (this._dmRefreshInterval) { clearInterval(this._dmRefreshInterval); }
            this._dmRefreshInterval = setInterval(fnLoadMessages, 8000);
        },

        // Normalizes raw messages into the appData model so the List in
        // DmChatDialog renders them. Replaces the old raw-HTML/inline-style
        // rendering: UI5 Text escapes content for us, and the bubble styling
        // now comes from the theme instead of hardcoded colours.
        _setDmMessages: function () {
            var oModel = this.getModel("appData");
            if (!oModel) return;

            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var oBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();

            var aMessages = (this._dmMessages || []).map(function (m) {
                var bOwn = m.sender_id === sUserId;
                var bRead = !!m.is_read;
                return {
                    content: m.content || "",
                    isOwn: bOwn,
                    isOwnStr: bOwn ? "true" : "false",
                    time: m.created_at
                        ? new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                        : "",
                    ticks: bOwn ? (bRead ? "\u2713\u2713" : "\u2713") : "",
                    tickTooltip: bOwn
                        ? oBundle.getText(bRead ? "messageRead" : "messageSent")
                        : ""
                };
            });

            oModel.setProperty("/dmMessages", aMessages);
            this._scrollDmToBottom();
        },

        _scrollDmToBottom: function () {
            var oScroll = this.byId("dmScrollContainer");
            if (!oScroll) return;
            // Wait for the List to re-render the new items before scrolling.
            setTimeout(function () { oScroll.scrollTo(0, 99999, 0); }, 50);
        },

        onDmSend: function () {
            var oInput = this.byId("dmInput");
            var sText = oInput.getValue().trim();
            if (!sText) return;

            var oModel = this.getModel("appData");
            var sUserId = oModel.getProperty("/user/id") || localStorage.getItem("helpmate_user_id");
            var sConvoId = this._currentConvoId;
            if (!sConvoId || !sUserId) return;

            oInput.setValue("");

            if (!this._dmMessages) { this._dmMessages = []; }
            this._dmMessages.push({
                sender_id: sUserId,
                content: sText,
                is_read: 0,
                created_at: new Date().toISOString()
            });
            this._setDmMessages();

            var that = this;
            fetch(API_BASE + "/api/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    conversation_id: sConvoId,
                    sender_id: sUserId,
                    content: sText
                })
            })
                .then(function (r) { return r.json(); })
                .then(function (oData) {
                    if (!oData.success) {
                        MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("dmSendFailed"));
                    }
                })
                .catch(function () { MessageToast.show(this.getOwnerComponent().getModel("i18n").getResourceBundle().getText("errNoServer")); });
        },

        onDmQuickReply: function (oEvent) {
            var sText = oEvent.getSource().getText().replace(/\s*[\u{1F600}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}]+$/u, "").trim();
            this.byId("dmInput").setValue(sText);
            this.onDmSend();
        },

        onCloseDmChat: function () {
            if (this._dmRefreshInterval) {
                clearInterval(this._dmRefreshInterval);
                this._dmRefreshInterval = null;
            }
            this._getDmChatDialog().then(function (d) { d.close(); }.bind(this));
            this._dmMessages = [];
            this.getModel("appData").setProperty("/dmMessages", []);
            this._loadConversations();
        },

        formatConvoTime: function (sTime) {
            if (!sTime) return "";
            var d = new Date(sTime);
            var now = new Date();
            var oYest = new Date(now); oYest.setDate(oYest.getDate() - 1);
            if (d.toDateString() === now.toDateString()) {
                return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            }
            if (d.toDateString() === oYest.toDateString()) {
                return "Yesterday";
            }
            // Within this year: "Apr 9"
            if (d.getFullYear() === now.getFullYear()) {
                return d.toLocaleDateString([], { month: "short", day: "numeric" });
            }
            // Older: "Apr 9, 2024"
            return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
        },

        _getPinnedIds: function () {
            try {
                return JSON.parse(localStorage.getItem("helpmate_pinned_convos") || "[]");
            } catch (e) { return []; }
        },

        _categorizeMsgConvos: function () {
            var oModel = this.getModel("appData");
            var aAll = oModel.getProperty("/conversations") || [];
            var sSearch = (oModel.getProperty("/msgSearch") || "").toLowerCase().trim();
            var aPinned = this._getPinnedIds();

            // Sort newest first
            aAll = aAll.slice().sort(function (a, b) {
                return new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0);
            });

            // Annotate each item
            aAll = aAll.map(function (c) {
                return Object.assign({}, c, {
                    _initials: (c.other_name || "?").charAt(0).toUpperCase(),
                    _pinned: aPinned.indexOf(String(c.id)) !== -1
                });
            });

            // Apply search filter
            if (sSearch) {
                aAll = aAll.filter(function (c) {
                    return (c.other_name || "").toLowerCase().indexOf(sSearch) !== -1
                        || (c.last_message || "").toLowerCase().indexOf(sSearch) !== -1;
                });
            }

            var now = new Date();
            var sTodayStr = now.toDateString();
            var oYest = new Date(now); oYest.setDate(oYest.getDate() - 1);
            var sYestStr = oYest.toDateString();

            var aMsgPinned = [], aMsgToday = [], aMsgYesterday = [], aMsgEarlier = [];

            aAll.forEach(function (c) {
                if (c._pinned) { aMsgPinned.push(c); return; }
                var sD = c.last_message_at ? new Date(c.last_message_at).toDateString() : "";
                if (sD === sTodayStr)       { aMsgToday.push(c); }
                else if (sD === sYestStr)   { aMsgYesterday.push(c); }
                else                        { aMsgEarlier.push(c); }
            });

            oModel.setProperty("/msgPinned",    aMsgPinned);
            oModel.setProperty("/msgToday",     aMsgToday);
            oModel.setProperty("/msgYesterday", aMsgYesterday);
            oModel.setProperty("/msgEarlier",   aMsgEarlier);

            oModel.setProperty("/msgPinnedVisible",    aMsgPinned.length > 0);
            oModel.setProperty("/msgTodayVisible",     aMsgToday.length > 0);
            oModel.setProperty("/msgYesterdayVisible", aMsgYesterday.length > 0);
            oModel.setProperty("/msgEarlierVisible",   aMsgEarlier.length > 0);

            var bAnyVisible = aMsgPinned.length + aMsgToday.length + aMsgYesterday.length + aMsgEarlier.length > 0;
            var aConvos = oModel.getProperty("/conversations") || [];
            oModel.setProperty("/msgEmptyNoConvos", aConvos.length === 0 && !sSearch);
            oModel.setProperty("/msgEmptySearch",   !bAnyVisible && !!sSearch);
        },

        onMsgSearch: function () {
            this._categorizeMsgConvos();
        },

        onMsgLongPress: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext("appData");
            if (!oCtx) return;
            var oConvo = oCtx.getObject();
            var aPinned = this._getPinnedIds();
            var sId = String(oConvo.id);
            var bIsPinned = aPinned.indexOf(sId) !== -1;
            var that = this;

            sap.ui.require(["sap/m/ActionSheet", "sap/m/Button"], function (ActionSheet, Button) {
                var oSheet = new ActionSheet({
                    title: oConvo.other_name || "Conversation",
                    buttons: [
                        new Button({
                            text: bIsPinned ? "📌 Unpin conversation" : "📌 Pin conversation",
                            press: function () {
                                if (bIsPinned) {
                                    aPinned = aPinned.filter(function (id) { return id !== sId; });
                                } else {
                                    aPinned.push(sId);
                                }
                                localStorage.setItem("helpmate_pinned_convos", JSON.stringify(aPinned));
                                that._categorizeMsgConvos();
                                oSheet.close();
                            }
                        })
                    ],
                    cancelButton: new Button({ text: "Cancel", press: function () { oSheet.close(); } })
                });
                oSheet.openBy(oEvent.getSource());
            });
        }

    };
});
