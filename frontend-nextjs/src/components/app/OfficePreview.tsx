"use client";

import { useTranslations } from "next-intl";
import { Hash } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { readIdentity } from "@/lib/identity";
import { FloorScene } from "@/components/floor/FloorScene";
import { Face, FaceStack, faceBackground } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { RailIcons } from "./railIcons";

const FREE_SEATS = 3;

/**
 * The office they are about to have, drawn like the app: a rail with its mark,
 * its channels, and the floor with them on it. It follows what they type.
 */
export function OfficePreview({
  name,
  typed,
  others,
  person,
  className,
}: {
  /** The office's name, or a stand-in until one is typed. */
  name: string;
  typed: boolean;
  /** People to show as already on the way in. */
  others: string[];
  /** You, at the foot of its column; null before there is anyone to show. */
  person: { id: string; name: string } | null;
  className?: string;
}) {
  const t = useTranslations("lobby.yourOffice");
  const ts = useTranslations("shell");
  const reduce = useReducedMotion();
  const character = readIdentity().character;
  const seed = typed ? name.toLowerCase() : "your-office";
  const channels = [t("channels.general"), t("channels.projects"), t("channels.random")];
  const free = Math.max(0, FREE_SEATS - 1 - Math.min(others.length, FREE_SEATS - 1));

  return (
    <div aria-hidden className={cn("relative", className)}>
      {/* A soft pool of the office's own colour behind it. */}
      <div
        className="pointer-events-none absolute inset-x-10 inset-y-8 rounded-full opacity-35 blur-3xl dark:opacity-20"
        style={{ backgroundImage: faceBackground(seed) }}
      />
      <div className="relative flex h-[380px] overflow-hidden rounded-[20px] border border-border bg-rail shadow-[0_24px_60px_-24px_rgb(0_0_0/0.25),0_1px_2px_rgb(0_0_0/0.06)] [--face-ring:var(--ui-rail)] sm:h-[420px]">
        {/* Rail */}
        <div className="flex w-12 shrink-0 flex-col items-center gap-2 py-3">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={seed}
              initial={reduce ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 26 }}
              className="flex"
            >
              <Face seed={seed} size={30} square />
            </motion.span>
          </AnimatePresence>
          <span className="my-1 h-px w-6 bg-border" />
          {[RailIcons.floor, RailIcons.chat, RailIcons.people].map((icon, index) => (
            <span
              key={index}
              className={cn(
                "flex size-8 items-center justify-center rounded-[10px] [&_svg]:size-[18px]",
                index === 1 ? "bg-card text-foreground shadow-[0_0_0_1px_var(--ui-border)] dark:bg-muted" : "text-muted-foreground",
              )}
            >
              {icon}
            </span>
          ))}
        </div>

        {/* Channels */}
        <div className="my-1.5 hidden w-[168px] shrink-0 flex-col rounded-s-[14px] border border-e-0 border-border bg-background sm:flex [--face-ring:var(--ui-background)]">
          <p className="truncate px-3.5 pb-2 pt-3.5 text-[13px] font-semibold text-foreground">{name}</p>
          <p className="px-3.5 pb-1 text-[10.5px] font-medium text-faint">{ts("chat")}</p>
          <div className="flex flex-col gap-px px-1.5">
            {channels.map((channel, index) => (
              <span
                key={channel}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px]",
                  index === 0 ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                <Hash className="size-3 opacity-60" />
                {channel}
              </span>
            ))}
          </div>
          <p className="px-3.5 pb-1 pt-3 text-[10.5px] font-medium text-faint">{ts("people")}</p>
          <div className="flex flex-col gap-px px-1.5">
            {others.slice(0, 2).map((id) => (
              <span key={id} className="flex h-7 items-center gap-2 rounded-md px-2">
                <Face seed={id} size={16} />
                <span className="h-1.5 w-14 rounded-full bg-muted" />
              </span>
            ))}
            {Array.from({ length: free }).map((_, index) => (
              <span key={index} className="flex h-7 items-center gap-2 rounded-md px-2 text-[11.5px] text-faint">
                <span className="size-4 rounded-full border border-dashed border-border-strong" />
                {t("freeSeat")}
              </span>
            ))}
          </div>
          <div className="mt-auto p-1.5">
            <span className="flex items-center gap-2 rounded-lg bg-rail p-1.5 [--face-ring:var(--ui-rail)]">
              <Face seed={person?.id ?? "you"} size={22} presence="available" />
              <span className="min-w-0 truncate text-[11.5px] font-semibold text-foreground">{person?.name || t("you")}</span>
            </span>
          </div>
        </div>

        {/* Floor */}
        <div className="relative my-1.5 me-1.5 min-w-0 flex-1 overflow-hidden rounded-e-[14px] rounded-s-[14px] border border-border sm:rounded-s-none">
          <FloorScene
            className="h-full w-full"
            view={[18, 9, 13, 9]}
            standing={[
              { character, at: [23, 13], face: "right", name: person?.name || t("you") },
              { character: character === "Amelia" ? "Adam" : "Amelia", at: [25, 13], face: "left", name: t("teammate") },
            ]}
          />
          <span className="absolute start-2.5 top-2.5 flex h-8 max-w-[70%] items-center gap-2 rounded-full border border-border bg-card/90 ps-3 pe-3 shadow-float backdrop-blur-md">
            <span className="size-1.5 shrink-0 rounded-full bg-ok" />
            <span className="truncate text-[12px] font-medium text-foreground">{name}</span>
          </span>
          {others.length > 0 && (
            <span className="absolute bottom-2.5 start-2.5 flex items-center gap-2 rounded-full border border-border bg-card/90 py-1 ps-1 pe-3 shadow-float backdrop-blur-md [--face-ring:var(--ui-card)]">
              <FaceStack seeds={others} size={20} max={3} />
              <span className="text-[11.5px] text-muted-foreground">{t("bringThem", { count: others.length })}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
