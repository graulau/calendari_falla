import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("event detail does not include share button", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.includes('id="event-share-btn"'), false);
});
