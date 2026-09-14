sap.ui.define([
    "sap/ui/test/opaQunit",
    "sap/ui/test/Opa5",
    "sap/ui/test/actions/Press",
    "helphub/test/integration/pages/DashboardPage",
    "helphub/test/mockserver/MockServer"
], function (opaTest, Opa5, Press, DashboardPage, MockServer) {
    "use strict";
    var VIEW = "helphub.view.Dashboard";
    QUnit.module("Interface polish — empty states, profile and theme", {
        before: function () { MockServer.start(); },
        after: function () { MockServer.stop(); }
    });

    function start(Given) {
        Given.iStartMyUIComponent({ componentConfig: { name: "helphub", manifest: true } });
    }
    function luminance(sColor) {
        var a = sColor.match(/[\d.]+/g).slice(0, 3).map(function (n) {
            var c = Number(n) / 255;
            return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
    }

    opaTest("Selected navigation text keeps readable contrast on the shipped theme", function (Given, When, Then) {
        start(Given);
        When.onTheDashboard.iPressNavTab("tasks");
        Then.waitFor({
            controlType: "sap.m.Button", viewName: VIEW,
            matchers: function (b) { return b.data("tab") === "tasks"; },
            success: function (aButtons) {
                var b = aButtons[0];
                var label = b.getDomRef("content");
                var inner = b.getDomRef("inner");
                var l1 = luminance(window.getComputedStyle(label).color);
                var l2 = luminance(window.getComputedStyle(inner).backgroundColor);
                var ratio = (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
                Opa5.assert.ok(ratio >= 4.5, "Selected task label contrast is " + ratio.toFixed(2) + ":1");
                Opa5.assert.ok(b.getDomRef().getBoundingClientRect().height >= 44, "Navigation has a comfortable touch target");
            }
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Empty conversations hide every date group and offer a working Find Helpers action", function (Given, When, Then) {
        start(Given);
        When.waitFor({
            id: "dashboardPage", viewName: VIEW,
            actions: function (page) {
                var model = page.getModel("appData");
                model.setProperty("/conversations", []);
                model.setProperty("/msgSearch", "");
                model.setProperty("/currentTab", "messages");
                page.getParent().getParent().getController()._categorizeMsgConvos();
            }
        });
        Then.waitFor({
            id: "messagesEmptyState", viewName: VIEW,
            success: function (box) {
                var view = box.getParent();
                while (!view.isA("sap.ui.core.mvc.View")) { view = view.getParent(); }
                ["Pinned", "Today", "Yesterday", "Earlier"].forEach(function (group) {
                    Opa5.assert.notOk(view.byId("msg" + group + "Group").getVisible(), group + " group is hidden");
                });
                var titles = box.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Title"); });
                Opa5.assert.strictEqual(titles[0].getText(), "No messages yet", "Empty title contains no duplicate instructions");
            }
        });
        When.waitFor({ id: "messagesFindHelp", viewName: VIEW, actions: new Press() });
        Then.waitFor({ id: "dashboardPage", viewName: VIEW,
            check: function (page) { return page.getModel("appData").getProperty("/currentTab") === "findHelp"; },
            success: function () { Opa5.assert.ok(true, "Find Helpers returns to the service categories"); }
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Saved hides unused lists and its empty state leads back to discovery", function (Given, When, Then) {
        start(Given);
        When.waitFor({ id: "dashboardPage", viewName: VIEW, actions: function (page) {
            page.getModel("appData").setProperty("/favoriteProviders", []);
            page.getModel("appData").setProperty("/recentlyViewed", []);
        } });
        When.onTheDashboard.iPressNavTab("saved");
        Then.waitFor({ id: "savedEmptyState", viewName: VIEW, success: function (box) {
            var model = box.getModel("appData");
            Opa5.assert.strictEqual(model.getProperty("/favoriteProviders").length, 0, "Empty saved state is shown");
        } });
        Then.waitFor({ id: "recentlyViewedList", viewName: VIEW, visible: false,
            success: function (list) { Opa5.assert.notOk(list.getVisible(), "No empty Recently Viewed section"); }
        });
        When.waitFor({ id: "savedFindHelp", viewName: VIEW, actions: new Press() });
        Then.waitFor({ id: "dashboardPage", viewName: VIEW,
            check: function (page) { return page.getModel("appData").getProperty("/currentTab") === "findHelp"; },
            success: function () { Opa5.assert.ok(true, "Saved CTA opens discovery"); }
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Profile availability remains inside the form without clipped options", function (Given, When, Then) {
        start(Given);
        When.waitFor({ id: "headerAvatar", viewName: VIEW, actions: new Press() });
        Then.waitFor({ id: "profileAvailability", viewName: VIEW, success: function (box) {
            var bounds = box.getDomRef().getBoundingClientRect();
            var buttons = box.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Button"); });
            Opa5.assert.strictEqual(buttons.length, 7, "All seven availability choices remain accessible");
            buttons.forEach(function (button) {
                var rect = button.getDomRef().getBoundingClientRect();
                Opa5.assert.ok(rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1,
                    button.getText() + " fits within the form");
            });
        } });
        Then.iTeardownMyUIComponent();
    });

    // UI5's phone value-help for a MultiComboBox is a stretched Dialog with the
    // search field in its subHeader. Our dialog padding only cleared the title
    // bar, so the first row ("Cleaning" in the profile's category picker) rendered
    // underneath the search field and could not be tapped. The picker type is
    // fixed when the control is constructed, so build one in phone mode here —
    // the CSS under test is global and applies to it the same way.
    opaTest("Phone category picker does not hide its first row under the search field", function (Given, When, Then) {
        start(Given);
        var bPhoneBefore = sap.ui.Device.system.phone;
        var oMcb;
        When.waitFor({ id: "dashboardPage", viewName: VIEW, success: function () {
            sap.ui.Device.system.phone = true;
            oMcb = new sap.m.MultiComboBox({
                items: ["Cleaning", "Gardening", "Handyman", "Elder Care", "Nanny"].map(function (s) {
                    return new sap.ui.core.Item({ key: s, text: s });
                })
            });
            oMcb.placeAt(document.body);
            sap.ui.getCore().applyChanges();
            oMcb.open();
        } });
        Then.waitFor({
            controlType: "sap.m.Dialog", searchOpenDialogs: true,
            // sapMDialogWithSubHeader is written by the renderer, so hasStyleClass()
            // does not see it — match on the aggregation instead.
            matchers: function (d) { return !!d.getSubHeader() && d.isOpen(); },
            success: function (aDlg) {
                var oDlg  = aDlg[0];
                var oSub  = oDlg.getSubHeader() && oDlg.getSubHeader().getDomRef();
                var oFirst = oDlg.getDomRef().querySelector(".sapMListUl > li");
                Opa5.assert.ok(oSub && oFirst, "Picker has a subHeader and a first list row");
                if (oSub && oFirst) {
                    var fSubBottom = oSub.getBoundingClientRect().bottom;
                    var fRowTop    = oFirst.getBoundingClientRect().top;
                    Opa5.assert.ok(fRowTop >= fSubBottom - 1,
                        "First row (top " + Math.round(fRowTop) + "px) starts below the search field (bottom " +
                        Math.round(fSubBottom) + "px): '" + oFirst.textContent.trim() + "'");
                }
                oDlg.close();
                sap.ui.Device.system.phone = bPhoneBefore;
                if (oMcb) { oMcb.destroy(); }
            },
            errorMessage: "Phone-mode MultiComboBox picker dialog did not open"
        });
        Then.iTeardownMyUIComponent();
    });

    opaTest("Saved availability is highlighted after the app boots from a session", function (Given, When, Then) {
        // iStartMyUIComponent boots through Component.applyUser — the same path an
        // app reopen takes. That path set /user/availability but never derived
        // /user/availabilityFlags, which is what the buttons bind their type to,
        // so every button came back Default and the saved choice looked lost.
        start(Given);
        When.waitFor({ id: "headerAvatar", viewName: VIEW, actions: new Press() });
        Then.waitFor({ id: "profileAvailability", viewName: VIEW, success: function (box) {
            var mSelected = { weekdays: true, morning: true, evening: true };
            var aButtons = box.findAggregatedObjects(true, function (c) { return c.isA("sap.m.Button"); });
            Opa5.assert.strictEqual(aButtons.length, 7, "All seven availability choices render");
            aButtons.forEach(function (oButton) {
                var sKey = oButton.data("availKey");
                var bWant = !!mSelected[sKey];
                Opa5.assert.strictEqual(oButton.getType(), bWant ? "Emphasized" : "Default",
                    sKey + " is " + (bWant ? "highlighted" : "not highlighted") + " on boot");
            });
        } });
        Then.iTeardownMyUIComponent();
    });
});
