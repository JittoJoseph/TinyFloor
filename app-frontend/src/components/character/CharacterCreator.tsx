"use client";

import {
  cloneElement,
  isValidElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  Characters,
  Check,
  ChevronLeft,
  ChevronRight,
  Dice,
  HatGlasses,
  ICON_STROKE,
  Scissors,
  Shirt,
  Smile,
} from "@/components/ui/icons";
import { Button } from "@/components/motion/button/base";
import { PixelAvatar, type AvatarDirection } from "@/components/PixelAvatar";
import { CharacterStage } from "./CharacterStage";
import { useAuth } from "@/contexts/AuthContext";
import { changeLookOnFloor } from "@/lib/floor";
import { saveIdentity } from "@/lib/identity";
import { track } from "@/lib/analytics";
import { EASE_OUT, SPRING_LAYOUT } from "@/lib/ease";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { cn } from "@/lib/utils";
import {
  CHARACTER_CATALOG,
  PRESETS,
  characterOrDefault,
  isPreset,
  lookFrom,
  lookString,
  randomLook,
  type CharacterPart,
} from "@shared/character";

/** What the creator shows, a category each, as the app's rail shows its places: whole characters, then the parts. */
const CATEGORIES = [
  { key: "characters", icon: <Characters /> },
  { key: "skin", icon: <Smile /> },
  { key: "hair", icon: <Scissors /> },
  { key: "outfit", icon: <Shirt /> },
  { key: "extras", icon: <HatGlasses /> },
] as const;
type Category = (typeof CATEGORIES)[number]["key"];
const EXTRAS = ["face", "glasses", "hat", "gloves", "bag"] as const;
type StyledPart = "hair" | "outfit" | (typeof EXTRAS)[number];
/**
 * Parts whose colours mean the same in every style: a hair colour is a hair
 * colour, so every hairstyle is shown in yours. An outfit's or a hat's colours
 * are its own, so each is shown in its first, and only yours in yours.
 */
const SHARED_COLOURS = new Set<StyledPart>(["hair"]);
/** Turning round, as the arrows do: facing us, then to their right, away, to their left. */
const TURN: AvatarDirection[] = ["down", "left", "up", "right"];
/** Whole pixels only: the art at twice its size on a choice, three times on the stage. */
const TILE_WIDTH = 64;

/** Each style of a part, with its colours: "12-5" is style 12 in its fifth colour. */
function stylesOf(
  part: CharacterPart,
): Map<string, Array<{ id: string; swatch: string }>> {
  const styles = new Map<string, Array<{ id: string; swatch: string }>>();
  for (const [id, swatch] of Object.entries(
    CHARACTER_CATALOG.parts[part].options,
  )) {
    const style = id.split("-")[0];
    if (!styles.has(style)) styles.set(style, []);
    styles.get(style)!.push({ id, swatch });
  }
  return styles;
}

/**
 * Changing how you look. You on the left, three times the art's size, turning
 * and walking, trying on whatever the pointer is over. The categories in the
 * middle, as the app's rail draws its places. The choices on the right: whole
 * characters (the presets, and the character generator's own, to start from),
 * then skin and eyes, hair, outfit and extras, each drawn on you as you are,
 * colours as swatches. A preset becomes the look nearest it the moment a part
 * changes, so nothing jumps. Save keeps it on your account, the same in every
 * office, and changes you over where you stand.
 *
 * The choices are drawn once the dialog has opened, so it opens smoothly
 * however many there are.
 */
