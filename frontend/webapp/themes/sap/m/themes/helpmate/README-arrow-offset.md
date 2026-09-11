# Why `_sap_m_Popover_ArrowOffset` is "8" here, not "0.5rem"

This theme was exported by the SAP Theme Designer against **UI5 1.147**, but the
app runs on **UI5 1.120** (see `index.html` bootstrap). In 1.147 the parameter
is `0.5rem`; 1.120's `sap.m.Popover` reads it with

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

**If this theme is ever re-exported from the Theme Designer, this edit will be
lost and the arrow bug will come back.** Re-apply it, or export against the UI5
version the app actually runs. `PopoverJourney` in the OPA5 suite guards it.
