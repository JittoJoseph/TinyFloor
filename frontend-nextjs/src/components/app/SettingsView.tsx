"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Accessibility, ArrowLeft, Bell, Building2, ChevronRight, Headphones, Mic, Monitor, Moon, SlidersHorizontal, Sun, Video } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { usePathname, useRouter } from "@/lib/i18n/navigation";
import { locales, type Locale } from "@/lib/i18n/routing";
import { useAuth } from "@/contexts/AuthContext";
import { api, ApiError } from "@/lib/api";
import { savedDevices, saveDevices } from "@/lib/media";
import { setPref, usePrefs, type Prefs } from "@/lib/prefs";
import { setTheme, useTheme, type ThemeChoice } from "@/lib/theme";
import { Switch } from "@/components/motion/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/motion/select";
import { Button } from "@/components/motion/button/base";
import { Face } from "@/components/ui/Face";
import { IconButton } from "@/components/ui/IconButton";
import { PlansSoon } from "@/components/ui/PlansSoon";
import { SPRING_LAYOUT } from "@/lib/ease";
import { cn } from "@/lib/utils";
import { ShellView } from "./AppShell";
import { PresenceDock } from "./PresenceDock";
import { usePlace } from "./place";
import { useOfficeMaybe } from "./OfficeShell";

type Section = "general" | "media" | "notifications" | "accessibility" | "office";

const ICONS: Record<Section, ReactNode> = {
  general: <SlidersHorizontal />,
  media: <Headphones />,
  notifications: <Bell />,
  accessibility: <Accessibility />,
  office: <Building2 />,
};

/**
 * Settings, in the shell like everything else: your own preferences, kept in
 * this browser, and — in an office — the office's own. Nothing here costs a
 * request to change except the office's name.
 */
export function SettingsView() {
  const t = useTranslations("settings");
  const ts = useTranslations("shell");
  const place = usePlace();
  const [section, setSection] = useState<Section>("general");
  const [picked, setPicked] = useState(false);
  const reduce = useReducedMotion();

  const yours: Section[] = ["general", "media", "notifications", "accessibility"];
  const office: Section[] = place.kind === "office" ? ["office"] : [];

  const choose = (one: Section) => {
    setSection(one);
    setPicked(true);
  };

  const item = (one: Section) => (
    <button
      key={one}
      type="button"
      onClick={() => choose(one)}
      aria-current={section === one ? "page" : undefined}
      className={cn(
        "relative flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 text-start text-[13.5px] transition-colors [&_svg]:size-4",
        section === one ? "text-foreground" : "text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
      )}
    >
      {section === one && (
        <motion.span
          layoutId="settings-row"
          transition={reduce ? { duration: 0 } : SPRING_LAYOUT}
          className="absolute inset-0 rounded-lg bg-muted"
        />
      )}
      <span className="relative">{ICONS[one]}</span>
      <span className="relative flex-1">{t(`sections.${one}`)}</span>
      <ChevronRight className="relative size-3.5 text-faint md:hidden rtl:rotate-180" />
    </button>
  );

  return (
    <ShellView
      showDetail={picked}
      column={
        <>
          <header className="flex h-14 shrink-0 items-center px-4">
            <h2 className="truncate text-[15px] font-semibold tracking-tight text-foreground">{ts("settings")}</h2>
          </header>
          <nav className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <p className="px-2.5 pb-1 pt-1 text-[12px] font-medium text-faint">{t("preferences")}</p>
            <div className="flex flex-col gap-px">{yours.map(item)}</div>
            {office.length > 0 && (
              <>
                <p className="px-2.5 pb-1 pt-4 text-[12px] font-medium text-faint">{place.name}</p>
                <div className="flex flex-col gap-px">{office.map(item)}</div>
              </>
            )}
          </nav>
          <PresenceDock place={place.name} settingsHref={place.paths.settings} />
        </>
      }
    >
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-3 sm:px-6">
        <IconButton
          label={ts("back")}
          size="sm"
          className="md:hidden"
          onClick={() => setPicked(false)}
          icon={<ArrowLeft className="rtl:rotate-180" />}
        />
        <span className="text-[15px] font-semibold text-foreground">{t(`sections.${section}`)}</span>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-2xl px-4 pb-16 pt-6 sm:px-8">
          {section === "general" && <General />}
          {section === "media" && <Media />}
          {section === "notifications" && <Notifications />}
          {section === "accessibility" && <AccessibilitySection />}
          {section === "office" && <OfficeSection />}
        </div>
      </div>
    </ShellView>
  );
}

