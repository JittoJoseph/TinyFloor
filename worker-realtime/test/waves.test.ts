import { describe, expect, it } from "vitest";
import { Client, settle, uniqueRoom } from "./client";

describe("waves", () => {
  it("says when a teammate walks in, not when they come back after a dropped connection", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");

    const ben = await Client.open(room, { sub: "ben" }, "&x=10&y=10&arrive=1");
    await ben.next("welcome");
    expect((await ava.next("player_joined")).arrived).toBe(true);

    ben.socket.close(1000, "dropped");
    await ava.next("player_left");
    ava.messages.length = 0;
    const back = await Client.open(room, { sub: "ben" }, "&x=10&y=10");
    await back.next("welcome");
    expect((await ava.next("player_joined")).arrived).toBeUndefined();
  });

  it("says when a guest walks into the demo office, so the people there can wave", async () => {
    const ava = await Client.open("lobby", { room: "lobby", role: "guest" });
    await ava.next("welcome");

    const ben = await Client.open("lobby", { room: "lobby", sub: `ben-${Date.now()}`, role: "guest" }, "&x=10&y=10&arrive=1");
    const self = (await ben.next("welcome")).self.id;
    await settle();
    const joined = ava.messages.find((message) => message.t === "player_joined" && message.player.id === self);
    expect(joined?.t === "player_joined" && joined.arrived).toBe(true);
  });

  it("shows a wave to everyone, only to someone who is here, and never to yourself", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    const ben = await Client.open(room, { sub: "ben" });
    await ben.next("welcome");
    const cal = await Client.open(room, { sub: "cal" });
    await cal.next("welcome");

    ava.send({ t: "wave", to: "ben" });
    expect(await ben.next("waved")).toMatchObject({ from: "ava", to: "ben" });
    expect(await cal.next("waved")).toMatchObject({ from: "ava", to: "ben" });

    cal.messages.length = 0;
    ava.send({ t: "wave", to: "ava" });
    ava.send({ t: "wave", to: "nobody" });
    await settle();
    expect(cal.messages.some((message) => message.t === "waved")).toBe(false);
  });

  it("shows a poke to everyone, only at someone who is here, never at yourself, and not as fast as you can click", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    const ben = await Client.open(room, { sub: "ben" });
    await ben.next("welcome");
    const cal = await Client.open(room, { sub: "cal" });
    await cal.next("welcome");

    ava.send({ t: "poke", to: "ben" });
    expect(await ben.next("poked")).toMatchObject({ from: "ava", to: "ben" });
    expect(await cal.next("poked")).toMatchObject({ from: "ava", to: "ben" });

    cal.messages.length = 0;
    ava.send({ t: "poke", to: "ava" });
    ava.send({ t: "poke", to: "nobody" });
    await settle();
    expect(cal.messages.some((message) => message.t === "poked")).toBe(false);

    // A burst of pokes is held to the room's pace for actions.
    cal.messages.length = 0;
    for (let i = 0; i < 40; i++) ava.send({ t: "poke", to: "ben" });
    await settle();
    expect(cal.messages.filter((message) => message.t === "poked").length).toBeLessThan(40);
  });
});
