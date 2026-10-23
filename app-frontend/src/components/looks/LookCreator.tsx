"use client";

import { useState, useSyncExternalStore, type CSSProperties } from "react";
import { useTranslations } from "next-intl";
import { Check, Dice, TurnLeft, TurnRight } from "@/components/ui/icons";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/motion/button/base";
import { PixelAvatar, type AvatarDirection } from "@/components/PixelAvatar";
import { useAuth } from "@/contexts/AuthContext";
import { changeLookOnFloor } from "@/lib/floor";
import { saveIdentity } from "@/lib/identity";
import { track } from "@/lib/analytics";
import { useErrorMessage } from "@/lib/useErrorMessage";
import { cn } from "@/lib/utils";
import { LOOKS, PREMADE_LOOKS, lookLayers, lookString, parseLook, randomLook, type Look, type LookPart } from "@shared/look";

/** What the creator shows, a tab each: the presets, then the parts, the small ones together. */
const TABS = ["presets", "skin", "hair", "outfit", "extras"] as const;
const EXTRAS = ["beard", "glasses", "hat", "bag"] as const;
type Tab = (typeof TABS)[number];
/** Turning round, as the arrows do: facing us, then to their right, away, to their left. */
const TURN: AvatarDirection[] = ["down", "left", "up", "right"];
/** A part's frame facing us, standing: the 19th of the strip's 48. */
const FACING = `${(18 / 47) * 100}%`;

/** Each style of a part, with its colours: "12-5" is style 12 in its fifth colour. */
function stylesOf(part: LookPart): Map<string, Array<{ id: string; swatch: string }>> {
  const styles = new Map<string, Array<{ id: string; swatch: string }>>();
  for (const [id, swatch] of Object.entries(LOOKS.parts[part].options)) {
    const style = id.split("-")[0];
    if (!styles.has(style)) styles.set(style, []);
    styles.get(style)!.push({ id, swatch });
  }
  return styles;
}
const STYLES = Object.fromEntries((["hair", "beard", "outfit", "glasses", "hat", "bag"] as const).map((part) => [part, stylesOf(part)])) as Record<
  Exclude<LookPart, "body" | "eyes">,
  ReturnType<typeof stylesOf>
>;

/**
 * One still frame of a look, facing us: its parts stacked in CSS, the way
 * PixelAvatar draws a moving one. `zoom` crops to the head and shoulders, for
 * hair, hats and faces.
 */
