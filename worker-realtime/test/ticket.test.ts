import { describe, expect, it } from "vitest";
import { signTicket, verifyTicket, type RoomTicket } from "../../shared-protocol/src";

const SECRET = "secret-one";

function ticket(overrides: Partial<RoomTicket> = {}): RoomTicket {
  return {
    v: 1,
    room: "design",
    sub: "user-1",
    name: "Ava",
    character: "Adam",
    role: "member",
    cap: 20,
    exp: Date.now() + 60_000,
    ...overrides,
  };
}

describe("room tickets", () => {
  it("round-trips a valid ticket", async () => {
    const claims = ticket();
    expect(await verifyTicket(await signTicket(claims, SECRET), SECRET)).toEqual(claims);
  });

  it("rejects a ticket signed with another secret", async () => {
    expect(await verifyTicket(await signTicket(ticket(), "other"), SECRET)).toBeNull();
  });

  it("rejects an expired ticket", async () => {
    const token = await signTicket(ticket({ exp: Date.now() - 1 }), SECRET);
    expect(await verifyTicket(token, SECRET)).toBeNull();
  });

  it("rejects a ticket whose claims were edited", async () => {
    const token = await signTicket(ticket(), SECRET);
    const [, signature] = token.split(".");
    const forged = btoa(JSON.stringify(ticket({ role: "owner" })))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await verifyTicket(`${forged}.${signature}`, SECRET)).toBeNull();
  });

  it("rejects garbage", async () => {
    expect(await verifyTicket("not-a-ticket", SECRET)).toBeNull();
    expect(await verifyTicket("a.b.c", SECRET)).toBeNull();
    expect(await verifyTicket(null, SECRET)).toBeNull();
  });
});
