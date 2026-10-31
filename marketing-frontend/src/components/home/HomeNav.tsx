import type { ReactNode } from "react";
import { getLocale, getTranslations } from "next-intl/server";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronDown,
  Coffee,
  CreditCard,
  DoorOpen,
  Eye,
  FileText,
  Footprints,
  HelpCircle,
  Globe,
  Hash,
  KeyRound,
  MessagesSquare,
  MonitorUp,
  Office,
  Palette,
  PenLine,
  Presentation,
  Settings2,
  UserPlus,
  UsersRound,
  Zap,
} from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { GUIDES_PATH, guidePath, guidesIn, type GuideKey } from "@/lib/guides";
import { guideCopies } from "@/lib/guide-copy";
import { HUBS, LANDINGS, landingByKey, type Landing, type LandingKey } from "@/lib/landings";
import type { Locale } from "@/lib/i18n/routing";
import { STANDUP_PATH, TOOLS_PATH } from "@/lib/tools/catalog";
import { FEW_TOOL_NAMES } from "@/lib/tools/hub-copy";
import { ICEBREAKERS_PATH } from "@/lib/tools/icebreakers";
import { OFFICE_COSTS_PATH } from "@/lib/tools/office-costs";
import { TIME_ZONES_PATH } from "@/lib/tools/time-zones";
import { Logo } from "@/components/app/Logo";
import { cn } from "@/lib/utils";
import { HomeNavActions } from "./HomeNavActions";
import { MobileMenu, MobileSection } from "./MobileMenu";
import { Later } from "./Later";
import { ScrollHeader } from "./ScrollHeader";

export const COLUMN = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

/** An icon for each feature, team and use case page. */
const ICONS: Partial<Record<LandingKey, ReactNode>> = {
  proximityChat: <Footprints />,
  meetingRoom: <Presentation />,
  teamChat: <Hash />,
  presence: <Eye />,
  whiteboard: <PenLine />,
  engineering: <Settings2 />,
  design: <Palette />,
  startups: <Zap />,
  agencies: <Building2 />,
  virtualOffice: <DoorOpen />,
  standup: <UsersRound />,
  pairProgramming: <MonitorUp />,
  onboarding: <UserPlus />,
  watercooler: <Coffee />,
  virtualCoworking: <UsersRound />,
  hybrid: <Office />,
};

const FEATURES = LANDINGS.filter((page) => page.group === "features");
const TEAMS = LANDINGS.filter((page) => page.group === "teams");
const USE_CASES = LANDINGS.filter((page) => page.group === "useCases");
const COMPARE = LANDINGS.filter((page) => page.group === "compare");

/** The alternatives people search for most (docs/search.md); the rest are on the compare index. */
export const TOP_ALTERNATIVES: LandingKey[] = ["gather", "kumospace", "sowork", "spot", "roam", "ovice", "zep", "workadventure"];
const HEAD_TO_HEAD = COMPARE.filter((page) => page.versus);

/** The guides a buyer or a team lead reads first, for the Resources menu and the footer. */
export const TOP_GUIDES: GuideKey[] = ["bestVirtualOffice", "gatherPricing", "remoteTools", "manageRemote", "remoteCommunication"];

/** The top guides written in this language, in TOP_GUIDES's order. */
export const topGuidesIn = (locale: string) =>
  TOP_GUIDES.map((key) => guidesIn(locale).find((guide) => guide.key === key)).filter((guide) => guide !== undefined);

/** The free tools written in every language, with an icon each; the footer's own name for them where it has one. */
export const TOP_TOOLS: Array<{ path: string; icon: ReactNode; name?: "officeCosts" | "timeZones" | "icebreakers" }> = [
  { path: OFFICE_COSTS_PATH, icon: <CreditCard />, name: "officeCosts" },
  { path: TIME_ZONES_PATH, icon: <Globe />, name: "timeZones" },
  { path: ICEBREAKERS_PATH, icon: <MessagesSquare />, name: "icebreakers" },
  { path: STANDUP_PATH, icon: <FileText /> },
];

/**
 * The site's nav. At the top of a page it lies flat; once the page moves it
 * floats (ScrollHeader). Wider screens get four menus that open on hover or
 * focus: the product (its features, and the demo office to try it), who it's
 * for (teams and use cases), how it compares (the alternatives people search
 * for, the head-to-heads, and the guide that compares them all), and
 * resources (the guides and free tools read most). A phone gets one
 * full-screen menu with the same links in sections that fold, and the two
 * ways in at the bottom where a thumb is.
 */
