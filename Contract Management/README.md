# Contract Management front end

The tender preparation workspace, split out of the single-file prototype
(`../Tender workspace prototype-no data.html`) into plain ES modules and CSS files.
Behaviour and appearance are unchanged. There is no framework, no build step and no npm.

## Run it

Serve this folder with any static server. Browsers won't load ES modules from `file://`.

```bash
python3 -m http.server 8081
```

Then open `http://localhost:8081/index.html`. Data is kept in the browser's localStorage under
`tender-workspace-proto-nodata-v1`, the same key the single-file version uses.

## Login

The app opens on a login screen with one password field. The password is `make users happy`
(set in `js/layout/login.js`). Once entered, access is remembered in localStorage under
`contract_mgmt_access` until the person clicks the log out button at the bottom of the sidebar.
This only hides the app in the browser; it is not real security, since the password is visible
in the source.

Every login starts with "Viewing as" set to the project lead (Daniel Wong). The prototype sets this
through the `onLogin` hook in `prototype/index.js`.

## Layout

```
index.html                 Page shell: header, sidebar, main, login screen, toasts, dialog
css/
  main.css                 Entry: declares the `app` layer and imports the rest in cascade order
  tokens.css               Colours (light and dark), fonts, top bar height
  base.css                 Element defaults
  layout.css               Top bar, sidebar navigation, main area, breadcrumbs
  components.css           Headings, buttons, badges, tables, panels, tabs, lists, feeds
  pagination.css           Pager controls
  progress.css             Tender stage progress list
  document.css             Document editor and comments
  forms.css                Fields and controls
  dialog.css               Modal dialog and toasts
  responsive.css           Narrow-screen layout
  home-search.css          Home page search pipeline, dropdowns, cards, results
  login.css                Login screen, and hiding the app while locked
  utilities.css            One-property utility classes (see Styles below)
js/
  main.js                  Entry point: load state, register listeners in order, first render
  core/                    No UI: state, data model, permissions, workflow, routing, actions
    registry.js            ROUTES and ACT registries (no imports, safe to use at load time)
    store.js               State `S`, load/save, hooks for seeding and migrations
    router.js              Hash router and render loop
    actions.js             Delegated handlers for data-act / data-chg / data-inp
    constants.js, model.js, permissions.js, progress.js, tasks.js, activity.js, document-templates.js
  ui/                      Shared UI helpers: formatting, markup, modal/toasts, breadcrumbs,
                           activity feed, table sorting, pagination, sanitiser
  layout/sidebar.js        Sidebar navigation and log out
  layout/login.js          Password gate: login screen, unlock and lock
  pages/                   One module per page or tab; each registers its routes and actions
    home/                  Home: state, search engine, dropdowns, detail panels, route
    tenders/               Tender page, tabs, package, TEC, AI recommendations
    document/              Document page, editor, actions, AI writer
    admin.js, library.js, my-tasks.js, projects.js
  features/export/         Word, PDF and ZIP export of tender packages
prototype/                 Prototype-only tooling, loaded by one line in js/main.js
  index.js                 Wires the pieces below into the app through store/router hooks
  sample-data.js           Sample people, catalogue and past-project library documents
  migrations.js            Upgrades browser data saved by earlier prototype versions
  role-switcher.js         "Viewing as" switcher and ?user=<id> switching
  reset-demo.js            Reset demo
  prototype.css            Styles for the prototype header controls
```

## How it fits together

- **Rendering.** Pages are functions that return HTML strings. `route(name, fn)` registers one;
  `render()` in `core/router.js` parses `location.hash` and puts the result in `<main id="view">`.
  `rerender()` saves state and renders again, keeping the scroll position.
- **Actions.** Buttons and links carry `data-act="name"`, selects `data-chg`, inputs `data-inp`.
  `core/actions.js` delegates the events to the matching `ACT.name(el, event)` handler.
  Page modules add their handlers with `ACT.name = …` when they load.
- **State.** `S` in `core/store.js` is the single state object. Modules import it as a live
  binding and mutate it; only `store.js` replaces it (`load()`, `setState()`).
- **Boot order.** `main.js` imports every page module so its routes and actions register,
  then calls `load()`, the `init…()` functions, and `render()`. Several listeners sit on
  `document`, so keep the `init…()` calls in the order shown.

## Removing the prototype tooling

Delete this line from `js/main.js`, and optionally the `prototype/` folder:

```js
import "../prototype/index.js";
```

The app then starts from an empty store with no signed-in person. The hooks the prototype used
are where real data plugs in:

- `useSeed(fn)` supplies the initial state when nothing is stored.
- `useMigration(fn)` upgrades stored state on load.
- `onLoad(fn)` runs after state loads.
- `onRender(fn)` runs after every page render.

## Styles

All component CSS sits in a cascade layer called `app` (see `css/main.css`). `css/utilities.css`
is deliberately outside that layer. Its classes replaced the inline `style="…"` attributes the
prototype used, and being unlayered they still win over component rules the way inline styles
did. Code that changes `element.style` at runtime still overrides them.

Class names read as property and value, for example `u-mt-14` is `margin-top:14px`, `u-d-flex`
is `display:flex` and `u-justify-between` is `justify-content:space-between`. Shorthand
utilities come first in the file, so a longhand on the same element wins.

Inline styles that remain on purpose:

- **Seven computed values:** progress-bar widths, show/hide states set from code, and the
  selected-format highlight in the package export dialog.
- **Saved and exported content:** the uploaded-file card saved into a document's HTML, and the
  exported package files, which must carry their own styles.

## Checks done during the refactor

- Every module parses as an ES module, every import matches an export, and no module uses an
  undeclared name.
- With the full sample dataset, all 8 roles were rendered on 26 pages each in the original and
  in this version. Markup, text, computed styles and the position and size of every element
  matched.
- Twelve interaction flows (creating projects, sub-projects and tenders, approvals, comments,
  uploads, invites, search, sorting, pagination, sidebar, export dialog, collation) produced the
  same pages and the same saved data in both.
- With the prototype import removed, the app starts with no errors.
# contract-management-first-launch