/** A group of settings on one card, the way every settings page reads. */
function Group({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="mb-8">
      <h3 className="text-[13px] font-semibold text-foreground">{title}</h3>
      {note && <p className="mt-0.5 text-[12.5px] text-muted-foreground">{note}</p>}
      <div className="mt-3 divide-y divide-border rounded-2xl border border-border bg-background">{children}</div>
    </section>
  );
}

function Row({
  title,
  description,
  control,
  badge,
}: {
  title: string;
  description?: string;
  control: ReactNode;
  /** A word beside the title, like "Experimental". */
  badge?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[13.5px] font-medium text-foreground">
          {title}
          {badge && (
            <span className="rounded-full bg-brand/10 px-2 py-px text-[11px] font-medium text-brand">{badge}</span>
          )}
        </p>
        {description && <p className="mt-0.5 text-[12.5px] leading-relaxed text-muted-foreground">{description}</p>}
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

function Toggle({
  pref,
  title,
  description,
  badge,
}: {
  pref: keyof Prefs;
  title: string;
  description?: string;
  badge?: string;
}) {
  const prefs = usePrefs();
  return (
    <Row
      title={title}
      description={description}
      badge={badge}
      control={<Switch checked={prefs[pref]} onCheckedChange={(on) => setPref(pref, on)} ariaLabel={title} />}
    />
  );
}

function General() {
  const t = useTranslations("settings");
  const ts = useTranslations("shell");
  const theme = useTheme();
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const themes: Array<{ value: ThemeChoice; icon: ReactNode }> = [
    { value: "system", icon: <Monitor className="size-4" /> },
    { value: "light", icon: <Sun className="size-4" /> },
    { value: "dark", icon: <Moon className="size-4" /> },
  ];
  return (
    <>
      <Group title={t("appearance")}>
        <div className="px-4 py-3.5">
          <p className="text-[13.5px] font-medium text-foreground">{ts("theme")}</p>
          <p className="mt-0.5 text-[12.5px] text-muted-foreground">{t("themeNote")}</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {themes.map((one) => (
              <button
                key={one.value}
                type="button"
                aria-pressed={theme === one.value}
                onClick={() => setTheme(one.value)}
                className={cn(
                  "group overflow-hidden rounded-xl border text-start transition-colors",
                  theme === one.value ? "border-foreground/40 ring-1 ring-foreground/20" : "border-border hover:border-border-strong",
                )}
              >
                <ThemePreview kind={one.value} />
                <span className="flex items-center gap-1.5 px-2.5 py-2 text-[12.5px] font-medium text-foreground">
                  {one.icon}
                  {ts(`themes.${one.value}`)}
                </span>
              </button>
            ))}
          </div>
        </div>
      </Group>
      <Group title={t("language")}>
        <Row
          title={t("languageTitle")}
          description={t("languageNote")}
          control={
            <div className="w-44">
              <Select
                value={locale}
                onValueChange={(code) => router.replace(`${pathname}${window.location.search}`, { locale: code as Locale })}
              >
                <SelectTrigger className="h-9 bg-card text-[13px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {locales.map((one) => (
                    <SelectItem key={one.code} value={one.code}>
                      {one.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          }
        />
      </Group>
    </>
  );
}

/** A tiny sketch of the app in that theme. */
function ThemePreview({ kind }: { kind: ThemeChoice }) {
  const half = (dark: boolean) => (
    <span className={cn("flex h-full flex-1 gap-1 p-1.5", dark ? "bg-[#0f0f10]" : "bg-[#f0f0ec]")}>
      <span className={cn("w-2.5 rounded-sm", dark ? "bg-[#1e1e21]" : "bg-[#e2e2dc]")} />
      <span className={cn("flex flex-1 flex-col gap-1 rounded-sm p-1", dark ? "bg-[#161617]" : "bg-white")}>
        <span className={cn("h-1 w-3/4 rounded-full", dark ? "bg-[#3a3a3e]" : "bg-[#d6d6d0]")} />
        <span className={cn("h-1 w-1/2 rounded-full", dark ? "bg-[#2a2a2e]" : "bg-[#e6e6e0]")} />
      </span>
    </span>
  );
  return (
    <span className="flex h-14 border-b border-border">
      {kind === "system" ? (
        <>
          {half(false)}
          {half(true)}
        </>
      ) : (
        half(kind === "dark")
      )}
    </span>
  );
}

interface Device {
  deviceId: string;
  label: string;
}
const DEFAULT = "default";

function Media() {
  const t = useTranslations("settings");
  const [microphones, setMicrophones] = useState<Device[]>([]);
  const [cameras, setCameras] = useState<Device[]>([]);
  const [audio, setAudio] = useState(() => savedDevices().audio ?? DEFAULT);
  const [video, setVideo] = useState(() => savedDevices().video ?? DEFAULT);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!navigator.mediaDevices?.enumerateDevices) return;
        let devices = await navigator.mediaDevices.enumerateDevices();
        if (devices.every((device) => !device.label)) {
          // Labels stay blank until the browser has granted the devices once.
          const probe = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
          devices = await navigator.mediaDevices.enumerateDevices();
          probe.getTracks().forEach((track) => track.stop());
        }
        if (cancelled) return;
        const of = (kind: MediaDeviceKind) =>
          devices
            .filter((device) => device.kind === kind && device.deviceId && device.deviceId !== DEFAULT)
            .map(({ deviceId, label }) => ({ deviceId, label }));
        setMicrophones(of("audioinput"));
        setCameras(of("videoinput"));
      } catch {
        // No permission or no devices: the default ones are used.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const pick = (kind: "audio" | "video", value: string) => {
    if (kind === "audio") setAudio(value);
    else setVideo(value);
    const next = { ...savedDevices(), [kind]: value === DEFAULT ? undefined : value };
    saveDevices(next);
  };

  const device = (kind: "audio" | "video", value: string, list: Device[], label: string) => (
    <div className="w-56 max-w-[55vw]">
      <Select value={value} onValueChange={(next) => pick(kind, next)}>
        <SelectTrigger className="h-9 bg-card text-[13px]">
          <SelectValue className="truncate" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={DEFAULT}>{t("default")}</SelectItem>
          {list.map((one) => (
            <SelectItem key={one.deviceId} value={one.deviceId}>
              {one.label || `${label} ${one.deviceId.slice(0, 6)}`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <>
      <Group title={t("devices")} note={t("devicesNote")}>
        <Row title={t("microphone")} control={device("audio", audio, microphones, t("microphone"))} />
        <Row title={t("camera")} control={device("video", video, cameras, t("camera"))} />
      </Group>
      <Group title={t("voice")} note={t("voiceNote")}>
        <Toggle pref="noiseSuppression" title={t("noiseSuppression")} description={t("noiseSuppressionNote")} />
        <Toggle pref="echoCancellation" title={t("echoCancellation")} description={t("echoCancellationNote")} />
        <Toggle
          pref="enhancedNoise"
          title={t("enhancedNoise")}
          description={t("enhancedNoiseNote")}
          badge={t("experimental")}
        />
      </Group>
      <Group title={t("video")}>
        <Toggle pref="mirrorVideo" title={t("mirror")} description={t("mirrorNote")} />
      </Group>
      <p className="flex items-center gap-2 text-[12px] text-faint">
        <Mic className="size-3.5" />
        <Video className="size-3.5" />
        {t("mediaLocal")}
      </p>
    </>
  );
}

function Notifications() {
  const t = useTranslations("settings");
  return (
    <>
      <Group title={t("sounds")}>
        <Toggle pref="messageSound" title={t("messageSound")} description={t("messageSoundNote")} />
        <Toggle pref="joinSound" title={t("joinSound")} description={t("joinSoundNote")} />
      </Group>
      <Group title={t("onTheFloor")}>
        <Toggle pref="nudges" title={t("nudges")} description={t("nudgesNote")} />
      </Group>
    </>
  );
}

function AccessibilitySection() {
  const t = useTranslations("settings");
  return (
    <>
      <Group title={t("motion")}>
        <Toggle pref="reduceMotion" title={t("reduceMotion")} description={t("reduceMotionNote")} />
      </Group>
      <Group title={t("performance")}>
        <Toggle pref="batterySaver" title={t("batterySaver")} description={t("batterySaverNote")} />
      </Group>
    </>
  );
}

/** The office's own settings: its name, its seats, and leaving or closing it. */
function OfficeSection() {
  const t = useTranslations("office.settings");
  const tc = useTranslations("common");
  const tPlans = useTranslations("office.plans");
  const router = useRouter();
  const { user } = useAuth();
  const context = useOfficeMaybe();
  const [name, setName] = useState(context?.office.name ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  if (!context) return null;
  const { office, refresh } = context;
  const admin = office.role === "admin";
  const owner = user?.id === office.owner;

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (problem) {
      setError(problem instanceof ApiError ? problem.message : t("wrong"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="mb-8 flex items-center gap-4">
        <Face seed={office.id} size={56} square />
        <div className="min-w-0">
          <p className="truncate text-[17px] font-semibold text-foreground">{office.name}</p>
          <p className="text-[13px] text-muted-foreground">
            {t("plan", {
              plan: tPlans.has(office.plan as "free") ? tPlans(office.plan as "free") : office.plan,
              used: office.members,
              seats: office.seats,
            })}
          </p>
          <PlansSoon className="mt-1" />
        </div>
      </div>

      <Group title={t("name")} note={t("seatsNote")}>
        <div className="flex gap-2 px-4 py-3.5">
          <input
            value={name}
            maxLength={64}
            disabled={!admin || busy}
            onChange={(event) => setName(event.target.value)}
            className="h-10 min-w-0 flex-1 rounded-xl border border-border bg-card px-3.5 text-[16px] text-foreground outline-none transition-colors focus:border-foreground/35 disabled:opacity-60 sm:text-[14px]"
          />
          {admin && name.trim() && name.trim() !== office.name && (
            <Button
              size="md"
              className="h-10 px-4 text-[13px]"
              disabled={busy}
              onClick={() =>
                run(async () => {
                  await api.renameOffice(office.id, name.trim());
                  await refresh();
                })
              }
            >
              {tc("save")}
            </Button>
          )}
        </div>
      </Group>

      {error && <p className="-mt-4 mb-6 text-[12.5px] text-destructive">{error}</p>}

      <Group title={t("danger")}>
        <div className="px-4 py-3.5">
          {owner ? (
            confirming ? (
              <div className="rounded-xl border border-destructive/25 bg-destructive/[0.06] p-3">
                <p className="text-[13px] leading-relaxed text-foreground">{t("closeSure")}</p>
                <div className="mt-3 flex justify-end gap-2">
                  <Button variant="ghost" size="sm" className="h-9 px-3" onClick={() => setConfirming(false)}>
                    {tc("cancel")}
                  </Button>
                  <Button
                    size="sm"
                    disabled={busy}
                    className="h-9 bg-destructive px-4 text-white hover:bg-destructive/90"
                    onClick={() =>
                      run(async () => {
                        await api.closeOffice(office.id);
                        router.replace("/dashboard");
                      })
                    }
                  >
                    {t("closeIt")}
                  </Button>
                </div>
              </div>
            ) : (
              <Row
                title={t("close")}
                description={t("closeSure")}
                control={
                  <Button variant="secondary" size="sm" className="h-9 px-3.5 text-destructive" onClick={() => setConfirming(true)}>
                    {t("close")}
                  </Button>
                }
              />
            )
          ) : (
            <Row
              title={t("leave")}
              description={t("seatsNote")}
              control={
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={busy}
                  className="h-9 px-3.5 text-destructive"
                  onClick={() =>
                    run(async () => {
                      await api.removeMember(office.id, user!.id);
                      router.replace("/dashboard");
                    })
                  }
                >
                  {t("leave")}
                </Button>
              }
            />
          )}
        </div>
      </Group>
    </>
  );
}
