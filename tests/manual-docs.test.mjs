import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("manual section and footer link exist in HTML", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  assert.equal(html.includes('id="user-manual"'), true);
  assert.equal(html.includes('id="manual-download-btn"'), true);
  assert.equal(html.includes('id="footer-manual-link"'), true);
});

test("manual route is protected and downloadable in frontend", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  assert.equal(app.includes('["home", "calendar", "events", "event-detail", "manual"]'), true);
  assert.equal(app.includes("function buildManualDownloadHtml()"), true);
  assert.equal(app.includes("function downloadManualHtml()"), true);
  assert.equal(app.includes("navigate(\"/manual\")"), true);
});

test("manual translations exist in both languages", () => {
  const i18n = fs.readFileSync(new URL("../i18n.js", import.meta.url), "utf8");
  assert.equal(i18n.includes('"manual.footerLink"'), true);
  assert.equal(i18n.includes('"manual.download"'), true);
  assert.equal(i18n.includes('"manual.admin.title"'), true);
});
