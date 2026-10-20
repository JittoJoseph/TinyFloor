import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { GENERAL_CHANNEL, dmChannelId, type ChatFile } from "../../shared-protocol/src";
import { ChatClient, officeId } from "./chat-client";

let sequence = 0;
const person = (name: string) => ({ id: `${name.toLowerCase()}-${sequence++}`, name });

/** A file as the API would have stored it for this office. */
async function stored(office: string, name = "plan.pdf", type = "application/pdf"): Promise<ChatFile> {
  const key = `att/${office}/${crypto.randomUUID()}.${name.split(".").pop()}`;
  await env.FILES.put(key, "content");
  return { key, name, size: 7, type };
}

describe("files in chat", () => {
  it("passes on files kept under this office, and drops anything else", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, person("Ada"));
    await ada.next("chat_ready");

    const mine = await stored(office);
    const elsewhere = { key: `att/other-office/${crypto.randomUUID()}.png`, name: "x.png", size: 3, type: "image/png" };
    const tooBig = { ...(await stored(office, "big.zip", "application/zip")), size: 50 * 1024 * 1024 };
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "", files: [mine, elsewhere, tooBig] });
    const { message } = await ada.next("chat_new");
    expect(message.files).toEqual([mine]);
    expect(message.body).toBe("");

    // A message with nothing in it after the bad files are dropped isn't sent at all.
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: " ", files: [elsewhere] });
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "after" });
    expect((await ada.next("chat_new")).message.body).toBe("after");
  });

  it("deletes a file from storage when its message is taken back", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, person("Ada"));
    await ada.next("chat_ready");
    const file = await stored(office, "shot.png", "image/png");
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "look", files: [{ ...file, width: 800, height: 600 }] });
    const { message } = await ada.next("chat_new");
    expect(message.files?.[0]).toMatchObject({ width: 800, height: 600 });

    ada.send({ t: "chat_delete", seq: message.seq });
    await ada.next("chat_deleted");
    // The delete runs after the reply; give it a moment.
    for (let tries = 0; tries < 20 && (await env.FILES.head(file.key)); tries++) await new Promise((done) => setTimeout(done, 25));
    expect(await env.FILES.head(file.key)).toBeNull();
  });
});

describe("mentions", () => {
  it("counts a channel's unread mentions for the person mentioned, and keeps them through an edit", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, person("Ada"));
    const bo = person("Bo");
    await ada.next("chat_ready");

    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "morning all" });
    ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "@Bo can you look?", mentions: [bo.id, ada.id, bo.id] });
    await ada.next("chat_new");
    const { message } = await ada.next("chat_new");
    // Each person once, never the author.
    expect(message.mentions).toEqual([bo.id]);

    const reader = await ChatClient.open(office, bo);
    const ready = await reader.next("chat_ready");
    expect(ready.channels.find((one) => one.id === GENERAL_CHANNEL)).toMatchObject({ unread: 2, mentions: 1 });

    ada.send({ t: "chat_edit", seq: message.seq, body: "never mind", mentions: [] });
    const edited = await reader.next("chat_edited");
    expect(edited.mentions).toBeUndefined();
    const again = await ChatClient.open(office, bo);
    const after = await again.next("chat_ready");
    expect(after.channels.find((one) => one.id === GENERAL_CHANNEL)?.mentions).toBeUndefined();
  });
});

describe("search", () => {
  it("finds words and file names in channels and your own direct messages, not others'", async () => {
    const office = officeId();
    const ada = person("Ada");
    const bo = person("Bo");
    const cy = person("Cy");
    const adaChat = await ChatClient.open(office, ada);
    const boChat = await ChatClient.open(office, bo);
    await adaChat.next("chat_ready");
    await boChat.next("chat_ready");

    adaChat.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "Lunch at the Café?" });
    adaChat.send({ t: "chat_send", channel: dmChannelId(ada.id, bo.id), body: "the cafe budget" });
    adaChat.send({ t: "chat_send", channel: dmChannelId(ada.id, cy.id), body: "cafe secret" });
    adaChat.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: "", files: [await stored(office, "Cafe-menu.pdf")] });
    for (let n = 0; n < 4; n++) await adaChat.next("chat_new");

    boChat.send({ t: "chat_search", q: "CAFE" });
    const found = await boChat.next("chat_found");
    expect(found.q).toBe("CAFE");
    expect(found.messages.map((one) => one.body)).toEqual(["", "the cafe budget", "Lunch at the Café?"]);

    boChat.send({ t: "chat_search", q: "c" });
    expect((await boChat.next("chat_found")).messages).toEqual([]);
  });

  it("loads a conversation back to a found message", async () => {
    const office = officeId();
    const ada = await ChatClient.open(office, person("Ada"));
    await ada.next("chat_ready");
    for (let n = 0; n < 80; n++) ada.send({ t: "chat_send", channel: GENERAL_CHANNEL, body: n === 3 ? "the needle" : `line ${n}` });
    let needle = 0;
    for (let n = 0; n < 80; n++) {
      const { message } = await ada.next("chat_new");
      if (message.body === "the needle") needle = message.seq;
    }

    ada.send({ t: "chat_history", channel: GENERAL_CHANNEL, to: needle });
    const page = await ada.next("chat_page");
    // Everything from the newest back past the needle: more than one ordinary page of 50.
    expect(page.messages.some((one) => one.seq === needle)).toBe(true);
    expect(page.messages.at(-1)?.body).toBe("line 79");
    expect(page.more).toBe(false);
  });
});
