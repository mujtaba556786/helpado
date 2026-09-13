# Hand-applied patches: this theme targets UI5 1.147, the app runs 1.120

This theme was exported by the SAP Theme Designer against **UI5 1.147**, but
the app runs **UI5 1.120** (`frontend/ui5.yaml` pins 1.120.18; `index.html`
pins the CDN to 1.120; the APK bundles the same). Where the two versions
disagree, the generated files below have been edited by hand to match the
1.120 runtime. **Every patch here is lost if the theme is re-exported from the
Theme Designer** — re-apply them, or export against the version the app
actually runs. Each one has an OPA5 test that will go red if it is undone.

Files touched: `library.css`, `library-RTL.css`, `library-parameters.json`.

---

## 1. `_sap_m_Popover_ArrowOffset` is "8", not "0.5rem"

In 1.147 the parameter is `0.5rem`; 1.120's `sap.m.Popover` reads it with

    arrowOffset = Parameters.get({ name: "_sap_m_Popover_ArrowOffset" }) || 8;

and never parses it, then does `Math.max(pos, arrowOffset)`. With the string
"0.5rem" that is `NaN`, jQuery drops the NaN, and the popover arrow is left at
its stylesheet default (20px from the popover's left edge) instead of pointing
at the button that opened it — visible on the language and notification
popovers on a phone, where the popover is pushed away from the opener.

Standard `sap_horizon` for 1.120 ships the value as the plain number "8". The
value was changed to "8" in `library-parameters.json`, `library.css` and
`library-RTL.css` (the two CSS files embed the same JSON URL-encoded in the
`#sap-ui-theme-sap\.m` background-image).

Guarded by `PopoverJourney` in the OPA5 suite.

---

## 2. TimePicker clock face: `.sapMTPCActive` and `.sapMTPClockCover`

SAP rewrote `sap.m.TimePickerClocks` between 1.120 and 1.147, and the class
names changed with it:

| | stock 1.120 (what the runtime renders) | 1.147 export |
|---|---|---|
| Show the active clock | `.sapMTPClock.sapMTPCActive{display:block}` | `.sapMTPClock.sapMTPCFadeIn` / `.sapMTPCDisplay` |
| `.sapMTPClockCover` inset | `0.5625rem` (= the clock's own padding, so it sits on the dial) | `-0.25rem` |

1.120 never adds `sapMTPCFadeIn`, so the clock face stayed `display:none` and
the Preferred Time popover in "Book a Helper" was an empty box with just the
hour/minute buttons. The cover is the element `TimePickerClock._calculateDimensions`
measures for the centre and the inner/outer ring radii, so the 1.147 inset
also shifts the hit-test maths.

Both rules were changed in `library.css` and `library-RTL.css` to the stock
1.120 values (the `.sapMTPCFadeIn` rule is left in place; it is harmless). All
other TimePicker rules differ from stock only in colour parameters, which are
the point of the theme and were kept.

Guarded by `BookingJourney` → "Time picker shows a clock face that selects the
tapped hour".
