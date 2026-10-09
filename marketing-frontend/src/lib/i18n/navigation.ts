import { createElement, type ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "@/lib/i18n/routing";
import { APP_PATH } from "@/lib/site";
import { AppAnchor } from "./AppAnchor";

/**
 * The site's locale-aware navigation. Each app has its own (the app's is plain);
 * shared components import "@/lib/i18n/navigation" and get this one here, so
 * every link on the site's pages, shared components' too, goes the same way.
 */
const navigation = createNavigation(routing);
export const { redirect, permanentRedirect, usePathname, useRouter } = navigation;

/**
 * A link to one of the site's pages, or, for the app's (the lobby, signing
 * in, making an office), a plain link to the app's address in the reader's language.
 */
export function Link({ href, locale, prefetch, replace, scroll, ...props }: ComponentProps<typeof navigation.Link>) {
  if (typeof href === "string" && APP_PATH.test(href)) return createElement(AppAnchor, { ...props, href, locale });
  return createElement(navigation.Link, { ...props, href, locale, prefetch, replace, scroll });
}