export function Creator({ onClose }: { onClose: () => void }) {
  const t = useTranslations("look");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const reduce = useReducedMotion() ?? false;
  const [character, setCharacter] = useState(() =>
    characterOrDefault(user?.character),
  );
  const [trying, setTrying] = useState<string | null>(null);
  const [category, setCategory] = useState<Category>("characters");
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

  const change = (part: CharacterPart, id: string | undefined) =>
    setCharacter(lookString({ ...look, [part]: id }));
  const turn = (by: number) =>
    setFacing((now) => (now + by + TURN.length) % TURN.length);
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
    <div className="flex flex-col sm:h-[38rem]">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-border pe-16 ps-5 sm:ps-6">
        <h2 className="text-[16px] font-semibold tracking-tight text-foreground">
          {t("title")}
        </h2>
      </header>

      <div className="flex min-h-0 flex-1 flex-col sm:flex-row">
        {/* You: on a lit spot, turning and walking. */}
        <div className="flex shrink-0 gap-3 border-border p-4 max-sm:items-center sm:w-[16.5rem] sm:flex-col sm:border-e sm:p-5">
          <CharacterStage
            character={onStage}
            scale={3}
            ground="16%"
            direction={TURN[facing]}
            walking={walking}
            className="h-48 flex-1 sm:h-auto"
          />
          <div className="flex items-center justify-center gap-1.5">
            <RoundButton label={t("turnLeft")} onClick={() => turn(1)}>
              <ChevronLeft className="size-4 rtl:rotate-180" />
            </RoundButton>
            <button
              type="button"
              aria-pressed={walking}
              onClick={() => setWalking((now) => !now)}
              className={cn(
                "h-8 rounded-full px-3.5 text-[12.5px] font-medium transition-[background-color,color,transform] duration-150 active:scale-95",
                walking
                  ? "bg-foreground text-background"
                  : "bg-foreground/[0.07] text-foreground hover:bg-foreground/[0.12]",
              )}
            >
              {t("walk")}
            </button>
            <RoundButton label={t("turnRight")} onClick={() => turn(-1)}>
              <ChevronRight className="size-4 rtl:rotate-180" />
            </RoundButton>
          </div>
        </div>

        {/* The categories, as the rail draws its places. */}
        <nav
          aria-label={t("title")}
          className="flex shrink-0 justify-around border-border px-2 max-sm:border-y max-sm:py-2 sm:w-[4.75rem] sm:flex-col sm:justify-start sm:gap-2 sm:border-e sm:py-3"
        >
          {CATEGORIES.map(({ key, icon }) => (
            <CategoryButton
              key={key}
              icon={icon}
              label={t(`tabs.${key}`)}
              active={category === key}
              onClick={() => setCategory(key)}
              reduce={reduce}
            />
          ))}
        </nav>

        <div className="relative min-h-0 flex-1 overflow-y-auto max-sm:h-[42dvh] max-sm:flex-none">
          {ready && (
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={category}
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
                          <Tile
                            key={preset}
                            label={preset}
                            caption={preset}
                            selected={character === preset}
                            onClick={() => setCharacter(preset)}
                            {...tryOn(preset)}
                          >
                            <Sprite character={preset} />
                          </Tile>
                        ))}
                      </Grid>
                    </Section>
                    <Section title={t("starts")}>
                      <Grid>
                        {CHARACTER_CATALOG.starts.map((start, n) => (
                          <Tile
                            key={start}
                            label={`${t("starts")} ${n + 1}`}
                            selected={character === start}
                            onClick={() => setCharacter(start)}
                            {...tryOn(start)}
                          >
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
                      <Swatches
                        part="body"
                        current={look.body}
                        onPick={(id) => change("body", id)}
                        tryOn={(id) => tryOn(lookString({ ...look, body: id }))}
                      />
                    </Section>
                    <Section title={t("eyes")}>
                      <Swatches
                        part="eyes"
                        current={look.eyes}
                        onPick={(id) => change("eyes", id)}
                        tryOn={(id) => tryOn(lookString({ ...look, eyes: id }))}
                      />
                    </Section>
                  </>
                )}
                {(category === "hair" || category === "outfit") && (
                  <Styles
                    part={category}
                    look={look}
                    onPick={(id) => change(category, id)}
                    tryOn={tryOn}
                    titled
                  />
                )}
                {category === "extras" &&
                  EXTRAS.map((part) => (
                    <Section key={part} title={t(`parts.${part}`)}>
                      <Styles
                        part={part}
                        look={look}
                        onPick={(id) => change(part, id)}
                        tryOn={tryOn}
                      />
                    </Section>
                  ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      <footer className="flex h-16 shrink-0 items-center gap-2 border-t border-border px-4 sm:px-5">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            setCharacter(lookString(randomLook()));
            track("look_randomized");
          }}
          className="h-9 gap-2 px-3.5 text-[13px]"
        >
          <Dice className="size-4" />
          {t("randomize")}
        </Button>
        {error && (
          <p className="min-w-0 flex-1 truncate text-[12.5px] text-destructive">
            {error}
          </p>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="ms-auto h-9 px-3.5 text-[13px]"
        >
          {t("cancel")}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy}
          onClick={save}
          className="h-9 gap-1.5 px-4 text-[13px]"
        >
          <Check className="size-3.5" />
          {t("save")}
        </Button>
      </footer>
    </div>
  );
}

type Hover = { onPointerEnter: () => void; onPointerLeave: () => void };

function RoundButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full bg-foreground/[0.07] text-foreground transition-[background-color,transform] duration-150 hover:bg-foreground/[0.12] active:scale-90"
    >
      {children}
    </button>
  );
}

/** A category, drawn as the app's rail draws a place: the icon in its tile (heavier where you are), the name under it, a bar at the edge. */
function CategoryButton({
  icon,
  label,
  active,
  onClick,
  reduce,
}: {
  icon: ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  reduce: boolean;
}) {
  const drawn = isValidElement(icon)
    ? cloneElement(
        icon as ReactElement<{ strokeWidth?: number; size?: number }>,
        { strokeWidth: active ? 2.2 : ICON_STROKE, size: 22 },
      )
    : icon;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className="group relative flex w-14 flex-col items-center gap-1 outline-none sm:w-full"
    >
      {active && (
        <motion.span
          layoutId="creator-category"
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute start-0 top-1.5 hidden h-7 w-[3px] rounded-e-full bg-foreground sm:block"
        />
      )}
      <span
        className={cn(
          "relative flex size-10 items-center justify-center rounded-[12px] transition-[background-color,color,transform] duration-150 group-active:scale-95 group-focus-visible:ring-2 group-focus-visible:ring-ring",
          active
            ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.08),0_0_0_1px_var(--ui-border)] dark:bg-muted"
            : "text-muted-foreground group-hover:bg-foreground/[0.06] group-hover:text-foreground",
        )}
      >
        {drawn}
      </span>
      <span
        className={cn(
          "max-w-full truncate px-0.5 text-[10.5px] leading-none tracking-tight transition-colors",
          active
            ? "font-semibold text-foreground"
            : "text-muted-foreground group-hover:text-foreground",
        )}
      >
        {label}
      </span>
    </button>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <p className="mb-2.5 text-[12.5px] font-semibold text-foreground">
        {title}
      </p>
      {children}
    </section>
  );
}

