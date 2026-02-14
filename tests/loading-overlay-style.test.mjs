import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("loading overlay uses subtle visual style", () => {
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");

  assert.equal(css.includes("background: rgba(248, 251, 255, 0.72);"), true);
  assert.equal(css.includes("backdrop-filter: blur(2px);"), true);
  assert.equal(css.includes("padding: 14px 16px;"), true);
  assert.equal(css.includes("width: 28px;"), true);
  assert.equal(css.includes("height: 28px;"), true);
});
