import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";

describe("dev tickets", () => {
  it("signs a ticket the realtime worker will accept, on localhost", async () => {
    const response = await exports.default.fetch("http://localhost:8787/v1/dev/ticket", {
      method: "POST",
      body: JSON.stringify({ room: "lobby-1", name: "Ava", role: "guest" }),
    });
    expect(response.status).toBe(200);
    const { ticket } = await response.json<{ ticket: string }>();
    expect(await verifyTicket(ticket, env.TICKET_SECRET)).toMatchObject({
      room: "lobby-1",
      name: "Ava",
      role: "guest",
    });
  });

  it("doesn't exist on the live hostname", async () => {
    const response = await exports.default.fetch("https://api.tinyfloor.com/v1/dev/ticket", {
      method: "POST",
      body: "{}",
    });
    expect(response.status).toBe(404);
  });
});
