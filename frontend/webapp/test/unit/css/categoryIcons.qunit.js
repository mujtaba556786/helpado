/**
 * The six hand-drawn category icons (img/*.svg) sit next to SAP icon-font
 * glyphs on the dashboard tiles and must read as the same set:
 *
 *   - same whitespace: SAP glyphs fill 88-100% of their em box, so each SVG's
 *     ink must fill 85-100% of its viewBox in its larger dimension and be
 *     centred (they used to fill 62-90% and sit low, so a 26px SVG could look
 *     smaller than a 20px glyph — or bigger, depending on the drawing);
 *   - same colour: the .fiSvcIcon green #10b981, not a separate brand green;
 *   - details cut out (mask), never painted white on top, so hover — which
 *     turns the whole mark white — does not lose them.
 *
 * Measured on a canvas, the same way the dashboard renders them.
 */
sap.ui.define([], function () {
    "use strict";

    var ICONS = ["cleaning", "gardening", "eldercare", "nanny", "pet", "groceries"];
    var N = 128;

    QUnit.module("img/*.svg — category icons match SAP glyph metrics");

    function inkBounds(oCtx) {
        var d = oCtx.getImageData(0, 0, N, N).data, x0 = N, y0 = N, x1 = -1, y1 = -1, x, y;
        for (y = 0; y < N; y++) {
            for (x = 0; x < N; x++) {
                if (d[(y * N + x) * 4 + 3] > 40) {
                    if (x < x0) { x0 = x; } if (x > x1) { x1 = x; }
                    if (y < y0) { y0 = y; } if (y > y1) { y1 = y; }
                }
            }
        }
        return { w: (x1 - x0 + 1) / N, h: (y1 - y0 + 1) / N, cx: (x0 + x1) / 2 / N, cy: (y0 + y1) / 2 / N };
    }

    ICONS.forEach(function (sName) {
        QUnit.test(sName + ".svg fills its box like a SAP glyph, centred, in the SAP green, with cut-out details", function (assert) {
            var done = assert.async();
            var oImg = new Image();
            oImg.onload = function () {
                var oCanvas = document.createElement("canvas");
                oCanvas.width = oCanvas.height = N;
                var oCtx = oCanvas.getContext("2d");
                oCtx.drawImage(oImg, 0, 0, N, N);
                var o = inkBounds(oCtx);
                var fFill = Math.max(o.w, o.h);
                assert.ok(fFill >= 0.85 && fFill <= 1.0,
                    "ink fills " + Math.round(fFill * 100) + "% of the box in its larger dimension (SAP glyphs: 88-100%)");
                assert.ok(Math.abs(o.cx - 0.5) <= 0.06 && Math.abs(o.cy - 0.5) <= 0.06,
                    "ink is centred (centre at " + o.cx.toFixed(2) + ", " + o.cy.toFixed(2) + ")");
                done();
            };
            oImg.onerror = function () { assert.ok(false, "could not load img/" + sName + ".svg"); done(); };
            oImg.src = "../../img/" + sName + ".svg";
        });

        QUnit.test(sName + ".svg source uses only the SAP green and masks its details", function (assert) {
            var done = assert.async();
            fetch("../../img/" + sName + ".svg").then(function (r) { return r.text(); }).then(function (sSvg) {
                var aFills = (sSvg.match(/fill="#[0-9a-fA-F]{3,6}"/g) || []).map(function (s) { return s.slice(6, -1).toLowerCase(); });
                var aPaint = aFills.filter(function (s) { return s !== "#fff" && s !== "#000"; });
                assert.ok(aPaint.length > 0 && aPaint.every(function (s) { return s === "#10b981"; }),
                    "every painted fill is #10b981 (got " + JSON.stringify(aPaint) + ")");
                assert.ok(!/fill="#ffffff"/i.test(sSvg.replace(/<mask[\s\S]*?<\/mask>/, "")),
                    "no white shape painted on top of the mark outside the mask");
                assert.ok(/viewBox="[-\d.]+ [-\d.]+ ([\d.]+) \1"/.test(sSvg), "viewBox is square");
                done();
            });
        });
    });
});
