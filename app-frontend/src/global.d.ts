import type { routing } from "@/lib/i18n/routing";
import type shared from "../../web-shared/messages/en.json";
import type own from "../messages/en.json";

// Types every `useTranslations` / `getTranslations` call against the English
// source (the messages both sites share and this site's own), so a missing or
// renamed key fails type-checking instead of rendering the raw key at runtime.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof shared & typeof own;
  }
}
