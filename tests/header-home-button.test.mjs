import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("header has a home icon button and click navigates to root", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.equal(html.includes('id="header-home-btn"'), true);
  assert.equal(app.includes("headerHomeBtn: document.getElementById(\"header-home-btn\")"), true);
  assert.equal(app.includes("elements.headerHomeBtn.onclick = () => navigate(\"/\");"), true);
});
