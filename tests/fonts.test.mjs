import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("styles use Inter for body and Space Grotesk for headings", () => {
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  assert.equal(css.includes("family=Inter"), true);
  assert.equal(css.includes("family=Space+Grotesk"), true);
  assert.equal(css.includes('font-family: "Inter"'), true);
  assert.equal(css.includes('font-family: "Space Grotesk"'), true);
  assert.equal(css.includes("Fraunces"), false);
  assert.equal(css.includes("Manrope"), false);
});
