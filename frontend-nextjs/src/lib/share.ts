"use client";

/** What happened when someone asked to invite people. */
export type ShareResult = "shared" | "copied" | "failed";

/**
 * A share sheet is the right thing on a phone and the wrong thing on a desktop,
 * where a system dialog to send a link to yourself is a detour: there the link
 * goes straight to the clipboard. Chrome on Windows has both, so the device
 * decides, not the browser.
 */
function prefersShareSheet(): boolean {
  if (typeof navigator === "undefined" || typeof navigator.share !== "function") return false;
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/**
 * Hands a link to whatever suits the device: the share sheet on phones, the
 * clipboard everywhere else, and a hidden field for browsers that allow
 * neither. Cancelling the share sheet is not a failure, so nothing is said.
 */
export async function shareLink(url: string, title?: string, text?: string): Promise<ShareResult> {
  if (prefersShareSheet()) {
    try {
      await navigator.share({ url, title, text });
      return "shared";
    } catch (error) {
      // "AbortError" is someone closing the sheet; anything else falls back.
      if (error instanceof DOMException && error.name === "AbortError") return "shared";
    }
  }
  return (await copyText(url)) ? "copied" : "failed";
}

/** Puts text on the clipboard, with a fallback for pages without permission. */
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Blocked or not allowed here; the old way still works in most browsers.
  }

  try {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.appendChild(field);
    field.select();
    const done = document.execCommand("copy");
    document.body.removeChild(field);
    return done;
  } catch {
    return false;
  }
}
