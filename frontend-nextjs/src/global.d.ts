import type { routing } from "@/lib/i18n/routing";
import type messages from "../messages/en.json";

// Types every `useTranslations` / `getTranslations` call against the English
// source, so a missing or renamed key fails type-checking instead of rendering
// the raw key at runtime.
declare module "next-intl" {
  interface AppConfig {
    Locale: (typeof routing.locales)[number];
    Messages: typeof messages;
  }
}
