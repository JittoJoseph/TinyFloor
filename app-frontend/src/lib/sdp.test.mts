import { test } from "node:test";
import assert from "node:assert/strict";
import { withOpusDtx } from "./sdp.ts";

// The audio part of a description as Chrome writes it, RED wrapping Opus.
const AUDIO = [
  "v=0",
  "o=- 4611731400430051336 2 IN IP4 127.0.0.1",
  "s=-",
  "t=0 0",
  "a=group:BUNDLE 0 1",
  "m=audio 9 UDP/TLS/RTP/SAVPF 63 111 9 0 8 13 110 126",
  "a=mid:0",
  "a=rtpmap:63 red/48000/2",
  "a=fmtp:63 111/111",
  "a=rtpmap:111 opus/48000/2",
  "a=rtcp-fb:111 transport-cc",
  "a=fmtp:111 minptime=10;useinbandfec=1",
  "a=rtpmap:9 G722/8000",
  "m=video 9 UDP/TLS/RTP/SAVPF 96",
  "a=mid:1",
  "a=rtpmap:96 VP8/90000",
  "",
].join("\r\n");

test("asks for DTX on every Opus payload, and nothing else changes", () => {
  const out = withOpusDtx(AUDIO);
  assert.match(out, /^a=fmtp:111 minptime=10;useinbandfec=1;usedtx=1$/m);
  assert.match(out, /^a=fmtp:63 111\/111$/m);
  assert.equal(out.split("\r\n").length, AUDIO.split("\r\n").length);
  assert.equal(out.replace(";usedtx=1", ""), AUDIO);
});

test("keeps the description's line endings", () => {
  assert.ok(!/[^\r]\n/.test(withOpusDtx(AUDIO)));
  const unix = AUDIO.replaceAll("\r\n", "\n");
  assert.ok(!withOpusDtx(unix).includes("\r"));
});

test("is idempotent, and turns DTX on where it was off", () => {
  const once = withOpusDtx(AUDIO);
  assert.equal(withOpusDtx(once), once);
  const off = AUDIO.replace("useinbandfec=1", "useinbandfec=1;usedtx=0");
  assert.match(withOpusDtx(off), /useinbandfec=1;usedtx=1$/m);
  assert.doesNotMatch(withOpusDtx(off), /usedtx=0/);
});

test("gives Opus a parameters line when it has none", () => {
  const bare = AUDIO.replace("a=fmtp:111 minptime=10;useinbandfec=1\r\n", "");
  const out = withOpusDtx(bare).split("\r\n");
  const rtpmap = out.indexOf("a=rtpmap:111 opus/48000/2");
  assert.equal(out[rtpmap + 1], "a=fmtp:111 usedtx=1");
});

test("covers each audio section, as the SFU's descriptions have several", () => {
  const two = AUDIO.replace("m=video", "m=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:2\r\na=rtpmap:111 opus/48000/2\r\na=fmtp:111 minptime=10;useinbandfec=1\r\nm=video");
  assert.equal(withOpusDtx(two).match(/usedtx=1/g)?.length, 2);
});

test("leaves a description without Opus alone", () => {
  const video = "v=0\r\nm=video 9 UDP/TLS/RTP/SAVPF 96\r\na=rtpmap:96 VP8/90000\r\n";
  assert.equal(withOpusDtx(video), video);
});
