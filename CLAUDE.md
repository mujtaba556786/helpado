# HelpHub — Claude Development Rules

This file is read automatically by Claude on every session. All rules below are
**non-negotiable** and apply to every change made to this codebase.

---

## 1. Branching (ALWAYS)

- Create a new Git branch **before touching any file**.
- Branch naming: `fix/<short-description>` or `feat/<short-description>`.
- **Never commit directly to `main`.**

---

## 1a. Merging and Deploying Need Their Own Approval

**Being asked to do a piece of work is NOT approval to merge it or ship it.**
Approval to write the code and approval to put it in front of users are two
separate decisions, and only the user makes the second one.

`main` auto-deploys to Railway, so **merging IS deploying** — there is no gate
between the two. Once it is pushed the choice has been made for the user.

The loop for every change:

1. Branch, implement, run **both** suites (unit + OPA5), commit **on the feature
   branch**.
2. Report what changed and the test results. **Then stop.**
3. Merge to `main` and push only when the user says so **for that specific
   change**.

- "Do X", "fix X", "yes" mean *write the code*. They do not mean merge or deploy.
- "Push it", "merge it", "deploy it" mean exactly that — but wait to be told.
- Approval for one change never carries over to the next one.

This matters more here than on most projects: a bad deploy can lock the owner out
of their own app (see the API auth work), and the shipped APK cannot be
hot-fixed — it has to be rebuilt and reinstalled by hand.

---

## 2. Plan First — Code Second

Before writing or modifying any code:

1. Analyse the issue (read relevant files, grep for root cause).
2. Identify the **root cause**, not just the symptom.
3. Present a clear step-by-step implementation plan with:
   - Files to change and why
   - Risks and side effects
4. **Wait for explicit user approval before making any changes.**

Approving the plan approves the *coding*. Shipping it is a separate ask — see
rule 1a.

---

## 3. Testing Requirements

- **Always run BOTH suites before finishing work** — the OPA5 integration tests
  *and* the QUnit unit tests (`test/unit/unitTests.qunit.html`). Running only
  OPA5 has let unit failures sit unnoticed.
- If a new feature or bug-fix is added, **add or update the corresponding OPA5
  integration test** in `frontend/webapp/test/integration/journeys/`.
- Tests live next to the feature they cover — a feature without a test is
  incomplete.
- Test the **exact behaviour that was broken**, not just that controls exist.
  - Bad:  "Language button is present" (just checks DOM)
  - Good: "Language Popover contains all four language options including English"
- Never mark work as done if tests are failing.

### Running tests locally

```bash
cd ~/Documents/helpado
# Double-click, or run directly:
./run-opa-tests.command
# Opens: http://localhost:8080/test/integration/opaTests.qunit.html
```

---

## 4. Cache-Busting — Bump on Every JS Change

`frontend/webapp/index.html` contains a `_HH_BUILD` version string:

```js
var _HH_BUILD = '2.16';   // ← increment this on EVERY JS/XML/CSS change
```

**Bump this version whenever any of the following change:**
- Any `.js` file under `controller/`, `model/`, or `Component.js`
- Any `.xml` view or fragment
- Any `.css` file

Failure to bump causes browsers to serve stale cached files, making fixes
invisible to users even after deployment.

---

## 5. SAP UI5 Coding Rules

- **No custom CSS.** Use only standard SAP UI5 controls and their built-in
  properties (type, state, class from the UI5 library). If you think you need
  custom CSS, check the SAP UI5 API first.
- Use `sap.m.Popover` with `openBy(oEvent.getSource())` for contextual menus
  (language selector, filter panels). **Never use `sap.m.Dialog` for something
  that should anchor to a button.**
- Use `findAggregatedObjects(true, fn)` for OPA5 matchers — never jQuery
  `$().find()` inside waitFor matchers.
- i18n keys must exist in **all five locale files** before a feature ships:
  `i18n.properties`, `i18n_en.properties`, `i18n_de.properties`,
  `i18n_tr.properties`, `i18n_ar.properties`.
- The global storage helper is `window.HelpHubStorage` (set in `Component.js`).
  Never use `window.HelpmateStorage` — that name does not exist.

---

## 6. Debugging Checklist

When a bug is reported, check in this order:

1. **Browser cache** — was `_HH_BUILD` bumped after the last fix?
2. **Console errors** — open DevTools, check for JS `TypeError` or `404`.
3. **i18n** — does the key exist in `i18n_en.properties`? (49-key trap)
4. **Storage global** — is `window.HelpHubStorage` used, not `HelpmateStorage`?
5. **Control placement** — is the control a `<dependents>` of the right parent?
6. **OPA5 test gap** — if a test wasn't covering this behaviour, add one now.

---

## 7. Deployment (Railway)

- App deploys automatically when `main` is pushed to GitHub.
- Before merging to `main`: confirm the build passes locally (`npm run build`
  in `frontend/`).
- After deploy: verify the fix in the live URL before closing the issue.
- Environment variables are set in the Railway dashboard — never hard-code
  secrets or API URLs.

---

## 8. Known Global State

| Global | Set in | Used in |
|---|---|---|
| `window.HelpHubStorage` | `Component.js` | All controllers |
| `window.HelpmateStorage` | **DOES NOT EXIST** — use `HelpHubStorage` | — |
| `helpmate_lang` localStorage key | `Dashboard.controller.js _applyLanguage` | `index.html` on boot |
| `helpmate_token` | `Login.controller.js` | `Component.js` auto-login |
| `hhOnboarded` | `OnboardingFavoritesMixin` | MockServer (test) |

---

## 9. Key File Map

```
frontend/webapp/
  Component.js                  ← app boot, auto-login, applyUser()
  manifest.json                 ← routing, i18n config, supported locales
  index.html                    ← _HH_BUILD cache buster, sap-ui-config language
  controller/
    Dashboard.controller.js     ← main controller, mixin merge at bottom
    mixins/ProfileMixin.js      ← onEditProfile, onOpenMyProfile
  view/
    Dashboard.view.xml          ← NavContainer with dashboardPage/searchPage/editPage
  i18n/
    i18n.properties             ← source of truth (260 keys)
    i18n_en.properties          ← must match base exactly
  test/integration/
    journeys/                   ← one journey file per feature area
    pages/DashboardPage.js      ← OPA5 page object (actions + assertions)
    mockserver/MockServer.js    ← stubs fetch, seeds localStorage
```

---

## 10. Change Management Checklist

Before every PR / merge:

- [ ] New branch created (not on `main`)
- [ ] Root cause identified (not just symptom)
- [ ] Plan approved by user before coding started
- [ ] Work committed **on the feature branch**, and the user asked before it was
      merged to `main` (which deploys it) — rule 1a
- [ ] `_HH_BUILD` bumped in `index.html`
- [ ] All i18n locale files updated with new keys
- [ ] OPA5 test added or updated for the changed behaviour
- [ ] Tests pass locally (no 15-second timeouts in OPA5 output)
- [ ] No `window.HelpmateStorage` references remain
- [ ] No custom CSS added (SAP UI5 standard only)
- [ ] Commit message explains root cause + fix (not just "fix bug")
