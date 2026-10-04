import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  Building2,
  ChevronDown,
  Coffee,
  DoorOpen,
  Eye,
  Footprints,
  GraduationCap,
  Hash,
  MonitorUp,
  Palette,
  PenLine,
  Presentation,
  Settings2,
  UserPlus,
  UsersRound,
  Zap,
} from "@/components/ui/icons";
import { SiteLink as Link } from "@/lib/i18n/SiteLink";
import { HUBS, LANDINGS, type Landing, type LandingKey } from "@/lib/landings";
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
  virtualClassroom: <GraduationCap />,
};

const FEATURES = LANDINGS.filter((page) => page.group === "features");
const TEAMS = LANDINGS.filter((page) => page.group === "teams");
const USE_CASES = LANDINGS.filter((page) => page.group === "useCases");
const COMPARE = LANDINGS.filter((page) => page.group === "compare");

/**
 * The site's nav. At the top of a page it lies flat; once the page moves it
 * floats (ScrollHeader). Wider screens get three menus that open on hover or
 * focus: the product (its features, and the demo office to try it), who it's
 * for (teams and use cases), and how it compares. A phone gets one
 * full-screen menu with the same links in sections that fold, and the two
 * ways in at the bottom where a thumb is.
 */
export function HomeNav({ fade = true }: { fade?: boolean }) {
  const t = useTranslations("home");
  const tl = useTranslations("landings");
  const plain =
    "flex h-9 items-center rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground";
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
          <Menu label={t("footer.product")} width="w-[720px]">
            <div className="grid grid-cols-[minmax(0,1fr)_210px] gap-1.5">
              <div>
                <ul className="grid grid-cols-2 gap-0.5">
                  {FEATURES.map((page) => (
                    <MenuItem
                      key={page.slug}
                      href={`/${page.slug}`}
                      icon={ICONS[page.key]}
                      title={tl(`pages.${page.key}.label`)}
                      line={tl(`pages.${page.key}.line`)}
                    />
                  ))}
                </ul>
                <MenuAll href={`/${HUBS.features}`} label={tl("all")} />
              </div>
              <Link
                href="/lobby"
                className="group/demo flex flex-col justify-between rounded-[16px] bg-brand/[0.08] p-4 transition-colors hover:bg-brand/[0.12]"
              >
                <span className="flex size-9 items-center justify-center rounded-[11px] bg-brand/15 text-brand [&_svg]:size-[18px]">
                  <DoorOpen className="rtl:-scale-x-100" />
                </span>
                <span>
                  <span className="block text-[14px] font-semibold leading-tight">{t("nav.lobbyTitle")}</span>
                  <span className="mt-1 block text-[12.5px] leading-snug text-muted-foreground">{t("nav.lobbyLine")}</span>
                  <ArrowRight className="mt-3 size-4 text-brand transition-transform group-hover/demo:translate-x-0.5 rtl:rotate-180" />
                </span>
              </Link>
            </div>
          </Menu>

          <Menu label={t("nav.teams")} width="w-[560px]">
            <div className="grid grid-cols-2 gap-1.5">
              {[TEAMS, USE_CASES].map((group) => (
                <div key={group[0].group} className="min-w-0">
                  <MenuHeading>{tl(group[0].group)}</MenuHeading>
                  <ul className="grid">
                    {group.map((page) => (
                      <MenuItem key={page.slug} href={`/${page.slug}`} icon={ICONS[page.key]} title={tl(`pages.${page.key}.label`)} compact />
                    ))}
                  </ul>
                  <MenuAll href={`/${HUBS[group[0].group]}`} label={tl("all")} />
                </div>
              ))}
            </div>
          </Menu>

          <Menu label={t("footer.compare")} width="w-[480px]">
            <ul className="grid grid-cols-2 gap-0.5">
              {COMPARE.map((page) => (
                <li key={page.slug}>
                  <Link
                    href={`/${page.slug}`}
                    className="group/item flex h-9 items-center justify-between gap-2 rounded-[11px] px-3 text-[13.5px] text-foreground/85 transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
                  >
                    <span className="truncate">{compareLabel(page)}</span>
                    <ArrowRight className="size-3 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover/item:opacity-100 rtl:rotate-180" />
                  </Link>
                </li>
              ))}
            </ul>
            <MenuAll href={`/${HUBS.compare}`} label={tl("all")} />
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
                  href="/create"
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
              {COMPARE.map((page) => (
                <MobileItem key={page.slug} href={`/${page.slug}`} title={compareLabel(page)} />
              ))}
              <MobileItem href={`/${HUBS.compare}`} title={tl("all")} />
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

/** A small heading over a column of a menu. */
function MenuHeading({ children }: { children: ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-[11.5px] font-medium uppercase tracking-[0.14em] text-faint">{children}</p>;
}

/** The last line of a menu column: everything else of its kind, on its index page. */
function MenuAll({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mt-1 flex h-8 w-fit items-center gap-1 rounded-full px-2.5 text-[12.5px] font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      {label}
      <ArrowRight className="size-3 rtl:rotate-180" />
    </Link>
  );
}

/**
 * A nav item that opens a small panel under itself while it's hovered or
 * focused. Opening is immediate; closing waits a moment, so moving the pointer
 * down to the panel never loses it.
 */
function Menu({ label, width, children }: { label: string; width: string; children: ReactNode }) {
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
          "invisible absolute start-1/2 top-full -translate-x-1/2 pt-2.5 opacity-0 rtl:translate-x-1/2",
          width,
          "translate-y-1 scale-[0.98] transition-[opacity,visibility,translate,scale] delay-100 duration-200 ease-out [transform-origin:top_center]",
          "group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:scale-100 group-focus-within/menu:opacity-100 group-focus-within/menu:delay-0",
          "group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:scale-100 group-hover/menu:opacity-100 group-hover/menu:delay-0",
        )}
      >
        <div className="rounded-[22px] border border-border bg-card p-2 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.3),0_2px_6px_-2px_rgb(0_0_0/0.08)]">
          <Later>{children}</Later>
        </div>
      </div>
    </div>
  );
}

/** One entry in a menu: an icon tile, the name, and a line under it. The lobby wears the brand colour. */
function MenuItem({
  href,
  icon,
  title,
  line,
  accent,
  compact,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  line?: string;
  accent?: boolean;
  /** A row with just the icon and the name, for menus with many entries. */
  compact?: boolean;
}) {
  return (
    <li>
      <Link
        href={href}
        className={cn(
          "group/item flex gap-3 rounded-[14px] transition-colors hover:bg-foreground/[0.045] focus-visible:bg-foreground/[0.045]",
          compact ? "items-center px-2.5 py-1.5" : "items-start p-2.5",
        )}
      >
        <span
          className={cn(
            "flex shrink-0 items-center justify-center transition-colors duration-200",
            compact ? "size-7 rounded-[9px] [&_svg]:size-[15px]" : "size-8 rounded-[10px] [&_svg]:size-4",
            accent ? "bg-brand/12 text-brand" : "bg-foreground/[0.06] text-foreground/75 group-hover/item:bg-brand/10 group-hover/item:text-brand",
          )}
        >
          {icon}
        </span>
        <span className={cn("min-w-0 flex-1", !compact && "pt-px")}>
          <span className="flex items-center gap-1 text-[13.5px] font-semibold leading-tight">
            {title}
            <ArrowRight className="size-3 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100 rtl:rotate-180 rtl:translate-x-1" />
          </span>
          {line && <span className="mt-0.5 block text-[12.5px] leading-snug text-muted-foreground">{line}</span>}
        </span>
      </Link>
    </li>
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