export async function HomeNav({ fade = true }: { fade?: boolean }) {
  const t = await getTranslations("home");
  const tl = await getTranslations("landings");
  const tg = await getTranslations("guides");
  const locale = await getLocale();
  const guides = await guideCopies(locale);
  const topGuides = topGuidesIn(locale);
  const compareGuide = guidesIn(locale).find((guide) => guide.key === "bestVirtualOffice");
  const toolName = (tool: (typeof TOP_TOOLS)[number]) => (tool.name ? t(`footer.${tool.name}`) : (FEW_TOOL_NAMES[locale as Locale]?.[tool.path] ?? ""));
  const tools = TOP_TOOLS.filter((tool) => toolName(tool));
  const plain =
    "flex h-9 items-center rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground";
  const demoStrip = <MenuStrip href="/lobby" title={t("nav.lobbyTitle")} line={t("nav.lobbyLine")} floor="-279px -98px" />;
  const compareLabel = (page: Landing) => {
    const name = page.competitor ?? page.product;
    return name ? t("footer.vs", { name }) : tl(`pages.${page.key}.label`);
  };

  return (
    <ScrollHeader fade={fade}>
      <nav
        aria-label={t("nav.main")}
        className={cn(
          "mx-auto grid h-16 max-w-[1200px] grid-cols-[1fr_auto_1fr] items-center gap-4 border border-transparent bg-background px-5 sm:px-8",
          "transition-[max-width,height,border-radius,background-color,border-color,box-shadow,padding] duration-300 ease-out",
          "group-data-[scrolled=true]/header:h-14 group-data-[scrolled=true]/header:max-w-[1100px] group-data-[scrolled=true]/header:rounded-full",
          "group-data-[scrolled=true]/header:border-border/80 group-data-[scrolled=true]/header:bg-background/85 group-data-[scrolled=true]/header:backdrop-blur-xl",
          "group-data-[scrolled=true]/header:px-3 group-data-[scrolled=true]/header:shadow-[0_8px_24px_-10px_rgb(0_0_0/0.18)] sm:group-data-[scrolled=true]/header:px-4 sm:group-data-[scrolled=true]/header:ps-5",
        )}
      >
        <Link href="/" className="flex w-fit items-center gap-2.5 text-[17px] font-bold tracking-tight">
          <Logo size={28} />
          TinyFloor
        </Link>

        <div className="hidden items-center md:flex">
          <Menu label={t("footer.product")} strip={demoStrip}>
            <MenuColumn title={tl("features")} all={{ href: `/${HUBS.features}`, label: tl("all") }}>
              {FEATURES.map((page) => (
                <MenuLink key={page.slug} href={`/${page.slug}`} icon={ICONS[page.key]} label={tl(`pages.${page.key}.label`)} />
              ))}
            </MenuColumn>
            <MenuColumn title={t("nav.getStarted")}>
              <MenuLink href="/lobby" icon={<DoorOpen className="rtl:-scale-x-100" />} label={t("nav.lobbyTitle")} />
              <MenuLink href="/home?mode=signup" icon={<UserPlus />} label={t("nav.start")} />
              <MenuLink href="/pricing" icon={<CreditCard />} label={t("nav.pricing")} />
              <MenuLink href="/#faq" icon={<HelpCircle />} label={t("nav.faq")} />
              <MenuLink href="/auth" icon={<KeyRound />} label={t("nav.signIn")} />
            </MenuColumn>
          </Menu>

          <Menu label={t("nav.teams")} strip={demoStrip}>
            {[TEAMS, USE_CASES.slice(0, TEAMS.length)].map((group) => (
              <MenuColumn key={group[0].group} title={tl(group[0].group)} all={{ href: `/${HUBS[group[0].group]}`, label: tl("all") }}>
                {group.map((page) => (
                  <MenuLink key={page.slug} href={`/${page.slug}`} icon={ICONS[page.key]} label={tl(`pages.${page.key}.label`)} />
                ))}
              </MenuColumn>
            ))}
          </Menu>

          <Menu
            label={t("footer.compare")}
            strip={
              compareGuide && <MenuStrip href={guidePath(compareGuide)} title={guides.bestVirtualOffice.label} line={t("nav.compareGuide")} floor="-36px -104px" />
            }
          >
            <MenuColumn title={tl("compare")} all={{ href: `/${HUBS.compare}`, label: tl("all") }} wide>
              {TOP_ALTERNATIVES.map(landingByKey).map((page) => (
                <MenuLink key={page.slug} href={`/${page.slug}`} icon={<Monogram name={page.competitor ?? page.product ?? ""} />} label={compareLabel(page)} />
              ))}
              {HEAD_TO_HEAD.map((page) => (
                <MenuLink
                  key={page.slug}
                  href={`/${page.slug}`}
                  icon={<Monogram name={(page.versus ?? []).map((key) => landingByKey(key).competitor?.[0] ?? "").join("")} />}
                  label={tl(`pages.${page.key}.label`)}
                />
              ))}
            </MenuColumn>
          </Menu>

          <Menu label={t("footer.resources")} strip={demoStrip}>
            <MenuColumn title={tg("label")} all={{ href: GUIDES_PATH, label: tg("all") }}>
              {topGuides.slice(0, Math.max(tools.length, 4)).map((guide) => (
                <MenuLink key={guide.slug} href={guidePath(guide)} icon={<BookOpen />} label={guides[guide.key].label} />
              ))}
            </MenuColumn>
            <MenuColumn title={t("footer.tools")} all={{ href: TOOLS_PATH, label: tl("all") }}>
              {tools.map((tool) => (
                <MenuLink key={tool.path} href={tool.path} icon={tool.icon} label={toolName(tool)} />
              ))}
            </MenuColumn>
          </Menu>

          <Link href="/pricing" className={plain}>
            {t("nav.pricing")}
          </Link>
        </div>

        <div className="col-start-3 flex items-center justify-end gap-2">
          <HomeNavActions signIn={t("nav.signIn")} start={t("nav.getStarted")} />
          <MobileMenu
            label={t("nav.menu")}
            actions={
              <>
                <Link
                  href="/home?mode=signup"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-foreground text-[15px] font-medium text-background active:scale-[0.98]"
                >
                  {t("nav.start")}
                </Link>
                <Link
                  href="/auth"
                  className="flex h-12 w-full items-center justify-center rounded-full bg-foreground/[0.07] text-[15px] font-medium text-foreground active:scale-[0.98]"
                >
                  {t("nav.signIn")}
                </Link>
              </>
            }
          >
            <MobileSection title={t("footer.product")} open>
              {FEATURES.map((page) => (
                <MobileItem key={page.slug} href={`/${page.slug}`} icon={ICONS[page.key]} title={tl(`pages.${page.key}.label`)} />
              ))}
              <MobileItem href="/lobby" icon={<DoorOpen className="rtl:-scale-x-100" />} title={t("nav.lobbyTitle")} accent />
            </MobileSection>
            <MobileSection title={tl("teams")}>
              {TEAMS.map((page) => (
                <MobileItem key={page.slug} href={`/${page.slug}`} icon={ICONS[page.key]} title={tl(`pages.${page.key}.label`)} />
              ))}
            </MobileSection>
            <MobileSection title={tl("useCases")}>
              {USE_CASES.map((page) => (
                <MobileItem key={page.slug} href={`/${page.slug}`} icon={ICONS[page.key]} title={tl(`pages.${page.key}.label`)} />
              ))}
            </MobileSection>
            <MobileSection title={t("footer.compare")}>
              {[...TOP_ALTERNATIVES.map(landingByKey), ...HEAD_TO_HEAD].map((page) => (
                <MobileItem key={page.slug} href={`/${page.slug}`} title={page.versus ? tl(`pages.${page.key}.label`) : compareLabel(page)} />
              ))}
              <MobileItem href={`/${HUBS.compare}`} title={tl("all")} />
            </MobileSection>
            <MobileSection title={t("footer.resources")}>
              {topGuides.map((guide) => (
                <MobileItem key={guide.slug} href={guidePath(guide)} icon={<BookOpen />} title={guides[guide.key].label} />
              ))}
              {tools.map((tool) => (
                <MobileItem key={tool.path} href={tool.path} icon={tool.icon} title={toolName(tool)} />
              ))}
              <MobileItem href={GUIDES_PATH} title={tg("all")} />
              <MobileItem href={TOOLS_PATH} title={t("footer.tools")} />
            </MobileSection>
            <div className="divide-y divide-border border-b border-border">
              <MobileLink href="/pricing">{t("nav.pricing")}</MobileLink>
              <MobileLink href="/#faq">{t("nav.faq")}</MobileLink>
            </div>
          </MobileMenu>
        </div>
      </nav>
    </ScrollHeader>
  );
}

