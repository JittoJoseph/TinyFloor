/**
 * Voice sent only while there is something to hear (Opus DTX, RFC 7587): in a
 * pause the encoder sends a comfort-noise packet every 400 ms instead of fifty
 * a second, so a call carries about half the voice it did, since someone is
 * usually listening. LiveKit turns it on for every microphone too.
 *
 * An SDP's `usedtx=1` asks the other end to send this way, so it is added to
 * what we hand over: our offers and answers on a call, and the SFU's
 * descriptions before they are applied here, since those set how our own
 * encoder sends. Every Opus payload type gets it, also the one RED wraps.
 */
export function withOpusDtx(sdp: string): string {
  const opus = new Set<string>();
  for (const match of sdp.matchAll(/^a=rtpmap:(\d+) opus\/48000/gim)) opus.add(match[1]);
  if (!opus.size) return sdp;
  const eol = sdp.includes("\r\n") ? "\r\n" : "\n";
  const lines = sdp.split(eol);
  const seen = new Set<string>();
  const out = lines.map((line) => {
    const fmtp = /^a=fmtp:(\d+) (.*)$/.exec(line);
    if (!fmtp || !opus.has(fmtp[1])) return line;
    seen.add(fmtp[1]);
    if (/(^|;)\s*usedtx=/.test(fmtp[2])) return line.replace(/usedtx=\d/, "usedtx=1");
    return `${line};usedtx=1`;
  });
  // An Opus payload type without parameters of its own gets a line for them, after its rtpmap.
  for (const pt of opus) {
    if (seen.has(pt)) continue;
    for (let i = out.length - 1; i >= 0; i--) {
      if (new RegExp(`^a=rtpmap:${pt} opus/48000`, "i").test(out[i])) out.splice(i + 1, 0, `a=fmtp:${pt} usedtx=1`);
    }
  }
  return out.join(eol);
}

/** A description with DTX asked for, ready to hand over or apply. */
export function dtxDescription<T extends { type: RTCSdpType; sdp?: string }>(description: T): T {
  return description.sdp ? { ...description, sdp: withOpusDtx(description.sdp) } : description;
}
