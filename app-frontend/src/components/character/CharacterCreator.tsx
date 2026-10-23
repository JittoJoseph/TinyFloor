"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { Check, ChevronLeft, ChevronRight, Dice } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/motion/button/base";
import { PixelAvatar, type AvatarDirection } from "@/components/PixelAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { changeLookOnFloor } from "@/lib/floor";
import { saveIdentity } from "@/lib/identity";
import { track } from "@/lib/analytics";
import { EASE_OUT } from "@/lib/ease";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { cn } from "@/lib/utils";
import { CHARACTER_CATALOG, PRESETS, characterOrDefault, isPreset, lookFrom, lookString, randomLook, type CharacterPart } from "@shared/character";
import { FloorPatch } from "./FloorPatch";

/** What the creator shows, a tab each: whole characters, then the parts, the small ones together. */
const TABS = ["characters", "skin", "hair", "outfit", "extras"] as const;
type Tab = (typeof TABS)[number];
const EXTRAS = ["face", "glasses", "hat", "gloves", "bag"] as const;
type StyledPart = "hair" | "outfit" | (typeof EXTRAS)[number];
/** Turning round, as the arrows do: facing us, then to their right, away, to their left. */
const TURN: AvatarDirection[] = ["down", "left", "up", "right"];
/**
 * Characters are drawn in whole pixels: twice the art's size on the tiles, as
 * the floor shows them up close, and three times on the stage.
 */
const SCALE = 2;
const SPRITE = 32 * SCALE;
const STAGE_SCALE = 3;

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

