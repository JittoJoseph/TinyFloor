import type { GuideSection } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";
import type { ToolCopy } from "@/components/tools/ToolPage";
import type { OooReason, OooTone } from "./compose";
import en from "./en";
import es from "./es";
import pt from "./pt";

/**
 * An out-of-office message generator (docs/search.md: "out of office message"
 * over 10,000 searches a month in the US, easy; "out of office message
 * examples" over 1,000): an email auto-reply and a chat status from a few
 * choices, and how to set one in Outlook, Gmail, Slack and Teams. Closest to
 * what TinyFloor does with status notes ("🌴 On holiday until Monday"). In
 * English, Portuguese and Spanish (lib/tools/catalog).
 */
export const OUT_OF_OFFICE_UPDATED = "2026-10-21";

export interface OooContent extends ToolCopy {
  writer: {
    reason: string;
    reasons: Record<OooReason, string>;
    back: string;
    unknown: string;
    name: string;
    contact: string;
    email: string;
    optional: string;
    tone: string;
    tones: Record<OooTone, string>;
    emailTitle: string;
    statusTitle: string;
    statusNote: string;
    copy: string;
    copied: string;
  };
  sections: GuideSection[];
}

const CONTENT: Partial<Record<Locale, OooContent>> = { en, pt, es };

export const outOfOfficeIn = (locale: string): OooContent | undefined => CONTENT[locale as Locale];
