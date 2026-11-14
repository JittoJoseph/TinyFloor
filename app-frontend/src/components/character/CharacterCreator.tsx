"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ChevronLeft, ChevronRight, Dice, Undo, X } from "web-shared/components/ui/icons";
import { Button } from "@/components/motion/button/base";
import { PixelAvatar, type AvatarDirection } from "web-shared/components/PixelAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { changeLookOnFloor } from "@/lib/floor";
import { saveIdentity } from "@/lib/identity";
import { track } from "web-shared/lib/analytics";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { cn } from "web-shared/lib/utils";
import {
  CHARACTER_CATALOG,
  PRESETS,
  characterOrDefault,
  isPreset,
  lookFrom,
  lookString,
  randomLook,
  type CharacterPart,
} from "shared-protocol/character";

/** What the creator shows, a tab each: whole characters, then the parts. */
const CATEGORIES = ["characters", "skin", "hair", "outfit", "extras"] as const;
type Category = (typeof CATEGORIES)[number];
const EXTRAS = ["face", "glasses", "hat", "gloves", "bag"] as const;
type Extra = (typeof EXTRAS)[number];
type StyledPart = "hair" | "outfit" | Extra;
/**
 * Parts whose colours mean the same in every style: a hair colour is a hair
 * colour, so every hairstyle is shown in yours. An outfit's or a hat's colours
 * are its own, so each is shown in its first, and only yours in yours.
 */
const SHARED_COLOURS = new Set<StyledPart>(["hair"]);
/** Turning round, as the arrows do: facing us, then to their right, away, to their left. */
const TURN: AvatarDirection[] = ["down", "left", "up", "right"];
/** Whole pixels only: the art at twice its size on a choice, four times on the stage. */
const TILE_WIDTH = 64;
const STAGE_WIDTH = 128;
/** How many changes Undo goes back through. */
const HISTORY = 30;

/** Each style of a part, with its colours: "12-5" is style 12 in its fifth colour. */
function stylesOf(part: CharacterPart): Map<string, Array<{ id: string; swatch: string }>> {
  const styles = new Map<string, Array<{ id: string; swatch: string }>>();
  for (const [id, swatch] of Object.entries(CHARACTER_CATALOG.parts[part].options)) {
    const style = id.split("-")[0];
    if (!styles.has(style)) styles.set(style, []);
    styles.get(style)!.push({ id, swatch });
  }
  return styles;
}

/**
 * Changing how you look, as a dressing room: you on a stage of your own, a
 * corner of a room at four times the art's size, turning and walking, trying
 * on whatever the pointer is over; beside it (under it, on a phone) the
 * choices, a tab each: whole characters (the presets, and the character
 * generator's own to start from), skin and eyes, hair, outfit, and the
 * extras, one at a time. Each choice is drawn on you as you are. A preset
 * becomes the look nearest it the moment a part changes, so nothing jumps.
 * Undo walks back through what you changed here. Save keeps it on your
 * account, the same in every office, and changes you over where you stand.
 *
 * The choices are drawn once the dialog has opened, so it opens smoothly
 * however many there are.
 */
