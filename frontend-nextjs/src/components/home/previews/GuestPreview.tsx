import { useTranslations } from "next-intl";
import { Check, Link2 } from "lucide-react";
import { PixelAvatar } from "@/components/PixelAvatar";

/** A guest link being handed out, and the guest who used it walking in. */
export function GuestPreview() {
  const t = useTranslations("home.preview");
  return (
    <div className="home-app flex h-full flex-col justify-center gap-3 p-4 text-start">
      <div className="rounded-2xl border border-border bg-background p-3.5 shadow-[0_12px_32px_-18px_rgb(0_0_0/0.3)]">
        <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-foreground">
          <Link2 className="size-3.5 text-muted-foreground" />
          {t("guestLink")}
        </p>
        <p className="mt-0.5 text-[11.5px] text-muted-foreground">{t("guestNote")}</p>
        <div className="mt-3 flex h-9 items-center gap-2 rounded-full border border-border bg-card pe-1 ps-3.5">
          <span dir="ltr" className="min-w-0 flex-1 truncate text-[11.5px] text-muted-foreground">
            tinyfloor.com/join/x7k2q
          </span>
          <span className="flex h-7 items-center gap-1 rounded-full bg-foreground px-2.5 text-[11px] font-medium text-background">
            <Check className="size-3" />
            {t("copy")}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-border bg-background p-2.5 pe-3.5">
        {/* The whole character, standing on a patch of the office floor. */}
        <span
          className="relative size-12 shrink-0 overflow-hidden rounded-xl border border-border"
          style={{ backgroundImage: "url(/office.png)", backgroundSize: "900px auto", backgroundPosition: "38% 62%", imageRendering: "pixelated" }}
        >
          <PixelAvatar character="Ash" width={20} style={{ left: "50%", top: "90%" }} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-semibold text-foreground">Elena</p>
          <p className="truncate text-[11px] text-muted-foreground">{t("guestArrived")}</p>
        </div>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">{t("guest")}</span>
      </div>
    </div>
  );
}