/**
 * A section of a menu: its heading, with the link to everything of its kind at
 * the heading's end, and its links. A wide one runs across both columns.
 */
function MenuColumn({ title, all, wide, children }: { title: string; all?: { href: string; label: string }; wide?: boolean; children: ReactNode }) {
  return (
    <div className={cn("min-w-0", wide && "col-span-2")}>
      <div className="flex h-8 items-center justify-between gap-2 px-2">
        <p className="text-[12px] font-medium text-muted-foreground">{title}</p>
        {all && (
          <Link href={all.href} className="flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground">
            {all.label}
            <ArrowRight className="size-3 rtl:rotate-180" />
          </Link>
        )}
      </div>
      <ul className={cn("grid gap-0.5", wide && "grid-cols-2 gap-x-2")}>{children}</ul>
    </div>
  );
}

/** A link in a menu: its icon in a small tile, the name, and an arrow on hover. */
function MenuLink({ href, icon, label }: { href: string; icon: ReactNode; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group/item flex h-10 items-center gap-2.5 rounded-[10px] px-2 text-[13.5px] text-foreground/85 transition-colors hover:bg-foreground/[0.05] hover:text-foreground focus-visible:bg-foreground/[0.05]"
      >
        <span className="flex size-7 shrink-0 items-center justify-center rounded-[8px] bg-foreground/[0.06] text-foreground/70 transition-colors group-hover/item:bg-foreground/[0.1] group-hover/item:text-foreground [&_svg]:size-[15px]">
          {icon}
        </span>
        <span className="min-w-0 flex-1 truncate">{label}</span>
        <ArrowRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 rtl:rotate-180" />
      </Link>
    </li>
  );
}

