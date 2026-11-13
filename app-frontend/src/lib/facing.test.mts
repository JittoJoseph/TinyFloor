import { test } from "node:test";
import assert from "node:assert/strict";
import { facing } from "./facing.ts";

test("a walk faces the way it goes furthest", () => {
  assert.equal(facing(1, 0, "down"), "right");
  assert.equal(facing(-1, 0, "up"), "left");
  assert.equal(facing(0, 1, "left"), "down");
  assert.equal(facing(0, -1, "right"), "up");
});

test("mostly sideways faces sideways, however it started", () => {
  // A path segment that drifts down a little, or a slide along a wall.
  for (const was of ["up", "down", "left", "right"] as const) {
    assert.equal(facing(1, 0.2, was), "right");
    assert.equal(facing(-1, 0.3, was), "left");
    assert.equal(facing(-1, -0.2, was), "left");
    assert.equal(facing(0.2, 1, was), "down");
    assert.equal(facing(-0.3, -1, was), "up");
  }
});

test("on a diagonal it keeps facing as it was, if that is one of the two ways", () => {
  assert.equal(facing(1, 1, "right"), "right");
  assert.equal(facing(1, 1, "down"), "down");
  assert.equal(facing(-1, -1, "up"), "up");
  assert.equal(facing(-1, 1, "left"), "left");
  // Facing neither way, it turns sideways.
  assert.equal(facing(1, 1, "up"), "right");
  assert.equal(facing(-1, -1, "down"), "left");
});

test("it turns only once the other way clearly leads", () => {
  assert.equal(facing(1, 1.2, "right"), "right");
  assert.equal(facing(1, 1.3, "right"), "down");
  assert.equal(facing(1.2, 1, "down"), "down");
  assert.equal(facing(1.3, 1, "down"), "right");
});

test("standing still keeps the way it faced", () => {
  assert.equal(facing(0, 0, "left"), "left");
});
