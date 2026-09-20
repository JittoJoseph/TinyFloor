import { exports } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("health", () => {
  it("answers and reaches the database", async () => {
    const response = await exports.default.fetch("https://api.tinyfloor.com/v1/health");
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ service: "tinyfloor-api", ok: true, database: true });
  });

  it("returns a JSON error for unknown endpoints", async () => {
    const response = await exports.default.fetch("https://api.tinyfloor.com/v1/nope");
    expect(response.status).toBe(404);
    expect(await response.json()).toMatchObject({ error: { code: "not_found" } });
  });
});
