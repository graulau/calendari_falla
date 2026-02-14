import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("admin panel includes active/closed tabs", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.includes('id="admin-tab-active"'), true);
  assert.equal(html.includes('id="admin-tab-closed"'), true);
});

test("frontend includes admin duplicate and list actions", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.equal(app.includes("openAdminListView(event.id)"), true);
  assert.equal(app.includes("adminDuplicate(event.id)"), true);
  assert.equal(app.includes('data-action="duplicate"'), true);
  assert.equal(app.includes("No hay nadie apuntado."), true);
});

test("apps script exposes admin signups and duplicate actions", () => {
  const gs = fs.readFileSync(new URL("../apps_script/Code.gs", import.meta.url), "utf8");
  assert.equal(gs.includes('action === "admin_event_signups"'), true);
  assert.equal(gs.includes('action === "admin_duplicate"'), true);
  assert.equal(gs.includes("function adminEventSignups_(params)"), true);
  assert.equal(gs.includes("function adminDuplicate_(params)"), true);
  assert.equal(gs.includes("function getColumnIndex_(data, targetHeader)"), true);
  assert.equal(gs.includes("normalizeHeaderName_(header)"), true);
});