export function Creator({ onClose }: { onClose: () => void }) {
  const t = useTranslations("look");
  const tc = useTranslations("common");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const reduce = useReducedMotion() ?? false;
  const [character, setCharacterNow] = useState(() => characterOrDefault(user?.character));
  const [history, setHistory] = useState<string[]>([]);
  const [trying, setTrying] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("characters");
  const [extra, setExtra] = useState<Extra>("hat");
  const [facing, setFacing] = useState(0);
  const [walking, setWalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const look = lookFrom(character);
  const onStage = trying ?? character;

  useEffect(() => {
    const later = window.setTimeout(() => setReady(true), reduce ? 0 : 200);
    return () => window.clearTimeout(later);
  }, [reduce]);

  /** A change, kept so Undo can take it back. */
  const setCharacter = (next: string) => {
    if (next === character) return;
    setHistory((past) => [...past, character].slice(-HISTORY));
    setCharacterNow(next);
  };
  const undo = () => {
    const previous = history[history.length - 1];
    if (previous === undefined) return;
    setHistory((past) => past.slice(0, -1));
    setCharacterNow(previous);
  };
  const change = (part: CharacterPart, id: string | undefined) => setCharacter(lookString({ ...look, [part]: id }));
  const turn = (by: number) => setFacing((now) => (now + by + TURN.length) % TURN.length);
  /** Pointing at a choice tries it on; leaving puts back what you have. */
  const tryOn = (candidate: string): Hover => ({
    onPointerEnter: () => setTrying(candidate),
    onPointerLeave: () => setTrying(null),
  });

  const save = async () => {
    if (character === user?.character) return onClose();
    setBusy(true);
    setError("");
    try {
      await updateProfile({ character });
      if (user) saveIdentity({ name: user.displayName, character });
      changeLookOnFloor(character);
      track("look_saved", { preset: isPreset(character) });
      onClose();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex h-[min(88dvh,46rem)] flex-col sm:h-[min(40rem,calc(100dvh-3rem))] sm:flex-row">
      {/* The stage: you in a corner of a room, and what you do to yourself there. */}
      <div className="relative shrink-0 overflow-hidden max-sm:h-[40%] sm:w-[44%]">
        <Room />
        <span
          aria-hidden
          className="absolute bottom-[22%] left-1/2 h-4 w-20 -translate-x-1/2 translate-y-1/2 rounded-[100%] bg-black/25 blur-[3px]"
        />
        <PixelAvatar
          character={onStage}
          direction={TURN[facing]}
          running={walking}
          width={STAGE_WIDTH}
          style={{ left: "50%", top: "78%" }}
        />

        <StageButton label={tc("close")} onClick={onClose} className="absolute start-3 top-3">
          <X className="size-4" />
        </StageButton>
        <div className="absolute end-3 top-3 flex gap-1.5">
          <StageButton label={t("undo")} onClick={undo} disabled={!history.length}>
            <Undo className="size-4" />
          </StageButton>
          <StageButton
            label={t("randomize")}
            onClick={() => {
              setCharacter(lookString(randomLook()));
              track("look_randomized");
            }}
          >
            <Dice className="size-4" />
          </StageButton>
        </div>
        <div className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-border bg-card/90 p-1 shadow-float backdrop-blur-md">
          <PillButton label={t("turnLeft")} onClick={() => turn(1)}>
            <ChevronLeft className="size-4 rtl:rotate-180" />
          </PillButton>
          <button
            type="button"
            aria-pressed={walking}
            onClick={() => setWalking((now) => !now)}
            className={cn(
              "h-8 rounded-full px-3.5 text-[12.5px] font-medium transition-[background-color,color] duration-150",
              walking ? "bg-foreground text-background" : "text-foreground hover:bg-foreground/[0.07]",
            )}
          >
            {t("walk")}
          </button>
          <PillButton label={t("turnRight")} onClick={() => turn(-1)}>
            <ChevronRight className="size-4 rtl:rotate-180" />
          </PillButton>
        </div>
      </div>

      {/* The choices. */}
      <div className="flex min-h-0 flex-1 flex-col border-border sm:border-s">
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-border ps-2 pe-3 sm:ps-3">
          <nav role="tablist" aria-label={t("title")} className="flex min-w-0 flex-1 gap-0.5 overflow-x-auto [scrollbar-width:none]">
            {CATEGORIES.map((key) => (
              <Tab key={key} active={category === key} onClick={() => setCategory(key)} reduce={reduce}>
                {t(`tabs.${key}`)}
              </Tab>
            ))}
          </nav>
          <Button type="button" size="sm" disabled={busy} onClick={save} className="h-9 shrink-0 px-4 text-[13px]">
            {t("save")}
          </Button>
        </div>
        {error && <p className="border-b border-border px-4 py-2 text-[12.5px] text-destructive">{error}</p>}

        <div className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {ready && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={category === "extras" ? `extras-${extra}` : category}
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, transition: { duration: 0.08 } }}
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="flex flex-col gap-6 p-4 sm:p-5"
              >
                {category === "characters" && (
                  <>
                    <Section title={t("presets")}>
                      <Grid>
                        {PRESETS.map((preset) => (
                          <Tile key={preset} label={preset} caption={preset} selected={character === preset} onClick={() => setCharacter(preset)} {...tryOn(preset)}>
                            <Sprite character={preset} />
                          </Tile>
                        ))}
                      </Grid>
                    </Section>
                    <Section title={t("starts")}>
                      <Grid>
                        {CHARACTER_CATALOG.starts.map((start, n) => (
                          <Tile key={start} label={`${t("starts")} ${n + 1}`} selected={character === start} onClick={() => setCharacter(start)} {...tryOn(start)}>
                            <Sprite character={start} />
                          </Tile>
                        ))}
                      </Grid>
                    </Section>
                  </>
                )}
                {category === "skin" && (
                  <>
                    <Section title={t("skin")}>
                      <Swatches part="body" current={look.body} onPick={(id) => change("body", id)} tryOn={(id) => tryOn(lookString({ ...look, body: id }))} />
                    </Section>
                    <Section title={t("eyes")}>
                      <Swatches part="eyes" current={look.eyes} onPick={(id) => change("eyes", id)} tryOn={(id) => tryOn(lookString({ ...look, eyes: id }))} />
                    </Section>
                  </>
                )}
                {(category === "hair" || category === "outfit") && (
                  <Styles part={category} look={look} onPick={(id) => change(category, id)} tryOn={tryOn} />
                )}
                {category === "extras" && (
                  <>
                    {/* One extra at a time, picked here. */}
                    <div className="-mx-1 flex flex-wrap gap-1.5">
                      {EXTRAS.map((part) => (
                        <Chip key={part} active={extra === part} onClick={() => setExtra(part)} worn={!!look[part]}>
                          {t(`parts.${part}`)}
                        </Chip>
                      ))}
                    </div>
                    <Styles part={extra} look={look} onPick={(id) => change(extra, id)} tryOn={tryOn} />
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </div>
  );
}

type Hover = { onPointerEnter: () => void; onPointerLeave: () => void };

/**
 * A corner of a room for you to stand in: wall above, a skirting board, and
 * a planked floor going back, all in the theme's own colours (light or dark),
 * a little light where you stand.
 */
function Room() {
  return (
    <span aria-hidden className="absolute inset-0 bg-[color-mix(in_oklab,var(--ui-muted)_75%,var(--ui-card))]">
      {/* The floor, from the skirting down: planks, seams staggered row by row. */}
      <span
        className="absolute inset-x-0 bottom-0 top-[58%] bg-[color-mix(in_oklab,var(--ui-muted)_80%,var(--ui-foreground)_9%)]"
        style={{
          backgroundImage: [
            "repeating-linear-gradient(180deg, transparent 0 17px, color-mix(in oklab, var(--ui-foreground) 12%, transparent) 17px 18px)",
            "repeating-linear-gradient(90deg, transparent 0 71px, color-mix(in oklab, var(--ui-foreground) 8%, transparent) 71px 72px)",
          ].join(","),
        }}
      />
      {/* The skirting board where wall meets floor. */}
      <span className="absolute inset-x-0 top-[58%] h-2.5 -translate-y-full border-b border-[color-mix(in_oklab,var(--ui-foreground)_14%,transparent)] bg-[color-mix(in_oklab,var(--ui-muted)_70%,var(--ui-foreground)_10%)]" />
      {/* A round rug where you stand. */}
      <span className="absolute bottom-[22%] left-1/2 h-12 w-56 -translate-x-1/2 translate-y-1/2 rounded-[100%] bg-[color-mix(in_oklab,var(--ui-card)_55%,var(--ui-muted))] shadow-[inset_0_0_0_6px_color-mix(in_oklab,var(--ui-foreground)_7%,transparent),0_1px_0_color-mix(in_oklab,var(--ui-foreground)_10%,transparent)]" />
    </span>
  );
}

function StageButton({ label, onClick, disabled, className, children }: { label: string; onClick: () => void; disabled?: boolean; className?: string; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex size-9 items-center justify-center rounded-full border border-border bg-card/90 text-foreground shadow-float backdrop-blur-md transition-[background-color,transform,opacity] duration-150 hover:bg-card active:scale-90 disabled:pointer-events-none disabled:opacity-40",
        className,
      )}
    >
      {children}
    </button>
  );
}

function PillButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full text-foreground transition-[background-color,transform] duration-150 hover:bg-foreground/[0.07] active:scale-90"
    >
      {children}
    </button>
  );
}

