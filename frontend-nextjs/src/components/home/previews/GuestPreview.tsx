import { useTranslations } from "next-intl";
import { Check, Link2 } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { FloorScene } from "@/components/floor/FloorScene";
import { PEOPLE } from "@/components/floor/scenes";

/** A guest link being handed out, and the guest who used it, in on the floor. */
export function GuestPreview() {
  const t = useTranslations("home.preview");
  const { grace } = PEOPLE;
  return (
    <div className="font-(family-name:--font-app) [font-feature-settings:'cv11','ss01'] flex h-full flex-col gap-3 p-4 text-start">
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

      <FloorScene
        view={[14.5, 0.5, 10, 6.5]}
        className="min-h-0 flex-1 rounded-2xl border border-border"
        standing={[{ ...grace, at: [19, 5], face: "down", status: "available" }]}
        over={
          <span className="absolute start-2.5 top-2.5 flex items-center gap-2 rounded-full border border-border bg-card py-1 pe-1 ps-1 shadow-float [--face-ring:var(--ui-card)]">
            <Face seed={grace.id} size={20} />
            <span className="text-[11.5px] text-foreground">
              <span className="font-semibold">{grace.name}</span> {t("guestArrived")}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-medium text-muted-foreground">{t("guest")}</span>
          </span>
        }
      />
    </div>
  );
}