function LookStill({ look, zoom = false }: { look: Look; zoom?: boolean }) {
  const style: CSSProperties = {
    backgroundImage: lookLayers(look).reverse().map((url) => `url(${url})`).join(", "),
    backgroundSize: "4800% 100%",
    backgroundPositionX: FACING,
    backgroundRepeat: "no-repeat",
    imageRendering: "pixelated",
  };
  return (
    <span className="relative block aspect-square w-full overflow-hidden">
      <span
        aria-hidden
        className={cn("absolute left-1/2 block aspect-[1/2] -translate-x-1/2", zoom ? "top-[-62%] w-[96%]" : "top-[-23%] w-[62%]")}
        style={style}
      />
    </span>
  );
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
export const openLookCreator = () => setShown(true);

/** The one creator every screen opens: in the app's layout, so it outlives the menu that opened it. */
export function LookCreatorHost() {
  const open = useSyncExternalStore(subscribe, () => shown, () => false);
  return <LookCreator open={open} onClose={() => setShown(false)} />;
}

/**
 * Making how you look, from the pack's parts: presets to start from, then
 * skin and eyes, hair, facial hair, outfit, glasses, hat and bag, each style
 * shown on you as you are, and its colours as swatches. You turn and walk on
 * the left as you change; Randomize rolls a new person; Save keeps it on your
 * profile and changes you over on the floor, where everyone sees it.
 */
export function LookCreator({ open, onClose }: { open: boolean; onClose: () => void }) {
  const t = useTranslations("look");
  const tc = useTranslations("common");
  return (
    <Modal open={open} onClose={onClose} label={t("title")} closeLabel={tc("close")} className="sm:max-w-[46rem]">
      {open && <Creator onClose={onClose} />}
    </Modal>
  );
}

function Creator({ onClose }: { onClose: () => void }) {
  const t = useTranslations("look");
  const { user, updateProfile } = useAuth();
  const explain = useErrorMessage();
  const [look, setLook] = useState<Look>(() => parseLook(user?.character) ?? parseLook(PREMADE_LOOKS[0]) ?? randomLook());
  const [tab, setTab] = useState<Tab>(parseLook(user?.character) ? "hair" : "presets");
  const [facing, setFacing] = useState(0);
  const [walking, setWalking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const character = lookString(look);
  const changed = character !== user?.character;

  const change = (part: LookPart, id: string | undefined) => setLook((now) => ({ ...now, [part]: id }));
  const turn = (by: number) => setFacing((now) => (now + by + TURN.length) % TURN.length);

  const save = async () => {
    if (!changed) return onClose();
    setBusy(true);
    setError("");
    try {
      await updateProfile({ character });
      if (user) saveIdentity({ name: user.displayName, character });
      changeLookOnFloor(character);
      track("look_saved", { parts: Object.keys(look).length });
      onClose();
    } catch (err) {
      setError(explain(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col sm:h-[34rem] sm:flex-row">
      {/* You, as you'll be: turning and walking on a patch of floor. On a phone, beside its buttons. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-3 border-border px-5 pb-3 pt-1 sm:w-[15.5rem] sm:flex-col sm:flex-nowrap sm:border-e sm:pb-5 sm:pt-5">
        <h2 className="w-full text-[17px] font-semibold tracking-tight text-foreground">{t("title")}</h2>
        <div className="relative aspect-[5/6] w-[6.5rem] rounded-2xl bg-muted/70 sm:mt-6 sm:w-full" style={{ containerType: "size" }}>
          <span className="absolute left-1/2 top-[84%] h-[6%] w-[34%] -translate-x-1/2 -translate-y-1/2 rounded-[100%] bg-black/15 blur-[1.5px] dark:bg-black/50" />
          <PixelAvatar character={character} direction={TURN[facing]} running={walking} width="46cqw" style={{ left: "50%", top: "84%" }} />
        </div>
        <div className="flex flex-col items-start gap-2 sm:contents">
          <div className="flex items-center gap-1.5">
            <IconToggle label={t("turnLeft")} onClick={() => turn(1)}>
              <TurnLeft className="size-4" />
            </IconToggle>
            <button
              type="button"
              aria-pressed={walking}
              onClick={() => setWalking((now) => !now)}
              className={cn(
                "h-8 cursor-pointer rounded-full px-3 text-[12.5px] font-medium transition-colors",
                walking ? "bg-foreground text-background" : "bg-muted text-foreground hover:bg-muted/70",
              )}
            >
              {t("walk")}
            </button>
            <IconToggle label={t("turnRight")} onClick={() => turn(-1)}>
              <TurnRight className="size-4" />
            </IconToggle>
          </div>
          <button
            type="button"
            onClick={() => setLook(randomLook())}
            className="flex h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 text-[12.5px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:mt-auto"
          >
            <Dice className="size-4" />
            {t("randomize")}
          </button>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div role="tablist" aria-label={t("title")} className="flex shrink-0 gap-1 overflow-x-auto px-4 pb-2 pt-1 sm:pe-14 sm:pt-4 [&::-webkit-scrollbar]:hidden">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={cn(
                "h-8 shrink-0 cursor-pointer rounded-full px-3 text-[12.5px] font-medium transition-colors",
                tab === name ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {t(`tabs.${name}`)}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 max-sm:max-h-[44dvh]">
          {tab === "presets" && (
            <Grid>
              {PREMADE_LOOKS.map((premade) => {
                const parsed = parseLook(premade);
                return (
                  parsed && (
                    <Tile key={premade} label={t("preset")} selected={premade === character} onClick={() => setLook(parsed)}>
                      <LookStill look={parsed} />
                    </Tile>
                  )
                );
              })}
            </Grid>
          )}
          {tab === "skin" && (
            <div className="flex flex-col gap-5 pt-2">
              <Swatches title={t("skin")} part="body" look={look} onPick={(id) => change("body", id)} />
              <Swatches title={t("eyes")} part="eyes" look={look} onPick={(id) => change("eyes", id)} />
            </div>
          )}
          {(tab === "hair" || tab === "outfit") && <Styles part={tab} look={look} onPick={(id) => change(tab, id)} />}
          {tab === "extras" && (
            <div className="flex flex-col gap-5">
              {EXTRAS.map((part) => (
                <section key={part}>
                  <p className="mb-2 pt-2 text-[12px] font-medium text-muted-foreground">{t(`tabs.${part}`)}</p>
                  <Styles part={part} look={look} onPick={(id) => change(part, id)} />
                </section>
              ))}
            </div>
          )}
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border px-4 py-3">
          {error && <p className="me-auto text-[12.5px] text-destructive">{error}</p>}
          <Button type="button" variant="ghost" size="sm" onClick={onClose} className="h-8 px-3 text-[13px]">
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

function IconToggle({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
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

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-5">{children}</div>;
}

function Tile({ label, selected, onClick, children }: { label: string; selected: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "relative cursor-pointer overflow-hidden rounded-xl bg-muted/60 transition-[background-color,box-shadow] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected ? "shadow-[inset_0_0_0_2px_var(--ui-foreground)]" : "hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}

/** A part's colours, one swatch each: skin and eyes, which have no styles. */
function Swatches({ title, part, look, onPick }: { title: string; part: LookPart; look: Look; onPick: (id: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-[12px] font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {Object.entries(LOOKS.parts[part].options).map(([id, swatch]) => (
          <Swatch key={id} colour={swatch} selected={look[part] === id} onClick={() => onPick(id)} />
        ))}
      </div>
    </div>
  );
}

function Swatch({ colour, selected, onClick }: { colour: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-label={colour}
      aria-pressed={selected}
      onClick={onClick}
      className={cn(
        "size-7 cursor-pointer rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/0.12)] transition-transform duration-150 hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        selected && "ring-2 ring-foreground ring-offset-2 ring-offset-card",
      )}
      style={{ backgroundColor: colour }}
    />
  );
}

/**
 * A part's styles, each on you as you are and in the colour you have it in
 * where the style has that colour; then the chosen style's colours. Parts you
 * can go without start with None.
 */
function Styles({ part, look, onPick }: { part: Exclude<LookPart, "body" | "eyes">; look: Look; onPick: (id: string | undefined) => void }) {
  const t = useTranslations("look");
  const styles = STYLES[part];
  const current = look[part];
  const [style, colour] = current?.split("-") ?? [];
  const head = part !== "outfit" && part !== "bag";
  const colours = style ? styles.get(style) : undefined;
  const tiles = [...styles].map(([name, options]) => ({ name, id: options.find((option) => option.id === `${name}-${colour}`)?.id ?? options[0].id }));

  return (
    <div className="flex flex-col gap-3 pt-1">
      {colours && colours.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {colours.map((option) => (
            <Swatch key={option.id} colour={option.swatch} selected={option.id === current} onClick={() => onPick(option.id)} />
          ))}
        </div>
      )}
      <Grid>
        {!LOOKS.parts[part].required && (
          <Tile label={t("none")} selected={!current} onClick={() => onPick(undefined)}>
            <span className="flex aspect-square items-center justify-center text-[12px] font-medium text-muted-foreground">{t("none")}</span>
          </Tile>
        )}
        {tiles.map(({ name, id }) => (
          <Tile key={name} label={t(`tabs.${part}`)} selected={style === name} onClick={() => onPick(id)}>
            <LookStill look={{ ...look, [part]: id }} zoom={head} />
          </Tile>
        ))}
      </Grid>
    </div>
  );
}
