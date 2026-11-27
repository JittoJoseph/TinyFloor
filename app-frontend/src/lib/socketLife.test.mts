import { test, mock } from "node:test";
import assert from "node:assert/strict";

(globalThis as { WebSocket?: unknown }).WebSocket ??= { OPEN: 1, CONNECTING: 0, CLOSING: 2, CLOSED: 3 };
const { Lifeline } = await import("./socketLife.ts");

function socket() {
  const sent: string[] = [];
  return { readyState: 1, sent, send: (data: string) => void sent.push(data) };
}

test("pings keep going out while the room keeps talking, so the service still hears from someone sitting still", () => {
  mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
  try {
    const ws = socket();
    let dead = false;
    const line = new Lifeline(ws as unknown as WebSocket, () => (dead = true));
    // Two minutes of others moving: something heard every second, nothing said.
    for (let s = 0; s < 120; s++) {
      mock.timers.tick(1000);
      line.heard();
    }
    assert.ok(ws.sent.length >= 5, `pinged ${ws.sent.length} times`);
    assert.equal(dead, false);
    line.stop();
  } finally {
    mock.timers.reset();
  }
});

test("a socket that stops answering is given up on", () => {
  mock.timers.enable({ apis: ["setInterval", "setTimeout", "Date"] });
  try {
    const ws = socket();
    let dead = false;
    new Lifeline(ws as unknown as WebSocket, () => (dead = true));
    for (let s = 0; s < 45; s++) mock.timers.tick(1000);
    assert.equal(ws.sent.length, 1);
    assert.equal(dead, true);
  } finally {
    mock.timers.reset();
  }
});
