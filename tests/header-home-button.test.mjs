import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("header has home and calendar icon buttons with route navigation", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.equal(html.includes('id="header-logo-btn"'), true);
  assert.equal(html.includes('id="header-home-btn"'), true);
  assert.equal(html.includes('id="header-calendar-btn"'), true);
  assert.equal(app.includes("headerLogoBtn: document.getElementById(\"header-logo-btn\")"), true);
  assert.equal(app.includes("headerHomeBtn: document.getElementById(\"header-home-btn\")"), true);
  assert.equal(app.includes("headerCalendarBtn: document.getElementById(\"header-calendar-btn\")"), true);
  assert.equal(app.includes("elements.headerLogoBtn.onclick = () => navigate(\"/\");"), true);
  assert.equal(app.includes("elements.headerHomeBtn.onclick = () => navigate(\"/\");"), true);
  assert.equal(app.includes("elements.headerCalendarBtn.onclick = () => navigate(\"/calendario\");"), true);
});
