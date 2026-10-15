"use client";

import { useState } from "react";
import { Check, Copy, Refresh } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { INK, STONE } from "@/components/home/Blocks";
import type { IcebreakerGroup } from "@/lib/tools/icebreakers";

/** Any question from the list but the one showing, so the same never comes twice in a row. */
function another(questions: string[], current: string) {
  const candidates = questions.filter((one) => one !== current);
  return candidates[Math.floor(Math.random() * candidates.length)];
}

interface Labels {
  all: string;
  another: string;
  copy: string;
  copied: string;
}

/**
 * One question at a time, drawn at random from every group or just one, with
 * a button for the next and one to copy it into the meeting's chat. The page
 * starts on the first quick question, so what's rendered on the server is a
 * real question and not a blank card.
 */
export function IcebreakerPicker({ groups, labels }: { groups: IcebreakerGroup[]; labels: Labels }) {
  const [group, setGroup] = useState<string | null>(null);
  const [question, setQuestion] = useState(groups[0].questions[0]);
  const [copied, setCopied] = useState(false);

  const pool = (key: string | null) => (key ? groups.filter((one) => one.key === key) : groups).flatMap((one) => one.questions);

  const draw = (key: string | null) => {
    setQuestion(another(pool(key), question));
    setCopied(false);
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(question);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // A browser that won't let the page write to the clipboard: the question is on screen to copy by hand.
    }
  };

  return (
    <div className="rounded-[28px] bg-muted/80 p-5 sm:p-8">
      <div role="group" className="flex flex-wrap gap-2">
        {[{ key: null, label: labels.all }, ...groups.map((one) => ({ key: one.key, label: one.label }))].map((option) => (
          <button
            key={option.label}
            type="button"
            aria-pressed={group === option.key}
            onClick={() => {
              setGroup(option.key);
              draw(option.key);
            }}
            className={cn(
              "h-9 cursor-pointer rounded-full px-3.5 text-[13.5px] font-medium transition-colors",
              group === option.key ? "bg-foreground text-background" : "bg-background/70 text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      <p aria-live="polite" className="mt-8 min-h-[3.2em] text-balance text-[26px] font-normal leading-[1.2] tracking-[-0.03em] sm:mt-10 sm:text-[36px]">
        {question}
      </p>

      <div className="mt-8 flex flex-wrap gap-2 sm:mt-10">
        <button type="button" onClick={() => draw(group)} className={cn(INK, "cursor-pointer")}>
          <Refresh className="size-4" />
          {labels.another}
        </button>
        <button type="button" onClick={copy} className={cn(STONE, "cursor-pointer")}>
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? labels.copied : labels.copy}
        </button>
      </div>
    </div>
  );
}
