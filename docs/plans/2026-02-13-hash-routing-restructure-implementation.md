# Hash Routing Restructure Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Convert the app to a route-first hash architecture and add incremental event list rendering for large datasets.

**Architecture:** Implement a lightweight hash router that owns screen selection and URL changes, then split monolithic render logic into route-scoped view functions. Keep existing JSONP services and event data model, but isolate list rendering into batched append with an `IntersectionObserver` sentinel to reduce DOM/render cost.

**Tech Stack:** Vanilla JavaScript, hash-based routing, browser DOM APIs, `IntersectionObserver`, Node built-in test runner (`node --test`) for route utility tests.

---

### Task 1: Extract Router Utilities

**Files:**
- Create: `router.js`
- Create: `tests/router.test.mjs`
- Modify: `index.html`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { parseHashRoute, buildHashPath } from "../router.js";

test("parseHashRoute parses dynamic event route", () => {
  assert.deepEqual(parseHashRoute("#/eventos/abc"), {
    name: "event-detail",
    params: { id: "abc" },
  });
});

test("buildHashPath normalizes path", () => {
  assert.equal(buildHashPath("eventos"), "#/eventos");
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/router.test.mjs`  
Expected: FAIL with missing module or missing exports from `router.js`.

**Step 3: Write minimal implementation**

```js
const ROUTES = [
  { name: "home", pattern: /^\/$/ },
  { name: "events", pattern: /^\/eventos$/ },
  { name: "event-detail", pattern: /^\/eventos\/([^/]+)$/ },
  { name: "signup-token", pattern: /^\/inscripcion\/([^/]+)$/ },
  { name: "admin", pattern: /^\/admin$/ },
];

export function buildHashPath(path) {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `#${normalized}`;
}

export function parseHashRoute(hash) {
  const value = (hash || "#/").replace(/^#/, "") || "/";
  for (const route of ROUTES) {
    const match = value.match(route.pattern);
    if (!match) continue;
    if (route.name === "event-detail") return { name: route.name, params: { id: decodeURIComponent(match[1]) } };
    if (route.name === "signup-token") return { name: route.name, params: { token: decodeURIComponent(match[1]) } };
    return { name: route.name, params: {} };
  }
  return { name: "home", params: {} };
}
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/router.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add router.js tests/router.test.mjs index.html
git commit -m "feat: add hash router utilities and tests"
```

### Task 2: Add Route Shell + Navigation Entrypoints

**Files:**
- Modify: `index.html`
- Modify: `app.js`

**Step 1: Write the failing test**

```js
test("parseHashRoute falls back to home on unknown hash", () => {
  assert.deepEqual(parseHashRoute("#/unknown"), { name: "home", params: {} });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/router.test.mjs`  
Expected: FAIL if fallback behavior is not yet covered.

**Step 3: Write minimal implementation**

```js
// app.js
import { parseHashRoute, buildHashPath } from "./router.js";

function navigate(path, { replace = false } = {}) {
  const hash = buildHashPath(path);
  if (replace) window.location.replace(hash);
  else window.location.hash = hash;
}

function resolveRoute() {
  const route = parseHashRoute(window.location.hash);
  renderRoute(route);
  window.scrollTo(0, 0);
}

window.addEventListener("hashchange", resolveRoute);
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/router.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app.js index.html tests/router.test.mjs
git commit -m "feat: add route resolution entrypoint"
```

### Task 3: Implement `#/eventos` Infinite Scroll View

**Files:**
- Modify: `index.html`
- Modify: `app.js`
- Modify: `styles.css`
- Create: `tests/events-list-state.test.mjs`

**Step 1: Write the failing test**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { nextVisibleCount } from "../router.js";

test("nextVisibleCount caps to total", () => {
  assert.equal(nextVisibleCount(20, 10, 25), 25);
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/events-list-state.test.mjs`  
Expected: FAIL with missing `nextVisibleCount`.

**Step 3: Write minimal implementation**

```js
// router.js
export function nextVisibleCount(current, batch, total) {
  return Math.min(current + batch, total);
}

// app.js
// add route-scoped list state and observer lifecycle:
// - initial visibleCount = 20
// - batch size = 10
// - append cards via DocumentFragment
// - disconnect observer on route exit
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/events-list-state.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app.js router.js index.html styles.css tests/events-list-state.test.mjs
git commit -m "feat: add incremental rendering for events list route"
```

### Task 4: Migrate Event Detail to `#/eventos/:id`

**Files:**
- Modify: `app.js`
- Modify: `index.html`

**Step 1: Write the failing test**

```js
test("parseHashRoute decodes event id", () => {
  assert.deepEqual(parseHashRoute("#/eventos/cena%202026"), {
    name: "event-detail",
    params: { id: "cena 2026" },
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/router.test.mjs`  
Expected: FAIL if route decoding is incomplete.

**Step 3: Write minimal implementation**

```js
// app.js:
// - replace openEvent hash mutation with navigate(`/eventos/${encodeURIComponent(id)}`)
// - route renderer loads event details by param id
// - invalid id redirects to /eventos with non-blocking hint
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/router.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app.js index.html tests/router.test.mjs
git commit -m "feat: route event detail screen by event id"
```

### Task 5: Migrate Signup Editor to `#/inscripcion/:token`

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `i18n.js`

**Step 1: Write the failing test**

```js
test("parseHashRoute parses signup token route", () => {
  assert.deepEqual(parseHashRoute("#/inscripcion/tok123"), {
    name: "signup-token",
    params: { token: "tok123" },
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/router.test.mjs`  
Expected: FAIL if route not fully matched.

**Step 3: Write minimal implementation**

```js
// app.js:
// - remove #edit token parsing
// - route renderer for signup-token calls loadTokenRecord(token)
// - render explicit invalid-token state and CTA to /eventos
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/router.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app.js index.html i18n.js tests/router.test.mjs
git commit -m "feat: migrate signup editor to dedicated token route"
```

### Task 6: Migrate Admin Flow to `#/admin`

**Files:**
- Modify: `app.js`
- Modify: `index.html`
- Modify: `styles.css`

**Step 1: Write the failing test**

```js
test("parseHashRoute parses admin route", () => {
  assert.deepEqual(parseHashRoute("#/admin"), {
    name: "admin",
    params: {},
  });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/router.test.mjs`  
Expected: FAIL if admin route mapping missing.

**Step 3: Write minimal implementation**

```js
// app.js:
// - admin UI visible only when current route is admin
// - if session secret exists, load list automatically
// - remove old hash admin branch and route side-effects
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/router.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app.js index.html styles.css tests/router.test.mjs
git commit -m "feat: move admin panel behind dedicated route"
```

### Task 7: Remove Legacy Routing and Run Full Verification

**Files:**
- Modify: `app.js`
- Modify: `README.md`

**Step 1: Write the failing test**

```js
test("legacy #event hash format is not supported", () => {
  assert.deepEqual(parseHashRoute("#event/abc"), { name: "home", params: {} });
});
```

**Step 2: Run test to verify it fails**

Run: `node --test tests/router.test.mjs tests/events-list-state.test.mjs`  
Expected: FAIL until parser behavior is explicit.

**Step 3: Write minimal implementation**

```js
// router.js:
// - keep strict '#/' parser only
// app.js:
// - delete maybeOpenFromHash legacy branches
// README.md:
// - document new routes and deep-link format
```

**Step 4: Run test to verify it passes**

Run: `node --test tests/router.test.mjs tests/events-list-state.test.mjs`  
Expected: PASS.

**Step 5: Commit**

```bash
git add app.js router.js README.md tests/router.test.mjs tests/events-list-state.test.mjs
git commit -m "refactor: remove legacy hash routing and document new routes"
```

### Task 8: Manual Smoke Verification

**Files:**
- Modify: `docs/plans/2026-02-13-hash-routing-restructure-implementation.md`

**Step 1: Execute manual route smoke checks**

```text
1) Load #/ and verify hero/upcoming/calendar render.
2) Load #/eventos and scroll until end; verify incremental batches and no duplicates.
3) Open #/eventos/:id from list and direct URL; verify details and signup flow.
4) Open #/inscripcion/:token with valid/invalid tokens.
5) Open #/admin with/without session secret.
6) Switch language and re-check list + detail labels.
```

**Step 2: Record evidence**

Run: `date`  
Expected: timestamp logged in verification notes section.

**Step 3: Commit**

```bash
git add docs/plans/2026-02-13-hash-routing-restructure-implementation.md
git commit -m "docs: add route migration smoke verification notes"
```
