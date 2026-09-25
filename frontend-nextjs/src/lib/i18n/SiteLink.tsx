import type { ComponentProps } from "react";
import { Link } from "./navigation";

/**
 * A link on the site's own pages. Next fetches every link in view ahead of
 * time, and each of those is a request to the worker that costs as much as
 * the page; the site's pages are quick to load on a click, so they are
 * fetched only then.
 */
export function SiteLink(props: ComponentProps<typeof Link>) {
  return <Link prefetch={false} {...props} />;
}
