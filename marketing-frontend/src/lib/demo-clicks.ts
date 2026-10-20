import { trackLeaving } from "@/lib/analytics";

/**
 * The first step of the demo office's funnel (docs/analytics.md): a click on
 * any link into it, from any page, recorded with where on the page it was.
 * One listener for the whole site rather than one per link, so a new link to
 * the demo office is counted without anyone remembering to. A link says where
 * it is with `data-cta` (on it or around it); otherwise the menu, the footer,
 * or simply the page.
 */
function placement(link: Element): string {
  const marked = link.closest("[data-cta]")?.getAttribute("data-cta");
  if (marked) return marked;
  if (link.closest("header, nav")) return "nav";
  if (link.closest("footer")) return "footer";
  return "page";
}

export function countDemoClicks() {
  document.addEventListener(
    "click",
    (event) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      const url = new URL(link.href);
      if (url.origin === window.location.origin || !/\/lobby\/?$/.test(url.pathname)) return;
      // Opened in another tab, this page stays: nothing to wait for.
      const here = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey && link.target !== "_blank";
      const waits = trackLeaving("demo_cta_clicked", { placement: placement(link) }, () => here && window.location.assign(link.href));
      if (waits && here) event.preventDefault();
    },
    { capture: true },
  );
}