let shown = false;
const listeners = new Set<() => void>();
const setShown = (value: boolean) => {
  shown = value;
  listeners.forEach((listener) => listener());
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Opens the creator, from anywhere (your menu, your profile). */
export const openCharacterCreator = () => setShown(true);

/** The one creator every screen opens: in the app's layout, so it outlives the menu that opened it. */
export function CharacterCreatorHost() {
  const open = useSyncExternalStore(subscribe, () => shown, () => false);
  const t = useTranslations("look");
  const tc = useTranslations("common");
  const close = () => setShown(false);
  return (
    <Modal open={open} onClose={close} label={t("title")} closeLabel={tc("close")} className="sm:max-w-[52rem]">
      {open && <Creator onClose={close} />}
    </Modal>
  );
}

/**
 * Changing how you look. On the left, you as you'll be, on a patch of the
 * office's floor at twice the art's size: turning, walking, and trying on
 * whatever the pointer is over. On the right, whole characters (the presets,
 * and the character generator's own, to start from), then skin and eyes,
 * hair, outfit and extras, each drawn on you as you are, colours as
 * swatches. A preset changes into the look nearest it the moment a part
 * changes, so nothing jumps. Save keeps it on your account, the same in every
 * office, and changes you over where you stand.
 */
function Creator({ onClose }: { onClose: () => void }) {
  const t = useTranslations("look");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const reduce = useReducedMotion() ?? false;
  const [character, setCharacter] = useState(() => characterOrDefault(user?.character));
  const [trying, setTrying] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("characters");
  const [facing, setFacing] = useState(0);
  const [walking, setWalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const look = lookFrom(character);
  const onStage = trying ?? character;

  const change = (part: CharacterPart, id: string | undefined) => setCharacter(lookString({ ...look, [part]: id }));
  const turn = (by: number) => setFacing((now) => (now + by + TURN.length) % TURN.length);
  /** Pointing at a choice tries it on; leaving puts back what you have. */
  const tryOn = (candidate: string) => ({ onPointerEnter: () => setTrying(candidate), onPointerLeave: () => setTrying(null) });

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
    <div className="flex flex-col sm:h-[37rem] sm:flex-row">
      <div className="flex shrink-0 flex-col gap-3 px-5 pb-3 pt-1 sm:w-[17rem] sm:border-e sm:border-border sm:pb-5 sm:pt-5">
        <h2 className="text-[17px] font-semibold tracking-tight text-foreground">{t("title")}</h2>
        {/* You, on the office floor: its own tiles, at your size. */}
        <div className="relative h-[11rem] overflow-hidden rounded-2xl shadow-[inset_0_0_0_1px_rgb(0_0_0/0.08)] sm:h-auto sm:min-h-[16rem] sm:flex-1">
          <FloorPatch scale={STAGE_SCALE} material="plank-light" className="absolute inset-0 size-full" />
          {/* The floor fades towards the edges, so it reads as a spot to stand on rather than a pattern. */}
          <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_62%,transparent_35%,var(--ui-card)_100%)]" />
          <span className="absolute left-1/2 top-[80%] h-3.5 w-14 -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-black/20 blur-[2px]" />
          <AnimatePresence initial={false}>
            <motion.div
              key={onStage}
              initial={reduce ? { opacity: 0 } : { y: -6, opacity: 0.4 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.22, ease: EASE_OUT }}
              className="absolute left-1/2 top-[80%]"
            >
              <PixelAvatar character={onStage} direction={TURN[facing]} running={walking} width={32 * STAGE_SCALE} style={{ left: 0, top: 9 }} />
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="flex items-center justify-center gap-1.5">
            <StageButton label={t("turnLeft")} onClick={() => turn(1)}>
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </StageButton>
            <button
              type="button"
              aria-pressed={walking}
              onClick={() => setWalking((now) => !now)}
              className={cn(
                "h-8 cursor-pointer rounded-full px-3.5 text-[12.5px] font-medium transition-colors",
                walking ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70",
              )}
            >
              {t("walk")}
            </button>
            <StageButton label={t("turnRight")} onClick={() => turn(-1)}>
              <ChevronRight className="size-4 rtl:rotate-180" />
            </StageButton>
        </div>
        <button
          type="button"
          onClick={() => {
            setCharacter(lookString(randomLook()));
            track("look_randomized");
          }}
          className="flex h-9 cursor-pointer items-center justify-center gap-2 rounded-xl text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground max-sm:hidden"
        >
          <Dice className="size-4" />
          {t("randomize")}
        </button>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div role="tablist" aria-label={t("title")} className="flex shrink-0 gap-1 overflow-x-auto px-4 pb-2 sm:pe-14 sm:pt-4 [&::-webkit-scrollbar]:hidden">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={cn(
                "relative h-8 shrink-0 cursor-pointer rounded-full px-3.5 text-[13px] font-medium transition-colors",
                tab === name ? "text-background" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab === name && (
                <motion.span layoutId="creator-tab" transition={{ duration: reduce ? 0 : 0.22, ease: EASE_OUT }} className="absolute inset-0 rounded-full bg-foreground" />
              )}
              <span className="relative">{t(`tabs.${name}`)}</span>
            </button>
          ))}
        </div>

        <div className="relative min-h-0 flex-1 overflow-y-auto px-4 pb-4 max-sm:h-[44dvh] max-sm:flex-none">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={tab}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, transition: { duration: 0.08 } }}
              transition={{ duration: 0.18, ease: EASE_OUT }}
              className="flex flex-col gap-5 pt-1"
            >
              {tab === "characters" && (
                <>
                  <Section title={t("presets")}>
                    <Grid>
                      {PRESETS.map((preset) => (
                        <Tile key={preset} label={preset} selected={character === preset} onClick={() => setCharacter(preset)} {...tryOn(preset)}>
                          <PixelAvatar character={preset} still width={SPRITE} style={{ left: "50%", top: "94%" }} />
                        </Tile>
                      ))}
                    </Grid>
                  </Section>
                  <Section title={t("starts")}>
                    <Grid>
                      {CHARACTER_CATALOG.starts.map((start, n) => (
                        <Tile key={start} label={`${t("starts")} ${n + 1}`} selected={character === start} onClick={() => setCharacter(start)} {...tryOn(start)}>
                          <PixelAvatar character={start} still width={SPRITE} style={{ left: "50%", top: "94%" }} />
                        </Tile>
                      ))}
                    </Grid>
                  </Section>
                </>
              )}
              {tab === "skin" && (
                <>
                  <Section title={t("skin")}>
                    <Swatches part="body" current={look.body} onPick={(id) => change("body", id)} tryOn={(id) => tryOn(lookString({ ...look, body: id }))} />
                  </Section>
                  <Section title={t("eyes")}>
                    <Swatches part="eyes" current={look.eyes} onPick={(id) => change("eyes", id)} tryOn={(id) => tryOn(lookString({ ...look, eyes: id }))} />
                  </Section>
                </>
              )}
              {(tab === "hair" || tab === "outfit") && (
                <Styles part={tab} look={look} onPick={(id) => change(tab, id)} tryOn={tryOn} />
              )}
              {tab === "extras" &&
                EXTRAS.map((part) => (
                  <Section key={part} title={t(`parts.${part}`)}>
                    <Styles part={part} look={look} onPick={(id) => change(part, id)} tryOn={tryOn} />
                  </Section>
                ))}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
          <button
            type="button"
            aria-label={t("randomize")}
            onClick={() => setCharacter(lookString(randomLook()))}
            className="flex size-8 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:hidden"
          >
            <Dice className="size-4" />
          </button>
          {error && <p className="me-auto text-[12.5px] text-destructive">{error}</p>}
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="ms-auto h-8 px-3 text-[13px]">
            {t("cancel")}
          </Button>
          <Button type="button" size="sm" disabled={busy} onClick={save} className="h-8 gap-1.5 px-4 text-[13px]">
            <Check className="size-3.5" />
            {t("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function StageButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-muted text-foreground transition-colors hover:bg-muted/70"
    >
      {children}
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2 text-[12px] font-medium text-muted-foreground">{title}</p>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-[repeat(auto-fill,minmax(4.5rem,1fr))] gap-1.5">{children}</div>;
}

/** A choice: a whole character standing on its tile, its feet near the bottom. */
function Tile({
  label,
  selected,
  onClick,
  children,
  ...hover
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
  onPointerEnter?: () => void;
  onPointerLeave?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      {...hover}
      className={cn(
        "group relative h-28 cursor-pointer overflow-hidden rounded-xl bg-muted/50 transition-[background-color,box-shadow,transform] duration-150 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "bg-muted shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** A part's colours, one swatch each. */
type Hover = { onPointerEnter: () => void; onPointerLeave: () => void };

function Swatches({ part, current, onPick, tryOn }: { part: CharacterPart; current?: string; onPick: (id: string) => void; tryOn: (id: string) => Hover }) {
  return (
    <div className="flex flex-wrap gap-2">
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
        "size-8 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.15)] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
      )}
      style={{ backgroundColor: colour }}
    />
  );
}

/**
 * A part's styles, each on you as you are, in the colour you have it in where
 * the style comes in it; the chosen style's colours above. Parts you can go
 * without start with None.
 */
function Styles({
  part,
  look,
  onPick,
  tryOn,
}: {
  part: StyledPart;
  look: ReturnType<typeof lookFrom>;
  onPick: (id: string | undefined) => void;
  tryOn: (candidate: string) => Hover;
}) {
  const t = useTranslations("look");
  const styles = stylesOf(part);
  const current = look[part];
  const [style, colour] = current?.split("-") ?? [];
  const colours = style ? styles.get(style) : undefined;
  const wearing = (id: string | undefined) => lookString({ ...look, [part]: id });

  return (
    <div className="flex flex-col gap-3">
      {colours && colours.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {colours.map((option) => (
            <Swatch key={option.id} colour={option.swatch} selected={option.id === current} onClick={() => onPick(option.id)} {...tryOn(wearing(option.id))} />
          ))}
        </div>
      )}
      <Grid>
        {!CHARACTER_CATALOG.parts[part].required && (
          <Tile label={t("none")} selected={!current} onClick={() => onPick(undefined)} {...tryOn(wearing(undefined))}>
            <PixelAvatar character={wearing(undefined)} still width={SPRITE} style={{ left: "50%", top: "94%" }} />
            <span className="absolute start-1.5 top-1.5 rounded-full bg-card/85 px-1.5 py-px text-[10.5px] font-medium text-muted-foreground">{t("none")}</span>
          </Tile>
        )}
        {[...styles].map(([name, options]) => {
          const id = options.find((option) => option.id === `${name}-${colour}`)?.id ?? options[0].id;
          return (
            <Tile key={name} label={t(`parts.${part}`)} selected={style === name} onClick={() => onPick(id)} {...tryOn(wearing(id))}>
              <PixelAvatar character={wearing(id)} still width={SPRITE} style={{ left: "50%", top: "94%" }} />
            </Tile>
          );
        })}
      </Grid>
    </div>
  );
}
