import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("health", () => {
  it("answers", async () => {
    const response = await exports.default.fetch("https://realtime.tinyfloor.com/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ service: "tinyfloor-realtime", ok: true });
  });

  it("does not answer unknown paths", async () => {
    const response = await exports.default.fetch("https://realtime.tinyfloor.com/nope");
    expect(response.status).toBe(404);
  });
});
