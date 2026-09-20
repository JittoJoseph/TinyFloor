import assert from "node:assert/strict";
import { test } from "node:test";
import { transform } from "./transform.mjs";

const HASH = "$2a$10$abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.";

test("carries accounts over and says why others were left out", () => {
  const { rows, report, sql } = transform([
    {
      _id: "a1",
      username: "ava",
      email: "  Ava@Example.com ",
      passwordHash: HASH,
      displayName: "Ava  O'Neil",
      avatarPreferences: { characterName: "Lucy" },
      createdAt: "2025-01-02T03:04:05.000Z",
      lastActiveAt: { $date: "2025-06-01T00:00:00.000Z" },
    },
    { _id: "b1", username: "ben", email: null, passwordHash: HASH },
    { _id: "g1", username: "guest_1", isGuest: true, displayName: "Guest" },
    { _id: "c1", username: "cara", email: "cara@example.com", passwordHash: HASH, avatarPreferences: { characterName: "Nobody" } },
    { _id: "d1", username: "dan", email: "not-an-email", passwordHash: HASH },
    { _id: "e1", username: "eve", email: "eve@example.com", passwordHash: "plain" },
    { _id: "a2", username: "ava2", email: "ava@example.com", passwordHash: HASH, lastActiveAt: "2024-01-01T00:00:00.000Z" },
  ]);

  assert.equal(report.accountsIn, 7);
  assert.equal(report.accountsWritten, 2);
  assert.deepEqual(report.skippedByReason, { no_email: 1, guest: 1, bad_email: 1, no_password: 1, duplicate_email: 1 });
  assert.deepEqual(report.skipped.find((s) => s.reason === "duplicate_email"), {
    id: "a2",
    reason: "duplicate_email",
    email: "ava@example.com",
    kept: "a1",
  });

  const ava = rows.find((row) => row.id === "a1");
  assert.deepEqual(ava, {
    id: "a1",
    email: "ava@example.com",
    passwordHash: HASH,
    displayName: "Ava O'Neil",
    character: "Lucy",
    createdAt: Date.parse("2025-01-02T03:04:05.000Z"),
    lastActiveAt: Date.parse("2025-06-01T00:00:00.000Z"),
  });
  const cara = rows.find((row) => row.id === "c1");
  assert.equal(cara.displayName, "cara");
  assert.equal(cara.character, "Adam");
  assert.equal(cara.lastActiveAt, cara.createdAt);

  assert.match(sql, /INSERT OR IGNORE INTO users/);
  assert.match(sql, /'Ava O''Neil'/);
});

test("splits large imports into several statements", () => {
  const users = Array.from({ length: 250 }, (_, i) => ({ _id: `u${i}`, email: `u${i}@example.com`, passwordHash: HASH, username: `u${i}` }));
  const { sql } = transform(users);
  assert.equal(sql.match(/INSERT OR IGNORE/g).length, 3);
});
