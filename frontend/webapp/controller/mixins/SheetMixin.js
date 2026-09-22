sap.ui.define([
    "sap/m/Dialog",
    "sap/m/Button",
    "sap/m/Text",
    "sap/m/VBox",
    "sap/m/HBox",
    "sap/ui/core/HTML"
], function (Dialog, Button, Text, VBox, HBox, HTML) {
    "use strict";

    /**
     * Bottom sheets, the way a phone messenger does them.
     *
     * The stock pair — sap.m.ActionSheet on the bubble, then sap.m.MessageBox —
     * rendered a blank title band, a pink "Reject" button with green text and a
     * question-mark confirm whose only emphasised button was Cancel. Both are
     * replaced by ONE sap.m.Dialog carrying the class hhSheet, which the theme
     * CSS pins to the bottom edge with rounded top corners (see style.css).
     *
     *   _openSheet({ actions: [{ text, icon, danger, press }], cancelText })
     *   _confirmSheet({ title, text, confirmText, cancelText, onConfirm })
     *
     * Every sheet is created on open and destroyed on close: nothing to keep in
     * sync, nothing to leak. Destructive rows/buttons carry hhSheetDanger and are
     * the only coloured element on the sheet.
     */
    return {

        _openSheet: function (oOpts) {
            var oDialog;
            var aRows = (oOpts.actions || []).map(function (oAct) {
                var oBtn = new Button({
                    text: oAct.text,
                    icon: oAct.icon,
                    type: "Transparent",
                    width: "100%",
                    press: function () {
                        oDialog.close();
                        if (oAct.press) { oAct.press(); }
                    }
                }).addStyleClass("hhSheetRow");
                if (oAct.danger) { oBtn.addStyleClass("hhSheetDanger"); }
                if (oAct.id) { oBtn.data("sheet", oAct.id); }
                return oBtn;
            });
            var oCancel = new Button({
                text: oOpts.cancelText,
                type: "Transparent",
                width: "100%",
                press: function () { oDialog.close(); }
            }).addStyleClass("hhSheetRow hhSheetCancel");

            oDialog = new Dialog({
                showHeader: false,
                horizontalScrolling: false,
                verticalScrolling: false,
                content: [
                    new HTML({ content: "<div class='hhSheetHandle'></div>" }),
                    new VBox({ items: aRows }).addStyleClass("hhSheetRows"),
                    oCancel
                ],
                afterClose: function () { oDialog.destroy(); }
            }).addStyleClass("hhSheet sapUiNoContentPadding");
            if (oOpts.id) { oDialog.data("sheet", oOpts.id); }
            this.getView().addDependent(oDialog);
            oDialog.open();
            return oDialog;
        },

        _confirmSheet: function (oOpts) {
            var oDialog;
            var oConfirm = new Button({
                text: oOpts.confirmText,
                type: "Transparent",
                press: function () {
                    oDialog.close();
                    if (oOpts.onConfirm) { oOpts.onConfirm(); }
                }
            }).addStyleClass("hhSheetDanger hhSheetConfirmBtn");
            var oCancel = new Button({
                text: oOpts.cancelText,
                type: "Transparent",
                press: function () { oDialog.close(); if (oOpts.onCancel) { oOpts.onCancel(); } }
            }).addStyleClass("hhSheetCancelBtn");

            oDialog = new Dialog({
                showHeader: false,
                horizontalScrolling: false,
                verticalScrolling: false,
                content: [
                    new HTML({ content: "<div class='hhSheetHandle'></div>" }),
                    new VBox({
                        items: [
                            new Text({ text: oOpts.title }).addStyleClass("hhSheetTitle"),
                            new Text({ text: oOpts.text }).addStyleClass("hhSheetText"),
                            new HBox({ justifyContent: "End", items: [oCancel, oConfirm] }).addStyleClass("hhSheetButtons")
                        ]
                    }).addStyleClass("hhSheetBody")
                ],
                afterClose: function () { oDialog.destroy(); }
            }).addStyleClass("hhSheet hhSheetConfirm sapUiNoContentPadding");
            if (oOpts.id) { oDialog.data("sheet", oOpts.id); }
            this.getView().addDependent(oDialog);
            oDialog.open();
            return oDialog;
        }
    };
});
