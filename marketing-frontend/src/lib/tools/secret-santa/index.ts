import type { GuideSection } from "@/lib/guides";
import type { Locale } from "@/lib/i18n/routing";
import type { ToolCopy } from "@/components/tools/ToolPage";
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
 * A Secret Santa name draw (docs/search.md: "secret santa" peaks in early
 * December at about four times "out of office message" in the US; Germany
 * searches "Wichteln", Brazil "amigo secreto online", Spain "amigo invisible",
 * the Netherlands "lootjes trekken", Korea "마니또", Israel "גמד וענק"). Each
 * person gets a private link that shows who they're buying for; nothing is
 * stored or emailed. In every language (lib/tools/catalog).
 */
export const SECRET_SANTA_UPDATED = "2026-10-26";

export interface SantaContent extends ToolCopy {
  drawer: {
    names: string;
    namesHint: string;
    budget: string;
    date: string;
    optional: string;
    draw: string;
    redraw: string;
    redrawNote: string;
    tooFew: string;
    duplicate: string;
    linksTitle: string;
    linksNote: string;
    copy: string;
    copied: string;
    copyAll: string;
    /** The first line of the message that carries every link. */
    allIntro: string;
    /** With {name}: the person the link is for. */
    revealTitle: string;
    show: string;
    lookAway: string;
    budgetLabel: string;
    dateLabel: string;
    keepSecret: string;
    own: string;
  };
  sections: GuideSection[];
}

const CONTENT: Record<Locale, SantaContent> = { en, pt, es, de, fr, it, nl, pl, sv, da, no, fi, ru, ja, ko, zh, he, ar };

export const secretSantaIn = (locale: string): SantaContent | undefined => CONTENT[locale as Locale];
