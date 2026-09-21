import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  ArrowRight,
  BookOpen,
  Building2,
  ChevronDown,
  Coffee,
  Footprints,
  GraduationCap,
  Link2,
  MessagesSquare,
  Presentation,
  Radio,
  UsersRound,
} from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { LANDINGS, type LandingKey } from "@/lib/landings";
import { Logo } from "@/components/app/AppShell";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { HomeNavActions } from "./HomeNavActions";
import { MobileMenu } from "./MobileMenu";
import { ScrollHeader } from "./ScrollHeader";
import { CAST } from "./previews/Frame";
import { FloorPreview } from "./previews/FloorPreview";

export const COLUMN = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

/** What's in the product, each pointing at its card on the home page. */
const FEATURES = [
  { key: "proximity", hash: "floor", icon: <Footprints /> },
  { key: "meetings", hash: "meetings", icon: <Presentation /> },
  { key: "chat", hash: "chat", icon: <MessagesSquare /> },
  { key: "people", hash: "people", icon: <UsersRound /> },
  { key: "guests", hash: "guests", icon: <Link2 /> },
] as const;

/** An icon for each use case page. */
const CASE_ICONS: Partial<Record<LandingKey, ReactNode>> = {
  virtualOffice: <Building2 />,
  virtualCoworking: <Coffee />,
  onlineStudyRoom: <BookOpen />,
  virtualClassroom: <GraduationCap />,
  proximityChat: <Radio />,
};

const USE_CASES = LANDINGS.filter((page) => page.group === "useCases");
const COMPARE = LANDINGS.filter((page) => page.group === "compare");

/**
 * The site's nav. At the top of a page it lies flat; once the page moves it
 * floats (ScrollHeader). Two menus open on hover or focus: the product, and
 * who it's for, which leads on to the use case and comparison pages. The
 * menus are CSS only; a phone gets one sheet with the same links.
 */
