import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("loading overlay exists and is used by real data load", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.equal(html.includes('id="loading-overlay"'), true);
  assert.equal(app.includes("setGlobalLoading(true);"), true);
  assert.equal(app.includes("setGlobalLoading(false);"), true);
});
