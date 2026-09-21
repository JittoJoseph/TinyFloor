import { useTranslations } from "next-intl";
import { Hash, ImagePlus, Search, Smile } from "lucide-react";
import { Face } from "@/components/ui/Face";
import { cn } from "@/lib/utils";
import { CAST } from "./Frame";

const [maya, leo, priya, sam, aiko] = CAST;

/**
 * The office's chat, as the app draws it: channels and direct messages in a
 * column, and a conversation with its composer. `compact` drops the column
 * for the smaller feature card.
 */
export function ChatPreview({ compact = false }: { compact?: boolean }) {
  const t = useTranslations("home.preview");
  const messages = [
    { who: sam, time: "9:12", text: t("message0") },
    { who: maya, time: "9:41", text: t("message1"), reaction: "🙌 3" },
    { who: leo, time: "9:42", text: t("message2") },
    { who: priya, time: "9:47", text: t("message3"), reaction: "👀 2" },
    { who: aiko, time: "9:52", text: t("message4") },
  ];
  const shown = compact ? messages.slice(1, 4) : messages;

  return (
    <div className="flex h-full min-h-0 text-start">
      {!compact && (
        <div className="hidden w-[190px] shrink-0 flex-col border-e border-border bg-background px-2 py-3 md:flex [--face-ring:var(--ui-background)]">
          <p className="px-2 text-[13px] font-semibold text-foreground">{t("office")}</p>
          <span className="mx-1 mt-2.5 flex h-7 items-center gap-1.5 rounded-lg bg-muted px-2 text-[11px] text-faint">
            <Search className="size-3" />
            ⌘K
          </span>
          <p className="mt-4 px-2 text-[10.5px] font-medium text-faint">{t("channels")}</p>
          <div className="mt-1 flex flex-col gap-px">
            {[t("general"), t("design"), t("random")].map((channel, index) => (
              <span
                key={channel}
                className={cn(
                  "flex h-7 items-center gap-1.5 rounded-md px-2 text-[12px]",
                  index === 0 ? "bg-muted font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                <Hash className="size-3 opacity-60" />
                {channel}
                {index === 1 && <span className="ms-auto rounded-full bg-brand px-1.5 text-[9.5px] font-semibold leading-4 text-white">2</span>}
              </span>
            ))}
          </div>
          <p className="mt-4 px-2 text-[10.5px] font-medium text-faint">{t("directMessages")}</p>
          <div className="mt-1 flex flex-col gap-px">
            {[sam, aiko, leo].map((person, index) => (
              <span key={person.id} className="flex h-7 items-center gap-2 rounded-md px-2 text-[12px] text-muted-foreground">
                <Face seed={person.id} size={16} presence={index === 1 ? "away" : "available"} />
                {person.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border px-4 text-[13px] font-semibold text-foreground">
          <Hash className="size-3.5 text-muted-foreground" />
          {t("general")}
        </div>
        <div className="flex flex-1 flex-col justify-end gap-3.5 overflow-hidden px-4 py-3">
          {!compact && (
            <div className="flex items-center gap-3 text-[10.5px] text-faint">
              <span className="h-px flex-1 bg-border" />
              {t("today")}
              <span className="h-px flex-1 bg-border" />
            </div>
          )}
          {shown.map((message) => (
            <div key={message.time} className="flex gap-2.5">
              <Face seed={message.who.id} size={30} />
              <div className="min-w-0">
                <p className="text-[12px] leading-none">
                  <span className="font-semibold text-foreground">{message.who.name}</span>
                  <span className="ms-1.5 text-[10.5px] text-faint">{message.time}</span>
                </p>
                <p className="mt-1 text-[12.5px] leading-snug text-foreground/90">{message.text}</p>
                {message.reaction && (
                  <span className="mt-1.5 inline-flex h-5 items-center rounded-full border border-border bg-muted px-1.5 text-[10.5px] text-muted-foreground">
                    {message.reaction}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
        {!compact && (
          <p className="flex items-center gap-1.5 px-4 pb-1.5 text-[10.5px] text-faint">
            <span className="flex gap-0.5">
              <span className="size-1 rounded-full bg-faint" />
              <span className="size-1 rounded-full bg-faint" />
              <span className="size-1 rounded-full bg-faint" />
            </span>
            {t("typing", { name: sam.name })}
          </p>
        )}
        <div className="m-3 mt-0 rounded-xl border border-border bg-background px-3 pb-2 pt-2.5">
          <p className="text-[12px] text-faint">{t("composer")}</p>
          <div className="mt-2 flex items-center gap-2 text-muted-foreground">
            <ImagePlus className="size-3.5" />
            <Smile className="size-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