export function HomeNav() {
  const t = useTranslations("home");
  const tl = useTranslations("landings");
  const plain =
    "flex h-9 items-center rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground";

  return (
    <ScrollHeader>
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
          <Menu label={t("footer.product")} className="w-[600px]">
            <div className="grid grid-cols-[1fr_216px] gap-1.5">
              <ul className="grid content-start gap-0.5 p-1">
                {FEATURES.map((item) => (
                  <MenuItem
                    key={item.key}
                    href={`/#${item.hash}`}
                    icon={item.icon}
                    title={t(`nav.items.${item.key}`)}
                    line={t(`features.${item.key}.muted`)}
                  />
                ))}
              </ul>
              <div className="flex flex-col rounded-[14px] bg-[#111113] p-3.5 text-white dark:bg-white/[0.05] dark:ring-1 dark:ring-inset dark:ring-white/10">
                <p className="text-[13.5px] font-semibold">{t("nav.lobbyTitle")}</p>
                <p className="mt-1 text-[12px] leading-snug text-white/55">{t("nav.lobbyBody")}</p>
                <div className="relative mt-3 min-h-[120px] flex-1 overflow-hidden rounded-lg border border-white/10 font-(family-name:--font-app)">
                  <FloorPreview bare />
                </div>
                <Link
                  href="/lobby"
                  className="group/cta mt-3 inline-flex h-8 w-fit items-center gap-1 rounded-full bg-white px-3 text-[12.5px] text-[#111113] transition-colors hover:bg-white/85"
                >
                  {t("hero.lobbyCta")}
                  <ArrowRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5 rtl:rotate-180" />
                </Link>
              </div>
            </div>
          </Menu>

          <Menu label={t("nav.teams")} className="w-[660px]">
            <div className="grid grid-cols-[1fr_230px] gap-1.5">
              <div className="p-1">
                <ul className="grid gap-0.5">
                  {USE_CASES.map((page) => (
                    <MenuItem
                      key={page.slug}
                      href={`/${page.slug}`}
                      icon={CASE_ICONS[page.key]}
                      title={tl(`pages.${page.key}.label`)}
                      line={t(`nav.cases.${page.key as "virtualOffice"}`)}
                    />
                  ))}
                </ul>
                <div className="mx-2 mt-2 border-t border-border pt-3">
                  <p className="text-[11.5px] font-semibold text-faint">{t("footer.compare")}</p>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {COMPARE.map((page) => (
                      <li key={page.slug}>
                        <Link
                          href={`/${page.slug}`}
                          className="inline-flex h-7 items-center rounded-full bg-foreground/[0.05] px-2.5 text-[12.5px] text-foreground/75 transition-colors hover:bg-foreground/[0.09] hover:text-foreground"
                        >
                          {page.competitor ? t("footer.vs", { name: page.competitor }) : tl(`pages.${page.key}.label`)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <TeamCard title={t("nav.teamTitle")} body={t("nav.teamBody")} cta={t("nav.start")} />
            </div>
          </Menu>

          <Link href="/#plans" className={plain}>{t("nav.pricing")}</Link>
          <Link href="/#faq" className={plain}>{t("nav.faq")}</Link>
        </div>

        <div className="col-start-3 flex items-center justify-end gap-2">
          <HomeNavActions signIn={t("nav.signIn")} start={t("nav.start")} open={t("nav.open")} />
          <MobileMenu label={t("nav.menu")}>
            <p className="px-1 text-[11.5px] font-semibold text-faint">{t("footer.product")}</p>
            <ul className="mt-1 grid gap-0.5">
              {FEATURES.map((item) => (
                <MenuItem key={item.key} href={`/#${item.hash}`} icon={item.icon} title={t(`nav.items.${item.key}`)} />
              ))}
            </ul>
            <p className="mt-4 px-1 text-[11.5px] font-semibold text-faint">{t("nav.teams")}</p>
            <ul className="mt-1 grid gap-0.5">
              {USE_CASES.map((page) => (
                <MenuItem key={page.slug} href={`/${page.slug}`} icon={CASE_ICONS[page.key]} title={tl(`pages.${page.key}.label`)} />
              ))}
            </ul>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border px-1 pt-4 text-[14.5px] text-foreground/75">
              <li><Link href="/#plans">{t("nav.pricing")}</Link></li>
              <li><Link href="/#faq">{t("nav.faq")}</Link></li>
              <li><Link href="/lobby">{t("nav.lobby")}</Link></li>
              <li><Link href="/auth">{t("nav.signIn")}</Link></li>
            </ul>
          </MobileMenu>
        </div>
      </nav>
    </ScrollHeader>
  );
}

/** A nav item that opens a panel under itself while it's hovered or focused. */
function Menu({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
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
          "invisible absolute start-1/2 top-full -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-[opacity,visibility,translate] duration-200 ease-out rtl:translate-x-1/2",
          "group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:opacity-100",
          "group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100",
          className,
        )}
      >
        <div className="rounded-[20px] border border-border bg-card p-1.5 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.25)]">{children}</div>
      </div>
    </div>
  );
}

/**
 * One row in a menu: an icon tile that takes the brand colour on hover, the
 * name, an optional line under it, and an arrow that slides in.
 */
function MenuItem({ href, icon, title, line }: { href: string; icon: ReactNode; title: string; line?: string }) {
  return (
    <li>
      <Link
        href={href}
        className="group/item flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-foreground/[0.045] focus-visible:bg-foreground/[0.045]"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-background text-foreground/75 transition-colors duration-200 group-hover/item:border-brand/25 group-hover/item:bg-brand/10 group-hover/item:text-brand [&_svg]:size-4">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold leading-tight">{title}</span>
          {line && <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{line}</span>}
        </span>
        <ArrowRight className="size-3.5 shrink-0 -translate-x-1 text-muted-foreground opacity-0 transition-[opacity,translate] duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100 rtl:rotate-180 rtl:translate-x-1" />
      </Link>
    </li>
  );
}

/** The menu's team card: a small roster of the people on your floor, and the way to make one. */
function TeamCard({ title, body, cta }: { title: string; body: string; cta: string }) {
  const t = useTranslations("home.preview");
  const roster = [
    { person: CAST[0], status: "available" as const },
    { person: CAST[1], status: "busy" as const },
    { person: CAST[2], status: "away" as const },
    { person: CAST[3], status: "available" as const },
  ];
  return (
    <div className="group/team flex flex-col rounded-[14px] bg-foreground/[0.045] p-3 [--face-ring:var(--ui-card)]">
      <ul className="grid gap-1 font-(family-name:--font-app)">
        {roster.map(({ person, status }, index) => (
          <li
            key={person.id}
            style={{ transitionDelay: `${index * 40}ms` }}
            className="flex items-center gap-2 rounded-lg bg-card px-2 py-1.5 shadow-[0_0_0_1px_var(--ui-border)] transition-transform duration-300 ease-out group-hover/team:translate-x-1 rtl:group-hover/team:-translate-x-1"
          >
            <Face seed={person.id} size={24} presence={status} />
            <span className="flex-1 truncate text-[12.5px] font-semibold">{person.name}</span>
            <span className="text-[11px] text-muted-foreground">{t(status)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-auto px-1 pt-4 text-[14px] font-semibold">{title}</p>
      <p className="mt-1 px-1 text-[12.5px] leading-snug text-muted-foreground">{body}</p>
      <Link
        href="/create"
        className="group/cta mx-1 mt-3 inline-flex h-8 w-fit items-center gap-1 rounded-full bg-foreground px-3 text-[12.5px] text-background transition-colors hover:bg-foreground/85"
      >
        {cta}
        <ArrowRight className="size-3.5 transition-transform group-hover/cta:translate-x-0.5 rtl:rotate-180" />
      </Link>
    </div>
  );
}
