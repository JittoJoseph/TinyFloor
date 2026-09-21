import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowRight, ChevronDown, Footprints, Link2, MessagesSquare, Presentation, UsersRound } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { LANDINGS } from "@/lib/landings";
import { Logo } from "@/components/app/AppShell";
import { cn } from "@/lib/utils";
import { HomeNavActions } from "./HomeNavActions";
import { MobileMenu } from "./MobileMenu";
import { FloorPreview } from "./previews/FloorPreview";

export const COLUMN = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

const FEATURES = [
  { key: "proximity", href: "#floor", icon: <Footprints /> },
  { key: "meetings", href: "#meetings", icon: <Presentation /> },
  { key: "chat", href: "#chat", icon: <MessagesSquare /> },
  { key: "people", href: "#people", icon: <UsersRound /> },
  { key: "guests", href: "#guests", icon: <Link2 /> },
] as const;

const EXTRAS = ["screen", "whiteboard", "music", "status", "noise", "mobile", "themes", "languages"] as const;

/**
 * The site's nav: the logo, two menus that open on hover or focus into a
 * compact panel (what's in the product; who it's for and how it compares),
 * pricing and questions, and the way in. The menus are CSS only; a phone gets
 * one sheet with the same links.
 */
export function HomeNav() {
  const t = useTranslations("home");
  const tl = useTranslations("landings");
  const quiet =
    "flex h-9 items-center rounded-full px-3.5 text-[14.5px] text-foreground/70 transition-colors hover:bg-foreground/[0.05] hover:text-foreground";

  const useCases = LANDINGS.filter((page) => page.group === "useCases");
  const compare = LANDINGS.filter((page) => page.group === "compare");

  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/75 backdrop-blur-xl">
      <nav aria-label={t("nav.main")} className={cn(COLUMN, "grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4")}>
        <Link href="/" className="flex w-fit items-center gap-2.5 text-[17px] font-bold tracking-tight">
          <Logo size={28} />
          TinyFloor
        </Link>

        <div className="hidden items-center md:flex">
          <Menu label={t("footer.product")} className="w-[620px]">
            <div className="grid grid-cols-[1fr_210px] gap-2">
              <div className="p-1.5">
                <ul className="grid gap-0.5">
                  {FEATURES.map((item) => (
                    <li key={item.key}>
                      <a href={item.href} className="group/item flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-foreground/[0.045]">
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-background text-foreground/80 transition-colors group-hover/item:text-brand [&_svg]:size-4">
                          {item.icon}
                        </span>
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold leading-tight">{t(`nav.items.${item.key}`)}</span>
                          <span className="mt-0.5 block truncate text-[12.5px] text-muted-foreground">{t(`features.${item.key}.muted`)}</span>
                        </span>
                      </a>
                    </li>
                  ))}
                </ul>
                <div className="mx-2 mt-3 border-t border-border pt-3">
                  <p className="text-[11.5px] font-semibold text-faint">{t("nav.everyOffice")}</p>
                  <ul className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
                    {EXTRAS.map((key) => (
                      <li key={key}>
                        <a href="#more" className="text-[12.5px] text-foreground/70 transition-colors hover:text-foreground">
                          {t(`more.items.${key}.title`)}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="flex flex-col rounded-[14px] bg-[#111113] p-3.5 text-white dark:bg-white/[0.05] dark:ring-1 dark:ring-inset dark:ring-white/10">
                <p className="text-[13.5px] font-semibold">{t("nav.lobbyTitle")}</p>
                <p className="mt-1 text-[12px] leading-snug text-white/55">{t("nav.lobbyBody")}</p>
                <div className="home-app relative mt-3 min-h-[130px] flex-1 overflow-hidden rounded-lg border border-white/10">
                  <FloorPreview bare />
                </div>
                <Link
                  href="/lobby"
                  className="mt-3 inline-flex h-8 w-fit items-center gap-1 rounded-full bg-white px-3 pt-px text-[12.5px] text-[#111113] transition-colors hover:bg-white/85"
                >
                  {t("hero.lobbyCta")}
                  <ArrowRight className="size-3.5 rtl:rotate-180" />
                </Link>
              </div>
            </div>
          </Menu>

          <Menu label={t("footer.useCases")} className="w-[480px]">
            <div className="grid grid-cols-2 gap-2 p-1.5">
              <MenuColumn title={t("footer.useCases")}>
                {useCases.map((page) => (
                  <MenuLink key={page.slug} href={`/${page.slug}`}>
                    {tl(`pages.${page.key}.label`)}
                  </MenuLink>
                ))}
              </MenuColumn>
              <MenuColumn title={t("footer.compare")}>
                {compare.map((page) => (
                  <MenuLink key={page.slug} href={`/${page.slug}`}>
                    {page.competitor ? t("footer.vs", { name: page.competitor }) : tl(`pages.${page.key}.label`)}
                  </MenuLink>
                ))}
              </MenuColumn>
            </div>
          </Menu>

          <a href="#plans" className={quiet}>{t("nav.pricing")}</a>
          <a href="#faq" className={quiet}>{t("nav.faq")}</a>
        </div>

        <div className="col-start-3 flex items-center justify-end gap-2">
          <HomeNavActions signIn={t("nav.signIn")} start={t("nav.start")} open={t("nav.open")} />
          <MobileMenu label={t("nav.menu")}>
            <ul className="grid gap-0.5">
              {FEATURES.map((item) => (
                <li key={item.key}>
                  <a href={item.href} className="flex items-center gap-3 rounded-xl py-2">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] border border-border bg-background [&_svg]:size-4">
                      {item.icon}
                    </span>
                    <span className="text-[15px] font-semibold">{t(`nav.items.${item.key}`)}</span>
                  </a>
                </li>
              ))}
            </ul>
            <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2.5 border-t border-border pt-4 text-[14.5px] text-foreground/75">
              <li><a href="#plans">{t("nav.pricing")}</a></li>
              <li><a href="#faq">{t("nav.faq")}</a></li>
              <li><Link href="/lobby">{t("nav.lobby")}</Link></li>
              <li><Link href="/auth">{t("nav.signIn")}</Link></li>
              {useCases.map((page) => (
                <li key={page.slug}>
                  <Link href={`/${page.slug}`}>{tl(`pages.${page.key}.label`)}</Link>
                </li>
              ))}
            </ul>
          </MobileMenu>
        </div>
      </nav>
    </header>
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
          "invisible absolute start-1/2 top-full -translate-x-1/2 translate-y-1 pt-3 opacity-0 transition-[opacity,transform,visibility] duration-200 rtl:translate-x-1/2",
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

function MenuColumn({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="p-2">
      <p className="px-2 text-[11.5px] font-semibold text-faint">{title}</p>
      <ul className="mt-1.5 grid gap-px">{children}</ul>
    </div>
  );
}

function MenuLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="group/item flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[14px] text-foreground/80 transition-colors hover:bg-foreground/[0.045] hover:text-foreground"
      >
        {children}
        <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover/item:opacity-60 rtl:rotate-180" />
      </Link>
    </li>
  );
}
