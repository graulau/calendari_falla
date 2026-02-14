import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("signup form supports multiple names and calendar CTA", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.includes('id="signup-rows"'), true);
  assert.equal(html.includes('id="signup-count-inc"'), true);
  assert.equal(html.includes('id="signup-count-dec"'), true);
  assert.equal(html.includes('id="save-calendar-event"'), true);
  assert.equal(html.includes('id="access-gate"'), true);
});

test("frontend includes multi-name validation and access gate logic", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.equal(app.includes("function parseNamesInput(rawValue)"), true);
  assert.equal(app.includes("function isValidFullName(name)"), true);
  assert.equal(app.includes("function requiredSecretForRoute(route)"), true);
  assert.equal(app.includes("state.access.failed >= 5"), true);
});

test("apps script supports shared tokens and event options", () => {
  const gs = fs.readFileSync(new URL("../apps_script/Code.gs", import.meta.url), "utf8");
  assert.equal(gs.includes('"extra_options"'), true);
  assert.equal(gs.includes('"extra_options_val"'), true);
  assert.equal(gs.includes('"event_pin"'), true);
  assert.equal(gs.includes('action === "signup_batch"'), true);
  assert.equal(gs.includes("function createSignupBatch_(params)"), true);
  assert.equal(gs.includes("parseNamesParam_(params.names)"), true);
  assert.equal(gs.includes("names.forEach((name) =>"), true);
  assert.equal(gs.includes("signup: {\n      names:"), true);
});
