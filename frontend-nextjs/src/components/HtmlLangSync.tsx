"use client";

import { useEffect } from "react";

/**
 * Keeps `<html lang>` and `<html dir>` in step with the active locale.
 *
 * The root layout renders `<html>` above the `[locale]` segment, so it does not
 * re-render on a client-side locale switch. Without this, going from `/` to
 * `/ar` would leave `lang`/`dir` stale until a full reload. On a hard load the
 * root layout already emits the right values, so this is a no-op there.
 */
export function HtmlLangSync({ lang, dir }: { lang: string; dir: "ltr" | "rtl" }) {
  useEffect(() => {
    const el = document.documentElement;
    el.lang = lang;
    el.dir = dir;
  }, [lang, dir]);

  return null;
}
