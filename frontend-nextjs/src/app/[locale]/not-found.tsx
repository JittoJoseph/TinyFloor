import { getTranslations } from "next-intl/server";
import { OfficeScene } from "@/components/OfficeScene";
import { AppTheme } from "@/components/app/AppTheme";
import { ActionLink } from "@/components/ui/Action";

/** A page that isn't there, in the app's look and theme, with the one way on: the lobby. */
export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");

  return (
    <main className="flex min-h-dvh w-full items-center justify-center bg-background px-4 py-10">
      <AppTheme />
      <div className="w-full max-w-[27rem] rounded-[1.75rem] border border-border bg-card p-3 shadow-float">
        <OfficeScene
          className="aspect-[7/5] rounded-[1.35rem] border border-border"
          zoom="auto 520px"
          focus="24% 78%"
          occupants={[{ character: "Bob", left: "50%", top: "72%", width: 44 }]}
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
