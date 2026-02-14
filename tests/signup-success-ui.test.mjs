import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("signup success uses a single save button", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.includes('id="save-signup-access"'), true);
  assert.equal(html.includes('id="copy-token"'), false);
  assert.equal(html.includes('id="share-token"'), false);
  assert.equal(html.includes('id="signup-token"'), false);
});
