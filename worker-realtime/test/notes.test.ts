import { describe, expect, it } from "vitest";
import { Client, settle, uniqueRoom } from "./client";

describe("status notes", () => {
  it("walks in with the note the ticket carries, and everyone sees it", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");

    const note = { emoji: "🍜", text: "Lunch", until: null };
    const ben = await Client.open(room, { sub: "ben", note });
    const welcome = await ben.next("welcome");
    expect(welcome.self.note).toEqual(note);
    expect((await ava.next("player_joined")).player.note).toEqual(note);
  });

  it("passes a changed note on, cleaned, and a cleared one", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    const ben = await Client.open(room, { sub: "ben" });
    await ben.next("welcome");

    ava.send({ t: "note", note: { emoji: "🎧", text: "  Heads   down ", until: null } });
    expect(await ben.next("note")).toEqual({ t: "note", id: "ava", note: { emoji: "🎧", text: "Heads down", until: null } });

    ben.messages.length = 0;
    ava.send({ t: "note", note: null });
    expect(await ben.next("note")).toEqual({ t: "note", id: "ava", note: null });
  });

  it("carries names and notes in any script through to the room", async () => {
    const room = uniqueRoom();
    const li = await Client.open(room, { sub: "li", name: "李小龙", note: { emoji: "👩🏽‍💻", text: "Café, à bientôt", until: null } });
    const welcome = await li.next("welcome");
    expect(welcome.self.name).toBe("李小龙");
    expect(welcome.self.note).toEqual({ emoji: "👩🏽‍💻", text: "Café, à bientôt", until: null });
  });

  it("leaves out a note that has already ended", async () => {
    const room = uniqueRoom();
    const ben = await Client.open(room, { sub: "ben", note: { emoji: "🚶", text: "Back soon", until: Date.now() - 1000 } });
    const welcome = await ben.next("welcome");
    expect(welcome.self.note).toBeNull();
  });

  it("takes no note from a guest", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    const gil = await Client.open(room, { sub: "gil", role: "guest" });
    await gil.next("welcome");

    gil.send({ t: "note", note: { emoji: "🍜", text: "Lunch", until: null } });
    await settle();
    expect(ava.messages.some((message) => message.t === "note")).toBe(false);
  });
});

describe("a new name on the demo office's floor", () => {
  let copy = 9000;

  it("passes on the name someone took signing up from the floor, cleaned", async () => {
    const room = `lobby-${copy++}`;
    const ava = await Client.open(room, { sub: "ava", role: "guest" });
    await ava.next("welcome");
    const gil = await Client.open(room, { sub: "gil", name: "Mason", role: "guest" });
    await gil.next("welcome");

    gil.send({ t: "rename", name: "  Gil   Smith " });
    expect(await ava.next("renamed")).toEqual({ t: "renamed", id: "gil", name: "Gil Smith" });

    // Whoever walks in next sees the new name.
    const cy = await Client.open(room, { sub: "cy", role: "guest" });
    const welcome = await cy.next("welcome");
    expect(welcome.players.find((player) => player.id === "gil")?.name).toBe("Gil Smith");
  });

  it("takes no new name in an office, where the name comes from the account", async () => {
    const room = uniqueRoom();
    const ava = await Client.open(room, { sub: "ava" });
    await ava.next("welcome");
    const ben = await Client.open(room, { sub: "ben" });
    await ben.next("welcome");

    ben.send({ t: "rename", name: "Someone Else" });
    await settle();
    expect(ava.messages.some((message) => message.t === "renamed")).toBe(false);
  });
});