function Grid({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(5rem,1fr))] gap-2">
      {children}
    </div>
  );
}

/** A character standing on a choice, twice the art's size, still. */
function Sprite({ character }: { character: string }) {
  return (
    <PixelAvatar
      character={character}
      still
      width={TILE_WIDTH}
      style={{ left: "50%", top: "calc(100% - 8px)" }}
    />
  );
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
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      title={label}
      onClick={onClick}
      {...hover}
      className="group flex flex-col items-stretch gap-1.5 outline-none"
    >
      <span
        className={cn(
          "relative block h-[6.5rem] overflow-hidden rounded-2xl transition-[background-color,box-shadow,transform] duration-150 group-active:scale-[0.97] group-focus-visible:ring-2 group-focus-visible:ring-ring",
          selected
            ? "bg-foreground/[0.08] shadow-[inset_0_0_0_2px_var(--ui-foreground)]"
            : "bg-foreground/[0.04] group-hover:-translate-y-0.5 group-hover:bg-foreground/[0.08]",
        )}
      >
        <span className="absolute bottom-2 left-1/2 h-2 w-9 -translate-x-1/2 translate-y-1/2 rounded-[100%] bg-black/20 blur-[2px]" />
        {children}
      </span>
      {caption && (
        <span
          className={cn(
            "truncate text-center text-[11.5px] transition-colors",
            selected
              ? "font-medium text-foreground"
              : "text-muted-foreground group-hover:text-foreground",
          )}
        >
          {caption}
        </span>
      )}
    </button>
  );
}

/** A part's colours, one swatch each. */
function Swatches({
  part,
  current,
  onPick,
  tryOn,
}: {
  part: CharacterPart;
  current?: string;
  onPick: (id: string) => void;
  tryOn: (id: string) => Hover;
}) {
  return (
    <div className="flex flex-wrap gap-2.5">
      {Object.entries(CHARACTER_CATALOG.parts[part].options).map(
        ([id, swatch]) => (
          <Swatch
            key={id}
            colour={swatch}
            selected={current === id}
            onClick={() => onPick(id)}
            {...tryOn(id)}
          />
        ),
      )}
    </div>
  );
}

function Swatch({
  colour,
  selected,
  onClick,
  ...hover
}: {
  colour: string;
  selected: boolean;
  onClick: () => void;
} & Partial<Hover>) {
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
function Styles({
  part,
  look,
  onPick,
  tryOn,
  titled = false,
}: {
  part: StyledPart;
  look: ReturnType<typeof lookFrom>;
  onPick: (id: string | undefined) => void;
  tryOn: (candidate: string) => Hover;
  titled?: boolean;
}) {
  const t = useTranslations("look");
  const styles = stylesOf(part);
  const current = look[part];
  const [style, colour] = current?.split("-") ?? [];
  const colours = style ? styles.get(style) : undefined;
  const wearing = (id: string | undefined) =>
    lookString({ ...look, [part]: id });

  const swatches = colours && colours.length > 1 && (
    <div className="flex flex-wrap gap-2.5">
      {colours.map((option) => (
        <Swatch
          key={option.id}
          colour={option.swatch}
          selected={option.id === current}
          onClick={() => onPick(option.id)}
          {...tryOn(wearing(option.id))}
        />
      ))}
    </div>
  );
  const grid = (
    <Grid>
      {!CHARACTER_CATALOG.parts[part].required && (
        <Tile
          label={t("none")}
          caption={t("none")}
          selected={!current}
          onClick={() => onPick(undefined)}
          {...tryOn(wearing(undefined))}
        >
          <Sprite character={wearing(undefined)} />
        </Tile>
      )}
      {[...styles].map(([name, options]) => {
        const id =
          name === style
            ? current!
            : SHARED_COLOURS.has(part)
              ? (options.find((option) => option.id === `${name}-${colour}`)
                  ?.id ?? options[0].id)
              : options[0].id;
        return (
          <Tile
            key={name}
            label={t(`parts.${part}`)}
            selected={style === name}
            onClick={() => onPick(id)}
            {...tryOn(wearing(id))}
          >
            <Sprite character={wearing(id)} />
          </Tile>
        );
      })}
    </Grid>
  );
  // A part of its own (hair, outfit) gets headings; a slot among the extras is under its own already.
  if (!titled) {
    return (
      <div className="flex flex-col gap-3">
        {swatches}
        {grid}
      </div>
    );
  }
  return (
    <>
      {swatches && <Section title={t("colour")}>{swatches}</Section>}
      <Section title={t("style")}>{grid}</Section>
    </>
  );
}
