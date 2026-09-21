import { runDurableObjectAlarm, runInDurableObject } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";

describe("password guard", () => {
  it("stores nothing after a right password", async () => {
    const stub = env.PASSWORD_GUARD.getByName("email:clean@example.com");
    const hash = await stub.hash("correct horse");
    expect((await stub.verify("wrong", hash)).ok).toBe(false);
    expect((await stub.verify("correct horse", hash)).ok).toBe(true);
    await runInDurableObject(stub, async (_guard, state) => {
      expect((await state.storage.list()).size).toBe(0);
      expect(await state.storage.getAlarm()).toBeNull();
    });
  });

  it("forgets the failures when the window ends", async () => {
    const stub = env.PASSWORD_GUARD.getByName("ip:203.0.113.9");
    expect(await stub.attempt(30)).toBe(true);
    await runInDurableObject(stub, async (_guard, state) => {
      expect(await state.storage.getAlarm()).not.toBeNull();
    });
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    await runInDurableObject(stub, async (_guard, state) => {
      expect((await state.storage.list()).size).toBe(0);
    });
  });
});
