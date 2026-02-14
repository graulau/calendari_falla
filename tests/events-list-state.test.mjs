import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { nextVisibleCount } from "../router.js";

test("nextVisibleCount increases by batch size", () => {
  assert.equal(nextVisibleCount(20, 10, 100), 30);
});

test("nextVisibleCount caps to total", () => {
  assert.equal(nextVisibleCount(20, 10, 25), 25);
});

test("events route has manual load-more fallback for mobile", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.equal(html.includes('id="events-route-load-more"'), true);
  assert.equal(app.includes("eventsRouteLoadMore"), true);
  assert.equal(app.includes("elements.eventsRouteLoadMore.onclick"), true);
});
