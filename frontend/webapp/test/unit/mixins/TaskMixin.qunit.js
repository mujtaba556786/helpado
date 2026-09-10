sap.ui.define([
    "helphub/controller/mixins/TaskMixin",
    "helphub/controller/mixins/BookingMixin"
], function (TaskMixin, BookingMixin) {
    "use strict";

    // formatTaskDate used to `return sDate || "Flexible"` — it never formatted
    // anything, so the task detail dialog printed the stored ISO string
    // ("2026-08-01T00:00:00.000Z") straight at the user.

    // Minimal stand-in for the controller's i18n plumbing.
    function withBundle(oMixin, mTexts) {
        return Object.assign(Object.create(oMixin), {
            getOwnerComponent: function () {
                return {
                    getModel: function () {
                        return {
                            getResourceBundle: function () {
                                return {
                                    getText: function (sKey, aArgs) {
                                        var sText = mTexts[sKey] || sKey;
                                        return aArgs ? sText.replace("{0}", aArgs[0]) : sText;
                                    }
                                };
                            }
                        };
                    }
                };
            }
        });
    }

    var TEXTS = {
        taskFlexible: "Flexible",
        taskDueToday: "Today",
        taskDueTomorrow: "Tomorrow",
        taskDueOverdue: "Overdue",
        taskDueInDays: "In {0} days"
    };

    QUnit.module("TaskMixin — task date formatting");

    QUnit.test("an ISO date is rendered as a readable date, never raw", function (assert) {
        var oCtl = withBundle(TaskMixin, TEXTS);
        var sOut = oCtl.formatTaskDate("2026-08-01T00:00:00.000Z");

        assert.strictEqual(sOut.indexOf("T00:00:00"), -1, "no time component leaks through");
        assert.strictEqual(sOut.indexOf("Z"), -1, "no UTC marker leaks through");
        assert.notStrictEqual(sOut, "2026-08-01T00:00:00.000Z", "value is not returned untouched");
        assert.ok(sOut.indexOf("2026") >= 0, "the year survives formatting (" + sOut + ")");
    });

    QUnit.test("a date-only value keeps its calendar day in any timezone", function (assert) {
        var oCtl = withBundle(TaskMixin, TEXTS);
        // Parsing the full ISO string yields a UTC instant, which renders as
        // 31 July for anyone west of Greenwich. Building from the Y-M-D parts
        // keeps the stored day.
        var oDate = oCtl._toCalendarDate("2026-08-01T00:00:00.000Z");
        assert.strictEqual(oDate.getFullYear(), 2026, "year");
        assert.strictEqual(oDate.getMonth(), 7, "month is August");
        assert.strictEqual(oDate.getDate(), 1, "day is the 1st, not the 31st");
    });

    QUnit.test("an empty date falls back to the translated Flexible label", function (assert) {
        var oCtl = withBundle(TaskMixin, TEXTS);
        assert.strictEqual(oCtl.formatTaskDate(""), "Flexible");
        assert.strictEqual(oCtl.formatTaskDate(null), "Flexible");
    });

    QUnit.test("an unparseable value is passed through rather than shown as Invalid Date",
        function (assert) {
            var oCtl = withBundle(TaskMixin, TEXTS);
            assert.strictEqual(oCtl.formatTaskDate("not-a-date"), "not-a-date");
        });

    QUnit.module("TaskMixin — relative due labels");

    function isoDaysFromToday(iDays) {
        var d = new Date();
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + iDays);
        return d.getFullYear() + "-" +
            String(d.getMonth() + 1).padStart(2, "0") + "-" +
            String(d.getDate()).padStart(2, "0");
    }

    QUnit.test("due labels come from the bundle, not hardcoded English", function (assert) {
        var oCtl = withBundle(TaskMixin, TEXTS);
        assert.strictEqual(oCtl.formatTaskDue(isoDaysFromToday(0)), "Today");
        assert.strictEqual(oCtl.formatTaskDue(isoDaysFromToday(1)), "Tomorrow");
        assert.strictEqual(oCtl.formatTaskDue(isoDaysFromToday(-1)), "Overdue");
        assert.strictEqual(oCtl.formatTaskDue(isoDaysFromToday(3)), "In 3 days");
    });

    QUnit.test("a task due today stays 'Today' regardless of the time of day",
        function (assert) {
            // The old code subtracted two instants, so a date stored at midnight
            // read as negative — "Overdue" — for the whole of its own day.
            var oCtl = withBundle(TaskMixin, TEXTS);
            assert.strictEqual(oCtl.formatTaskDue(isoDaysFromToday(0) + "T00:00:00.000Z"), "Today");
        });

    QUnit.module("BookingMixin — booking date formatting");

    QUnit.test("booking dates are not pinned to a US format", function (assert) {
        var sOut = BookingMixin.formatBookingDate("2026-08-01T00:00:00.000Z");
        assert.strictEqual(sOut.indexOf("T00:00:00"), -1, "no raw ISO leaks through");
        assert.ok(sOut.indexOf("2026") >= 0, "formatted output keeps the year (" + sOut + ")");
    });

    QUnit.test("an empty or invalid booking date degrades gracefully", function (assert) {
        assert.strictEqual(BookingMixin.formatBookingDate(""), "");
        assert.strictEqual(BookingMixin.formatBookingDate("nope"), "nope");
    });
});
