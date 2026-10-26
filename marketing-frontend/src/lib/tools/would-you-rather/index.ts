import type { Locale } from "@/lib/i18n/routing";
import type { IcebreakersContent } from "@/lib/tools/icebreakers";
import ar from "./ar";
import da from "./da";
import de from "./de";
import en from "./en";
import es from "./es";
import fi from "./fi";
import fr from "./fr";
import he from "./he";
import it from "./it";
import ja from "./ja";
import ko from "./ko";
import nl from "./nl";
import no from "./no";
import pl from "./pl";
import pt from "./pt";
import ru from "./ru";
import sv from "./sv";
import zh from "./zh";

/**
 * Would-you-rather and this-or-that questions for work (docs/search.md: over
 * 1,000 searches a month in the US, easy), in every language
 * (lib/tools/catalog). Same rules as the icebreakers: nothing private, both
 * options fine, nothing that assumes how someone lives.
 */
export const WOULD_YOU_RATHER_UPDATED = "2026-10-26";

const CONTENT: Record<Locale, IcebreakersContent> = { en, pt, es, de, fr, it, nl, pl, sv, da, no, fi, ru, ja, ko, zh, he, ar };

export const wouldYouRatherIn = (locale: string): IcebreakersContent | undefined => CONTENT[locale as Locale];