/** A tab: its name, the one you're on underlined. */
function Tab({ active, onClick, reduce, children }: { active: boolean; onClick: () => void; reduce: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "relative h-14 shrink-0 px-2.5 text-[13.5px] font-medium outline-none transition-colors focus-visible:text-foreground",
        active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
      {active && (
        <motion.span
          layoutId="creator-tab"
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-x-2.5 bottom-0 h-[2px] rounded-full bg-foreground"
        />
      )}
    </button>
  );
}

/** One of the extras to pick from, with a dot when you're wearing one. */
function Chip({ active, worn, onClick, children }: { active: boolean; worn: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex h-8 items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium transition-[background-color,color,box-shadow] duration-150",
        active ? "bg-foreground text-background" : "bg-foreground/[0.06] text-foreground hover:bg-foreground/[0.1]",
      )}
    >
      {children}
      {worn && <span aria-hidden className={cn("size-1.5 rounded-full", active ? "bg-background" : "bg-foreground/50")} />}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2.5 text-[12.5px] font-semibold text-foreground">{title}</p>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">{children}</div>;
}

/** A character standing on a choice, twice the art's size, still. */
function Sprite({ character }: { character: string }) {
  return <PixelAvatar character={character} still width={TILE_WIDTH} style={{ left: "50%", top: "calc(100% - 8px)" }} />;
}

