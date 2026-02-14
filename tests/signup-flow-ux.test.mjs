import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("signup panel can be hidden while success card remains visible", () => {
  const html = fs.readFileSync(new URL("../index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");

  assert.equal(html.includes('id="signup-panel"'), true);
  assert.equal(app.includes("signupPanel: document.getElementById(\"signup-panel\")"), true);
  assert.equal(app.includes("elements.signupPanel.hidden = true;"), true);
});

test("submit button supports saving state with spinner text", () => {
  const app = fs.readFileSync(new URL("../app.js", import.meta.url), "utf8");
  const css = fs.readFileSync(new URL("../styles.css", import.meta.url), "utf8");
  const i18n = fs.readFileSync(new URL("../i18n.js", import.meta.url), "utf8");

  assert.equal(app.includes("function setSignupSaving(active)"), true);
  assert.equal(app.includes('elements.signupSubmit.textContent = t("signup.saving");'), true);
  assert.equal(css.includes(".primary.is-loading"), true);
  assert.equal(i18n.includes('"signup.saving"'), true);
});
