import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Locale-aware navigation. Use these instead of `next/link` and the router
 * hooks from `next/navigation` wherever a link or redirect should keep the
 * active locale. `useSearchParams` and `useParams` still come from Next.
 */
export const { Link, redirect, usePathname, useRouter, getPathname } =
  createNavigation(routing);
