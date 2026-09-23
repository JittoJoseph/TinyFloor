import { useTranslations } from "next-intl";
import { Check, Link2 } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { FloorScene } from "@/components/floor/FloorScene";
import { PEOPLE } from "@/components/floor/scenes";

// Grace's loop, starting where she stands once she's in: a while there, out through the door, a moment, and in again.
const STAY = 6;
const LOOP = STAY + 0.8 + (2 * 4) / 2.2;
const KEYFRAMES =
  `@keyframes g-in{0%{opacity:0;translate:0 -4px}${((0.25 / LOOP) * 100).toFixed(2)}%,${(((STAY - 0.3) / LOOP) * 100).toFixed(2)}%{opacity:1;translate:0 0}` +
  `${((STAY / LOOP) * 100).toFixed(2)}%,100%{opacity:0;translate:0 -4px}}` +
  "@media (prefers-reduced-motion:reduce){.g-in{animation:none!important}}";

/** A guest link being handed out, and the guest who used it walking onto the floor. */
export function GuestPreview() {
  const t = useTranslations("home.preview");
  const { grace } = PEOPLE;
  return (
    <div className="font-(family-name:--font-app) [font-feature-settings:'cv11','ss01'] flex h-full flex-col gap-3 p-4 text-start">
      <style>{KEYFRAMES}</style>
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
        walking={[
          {
            ...grace,
            status: "available",
            path: [
              [19, 5, STAY],
              [15, 5, 0.8],
            ],
            faces: { 0: "down" },
          },
        ]}
        over={
          <span
            className="g-in absolute start-2.5 top-2.5 flex items-center gap-2 rounded-full border border-border bg-card py-1 pe-1 ps-1 shadow-float [--face-ring:var(--ui-card)]"
            style={{ animation: `g-in ${LOOP.toFixed(2)}s ease-out infinite` }}
          >
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
