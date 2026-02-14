import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("admin form includes valencian options field", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.includes('name="extra_options_val"'), true);
});

test("frontend parses event options with comma separator", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.equal(app.includes(".split(/[|,]+/)"), true);
});
