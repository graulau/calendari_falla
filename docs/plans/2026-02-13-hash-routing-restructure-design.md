# Hash Routing Restructure Design

**Context**
- Current app is a single-file SPA (`app.js`) where navigation and rendering are tightly coupled.
- Event list rendering scales poorly when event count grows because the full list is rendered in one pass.
- Existing hash fragments are ad-hoc (`#event/:id`, `#edit/:token`, `#admin`) and parsed by a single helper.

**Goals**
- Move to a route-first architecture with explicit screens:
  - `#/`
  - `#/eventos`
  - `#/eventos/:id`
  - `#/inscripcion/:token`
  - `#/admin`
- Add infinite-scroll rendering in `#/eventos` to reduce navigation/render cost with large datasets.
- Remove legacy hash compatibility to keep routing logic simple and consistent.

**Architecture**
- Introduce a small router layer responsible for:
  - hash parsing and route matching
  - guard/fallback handling
  - invoking a single render entrypoint per route
- Split view rendering responsibilities by screen:
  - home view: hero/upcoming preview/calendar only
  - events list view: batch append cards with sentinel observer
  - event detail view: event detail + signup form
  - signup token view: signup edit/delete by token
  - admin view: admin login and panel
- Keep service/API access in existing JSONP helpers, but stop mutating URL hash from rendering functions.

**Data + UI State Strategy**
- Keep shared data in state:
  - loaded events
  - selected event cache
  - token/admin records
- Keep route/UI state separate:
  - current route object
  - events list pagination (`visibleCount`, `batchSize`, `observerActive`)
  - loading/error flags per view
- Reset only route-local state on navigation; preserve loaded event data to avoid refetch loops.

**Performance Strategy**
- Infinite scroll in `#/eventos` using `IntersectionObserver` + sentinel.
- Initial render target: 20 cards, then incremental batches (10-20 configurable).
- Use `DocumentFragment` for batch append to avoid repeated layout thrash.
- Disconnect observer when leaving route to prevent hidden background work.

**Navigation Rules**
- Single `navigate(path, { replace })` helper updates `location.hash`.
- Route change flow:
  - parse hash
  - resolve known route or fallback to `#/`
  - clear current view and render target screen
  - `window.scrollTo(0, 0)` once per route change
- Unknown route fallback: `#/`.

**Error Handling**
- Invalid event id in `#/eventos/:id` -> route to `#/eventos` with user-facing hint.
- Invalid token in `#/inscripcion/:token` -> show token error state + CTA back to events.
- API failures show contextual hints per screen, without breaking router state.

**Testing Approach**
- Add lightweight route parser/matcher unit tests.
- Add list batching tests for pagination counters and slice boundaries.
- Execute manual smoke checks for deep links, reload behavior, and screen transitions.

**Migration Plan**
1. Add router primitives and keep home on `#/`.
2. Implement `#/eventos` infinite list and isolate list rendering.
3. Migrate event detail and signup token flows to dedicated routes.
4. Migrate admin flow to `#/admin`.
5. Remove legacy hash handlers and dead code paths.

**Outcomes Expected**
- Better responsiveness with large event volumes.
- Cleaner separation between navigation and rendering logic.
- Simpler maintenance and safer future feature work.
