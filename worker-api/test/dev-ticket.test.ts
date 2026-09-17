import { env, exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { verifyTicket } from "../../shared-protocol/src";
import { devTicket } from "../src/dev-ticket";

describe("dev tickets", () => {
  it("signs a ticket the realtime worker will accept", async () => {
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

  it("doesn't exist without the DEV_TICKETS flag", async () => {
    const request = new Request("https://api.tinyfloor.com/v1/dev/ticket", { method: "POST", body: "{}" });
    expect(await devTicket(request, { ...env, DEV_TICKETS: undefined as never })).toBeNull();
  });
});
