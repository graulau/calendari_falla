import test from "node:test";
import assert from "node:assert/strict";
import { nextVisibleCount } from "../router.js";

test("nextVisibleCount increases by batch size", () => {
  assert.equal(nextVisibleCount(20, 10, 100), 30);
});

test("nextVisibleCount caps to total", () => {
  assert.equal(nextVisibleCount(20, 10, 25), 25);
});
