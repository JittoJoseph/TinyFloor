import { test } from "node:test";
import assert from "node:assert/strict";
import { busyAt, isOurs } from "./calendarBusy.ts";

const MIN = 60_000;
const NOW = Date.UTC(2026, 10, 13, 10, 0);
const event = (id: string, from: number, to: number, more: Record<string, unknown> = {}) => ({
  id,
  title: id,
  start: NOW + from * MIN,
  end: NOW + to * MIN,
  allDay: false,
  busy: true,
  private: false,
  link: null,
  kind: "event" as const,
  url: null,
  ...more,
});

test("nothing on now is no meeting", () => {
  assert.equal(busyAt([event("later", 30, 60)], true, NOW), null);
  assert.equal(busyAt([], true, NOW), null);
});

test("a meeting on now lasts until it ends, and through any that follow straight on", () => {
  assert.deepEqual(busyAt([event("standup", -5, 15)], false, NOW), { until: NOW + 15 * MIN });
  const day = [event("standup", -5, 15), event("review", 15, 45), event("gap", 60, 90)];
  assert.equal(busyAt(day, false, NOW)?.until, NOW + 45 * MIN);
});

test("free time, all-day events and what was marked free don't count", () => {
  assert.equal(busyAt([event("focus", -10, 50, { busy: false })], true, NOW), null);
  assert.equal(busyAt([event("holiday", -600, 800, { allDay: true })], true, NOW), null);
});

test("a title only when titles are shown and the event isn't private", () => {
  assert.equal(busyAt([event("Design review", -5, 15)], true, NOW)?.title, "Design review");
  assert.equal(busyAt([event("Design review", -5, 15)], false, NOW)?.title, undefined);
  assert.equal(busyAt([event("Doctor", -5, 15, { private: true })], true, NOW)?.title, undefined);
});

test("a call somewhere else online is a call; one of ours isn't", () => {
  assert.equal(busyAt([event("sync", -5, 15, { link: "https://meet.google.com/abc" })], false, NOW)?.call, true);
  assert.equal(busyAt([event("sync", -5, 15, { link: "https://app.tinyfloor.com/office/x/meetings" })], false, NOW)?.call, undefined);
  assert.equal(isOurs("https://app.tinyfloor.com/en/office/abc/meetings", "localhost"), true);
  assert.equal(isOurs("http://localhost:3001/office/abc/meetings", "localhost"), true);
  assert.equal(isOurs("https://eviltinyfloor.com/office/abc/meetings", "localhost"), false);
  assert.equal(isOurs("https://zoom.us/j/1", "localhost"), false);
});