/** A competitor's initials, in place of an icon (their marks are theirs). */
function Monogram({ name }: { name: string }) {
  const letters = name.length <= 2 ? name : name.replace(/[^A-Za-z]/g, "").slice(0, 1);
  return <span className="text-[11px] font-semibold tracking-tight">{letters.toUpperCase()}</span>;
}

/**
 * The line along the bottom of every menu: the one place to go first, with a
 * corner of the real floor, at the art's own pixels, beside it.
 */
function MenuStrip({ href, title, line, floor }: { href: string; title: string; line: string; floor: string }) {
  return (
    <Link href={href} className="group/strip flex items-center gap-3.5 rounded-[12px] bg-foreground/[0.04] p-2 pe-4 transition-colors hover:bg-foreground/[0.07]">
      <span
        aria-hidden
        className="block h-[72px] w-[120px] shrink-0 rounded-[8px] bg-[url(/floor.webp)] bg-no-repeat [image-rendering:pixelated]"
        style={{ backgroundSize: "768px 512px", backgroundPosition: floor }}
      />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium leading-tight">{title}</span>
        <span className="mt-1 line-clamp-2 block text-[12.5px] leading-snug text-muted-foreground">{line}</span>
      </span>
      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover/strip:translate-x-0.5 rtl:rotate-180" />
    </Link>
  );
}

/**
 * A nav item that opens a panel under itself while it's hovered or focused.
 * Every menu is the same panel: one width, two columns of links, and the place
 * to go first along the bottom. Opening is
 * immediate; closing waits a moment, so moving the pointer down to the panel
 * never loses it.
 */
function Menu({ label, strip, children }: { label: string; strip?: ReactNode; children: ReactNode }) {
  return (
    <div className="group/menu relative">
      <button
        type="button"
        aria-haspopup="true"
        className="flex h-9 cursor-default items-center gap-1 rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors group-focus-within/menu:bg-foreground/[0.05] group-focus-within/menu:text-foreground group-hover/menu:bg-foreground/[0.05] group-hover/menu:text-foreground"
      >
        {label}
        <ChevronDown className="size-3.5 opacity-60 transition-transform duration-200 group-focus-within/menu:rotate-180 group-hover/menu:rotate-180" />
      </button>
      <div
        className={cn(
          "invisible absolute start-1/2 top-full w-[520px] -translate-x-1/2 pt-2.5 opacity-0 rtl:translate-x-1/2",
          "translate-y-1 scale-[0.98] transition-[opacity,visibility,translate,scale] delay-100 duration-200 ease-out [transform-origin:top_center]",
          "group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:scale-100 group-focus-within/menu:opacity-100 group-focus-within/menu:delay-0",
          "group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:scale-100 group-hover/menu:opacity-100 group-hover/menu:delay-0",
        )}
      >
        <div className="rounded-[18px] border border-border bg-card p-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.3),0_2px_6px_-2px_rgb(0_0_0/0.08)]">
          <Later>
            <div className="grid grid-cols-2 gap-2">{children}</div>
            {strip && <div className="mt-2.5">{strip}</div>}
          </Later>
        </div>
      </div>
    </div>
  );
}

/** A row in the phone menu: big enough to tap, an icon when it has one. The demo office wears the brand colour. */
function MobileItem({ href, icon, title, accent }: { href: string; icon?: ReactNode; title: string; accent?: boolean }) {
  return (
    <li>
      <Link href={href} className="flex h-12 items-center gap-3 rounded-2xl px-2 text-[15px] text-foreground active:bg-foreground/[0.05]">
        {icon && (
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-[10px] [&_svg]:size-4",
              accent ? "bg-brand/12 text-brand" : "bg-foreground/[0.06] text-foreground/75",
            )}
          >
            {icon}
          </span>
        )}
        <span className={cn("flex-1 truncate", !icon && "ps-1")}>{title}</span>
      </Link>
    </li>
  );
}

function MobileLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="flex h-14 items-center justify-between px-1 text-[16px] font-medium text-foreground">
      {children}
      <ArrowRight className="size-4 text-faint rtl:rotate-180" />
    </Link>
  );
}
