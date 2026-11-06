"use client";

/**
 * The call in a small window of its own that stays on top of everything
 * (Chrome's Document Picture-in-Picture), the way Meet keeps a meeting with
 * you while you work in another tab or app. It opens by itself when you leave
 * the tab during a call (the media session's "enterpictureinpicture", which
 * Chrome offers to pages using the camera or microphone), or from a button,
 * and closes when the call ends. Elsewhere (Firefox, Safari) there is none,
 * and nothing offers it.
 */

interface DocumentPip {
  requestWindow(options?: { width?: number; height?: number; disallowReturnToOpener?: boolean; preferInitialWindowPlacement?: boolean }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPip;
  }
}

/** The window's size when it first opens: a small card, about a phone's width. */
const SIZE = { width: 320, height: 264 };

type Listener = () => void;

class Pip {
  private win: Window | null = null;
  private host: HTMLElement | null = null;
  private listeners = new Set<Listener>();
  /** Opened because you left the tab, so it goes again when you come back. */
  private byItself = false;
  /** Keeps the window in the app's theme when it changes while it's open. */
  private themeWatch: MutationObserver | null = null;

  get supported(): boolean {
    return typeof window !== "undefined" && !!window.documentPictureInPicture && window.isSecureContext;
  }

  /** Where the call is drawn while the window is open. */
  get container(): HTMLElement | null {
    return this.host;
  }

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = () => this.host;
  getServerSnapshot = () => null;

  /** Opens the window (from a press, or when you leave the tab); `byItself` closes it again when you come back. */
  async open(byItself = false): Promise<boolean> {
    if (!this.supported) return false;
    if (this.win) return true;
    let win: Window;
    try {
      win = await window.documentPictureInPicture!.requestWindow(SIZE);
    } catch {
      return false;
    }
    this.byItself = byItself;
    this.win = win;
    copyLook(win.document);
    this.themeWatch = new MutationObserver(() => copyTheme(win.document));
    this.themeWatch.observe(document.documentElement, { attributes: true });
    this.themeWatch.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    const host = win.document.createElement("div");
    host.className = "h-full";
    win.document.body.append(host);
    this.host = host;
    win.addEventListener("pagehide", () => this.forget(win), { once: true });
    this.emit();
    return true;
  }

  close() {
    const win = this.win;
    if (!win) return;
    this.forget(win);
    win.close();
  }

  /** Back to the tab: a window that opened by itself goes. */
  returned() {
    if (this.byItself) this.close();
  }

  private forget(win: Window) {
    if (this.win !== win) return;
    this.themeWatch?.disconnect();
    this.themeWatch = null;
    this.win = null;
    this.host = null;
    this.byItself = false;
    this.emit();
  }

  private emit() {
    this.listeners.forEach((listener) => listener());
  }
}

/**
 * The page's styles, theme and fonts, into the window's document, so what's
 * drawn there looks as it does in the page. Stylesheets are linked again by
 * address (their fonts and images then load relative to them), and styles
 * written into the page are copied rule by rule.
 */
function copyLook(target: Document) {
  for (const sheet of Array.from(document.styleSheets)) {
    if (sheet.href) {
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = sheet.href;
      target.head.append(link);
      continue;
    }
    try {
      const style = target.createElement("style");
      style.textContent = Array.from(sheet.cssRules, (rule) => rule.cssText).join("\n");
      target.head.append(style);
    } catch {
      // A sheet the page may not read: left out.
    }
  }
  copyTheme(target);
  target.title = document.title;
}

/** The page's theme (its classes and attributes, light or dark), onto the window's document. */
function copyTheme(target: Document) {
  target.documentElement.className = document.documentElement.className;
  for (const { name, value } of Array.from(document.documentElement.attributes)) {
    if (name !== "class" && name !== "style") target.documentElement.setAttribute(name, value);
  }
  target.documentElement.style.cssText = document.documentElement.style.cssText;
  target.body.className = document.body.className;
  target.documentElement.style.height = "100%";
  target.body.style.height = "100%";
  target.body.style.margin = "0";
}

export const pip = new Pip();
