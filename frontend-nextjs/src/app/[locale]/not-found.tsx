import { getTranslations } from "next-intl/server";
import { FloorScene } from "@/components/floor/FloorScene";
import { SiteTheme } from "@/components/home/SiteTheme";
import { ActionLink } from "@/components/ui/ActionLink";

/**
 * A page that isn't there, in the app's look and theme, with the one way on:
 * the lobby. Every page under the locale carries this boundary's scripts, so
 * it keeps to ones that bring no animation library.
 */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10">
      <SiteTheme />
      <div className="w-full max-w-[27rem] rounded-[1.75rem] border border-border bg-card p-3 shadow-float">
        {/* Someone alone in the empty private office, wondering where everyone went. */}
        <FloorScene
          className="aspect-[7/5] rounded-[1.35rem] border border-border"
          view={[1, 18, 13, 10]}
          standing={[{ character: "Bob", at: [10, 25], face: "down" }]}
        />
        <div className="px-2 pb-2 pt-5">
          <h1 className="mb-1.5 text-[1.6rem] font-semibold leading-tight tracking-tight text-foreground">{t("title")}</h1>
          <p className="mb-6 text-[14px] leading-relaxed text-muted-foreground">{t("body")}</p>
          <ActionLink href="/lobby">{t("home")}</ActionLink>
        </div>
      </div>
    </main>
  );
}
