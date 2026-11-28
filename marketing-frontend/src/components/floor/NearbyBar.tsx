import { AudioLines, MessageSquare } from "web-shared/components/ui/icons";

/**
 * The card beside someone you've stopped next to on the floor, as the app
 * draws it: their name, a wave and a poke as the hand and finger they'll see,
 * a message, and Talk in the colour of talking, in a soft squircle.
 */
export function NearbyBar({ name, labels }: { name: string; labels: { talk: string; message: string } }) {
  return (
    <div className="flex h-11 items-center gap-0.5 whitespace-nowrap rounded-[20px] border border-border bg-card pe-1.5 ps-4 font-(family-name:--font-app) shadow-float [corner-shape:squircle]">
      <span className="pe-2 text-[13.5px] font-semibold text-foreground">{name}</span>
      <span aria-hidden className="mx-1 h-5 w-px bg-border" />
      <span aria-hidden className="flex size-8 items-center justify-center text-[15px] leading-none">
        👋
      </span>
      <span aria-hidden className="flex size-8 items-center justify-center text-[15px] leading-none">
        👉
      </span>
      <span title={labels.message} className="flex size-8 items-center justify-center text-foreground">
        <MessageSquare className="size-4" />
      </span>
      <span className="ms-1 flex h-8 items-center gap-1.5 rounded-[13px] bg-ok px-3 text-[12.5px] font-semibold text-white [corner-shape:squircle] dark:text-[rgb(4_32_16)]">
        <AudioLines className="size-3.5" strokeWidth={2.25} />
        {labels.talk}
      </span>
    </div>
  );
}
