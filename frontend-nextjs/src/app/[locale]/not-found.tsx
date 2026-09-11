import { getTranslations } from "next-intl/server";
import { Link } from "@/lib/i18n/navigation";
import { OfficeScene } from "@/components/OfficeScene";
import { primaryButtonClass } from "@/components/entry/EntryShell";

export default async function LocaleNotFound() {
  const t = await getTranslations("notFound");
  const tc = await getTranslations("common");

  return (
    <main className="min-h-screen w-full bg-[var(--color-braun-bg)] flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[27rem] rounded-[1.75rem] border border-black/10 bg-white p-3 shadow-[0_24px_60px_-36px_rgba(0,0,0,0.45)]">
        <OfficeScene
          className="aspect-[7/5] rounded-[1.35rem] border border-black/10"
          zoom="auto 470px"
          focus="24% 78%"
          occupants={[{ character: "Bob", left: "50%", top: "79%", width: 44 }]}
        />
        <div className="px-2 pt-5 pb-1">
          <h1 className="font-body text-[1.75rem] font-medium tracking-tight leading-tight text-[var(--color-braun-text)] mb-2">
            {t("title")}
          </h1>
          <p className="font-body text-sm text-[var(--color-braun-text)] opacity-55 mb-6">
            {t("body")}
          </p>
          <Link href="/" className={primaryButtonClass}>
            {t("home")}
          </Link>
          <Link
            href="/rooms"
            className="cursor-pointer block text-center mt-3 py-2 font-body text-[13px] font-medium text-[var(--color-braun-text)] opacity-55 hover:opacity-100 transition-opacity duration-200"
          >
            {tc("browseRooms")}
          </Link>
        </div>
      </div>
    </main>
  );
}
