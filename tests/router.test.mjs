import test from "node:test";
import assert from "node:assert/strict";
import { buildHashPath, parseHashRoute } from "../router.js";

test("parseHashRoute parses dynamic event route", () => {
  assert.deepEqual(parseHashRoute("#/eventos/abc"), {
    name: "event-detail",
    params: { id: "abc" },
  });
});

test("parseHashRoute parses signup token route", () => {
  assert.deepEqual(parseHashRoute("#/inscripcion/tok123"), {
    name: "signup-token",
    params: { token: "tok123" },
  });
});

test("parseHashRoute parses admin route", () => {
  assert.deepEqual(parseHashRoute("#/admin"), {
    name: "admin",
    params: {},
  });
});

test("parseHashRoute parses calendar route", () => {
  assert.deepEqual(parseHashRoute("#/calendario"), {
    name: "calendar",
    params: {},
  });
});

test("parseHashRoute decodes event id", () => {
  assert.deepEqual(parseHashRoute("#/eventos/cena%202026"), {
    name: "event-detail",
    params: { id: "cena 2026" },
  });
});

test("parseHashRoute falls back to home on unknown hash", () => {
  assert.deepEqual(parseHashRoute("#/unknown"), {
    name: "home",
    params: {},
  });
});

test("legacy hash format is not supported", () => {
  assert.deepEqual(parseHashRoute("#event/abc"), {
    name: "home",
    params: {},
  });
});

test("buildHashPath normalizes path", () => {
  assert.equal(buildHashPath("eventos"), "#/eventos");
});
