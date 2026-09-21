import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { ArrowUpRight, ChevronDown } from "lucide-react";
import { Link } from "@/lib/i18n/navigation";
import { LANDINGS } from "@/lib/landings";
import { Logo } from "@/components/app/AppShell";
import { FaceStack } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { HomeNavActions } from "./HomeNavActions";
import { MobileMenu } from "./MobileMenu";
import { CAST } from "./previews/Frame";
import { FloorPreview } from "./previews/FloorPreview";

export const COLUMN = "mx-auto w-full max-w-[1200px] px-5 sm:px-8";

const FEATURES = [
  { key: "proximity", href: "#floor" },
  { key: "meetings", href: "#meetings" },
  { key: "chat", href: "#chat" },
  { key: "people", href: "#people" },
  { key: "guests", href: "#guests" },
] as const;

const EXTRAS = ["screen", "whiteboard", "music", "status", "noise", "mobile", "themes", "languages"] as const;

/**
 * The site's nav, Gleap's way: the logo, two menus that open on hover or focus
 * into a wide panel (what's in the product; who it's for and how it compares),
 * pricing and questions, and the way in. The menus are CSS only; the phone
 * gets one sheet with the same links.
 */
export function HomeNav() {
  const t = useTranslations("home");
  const tl = useTranslations("landings");
  const quiet = "flex h-9 items-center rounded-full px-3 text-[15px] text-foreground/75 transition-colors hover:text-foreground";

  const useCases = LANDINGS.filter((page) => page.group === "useCases");
  const compare = LANDINGS.filter((page) => page.group === "compare");

  return (
    <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl">
      <nav aria-label={t("nav.main")} className={cn(COLUMN, "relative grid h-16 grid-cols-[1fr_auto_1fr] items-center gap-4")}>
        <Link href="/" className="flex w-fit items-center gap-2 text-[18px] font-bold tracking-tight">
          <Logo size={28} />
          TinyFloor
        </Link>

        <div className="hidden items-center gap-0.5 md:flex">
          <Menu label={t("footer.product")}>
            <div>
              <ul className="grid gap-1">
                {FEATURES.map((item) => (
                  <li key={item.key}>
                    <a href={item.href} className="text-[24px] font-semibold tracking-tight text-foreground/85 transition-colors hover:text-foreground">
                      {t(`nav.items.${item.key}`)}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-[13px] text-muted-foreground">{t("nav.everyOffice")}</p>
              <ul className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2">
                {EXTRAS.map((key) => (
                  <li key={key}>
                    <a href="#more" className="text-[14.5px] text-foreground/80 transition-colors hover:text-foreground">
                      {t(`more.items.${key}.title`)}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
            <Promo
              title={t("nav.lobbyTitle")}
              body={t("nav.lobbyBody")}
              cta={t("hero.lobbyCta")}
              href="/lobby"
              art={
                <div className="home-app relative h-full overflow-hidden rounded-xl border border-white/10">
                  <FloorPreview />
                </div>
              }
            />
          </Menu>

          <Menu label={t("footer.useCases")}>
            <div>
              <ul className="grid gap-1">
                {useCases.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="text-[24px] font-semibold tracking-tight text-foreground/85 transition-colors hover:text-foreground">
                      {tl(`pages.${page.key}.label`)}
                    </Link>
                  </li>
                ))}
              </ul>
              <p className="mt-7 text-[13px] text-muted-foreground">{t("footer.compare")}</p>
              <ul className="mt-2.5 grid grid-cols-2 gap-x-6 gap-y-2">
                {compare.map((page) => (
                  <li key={page.slug}>
                    <Link href={`/${page.slug}`} className="text-[14.5px] text-foreground/80 transition-colors hover:text-foreground">
                      {page.competitor ? t("footer.vs", { name: page.competitor }) : tl(`pages.${page.key}.label`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
            <Promo
              title={t("plans.title")}
              body={t("plans.free.per")}
              cta={t("nav.start")}
              href="/create"
              art={
                <div className="flex h-full items-center justify-center [--face-ring:#111113]">
                  <FaceStack seeds={CAST.map((one) => one.id)} size={52} max={6} />
                </div>
              }
            />
          </Menu>

          <a href="#plans" className={quiet}>{t("nav.pricing")}</a>
          <a href="#faq" className={quiet}>{t("nav.faq")}</a>
        </div>

        <div className="col-start-3 flex items-center justify-end gap-2">
          <HomeNavActions signIn={t("nav.signIn")} start={t("nav.start")} open={t("nav.open")} />
          <MobileMenu label={t("nav.menu")}>
            <ul className="grid gap-1">
              {FEATURES.map((item) => (
                <li key={item.key}>
                  <a href={item.href} className="block py-1.5 text-[20px] font-semibold tracking-tight">
                    {t(`nav.items.${item.key}`)}
                  </a>
                </li>
              ))}
            </ul>
            <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 border-t border-border pt-4 text-[15px] text-foreground/80">
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

/** A nav item that opens a wide panel under the bar while it's hovered or focused. */
function Menu({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="group/menu">
      <button
        type="button"
        aria-haspopup="true"
        className="flex h-9 cursor-default items-center gap-1 rounded-full px-3 text-[15px] text-foreground/75 transition-colors group-focus-within/menu:text-foreground group-hover/menu:text-foreground"
      >
        {label}
        <ChevronDown className="size-3.5 transition-transform duration-200 group-focus-within/menu:rotate-180 group-hover/menu:rotate-180" />
      </button>
      <div
        className={cn(
          "invisible absolute inset-x-5 top-full translate-y-1 pt-2 opacity-0 transition-[opacity,transform,visibility] duration-200 sm:inset-x-8",
          "group-focus-within/menu:visible group-focus-within/menu:translate-y-0 group-focus-within/menu:opacity-100",
          "group-hover/menu:visible group-hover/menu:translate-y-0 group-hover/menu:opacity-100",
        )}
      >
        <div className="grid grid-cols-[1.1fr_1fr] gap-8 rounded-[24px] border border-border bg-card p-7 shadow-float">{children}</div>
      </div>
    </div>
  );
}

/** The dark card on a menu's right: one thing to do next, with something to look at. */
function Promo({ title, body, cta, href, art }: { title: string; body: string; cta: string; href: string; art: ReactNode }) {
  return (
    <div className="flex min-h-[340px] flex-col gap-4 rounded-[18px] bg-[#111113] p-5 text-white">
      <div>
        <p className="text-[17px] font-semibold">{title}</p>
        <p className="mt-0.5 text-[15px] text-white/60">{body}</p>
      </div>
      <div className="min-h-0 flex-1">{art}</div>
      <Link
        href={href}
        className="inline-flex h-10 w-fit items-center gap-1.5 rounded-full bg-white px-4 text-[14.5px] text-[#111113] transition-colors hover:bg-white/85"
      >
        {cta}
        <ArrowUpRight className="size-4 rtl:-rotate-90" />
      </Link>
    </div>
  );
}