/** A choice: a whole character standing on its tile, its name under it if it has one. */
function Tile({
  label,
  caption,
  selected,
  onClick,
  children,
  ...hover
}: {
  label: string;
  caption?: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
} & Partial<Hover>) {
  return (
    <button type="button" aria-label={label} aria-pressed={selected} title={label} onClick={onClick} {...hover} className="group flex flex-col items-stretch gap-1.5 outline-none">
      <span
        className={cn(
          "relative block h-[6.5rem] overflow-hidden rounded-2xl transition-[background-color,box-shadow,transform] duration-150 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-ring",
          selected ? "bg-foreground/[0.08] shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "bg-foreground/[0.04] group-hover:-translate-y-0.5 group-hover:bg-foreground/[0.08]",
        )}
      >
        <span className="absolute bottom-2 left-1/2 h-2 w-9 -translate-x-1/2 translate-y-1/2 rounded-[100%] bg-black/20 blur-[2px]" />
        {children}
      </span>
      {caption && (
        <span className={cn("truncate text-center text-[11.5px] transition-colors", selected ? "font-medium text-foreground" : "text-muted-foreground group-hover:text-foreground")}>
          {caption}
        </span>
      )}
    </button>
  );
}

/** A part's colours, one swatch each. */
function Swatches({ part, current, onPick, tryOn }: { part: CharacterPart; current?: string; onPick: (id: string) => void; tryOn: (id: string) => Hover }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {Object.entries(CHARACTER_CATALOG.parts[part].options).map(([id, swatch]) => (
        <Swatch key={id} colour={swatch} selected={current === id} onClick={() => onPick(id)} {...tryOn(id)} />
      ))}
    </div>
  );
}

function Swatch({ colour, selected, onClick, ...hover }: { colour: string; selected: boolean; onClick: () => void } & Partial<Hover>) {
  return (
    <button
      type="button"
      aria-label={colour}
      aria-pressed={selected}
      onClick={onClick}
      {...hover}
      className={cn(
        "size-8 rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)] transition-transform duration-150 hover:scale-110 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
      )}
      style={{ backgroundColor: colour }}
    />
  );
}

/**
 * A part's styles, each drawn on you as you are: in your colour where colours
 * carry across styles (hair), otherwise in its own first, so the choices stay
 * put whatever you're wearing. The chosen style's colours sit above. Parts
 * you can go without start with None.
 */
function Styles({ part, look, onPick, tryOn }: { part: StyledPart; look: ReturnType<typeof lookFrom>; onPick: (id: string | undefined) => void; tryOn: (candidate: string) => Hover }) {
  const t = useTranslations("look");
  const styles = stylesOf(part);
  const current = look[part];
  const [style, colour] = current?.split("-") ?? [];
  const colours = style ? styles.get(style) : undefined;
  const wearing = (id: string | undefined) => lookString({ ...look, [part]: id });

  return (
    <>
      {colours && colours.length > 1 && (
        <Section title={t("colour")}>
          <div className="flex flex-wrap gap-2.5">
            {colours.map((option) => (
              <Swatch key={option.id} colour={option.swatch} selected={option.id === current} onClick={() => onPick(option.id)} {...tryOn(wearing(option.id))} />
            ))}
          </div>
        </Section>
      )}
      <Section title={t("style")}>
        <Grid>
          {!CHARACTER_CATALOG.parts[part].required && (
            <Tile label={t("none")} caption={t("none")} selected={!current} onClick={() => onPick(undefined)} {...tryOn(wearing(undefined))}>
              <Sprite character={wearing(undefined)} />
            </Tile>
          )}
          {[...styles].map(([name, options]) => {
            const id =
              name === style
                ? current!
                : SHARED_COLOURS.has(part)
                  ? (options.find((option) => option.id === `${name}-${colour}`)?.id ?? options[0].id)
                  : options[0].id;
            return (
              <Tile key={name} label={t(`parts.${part}`)} selected={style === name} onClick={() => onPick(id)} {...tryOn(wearing(id))}>
                <Sprite character={wearing(id)} />
              </Tile>
            );
          })}
        </Grid>
      </Section>
    </>
  );
}
